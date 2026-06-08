// ==================== Editor Page Logic ====================

// Get project index from URL params
const urlParams = new URLSearchParams(window.location.search);
const parsedProjectIndex = parseInt(urlParams.get('project'), 10);
const parsedChapterIndex = parseInt(urlParams.get('chapter'), 10);
const projectIndex = Number.isNaN(parsedProjectIndex) ? -1 : parsedProjectIndex;
const chapterIndex = Number.isNaN(parsedChapterIndex) ? 0 : parsedChapterIndex;

// ==================== Initialize ====================
function init() {
    if (!requireAuth()) return;
    loadSettings();
    loadTheme();
    setupAuthDisplay();
    setupAuthActions();
    loadProject();
    updateAIStatus();
}

function requireAuth() {
    const user = getAuthUser();
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    localStorage.setItem('moyun_user_name', user.name);
    return true;
}

function getAuthUser() {
    const auth = parseJson(sessionStorage.getItem('moyun_auth_user'));
    return auth?.name ? auth : null;
}

function parseJson(raw) {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function setupAuthDisplay() {
    const name = localStorage.getItem('moyun_user_name') || 'yyy';
    const userNameEl = document.querySelector('.user-name');
    const avatarEl = document.querySelector('.user-avatar');
    if (userNameEl) userNameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
}

function setupAuthActions() {
    const userInfo = document.querySelector('.user-info');
    if (!userInfo) return;

    userInfo.setAttribute('role', 'button');
    userInfo.setAttribute('tabindex', '0');
    userInfo.title = '用户菜单';

    let menu = userInfo.querySelector('.user-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.hidden = true;

        const user = document.createElement('div');
        user.className = 'user-menu-user';
        user.textContent = localStorage.getItem('moyun_user_name') || '当前用户';

        const logoutBtn = document.createElement('button');
        logoutBtn.type = 'button';
        logoutBtn.textContent = '退出登录';
        logoutBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            handleLogout();
        });

        menu.append(user, logoutBtn);
        userInfo.appendChild(menu);
    } else {
        menu.hidden = true;
    }

    userInfo.addEventListener('click', function(event) {
        event.stopPropagation();
        const open = !userInfo.classList.contains('open');
        userInfo.classList.toggle('open', open);
        menu.hidden = !open;
    });
    userInfo.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const open = !userInfo.classList.contains('open');
            userInfo.classList.toggle('open', open);
            menu.hidden = !open;
        }
        if (event.key === 'Escape') {
            userInfo.classList.remove('open');
            menu.hidden = true;
        }
    });
    document.addEventListener('click', function() {
        userInfo.classList.remove('open');
        menu.hidden = true;
    });
}

function handleLogout() {
    sessionStorage.removeItem('moyun_auth_user');
    localStorage.removeItem('moyun_auth_user');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function loadSettings() {
    const saved = localStorage.getItem('moyun_ai_settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            aiSettings = { ...aiSettings, ...parsed };
        } catch (e) {}
    }
}

function loadTheme() {
    const saved = localStorage.getItem('moyun_theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        document.querySelector('.theme-select').value = saved;
    }
}

function toggleTheme() {
    const theme = document.querySelector('.theme-select').value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('moyun_theme', theme);
}

// ==================== Load Project ====================
function loadProject() {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) {
        alert('没有找到项目');
        window.location.href = 'index.html';
        return;
    }

    const projects = JSON.parse(saved);
    if (projectIndex < 0 || projectIndex >= projects.length) {
        alert('项目不存在');
        window.location.href = 'index.html';
        return;
    }

    const project = projects[projectIndex];
    renderChapters(project, chapterIndex);

    if (chapterIndex >= 0 && chapterIndex < project.chapters.length) {
        selectChapter(project, chapterIndex);
    }
}

// ==================== Render Functions ====================
function renderChapters(project, activeIndex) {
    const list = document.getElementById('chapterList');

    if (!project.chapters || project.chapters.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">暂无章节</p>';
        return;
    }

    list.innerHTML = project.chapters.map((ch, i) => `
        <div class="chapter-item ${i === activeIndex ? 'active' : ''}" onclick="selectChapterByIndex(${i})">
            第${i + 1}章 · ${ch.title}
        </div>
    `).join('');
}

function selectChapterByIndex(index) {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = JSON.parse(saved);
    const project = projects[projectIndex];
    const chapter = project.chapters[index];

    document.getElementById('editorTitle').textContent = `第${index + 1}章 · ${chapter.title}`;
    document.getElementById('contentEditor').value = chapter.content || '';

    // Update URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('chapter', index);
    window.history.pushState({}, '', newUrl);

    renderChapters(project, index);
    updateWordCount();

    // Store current indices (修 bug：之前漏存 chapter)
    localStorage.setItem('moyun_current_project', projectIndex);
    chapterIndex = index;
    localStorage.setItem('moyun_current_chapter', index);
}

function selectChapter(project, index) {
    const chapter = project.chapters[index];
    document.getElementById('editorTitle').textContent = `第${index + 1}章 · ${chapter.title}`;
    document.getElementById('contentEditor').value = chapter.content || '';
    updateWordCount();
}

// ==================== Content Editor ====================
document.getElementById('contentEditor').addEventListener('input', function() {
    saveCurrentChapterLocal();
    updateWordCount();
});

function saveCurrentChapterLocal() {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = JSON.parse(saved);
    const chapter = projects[projectIndex].chapters[chapterIndex];
    if (chapter) {
        chapter.content = document.getElementById('contentEditor').value;
        localStorage.setItem('moyun_projects', JSON.stringify(projects));
    }
}

function saveCurrentChapter() {
    saveCurrentChapterLocal();
    alert('保存成功！');
}

function updateWordCount() {
    const content = document.getElementById('contentEditor').value;
    document.getElementById('currentWordCount').textContent = `${content.length} 字`;
}

function goBack() {
    window.location.href = 'index.html';
}

// ==================== Add Chapter ====================
function openAddChapterModal() {
    document.getElementById('addChapterModal').classList.add('show');
    document.getElementById('chapterTitleInput').value = '';
    document.getElementById('chapterDescInput').value = '';
}

function closeAddChapterModal() {
    document.getElementById('addChapterModal').classList.remove('show');
}

function addChapter() {
    const title = document.getElementById('chapterTitleInput').value.trim();
    const summary = document.getElementById('chapterDescInput').value.trim();

    if (!title) {
        alert('请输入章节标题');
        return;
    }

    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = JSON.parse(saved);
    projects[projectIndex].chapters.push({
        title,
        summary,
        content: ''
    });

    localStorage.setItem('moyun_projects', JSON.stringify(projects));

    // 记住当前章节（防止整页刷新丢状态）
    localStorage.setItem('moyun_current_project', projectIndex);
    localStorage.setItem('moyun_current_chapter', projects[projectIndex].chapters.length - 1);

    // Reload with new chapter selected
    const newIndex = projects[projectIndex].chapters.length - 1;
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('chapter', newIndex);
    window.location.href = newUrl.toString();
}

// ==================== Export ====================
function exportCurrentProject() {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = JSON.parse(saved);
    const project = projects[projectIndex];

    if (project.chapters.length === 0) {
        alert('没有可导出的内容');
        return;
    }

    let content = `# ${project.title}\n\n`;
    content += `${project.description || ''}\n\n`;
    content += `---\n\n## 章节内容\n\n`;

    project.chapters.forEach((chapter, i) => {
        content += `### 第${i + 1}章 · ${chapter.title}\n\n`;
        if (chapter.summary) {
            content += `> ${chapter.summary}\n\n`;
        }
        content += `${chapter.content || '（待撰写）'}\n\n---\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

// ==================== AI Settings (Shared) ====================
let aiSettings = {
    provider: 'anthropic',
    apiKey: '',
    baseUrl: '',
    model: '',
    maxTokens: 2048,
    temperature: 0.7
};

function openSettingsModal() {
    document.getElementById('settingsModal').classList.add('show');
    document.getElementById('apiProvider').value = aiSettings.provider;
    document.getElementById('apiKeyInput').value = aiSettings.apiKey;
    document.getElementById('baseUrlInput').value = aiSettings.baseUrl;
    document.getElementById('modelInput').value = aiSettings.model;
    document.getElementById('maxTokensInput').value = aiSettings.maxTokens;
    document.getElementById('temperatureInput').value = aiSettings.temperature;
    document.getElementById('temperatureValue').textContent = aiSettings.temperature;
    onApiProviderChange();
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('show');
}

function onApiProviderChange() {
    const provider = document.getElementById('apiProvider').value;
    const keyGroup = document.getElementById('apiKeyGroup');
    const urlGroup = document.getElementById('baseUrlGroup');
    const modelGroup = document.getElementById('modelGroup');

    if (provider === 'local') {
        keyGroup.style.display = 'none';
        urlGroup.style.display = 'none';
        modelGroup.style.display = 'none';
    } else {
        keyGroup.style.display = 'block';
        urlGroup.style.display = 'block';
        modelGroup.style.display = 'block';
    }
}

document.getElementById('temperatureInput').addEventListener('input', function() {
    document.getElementById('temperatureValue').textContent = this.value;
});

function saveSettings() {
    aiSettings.provider = document.getElementById('apiProvider').value;
    aiSettings.apiKey = document.getElementById('apiKeyInput').value;
    aiSettings.baseUrl = document.getElementById('baseUrlInput').value;
    aiSettings.model = document.getElementById('modelInput').value;
    aiSettings.maxTokens = parseInt(document.getElementById('maxTokensInput').value);
    aiSettings.temperature = parseFloat(document.getElementById('temperatureInput').value);

    localStorage.setItem('moyun_ai_settings', JSON.stringify(aiSettings));
    closeSettingsModal();
    updateAIStatus();
    alert('设置已保存！');
}

function updateAIStatus() {
    const status = document.getElementById('aiStatus');
    if (aiSettings.provider === 'local') {
        status.textContent = '📍 本地模式';
    } else if (aiSettings.apiKey) {
        status.textContent = '✅ ' + aiSettings.provider.toUpperCase();
    } else {
        status.textContent = '⚠️ 未配置API';
    }
}

// ==================== AI Functions ====================
function getThemePrompt(themeType) {
    const prompts = {
        romance: '你是一位专业的言情小说写作助手，擅长细腻的情感描写和人物心理刻画。请用中文回答。',
        fantasy: '你是一位专业的玄幻小说写作助手，擅长构建奇幻世界观和力量体系。请用中文回答。',
        mystery: '你是一位专业的悬疑小说写作助手，擅长铺设悬念和设计推理逻辑。请用中文回答。',
        scifi: '你是一位专业的科幻小说写作助手，擅长设计科技设定和未来场景。请用中文回答。',
        wuxia: '你是一位专业的武侠小说写作助手，擅长描绘江湖规矩和武功招式。请用中文回答。',
        urban: '你是一位专业的都市小说写作助手，擅长描绘现代都市生活。请用中文回答。',
        historical: '你是一位专业的历史小说写作助手，擅长还原时代背景和人物风貌。请用中文回答。',
        horror: '你是一位专业的恐怖小说写作助手，擅长营造恐怖氛围和心理恐惧。请用中文回答。'
    };
    return prompts[themeType] || prompts.romance;
}

// ==================== API Presets ====================
const API_PRESETS = {
    anthropic: {
        name: 'Anthropic (Claude)',
        baseUrl: 'https://api.anthropic.com/v1',
        authHeader: 'x-api-key',
        modelPrefix: ''
    },
    openai: {
        name: 'OpenAI (GPT)',
        baseUrl: 'https://api.openai.com/v1',
        authHeader: 'bearer',
        modelPrefix: ''
    },
    deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        authHeader: 'bearer',
        modelPrefix: 'deepseek-'
    },
    minimax: {
        name: 'MiniMax',
        baseUrl: 'https://api.minimax.chat/v1',
        authHeader: 'bearer',
        modelPrefix: 'MiniMax-'
    },
    kimi: {
        name: 'Kimi (Moonshot)',
        baseUrl: 'https://api.moonshot.cn/v1',
        authHeader: 'bearer',
        modelPrefix: 'moonshot-'
    },
    glm: {
        name: 'GLM (智谱)',
        baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
        authHeader: 'bearer',
        modelPrefix: 'glm-'
    }
};

// ==================== API Helpers ====================
function inferApiProfile(baseUrl, model) {
    const normalizedBaseUrl = String(baseUrl || '').trim().toLowerCase();
    const normalizedModel = String(model || '').trim().toLowerCase();

    // 检查是否有明确的代理路径
    if (/\/anthropic\b/i.test(normalizedBaseUrl)) {
        return 'anthropic';
    }

    // 按域名精确匹配
    if (/api\.anthropic\.com/i.test(normalizedBaseUrl)) {
        return 'anthropic';
    }
    if (/api\.deepseek\.com/i.test(normalizedBaseUrl)) {
        return 'deepseek';
    }
    if (/api\.minimax\.chat/i.test(normalizedBaseUrl)) {
        return 'minimax';
    }
    if (/api\.moonshot\.cn/i.test(normalizedBaseUrl)) {
        return 'kimi';
    }
    if (/bigmodel\.cn/i.test(normalizedBaseUrl)) {
        return 'glm';
    }
    if (/api\.openai\.com/i.test(normalizedBaseUrl)) {
        return 'openai';
    }

    // 按 model 前缀匹配
    if (normalizedModel.startsWith('deepseek-')) return 'deepseek';
    if (normalizedModel.startsWith('minimax-')) return 'minimax';
    if (normalizedModel.startsWith('glm-')) return 'glm';
    if (normalizedModel.startsWith('moonshot-')) return 'kimi';
    if (/claude/i.test(normalizedModel)) return 'anthropic';

    // 默认
    return 'openai';
}

function buildConnectivityTestPayload(provider, model) {
    return {
        model: model,
        messages: [
            { role: 'system', content: 'Reply with exactly: hello world' },
            { role: 'user', content: 'hello world' }
        ],
        temperature: 0,
        max_tokens: 256
    };
}

function buildApiEndpoint(baseUrl, provider, model) {
    const normalized = (baseUrl || '').replace(/\/+$/, '');

    if (!normalized) {
        if (provider === 'anthropic') return 'https://api.anthropic.com/v1/messages';
        if (provider === 'deepseek') return 'https://api.deepseek.com/v1/chat/completions';
        if (provider === 'minimax') return 'https://api.minimax.chat/v1/chat_completions';
        if (provider === 'kimi') return 'https://api.moonshot.cn/v1/chat/completions';
        if (provider === 'glm') return 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions';
        return 'https://api.openai.com/v1/chat/completions';
    }

    // 如果用户提供了 baseUrl，直接追加 provider 对应的端点路径
    if (normalized) {
        if (provider === 'anthropic') {
            return `${normalized}/v1/messages`;
        }
        // 默认使用 chat completions
        return `${normalized}/v1/chat/completions`;
    }

    // 如果没有提供 baseUrl，使用默认值
    if (provider === 'anthropic') return 'https://api.anthropic.com/v1/messages';
    if (provider === 'deepseek') return 'https://api.deepseek.com/v1/chat/completions';
    if (provider === 'minimax') return 'https://api.minimax.chat/v1/chat_completions';
    if (provider === 'kimi') return 'https://api.moonshot.cn/v1/chat_completions';
    if (provider === 'glm') return 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions';
    return 'https://api.openai.com/v1/chat/completions';
}

function buildApiHeaders(provider, apiKey) {
    const headers = { 'Content-Type': 'application/json' };
    if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
    } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return headers;
}

function buildApiBody(provider, model, systemPrompt, messages, temperature, maxTokens) {
    const modelName = model || (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4');

    if (provider === 'anthropic') {
        return {
            model: modelName,
            system: systemPrompt,
            messages: messages,
            max_tokens: maxTokens || 2048
        };
    }

    // OpenAI / DeepSeek / MiniMax
    return {
        model: modelName,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 2048
    };
}

async function callAI(messages, systemPrompt) {
    if (aiSettings.provider === 'local') {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve('【本地模拟】夜风轻拂，星光点点，他望着远方的山峦，心中涌起无限思绪。');
            }, 1000);
        });
    }

    const provider = inferApiProfile(aiSettings.baseUrl, aiSettings.model) || aiSettings.provider;
    const endpoint = buildApiEndpoint(aiSettings.baseUrl, provider, aiSettings.model);
    const headers = buildApiHeaders(provider, aiSettings.apiKey);
    const body = buildApiBody(provider, aiSettings.model, systemPrompt, messages, aiSettings.temperature, aiSettings.maxTokens);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            let errorDetail = '';
            try {
                const errData = await response.json();
                errorDetail = errData.error?.message || JSON.stringify(errData).slice(0, 200);
            } catch {
                errorDetail = await response.text();
            }
            throw new Error(`HTTP ${response.status}: ${errorDetail}`);
        }

        const data = await response.json();

        if (provider === 'anthropic') {
            return data.content?.[0]?.text || '';
        } else {
            return data.choices?.[0]?.message?.content || '';
        }
    } catch (error) {
        if (error.message.includes('fetch') || error.message.includes('CORS')) {
            throw new Error('网络请求失败，可能是 CORS 跨域问题。请确认 API 端点支持跨域访问。');
        }
        throw error;
    }
}

async function aiWrite() {
    const content = document.getElementById('contentEditor').value;
    if (!content) {
        alert('请先输入一些内容');
        return;
    }

    const btn = document.querySelector('.toolbar-btn.primary');
    btn.textContent = '⏳ AI思考中...';
    btn.disabled = true;

    try {
        const saved = localStorage.getItem('moyun_projects');
        const projects = JSON.parse(saved);
        const project = projects[projectIndex];

        const messages = [{
            role: 'user',
            content: `请续写以下小说内容，保持相同的风格和节奏，续写150-300字：\n\n${content}`
        }];

        const continuation = await callAI(messages, getThemePrompt(project.type));
        document.getElementById('contentEditor').value = content + continuation;
        saveCurrentChapterLocal();
        updateWordCount();
        // 提示用户已完成续写
        const aiStatus = document.getElementById('aiStatus');
        if (aiStatus) {
            aiStatus.textContent = '✅ AI续写完成';
            setTimeout(() => updateAIStatus(), 3000);
        }
    } catch (error) {
        alert('AI调用失败，请检查API设置');
    }

    btn.textContent = '✍️ AI续写';
    btn.disabled = false;
}

async function aiPolish() {
    const content = document.getElementById('contentEditor').value;
    if (!content) {
        alert('请先输入内容');
        return;
    }

    const btn = document.querySelector('.toolbar-btn:nth-of-type(2)');
    const originalText = btn.textContent;
    btn.textContent = '⏳ AI润色中...';
    btn.disabled = true;

    try {
        const messages = [{
            role: 'user',
            content: `请润色以下内容：\n\n${content}`
        }];

        const polished = await callAI(messages, '你是一位专业的中文写作润色专家。请直接返回润色后的内容。');
        document.getElementById('contentEditor').value = polished;
        saveCurrentChapterLocal();
        updateWordCount();
    } catch (error) {
        alert('AI调用失败，请检查API设置');
    }

    btn.textContent = originalText;
    btn.disabled = false;
}

async function aiImprove() {
    const content = document.getElementById('contentEditor').value;
    if (!content) {
        alert('请先输入内容');
        return;
    }

    const btn = document.querySelector('.toolbar-btn:nth-of-type(3)');
    const originalText = btn.textContent;
    btn.textContent = '⏳ AI分析中...';
    btn.disabled = true;

    try {
        const saved = localStorage.getItem('moyun_projects');
        const projects = JSON.parse(saved);
        const project = projects[projectIndex];

        const messages = [{
            role: 'user',
            content: `请为以下小说内容提供改进建议：\n\n${content.slice(0, 500)}`
        }];

        const suggestion = await callAI(messages, getThemePrompt(project.type));
        alert('💡 AI改进建议：\n\n' + suggestion);
    } catch (error) {
        alert('AI调用失败，请检查API设置');
    }

    btn.textContent = originalText;
    btn.disabled = false;
}

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', init);
