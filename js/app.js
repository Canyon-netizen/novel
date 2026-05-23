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

// Gist sync
let gistSettings = {
    token: '',
    gistId: '',
    lastSync: null
};

const GIST_FILENAME = 'moyun_data.json';

// ==================== Initialize ====================
function init() {
    loadProjects();
    loadSettings();
    loadTheme();
    loadGistSettings();
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
function renderProjects(filterFn) {
    const grid = document.getElementById('novelGrid');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('projectCount');

    let filteredProjects = filterFn ? filterFn(projects) : projects;
    count.textContent = `(${filteredProjects.length})`;

    if (filteredProjects.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    grid.innerHTML = filteredProjects.map((project, index) => {
        const originalIndex = projects.indexOf(project);
        return `
        <div class="novel-card" onclick="openProject(${originalIndex})">
            <div class="novel-card-header">
                <span class="novel-type">${getTypeName(project.type)}</span>
                <span class="novel-menu" onclick="event.stopPropagation(); showNovelMenu(${originalIndex})">⋮</span>
            </div>
            <h3 class="novel-title">${project.title}</h3>
            <p class="novel-desc">${project.description || '暂无简介'}</p>
            <div class="novel-meta">
                <span>📖 ${project.chapters.length}章</span>
                <span>✍️ ${getProjectWordCount(project)}字</span>
            </div>
        </div>
    `}).join('');
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

let currentFilter = { type: null, search: '', timeSort: 'desc' };
let currentView = 'grid';

function toggleSearch() {
    const searchBar = document.getElementById('searchBar');
    const filterPanel = document.getElementById('filterPanel');
    if (searchBar.style.display === 'none') {
        searchBar.style.display = 'block';
        filterPanel.style.display = 'none';
        document.getElementById('searchInput').focus();
    } else {
        searchBar.style.display = 'none';
        currentFilter.search = '';
        filterProjects();
    }
}

function toggleFilter(filterType) {
    const searchBar = document.getElementById('searchBar');
    const filterPanel = document.getElementById('filterPanel');

    if (filterPanel.style.display === 'none' || currentFilter.type !== filterType) {
        filterPanel.style.display = 'block';
        searchBar.style.display = 'none';
        renderFilterPanel(filterType);
    } else {
        filterPanel.style.display = 'none';
        currentFilter.type = null;
        filterProjects();
    }
}

function renderFilterPanel(filterType) {
    currentFilter.type = filterType;
    const content = document.getElementById('filterContent');

    if (filterType === 'type') {
        const types = [
            { value: '', label: '全部' },
            { value: 'romance', label: '言情' },
            { value: 'fantasy', label: '玄幻' },
            { value: 'mystery', label: '悬疑' },
            { value: 'scifi', label: '科幻' },
            { value: 'wuxia', label: '武侠' },
            { value: 'urban', label: '都市' },
            { value: 'historical', label: '历史' },
            { value: 'horror', label: '恐怖' }
        ];
        content.innerHTML = '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
            types.map(t => `<button class="toolbar-btn ${currentFilter.type === t.value ? 'active' : ''}" onclick="applyTypeFilter('${t.value}')">${t.label}</button>`).join('') +
            '</div>';
    } else if (filterType === 'time') {
        content.innerHTML = '<div style="display:flex;gap:0.5rem;">' +
            `<button class="toolbar-btn ${currentFilter.timeSort === 'desc' ? 'active' : ''}" onclick="applyTimeFilter('desc')">最新优先</button>` +
            `<button class="toolbar-btn ${currentFilter.timeSort === 'asc' ? 'active' : ''}" onclick="applyTimeFilter('asc')">最旧优先</button>` +
            '</div>';
    }
}

function applyTypeFilter(type) {
    currentFilter.type = type;
    filterProjects();
}

function applyTimeFilter(order) {
    currentFilter.timeSort = order;
    filterProjects();
}

function filterProjects() {
    renderProjects((projs) => {
        let filtered = [...projs];

        if (currentFilter.search) {
            const q = currentFilter.search.toLowerCase();
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(q) ||
                (p.description && p.description.toLowerCase().includes(q))
            );
        }

        if (currentFilter.type) {
            filtered = filtered.filter(p => p.type === currentFilter.type);
        }

        filtered.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return currentFilter.timeSort === 'desc' ? dateB - dateA : dateA - dateB;
        });

        return filtered;
    });
}

function setView(view) {
    currentView = view;
    document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
    const grid = document.getElementById('novelGrid');
    if (view === 'list') {
        grid.style.gridTemplateColumns = '1fr';
    } else {
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
    }
}

document.getElementById('searchInput')?.addEventListener('input', function() {
    currentFilter.search = this.value;
    filterProjects();
});

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
    document.getElementById('githubTokenInput').value = gistSettings.token || '';
    onApiProviderChange();
    updateGistStatus();
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

// ==================== Gist Sync ====================
function loadGistSettings() {
    const saved = localStorage.getItem('moyun_gist_settings');
    if (saved) {
        try {
            gistSettings = JSON.parse(saved);
        } catch (e) {}
    }
    if (gistSettings.token) {
        document.getElementById('githubTokenInput').value = gistSettings.token;
    }
    updateGistStatus();
}

function saveGistSettings() {
    localStorage.setItem('moyun_gist_settings', JSON.stringify(gistSettings));
}

function updateGistStatus() {
    const statusEl = document.getElementById('gistStatus');
    const statusText = document.getElementById('gistStatusText');
    const syncBtn = document.getElementById('syncBtn');
    const loadBtn = document.getElementById('loadFromGistBtn');

    if (gistSettings.token) {
        statusEl.style.display = 'block';
        syncBtn.disabled = false;
        loadBtn.disabled = false;
        if (gistSettings.gistId) {
            statusText.textContent = `✅ 已连接 Gist (ID: ${gistSettings.gistId.slice(0, 8)}...) 上次同步: ${gistSettings.lastSync || '从未'}`;
        } else {
            statusText.textContent = '⚠️ Token 已设置，点击"连接/更新 Gist"创建或更新 Gist';
        }
    } else {
        statusEl.style.display = 'none';
        syncBtn.disabled = true;
        loadBtn.disabled = true;
    }
}

async function connectGist() {
    const token = document.getElementById('githubTokenInput').value.trim();
    if (!token) {
        alert('请输入 GitHub Token');
        return;
    }

    gistSettings.token = token;
    saveGistSettings();

    try {
        const data = getSyncData();
        const gistData = JSON.stringify(data, null, 2);

        if (gistSettings.gistId) {
            // Update existing gist
            const response = await fetch(`https://api.github.com/gists/${gistSettings.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: '墨韵AI 数据同步',
                    files: {
                        [GIST_FILENAME]: { content: gistData }
                    }
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`更新失败 (${response.status}): ${err}`);
            }

            gistSettings.lastSync = new Date().toLocaleString('zh-CN');
            saveGistSettings();
            updateGistStatus();
            alert('✅ Gist 已更新！');

        } else {
            // Create new gist
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: '墨韵AI 数据同步',
                    public: false,
                    files: {
                        [GIST_FILENAME]: { content: gistData }
                    }
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`创建失败 (${response.status}): ${err}`);
            }

            const result = await response.json();
            gistSettings.gistId = result.id;
            gistSettings.lastSync = new Date().toLocaleString('zh-CN');
            saveGistSettings();
            updateGistStatus();
            alert('✅ Gist 创建成功！\n\nGist ID: ' + gistSettings.gistId + '\n请妥善保存此 ID，以便在其他设备上恢复数据。');
        }
    } catch (error) {
        alert('❌ Gist 操作失败：' + error.message);
    }
}

function getSyncData() {
    return {
        projects: projects,
        aiSettings: aiSettings,
        userTemplates: JSON.parse(localStorage.getItem('moyun_user_templates') || '[]'),
        userName: localStorage.getItem('moyun_user_name') || 'yyy',
        theme: localStorage.getItem('moyun_theme') || 'dark',
        syncTime: new Date().toISOString()
    };
}

async function syncToGist() {
    if (!gistSettings.token || !gistSettings.gistId) {
        alert('请先点击"连接/更新 Gist"');
        return;
    }

    const syncBtn = document.getElementById('syncBtn');
    const originalText = syncBtn.textContent;
    syncBtn.textContent = '同步中...';
    syncBtn.disabled = true;

    try {
        const data = getSyncData();
        const response = await fetch(`https://api.github.com/gists/${gistSettings.gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${gistSettings.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: '墨韵AI 数据同步',
                files: {
                    [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) }
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`同步失败 (${response.status}): ${err}`);
        }

        gistSettings.lastSync = new Date().toLocaleString('zh-CN');
        saveGistSettings();
        updateGistStatus();
        alert('✅ 数据已同步到 Gist！');
    } catch (error) {
        alert('❌ 同步失败：' + error.message);
    } finally {
        syncBtn.textContent = originalText;
        syncBtn.disabled = false;
    }
}

async function loadFromGist() {
    if (!gistSettings.token) {
        alert('请先输入 Token 并点击"连接/更新 Gist"');
        return;
    }

    const loadBtn = document.getElementById('loadFromGistBtn');
    const originalText = loadBtn.textContent;
    loadBtn.textContent = '加载中...';
    loadBtn.disabled = true;

    try {
        let gistId = gistSettings.gistId;

        if (!gistId) {
            gistId = prompt('请输入 Gist ID（首次使用后会自动保存）：');
            if (!gistId) {
                loadBtn.textContent = originalText;
                loadBtn.disabled = false;
                return;
            }
            gistSettings.gistId = gistId;
            saveGistSettings();
        }

        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${gistSettings.token}`,
            }
        });

        if (!response.ok) throw new Error('加载失败，请检查 Gist ID 和 Token');

        const result = await response.json();
        const file = result.files[GIST_FILENAME];

        if (!file) throw new Error('Gist 中未找到数据文件');

        const data = JSON.parse(file.content);

        // Restore data
        if (data.projects) {
            projects = data.projects;
            localStorage.setItem('moyun_projects', JSON.stringify(projects));
        }
        if (data.aiSettings) {
            aiSettings = data.aiSettings;
            localStorage.setItem('moyun_ai_settings', JSON.stringify(aiSettings));
        }
        if (data.userTemplates) {
            localStorage.setItem('moyun_user_templates', JSON.stringify(data.userTemplates));
        }
        if (data.userName) {
            localStorage.setItem('moyun_user_name', data.userName);
        }
        if (data.theme) {
            localStorage.setItem('moyun_theme', data.theme);
        }

        // Reinitialize
        loadProjects();
        loadSettings();
        loadTheme();
        updateGreeting();
        renderProjects();
        updateStats();
        updateAIStatus();

        gistSettings.lastSync = new Date().toLocaleString('zh-CN');
        saveGistSettings();
        updateGistStatus();

        alert('✅ 数据加载成功！');
    } catch (error) {
        alert('❌ 加载失败：' + error.message);
    } finally {
        loadBtn.textContent = originalText;
        loadBtn.disabled = false;
    }
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
        const profile = inferApiProfile(baseUrl, model);
        const endpoint = buildApiEndpoint(baseUrl, provider, model);
        const headers = buildApiHeaders(provider, apiKey);
        const body = buildApiBody(provider, model, '你是一个助手。', [{ role: 'user', content: '你好' }], 0.7);

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
const contentEditor = document.getElementById('contentEditor');
if (contentEditor) {
    contentEditor.addEventListener('input', function() {
        if (currentProjectIndex !== -1 && currentChapterIndex !== -1) {
            projects[currentProjectIndex].chapters[currentChapterIndex].content = this.value;
            saveProjects();
            updateWordCount();
        }
    });
}

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

// ==================== API Profile Detection ====================
function inferApiProfile(baseUrl, model) {
    const normalizedBaseUrl = String(baseUrl || '').trim().toLowerCase();
    const normalizedModel = String(model || '').trim().toLowerCase();

    // DeepSeek
    if ((/api\.deepseek\.com/i.test(normalizedBaseUrl) || normalizedModel.startsWith('deepseek-'))) {
        return 'deepseek';
    }
    // MiniMax (用户反馈的 API)
    if (/minimax|api\.minimax\.com/i.test(normalizedBaseUrl)) {
        return 'minimax';
    }
    // Anthropic
    if (/api\.anthropic\.com/i.test(normalizedBaseUrl) || /claude/i.test(normalizedModel)) {
        return 'anthropic';
    }
    // 通用的 OpenAI 兼容格式
    return 'openai';
}

function buildApiEndpoint(baseUrl, provider, model) {
    const normalized = (baseUrl || '').replace(/\/+$/, '');

    if (!normalized) {
        // 使用默认值
        if (provider === 'anthropic') return 'https://api.anthropic.com/v1/messages';
        if (provider === 'openai' || provider === 'deepseek' || provider === 'minimax') {
            return 'https://api.openai.com/v1/chat/completions';
        }
        return '';
    }

    // 如果已经是完整 URL（含路径），直接返回
    if (normalized.includes('/v1/') || normalized.includes('/chat/')) {
        return normalized;
    }

    // 根据 provider 追加合适的路径
    if (provider === 'anthropic') {
        if (/\/v\d+$/i.test(normalized)) return `${normalized}/messages`;
        return `${normalized}/v1/messages`;
    }

    // OpenAI / DeepSeek / MiniMax 都用 chat completions
    if (/\/v\d+$/i.test(normalized)) return `${normalized}/chat/completions`;
    return `${normalized}/v1/chat/completions`;
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

function buildApiBody(provider, model, systemPrompt, messages, temperature) {
    const modelName = model || (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4');

    if (provider === 'anthropic') {
        return {
            model: modelName,
            system: systemPrompt,
            messages: messages,
            stream: true
        };
    }

    // OpenAI / DeepSeek / MiniMax
    return {
        model: modelName,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
        temperature: temperature
    };
}

// ==================== API Call ====================
async function callAI(messages, systemPrompt) {
    if (aiSettings.provider === 'local') {
        return callLocalAI(messages, systemPrompt);
    }

    const profile = inferApiProfile(aiSettings.baseUrl, aiSettings.model);
    const endpoint = buildApiEndpoint(aiSettings.baseUrl, aiSettings.provider, aiSettings.model);
    const headers = buildApiHeaders(aiSettings.provider, aiSettings.apiKey);
    const body = buildApiBody(aiSettings.provider, aiSettings.model, systemPrompt, messages, aiSettings.temperature);

    if (!endpoint) {
        throw new Error('未配置 API 端点');
    }

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

        if (aiSettings.provider === 'anthropic') {
            return data.content?.[0]?.text || '';
        } else {
            // OpenAI / DeepSeek / MiniMax
            return data.choices?.[0]?.message?.content || '';
        }
    } catch (error) {
        if (error.message.includes('fetch') || error.message.includes('CORS')) {
            throw new Error('网络请求失败，可能是 CORS 跨域问题。请确认 API 端点支持跨域访问。');
        }
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