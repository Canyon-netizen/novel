// ==================== Editor Page Logic ====================

// Get project index from URL params
const urlParams = new URLSearchParams(window.location.search);
const projectIndex = parseInt(urlParams.get('project')) || -1;
const chapterIndex = parseInt(urlParams.get('chapter')) || 0;

// ==================== Initialize ====================
function init() {
    loadSettings();
    loadTheme();
    loadProject();
    updateAIStatus();
}

function loadSettings() {
    const saved = localStorage.getItem('moyun_ai_settings');
    if (saved) {
        try {
            aiSettings = JSON.parse(saved);
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

    // Store current indices
    localStorage.setItem('moyun_current_project', projectIndex);
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

async function callAI(messages, systemPrompt) {
    if (aiSettings.provider === 'local') {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve('【本地模拟】夜风轻拂，星光点点，他望着远方的山峦，心中涌起无限思绪。');
            }, 1000);
        });
    }

    const headers = { 'Content-Type': 'application/json' };
    let endpoint = aiSettings.baseUrl;
    let body = {};

    if (aiSettings.provider === 'anthropic') {
        if (!endpoint) endpoint = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = aiSettings.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        body = {
            model: aiSettings.model,
            max_tokens: aiSettings.maxTokens,
            system: systemPrompt,
            messages: messages
        };
    } else if (aiSettings.provider === 'openai' || aiSettings.provider === 'custom') {
        if (!endpoint) endpoint = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${aiSettings.apiKey}`;
        body = {
            model: aiSettings.model,
            max_tokens: aiSettings.maxTokens,
            temperature: aiSettings.temperature,
            messages: [{ role: 'system', content: systemPrompt }, ...messages]
        };
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error('API request failed');

    const data = await response.json();

    if (aiSettings.provider === 'anthropic') {
        return data.content[0].text;
    } else {
        return data.choices[0].message.content;
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