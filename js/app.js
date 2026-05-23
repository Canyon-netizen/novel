// ==================== Data ====================
let projects = [];
let currentProjectIndex = -1;
let currentChapterIndex = -1;

let aiSettings = {
    provider: 'anthropic',
    apiKey: '',
    baseUrl: '',
    model: '',
    temperature: 0.7
};

// ==================== Initialize ====================
function init() {
    loadProjects();
    loadSettings();
    loadTheme();
    updateGreeting();
    renderProjects();
    updateStats();
    updateAIStatus();
}

// ==================== Storage ====================
function loadProjects() {
    const saved = localStorage.getItem('moyun_projects');
    if (saved) {
        projects = JSON.parse(saved);
    }
}

function saveProjects() {
    localStorage.setItem('moyun_projects', JSON.stringify(projects));
}

function loadSettings() {
    const saved = localStorage.getItem('moyun_ai_settings');
    if (saved) {
        try {
            aiSettings = JSON.parse(saved);
        } catch (e) {}
    }
}

function saveSettingsToStorage() {
    localStorage.setItem('moyun_ai_settings', JSON.stringify(aiSettings));
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

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '晚上好';
    if (hour >= 5 && hour < 12) greeting = '早上好';
    else if (hour >= 12 && hour < 18) greeting = '下午好';

    const saved = localStorage.getItem('moyun_user_name');
    const name = saved || 'yyy';

    document.getElementById('greetingText').textContent = `${greeting}，${name}`;
}

// ==================== Render Functions ====================
function renderProjects() {
    const grid = document.getElementById('novelGrid');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('projectCount');

    count.textContent = `(${projects.length})`;

    if (projects.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    grid.innerHTML = projects.map((project, index) => `
        <div class="novel-card" onclick="openProject(${index})">
            <div class="novel-card-header">
                <span class="novel-type">${getTypeName(project.type)}</span>
                <span class="novel-menu" onclick="event.stopPropagation(); showNovelMenu(${index})">⋮</span>
            </div>
            <h3 class="novel-title">${project.title}</h3>
            <p class="novel-desc">${project.description || '暂无简介'}</p>
            <div class="novel-meta">
                <span>📖 ${project.chapters.length}章</span>
                <span>✍️ ${getProjectWordCount(project)}字</span>
            </div>
        </div>
    `).join('');
}

function getTypeName(type) {
    const types = {
        romance: '言情',
        fantasy: '玄幻',
        mystery: '悬疑',
        scifi: '科幻',
        wuxia: '武侠',
        urban: '都市',
        historical: '历史',
        horror: '恐怖'
    };
    return types[type] || '其他';
}

function getProjectWordCount(project) {
    return project.chapters.reduce((sum, ch) => sum + (ch.content?.length || 0), 0);
}

function updateStats() {
    const totalNovels = projects.length;
    const totalChapters = projects.reduce((sum, p) => sum + p.chapters.length, 0);
    const totalWords = projects.reduce((sum, p) => sum + getProjectWordCount(p), 0);
    const totalChars = projects.reduce((sum, p) => sum + (p.characters?.length || 0), 0);

    document.getElementById('novelCount').textContent = totalNovels;
    document.getElementById('chapterCount').textContent = totalChapters;
    document.getElementById('wordCount').textContent = totalWords;
    document.getElementById('charCount').textContent = totalChars;
}

function renderChapters() {
    const list = document.getElementById('chapterList');
    const project = projects[currentProjectIndex];

    if (!project || project.chapters.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">暂无章节</p>';
        return;
    }

    list.innerHTML = project.chapters.map((ch, i) => `
        <div class="chapter-item ${i === currentChapterIndex ? 'active' : ''}" onclick="selectChapter(${i})">
            第${i + 1}章 · ${ch.title}
        </div>
    `).join('');
}

// ==================== Modal Functions ====================
function openNewNovelModal() {
    // Redirect to create page with full configuration
    window.location.href = 'create.html';
}

function closeNewNovelModal() {
    // No longer used - modal removed
}

function openAddChapterModal() {
    document.getElementById('addChapterModal').classList.add('show');
    document.getElementById('chapterTitleInput').value = '';
    document.getElementById('chapterDescInput').value = '';
}

function closeAddChapterModal() {
    document.getElementById('addChapterModal').classList.remove('show');
}

function openSettingsModal() {
    document.getElementById('settingsModal').classList.add('show');
    document.getElementById('apiProvider').value = aiSettings.provider;
    document.getElementById('apiKeyInput').value = aiSettings.apiKey;
    document.getElementById('baseUrlInput').value = aiSettings.baseUrl;
    document.getElementById('modelInput').value = aiSettings.model;
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
    aiSettings.temperature = parseFloat(document.getElementById('temperatureInput').value);

    saveSettingsToStorage();
    closeSettingsModal();
    updateAIStatus();
    alert('设置已保存！');
}

async function testApiConnection() {
    const testBtn = document.getElementById('testBtn');
    const originalText = testBtn.textContent;
    testBtn.textContent = '测试中...';
    testBtn.disabled = true;

    const provider = document.getElementById('apiProvider').value;
    const apiKey = document.getElementById('apiKeyInput').value;
    const baseUrl = document.getElementById('baseUrlInput').value;
    const model = document.getElementById('modelInput').value;

    if (provider === 'local') {
        setTimeout(() => {
            testBtn.textContent = originalText;
            testBtn.disabled = false;
            alert('✅ 本地模拟模式可用');
        }, 500);
        return;
    }

    if (!apiKey) {
        testBtn.textContent = originalText;
        testBtn.disabled = false;
        alert('请先输入 API Key');
        return;
    }

    try {
        const headers = { 'Content-Type': 'application/json' };
        let endpoint = '';
        let body = {};

        if (provider === 'anthropic') {
            endpoint = baseUrl || 'https://api.anthropic.com/v1/messages';
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            body = {
                model: model || 'claude-sonnet-4-20250514',
                system: '你是一个助手。',
                messages: [{ role: 'user', content: '你好' }]
            };
        } else if (provider === 'openai') {
            endpoint = baseUrl || 'https://api.openai.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || 'gpt-4',
                messages: [{ role: 'user', content: '你好' }]
            };
        } else if (provider === 'custom') {
            endpoint = baseUrl;
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || 'default',
                messages: [{ role: 'user', content: '你好' }]
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        let reply = '';
        if (provider === 'anthropic') {
            reply = data.content?.[0]?.text || JSON.stringify(data).slice(0, 100);
        } else {
            reply = data.choices?.[0]?.message?.content || JSON.stringify(data).slice(0, 100);
        }

        testBtn.textContent = originalText;
        testBtn.disabled = false;
        alert('✅ 连接成功！\n\nAI 回复：' + reply.slice(0, 200));
    } catch (error) {
        testBtn.textContent = originalText;
        testBtn.disabled = false;
        alert('❌ 连接失败：' + error.message);
    }
}

function updateAIStatus() {
    const status = document.getElementById('aiStatus');
    if (aiSettings.provider === 'local') {
        status.textContent = '📍 本地模式';
    } else if (aiSettings.apiKey) {
        const modelDisplay = aiSettings.model === '' ? aiSettings.customModel : aiSettings.model;
        status.textContent = '✅ ' + (modelDisplay || aiSettings.provider.toUpperCase());
    } else {
        status.textContent = '⚠️ 未配置API';
    }
}

// ==================== CRUD Functions ====================
function createNovel() {
    const title = document.getElementById('novelTitleInput').value.trim();
    const type = document.getElementById('novelTypeSelect').value;
    const description = document.getElementById('novelDescInput').value.trim();

    if (!title) {
        alert('请输入小说标题');
        return;
    }

    projects.push({
        title,
        type,
        description,
        chapters: [],
        characters: [],
        createdAt: new Date().toISOString()
    });

    saveProjects();
    renderProjects();
    updateStats();
    closeNewNovelModal();
}

function openProject(index) {
    // Store current project index and redirect to editor
    localStorage.setItem('moyun_current_project', index);
    localStorage.setItem('moyun_current_chapter', 0);
    window.location.href = `editor.html?project=${index}&chapter=0`;
}

function goBack() {
    window.location.href = 'index.html';
}

function addChapter() {
    const title = document.getElementById('chapterTitleInput').value.trim();
    const summary = document.getElementById('chapterDescInput').value.trim();

    if (!title) {
        alert('请输入章节标题');
        return;
    }

    if (currentProjectIndex === -1) return;

    projects[currentProjectIndex].chapters.push({
        title,
        summary,
        content: ''
    });

    saveProjects();
    renderChapters();
    closeAddChapterModal();
    updateStats();
}

function selectChapter(index) {
    currentChapterIndex = index;
    const project = projects[currentProjectIndex];
    const chapter = project.chapters[index];

    document.getElementById('editorTitle').textContent = `第${index + 1}章 · ${chapter.title}`;
    document.getElementById('contentEditor').value = chapter.content || '';

    renderChapters();
    updateWordCount();
}

function showNovelMenu(index) {
    const project = projects[index];
    const action = prompt(`项目管理: ${project.title}\n\n1. 删除项目\n2. 导出\n\n请输入操作编号：`);

    if (action === '1') {
        deleteProject(index);
    } else if (action === '2') {
        exportProject(index);
    }
}

function deleteProject(index) {
    if (confirm('确定要删除这个项目吗？')) {
        projects.splice(index, 1);
        saveProjects();
        renderProjects();
        updateStats();
    }
}

function exportProject(index) {
    const project = projects[index];
    if (project.chapters.length === 0) {
        alert('没有可导出的内容');
        return;
    }

    let content = generateMarkdown(project);

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportCurrentProject() {
    if (currentProjectIndex === -1) {
        alert('请先打开一个项目');
        return;
    }
    exportProject(currentProjectIndex);
}

function generateMarkdown(project) {
    let content = `# ${project.title}\n\n`;
    content += `## ${getTypeName(project.type)}\n\n`;
    content += `${project.description || ''}\n\n`;
    content += `---\n\n## 章节内容\n\n`;

    project.chapters.forEach((chapter, i) => {
        content += `### 第${i + 1}章 · ${chapter.title}\n\n`;
        if (chapter.summary) {
            content += `> ${chapter.summary}\n\n`;
        }
        content += `${chapter.content || '（待撰写）'}\n\n---\n\n`;
    });

    return content;
}

// ==================== Content Editor ====================
document.getElementById('contentEditor').addEventListener('input', function() {
    if (currentProjectIndex !== -1 && currentChapterIndex !== -1) {
        projects[currentProjectIndex].chapters[currentChapterIndex].content = this.value;
        saveProjects();
        updateWordCount();
    }
});

function updateWordCount() {
    const content = document.getElementById('contentEditor').value;
    document.getElementById('currentWordCount').textContent = `${content.length} 字`;
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
        return callLocalAI(messages, systemPrompt);
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    let endpoint = '';
    let body = {};

    if (aiSettings.provider === 'anthropic') {
        endpoint = aiSettings.baseUrl || 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = aiSettings.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        body = {
            model: aiSettings.model || aiSettings.customModel,
            system: systemPrompt,
            messages: messages
        };
    } else if (aiSettings.provider === 'openai') {
        endpoint = aiSettings.baseUrl || 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${aiSettings.apiKey}`;
        body = {
            model: aiSettings.model || aiSettings.customModel,
            temperature: aiSettings.temperature,
            messages: [{ role: 'system', content: systemPrompt }, ...messages]
        };
    } else if (aiSettings.provider === 'custom') {
        endpoint = aiSettings.baseUrl;
        headers['Authorization'] = `Bearer ${aiSettings.apiKey}`;
        body = {
            model: aiSettings.model || aiSettings.customModel,
            temperature: aiSettings.temperature,
            messages: [{ role: 'system', content: systemPrompt }, ...messages]
        };
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();

        if (aiSettings.provider === 'anthropic') {
            return data.content[0].text;
        } else {
            return data.choices[0].message.content;
        }
    } catch (error) {
        console.error('AI API Error:', error);
        throw error;
    }
}

function callLocalAI(messages, systemPrompt) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('【本地模拟】这是一段模拟的AI续写内容。夜风轻拂，星光点点，他望着远方的山峦，心中涌起无限思绪。');
        }, 1000);
    });
}

async function aiWrite() {
    if (currentChapterIndex === -1) {
        alert('请先选择一个章节');
        return;
    }
    const content = document.getElementById('contentEditor').value;
    if (!content) {
        alert('请先输入一些内容');
        return;
    }

    showLoading(true);

    try {
        const project = projects[currentProjectIndex];
        const systemPrompt = getThemePrompt(project.type);

        const messages = [{
            role: 'user',
            content: `请续写以下小说内容，保持相同的风格和节奏，续写150-300字：\n\n${content}`
        }];

        const continuation = await callAI(messages, systemPrompt);
        document.getElementById('contentEditor').value = content + continuation;
        projects[currentProjectIndex].chapters[currentChapterIndex].content = document.getElementById('contentEditor').value;
        saveProjects();
        updateWordCount();
    } catch (error) {
        alert('AI调用失败，请检查API设置');
    }

    showLoading(false);
}

async function aiPolish() {
    if (currentChapterIndex === -1) {
        alert('请先选择一个章节');
        return;
    }
    const content = document.getElementById('contentEditor').value;
    if (!content) {
        alert('请先输入内容');
        return;
    }

    showLoading(true);

    try {
        const systemPrompt = '你是一位专业的中文写作润色专家，擅长优化文字表达。请直接返回润色后的内容。';

        const messages = [{
            role: 'user',
            content: `请润色以下内容：\n\n${content}`
        }];

        const polished = await callAI(messages, systemPrompt);
        document.getElementById('contentEditor').value = polished;
        projects[currentProjectIndex].chapters[currentChapterIndex].content = polished;
        saveProjects();
        updateWordCount();
    } catch (error) {
        alert('AI调用失败，请检查API设置');
    }

    showLoading(false);
}

async function aiImprove() {
    if (currentChapterIndex === -1) {
        alert('请先选择一个章节');
        return;
    }
    const content = document.getElementById('contentEditor').value;
    if (!content) {
        alert('请先输入内容');
        return;
    }

    showLoading(true);

    try {
        const project = projects[currentProjectIndex];
        const systemPrompt = getThemePrompt(project.type);

        const messages = [{
            role: 'user',
            content: `请为以下小说内容提供改进建议：\n\n${content.slice(0, 500)}`
        }];

        const suggestion = await callAI(messages, systemPrompt);
        alert('💡 AI改进建议：\n\n' + suggestion);
    } catch (error) {
        alert('AI调用失败，请检查API设置');
    }

    showLoading(false);
}

function showLoading(show) {
    const btn = event?.target?.closest('.toolbar-btn') || document.querySelector('.toolbar-btn.primary');
    if (show) {
        btn.textContent = '⏳ AI思考中...';
        btn.disabled = true;
    } else {
        btn.textContent = btn.classList.contains('primary') ? '✍️ AI续写' : btn.dataset.originalText || '✍️ AI续写';
        btn.disabled = false;
    }
}

// ==================== Auto-save ====================
setInterval(() => {
    if (projects.length > 0) {
        saveProjects();
    }
}, 30000);

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', init);