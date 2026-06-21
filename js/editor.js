// ==================== MoYun AI - 编辑页逻辑 ====================

// ==================== 工具函数 ====================
// 安全的 localStorage 读取 + JSON.parse，损坏的存储会回到空数组/默认值，不会崩页面
function safeLoadProjects() {
    try {
        const saved = localStorage.getItem('moyun_projects');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error('加载项目失败（localStorage 可能损坏）:', e);
        return [];
    }
}

function safeLoadAISettings() {
    try {
        const saved = localStorage.getItem('moyun_ai_settings');
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.error('加载 AI 设置失败:', e);
        return null;
    }
}

// ==================== 全局状态 ====================
let aiSettings = {
    provider: 'anthropic',
    apiKey: '',
    baseUrl: '',
    model: '',
    maxTokens: 2048,
    temperature: 0.7
};

// URL 参数
const urlParams = new URLSearchParams(window.location.search);
const parsedProjectIndex = parseInt(urlParams.get('project'), 10);
const parsedChapterIndex = parseInt(urlParams.get('chapter'), 10);
const projectIndex = Number.isNaN(parsedProjectIndex) ? -1 : parsedProjectIndex;
let chapterIndex = Number.isNaN(parsedChapterIndex) ? 0 : parsedChapterIndex;
let currentEditingCharacter = null;
let currentEditingTimeline = null;

// ==================== Initialize ====================
function init() {
    // Auth 委托到 NovelCommon（如果可用），否则使用本地后备
    if (typeof NovelCommon !== 'undefined' && NovelCommon.requireAuth) {
        if (!NovelCommon.requireAuth()) return;
        if (NovelCommon.loadAISettings) NovelCommon.loadAISettings(aiSettings);
        if (NovelCommon.loadTheme) NovelCommon.loadTheme();
    } else {
        loadSettings();
        loadTheme();
    }
    setupAuthDisplay();
    setupAuthActions();
    loadProject();
    updateAIStatus();
    setupEventListeners();
}

function setupEventListeners() {
    const contentEditor = document.getElementById('contentEditor');
    if (contentEditor) {
        contentEditor.addEventListener('input', function() {
            saveCurrentChapterLocal();
            updateWordCount();
        });
    }

    const temperatureInput = document.getElementById('temperatureInput');
    if (temperatureInput) {
        temperatureInput.addEventListener('input', function() {
            const valueEl = document.getElementById('temperatureValue');
            if (valueEl) valueEl.textContent = this.value;
        });
    }
}

// ==================== 设置加载（NovelCommon 委托 + 本地后备）====================
function loadSettings() {
    if (typeof NovelCommon !== 'undefined' && NovelCommon.loadAISettings) {
        NovelCommon.loadAISettings(aiSettings);
        return;
    }
    const saved = localStorage.getItem('moyun_ai_settings');
    if (saved) {
        try {
            aiSettings = JSON.parse(saved);
        } catch (e) {
            console.error('加载设置失败:', e);
        }
    }
}

function loadTheme() {
    if (typeof NovelCommon !== 'undefined' && NovelCommon.loadTheme) {
        NovelCommon.loadTheme();
        const sel = document.querySelector('.theme-select');
        if (sel && NovelCommon.getTheme) sel.value = NovelCommon.getTheme();
        return;
    }
    const saved = localStorage.getItem('moyun_theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        const select = document.querySelector('.theme-select');
        if (select) select.value = saved;
    }
}

function toggleTheme() {
    const theme = document.querySelector('.theme-select').value;
    if (typeof NovelCommon !== 'undefined' && NovelCommon.setTheme) {
        NovelCommon.setTheme(theme);
    } else {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('moyun_theme', theme);
    }
}

// auth 委托（包装 NovelCommon）
function requireAuth() {
    if (typeof NovelCommon !== 'undefined' && NovelCommon.requireAuth) {
        return NovelCommon.requireAuth();
    }
    return true;
}

function handleLogout() {
    if (typeof NovelCommon !== 'undefined' && NovelCommon.handleLogout) {
        NovelCommon.handleLogout();
    }
}

// editor.js 独有的设置显示（user name/avatar）
function setupAuthDisplay() {
    // 优先使用 NovelCommon 的实现
    if (typeof NovelCommon !== 'undefined' && NovelCommon.setupAuthDisplay) {
        NovelCommon.setupAuthDisplay();
        return;
    }
    const name = localStorage.getItem('moyun_user_name') || 'yyy';
    const userNameEl = document.querySelector('.user-name');
    const avatarEl = document.querySelector('.user-avatar');
    if (userNameEl) userNameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
}

// user-menu 委托
function setupAuthActions() {
    if (typeof NovelCommon !== 'undefined' && NovelCommon.setupAuthActions) {
        NovelCommon.setupAuthActions();
    }
}

// ==================== 项目加载 ====================
function loadProject() {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) {
        showToast('没有找到项目', 'error');
        window.location.href = 'index.html';
        return;
    }

    const projects = safeLoadProjects();
    if (projectIndex < 0 || projectIndex >= projects.length) {
        showToast('项目不存在', 'error');
        window.location.href = 'index.html';
        return;
    }

    const project = projects[projectIndex];

    // 初始化项目数据结构
    if (!project.characters) project.characters = [];
    if (!project.worldSetting) project.worldSetting = {};
    if (!project.timeline) project.timeline = [];

    // 渲染所有侧边栏内容
    renderChapters(project, chapterIndex);
    renderCharacters(project);
    renderWorldSetting(project);
    renderTimeline(project);

    if (chapterIndex >= 0 && chapterIndex < project.chapters.length) {
        selectChapter(project, chapterIndex);
    } else if (project.chapters && project.chapters.length > 0) {
        selectChapter(project, 0);
    }
}

// ==================== 侧边栏切换 ====================
function switchSidebarTab(tabName) {
    // 切换tab按钮状态
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // 切换内容显示
    document.querySelectorAll('.sidebar-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName + 'Tab');
    });
}

// ==================== 章节管理 ====================
function renderChapters(project, activeIndex) {
    const list = document.getElementById('chapterList');
    if (!list) return;

    const chapters = project.chapters || [];

    if (chapters.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">暂无章节</p>';
        return;
    }

    list.innerHTML = chapters.map((ch, i) => `
        <div class="chapter-item ${i === activeIndex ? 'active' : ''}" onclick="selectChapterByIndex(${i})">
            <span>第${i + 1}章</span>
            <span class="chapter-title">${escapeHtml(ch.title || '')}</span>
        </div>
    `).join('');
}

function selectChapterByIndex(index) {
    chapterIndex = index;
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();
    const project = projects[projectIndex];
    const chapter = project.chapters[index];

    const editorTitle = document.getElementById('editorTitle');
    const contentEditor = document.getElementById('contentEditor');
    if (editorTitle) editorTitle.textContent = `第${index + 1}章 · ${chapter.title}`;
    if (contentEditor) contentEditor.value = chapter.content || '';

    const newUrl = new URL(window.location);
    newUrl.searchParams.set('chapter', index);
    window.history.pushState({}, '', newUrl);

    localStorage.setItem('moyun_current_project', projectIndex);
    localStorage.setItem('moyun_current_chapter', index);

    renderChapters(project, index);
    updateWordCount();
}

function selectChapter(project, index) {
    chapterIndex = index;
    const chapter = project.chapters[index];
    const editorTitle = document.getElementById('editorTitle');
    const contentEditor = document.getElementById('contentEditor');

    if (editorTitle) editorTitle.textContent = `第${index + 1}章 · ${chapter.title}`;
    if (contentEditor) contentEditor.value = chapter.content || '';
    updateWordCount();
}

function openAddChapterModal() {
    const modal = document.getElementById('addChapterModal');
    if (!modal) return;

    modal.classList.add('show');
    const titleInput = document.getElementById('chapterTitleInput');
    const descInput = document.getElementById('chapterDescInput');
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
}

function closeAddChapterModal() {
    const modal = document.getElementById('addChapterModal');
    if (modal) modal.classList.remove('show');
}

function addChapter() {
    const titleInput = document.getElementById('chapterTitleInput');
    const descInput = document.getElementById('chapterDescInput');

    const title = titleInput?.value.trim();
    if (!title) {
        showToast('请输入章节标题', 'error');
        return;
    }

    const summary = descInput?.value.trim() || '';

    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();

    if (!projects[projectIndex].chapters) {
        projects[projectIndex].chapters = [];
    }

    projects[projectIndex].chapters.push({
        title,
        summary,
        content: ''
    });

    localStorage.setItem('moyun_projects', JSON.stringify(projects));

    const newIndex = projects[projectIndex].chapters.length - 1;
    closeAddChapterModal();

    const newUrl = new URL(window.location);
    newUrl.searchParams.set('chapter', newIndex);
    window.location.href = newUrl.toString();
}

// ==================== 角色管理 ====================
function renderCharacters(project) {
    const list = document.getElementById('characterList');
    if (!list) return;

    const characters = project.characters || [];

    if (characters.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">暂无角色</p>';
        return;
    }

    list.innerHTML = characters.map((char, i) => `
        <div class="character-item" onclick="editCharacter(${i})">
            <div class="character-name">${escapeHtml(char.name || '未命名')}</div>
            <div class="character-role">${escapeHtml(char.role || '未知身份')}</div>
            <div class="character-desc">${escapeHtml(char.description || '暂无描述')}</div>
        </div>
    `).join('');
}

function openAddCharacterModal() {
    const modal = document.getElementById('addCharacterModal');
    if (!modal) return;

    modal.classList.add('show');
    const nameInput = document.getElementById('characterNameInput');
    const roleInput = document.getElementById('characterRoleInput');
    const descInput = document.getElementById('characterDescInput');
    if (nameInput) nameInput.value = '';
    if (roleInput) roleInput.value = '';
    if (descInput) descInput.value = '';
    currentEditingCharacter = null;
}

function closeAddCharacterModal() {
    const modal = document.getElementById('addCharacterModal');
    if (modal) modal.classList.remove('show');
}

function addCharacter() {
    const name = document.getElementById('characterNameInput')?.value.trim();
    const role = document.getElementById('characterRoleInput')?.value.trim();
    const description = document.getElementById('characterDescInput')?.value.trim();

    if (!name) {
        showToast('请输入角色名称', 'error');
        return;
    }

    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();

    if (!projects[projectIndex].characters) {
        projects[projectIndex].characters = [];
    }

    projects[projectIndex].characters.push({
        name,
        role: role || '配角',
        description: description || ''
    });

    localStorage.setItem('moyun_projects', JSON.stringify(projects));

    closeAddCharacterModal();
    renderCharacters(projects[projectIndex]);
    showToast('角色已添加', 'success');

    // 更新首页统计
    updateParentStats();
}

function editCharacter(index) {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();
    const character = projects[projectIndex].characters[index];
    if (!character) return;

    currentEditingCharacter = index;

    const modal = document.getElementById('editCharacterModal');
    if (!modal) return;

    modal.classList.add('show');
    document.getElementById('editCharacterNameInput').value = character.name || '';
    document.getElementById('editCharacterRoleInput').value = character.role || '';
    document.getElementById('editCharacterDescInput').value = character.description || '';
}

function closeEditCharacterModal() {
    const modal = document.getElementById('editCharacterModal');
    if (modal) modal.classList.remove('show');
    currentEditingCharacter = null;
}

function saveCharacter() {
    if (currentEditingCharacter === null) return;

    const name = document.getElementById('editCharacterNameInput')?.value.trim();
    const role = document.getElementById('editCharacterRoleInput')?.value.trim();
    const description = document.getElementById('editCharacterDescInput')?.value.trim();

    if (!name) {
        showToast('请输入角色名称', 'error');
        return;
    }

    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();
    projects[projectIndex].characters[currentEditingCharacter] = {
        name,
        role: role || '配角',
        description: description || ''
    };

    localStorage.setItem('moyun_projects', JSON.stringify(projects));

    closeEditCharacterModal();
    renderCharacters(projects[projectIndex]);
    showToast('角色已保存', 'success');
}

// ==================== 世界观设定 ====================
function renderWorldSetting(project) {
    const world = project.worldSetting || {};

    const fields = ['worldEra', 'worldSociety', 'worldGeography', 'worldRules'];
    const values = [world.era, world.society, world.geography, world.rules];

    fields.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.value = values[i] || '';
    });
}

function saveWorldSetting() {
    const era = document.getElementById('worldEra')?.value.trim();
    const society = document.getElementById('worldSociety')?.value.trim();
    const geography = document.getElementById('worldGeography')?.value.trim();
    const rules = document.getElementById('worldRules')?.value.trim();

    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();
    projects[projectIndex].worldSetting = {
        era: era || '',
        society: society || '',
        geography: geography || '',
        rules: rules || ''
    };

    localStorage.setItem('moyun_projects', JSON.stringify(projects));
    showToast('世界观已保存', 'success');
}

// ==================== 时间线 ====================
function renderTimeline(project) {
    const container = document.getElementById('timelineEvents');
    if (!container) return;

    const events = project.timeline || [];

    if (events.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">暂无时间节点</p>';
        return;
    }

    container.innerHTML = events.map((event, i) => `
        <div class="timeline-event" onclick="editTimelineEvent(${i})">
            <div class="timeline-event-title">${escapeHtml(event.title || '未命名')}</div>
            <div class="timeline-event-time">${escapeHtml(event.time || '')}</div>
            <div class="timeline-event-desc">${escapeHtml(event.description || '')}</div>
        </div>
    `).join('');
}

function openAddTimelineEventModal() {
    const modal = document.getElementById('addTimelineEventModal');
    if (!modal) return;

    modal.classList.add('show');
    document.getElementById('eventTitleInput').value = '';
    document.getElementById('eventTimeInput').value = '';
    document.getElementById('eventDescInput').value = '';
    currentEditingCharacter = null;
}

function closeAddTimelineEventModal() {
    const modal = document.getElementById('addTimelineEventModal');
    if (modal) modal.classList.remove('show');

    // 无论保存/取消，关闭时都重置按钮回 "添加" 状态
    // 防止 editTimelineEvent 修改了 confirmBtn.onclick 后被下次 "新增" 误用
    const confirmBtn = modal?.querySelector('.modal-btn.confirm');
    if (confirmBtn) {
        confirmBtn.textContent = '添加';
        confirmBtn.onclick = addTimelineEvent;
    }
    currentEditingTimeline = null;
}

function addTimelineEvent() {
    const title = document.getElementById('eventTitleInput')?.value.trim();
    const time = document.getElementById('eventTimeInput')?.value.trim();
    const description = document.getElementById('eventDescInput')?.value.trim();

    if (!title) {
        showToast('请输入事件名称', 'error');
        return;
    }

    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();

    if (!projects[projectIndex].timeline) {
        projects[projectIndex].timeline = [];
    }

    projects[projectIndex].timeline.push({
        title,
        time: time || '',
        description: description || ''
    });

    localStorage.setItem('moyun_projects', JSON.stringify(projects));

    closeAddTimelineEventModal();
    renderTimeline(projects[projectIndex]);
    showToast('时间节点已添加', 'success');
}

function editTimelineEvent(index) {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();
    const event = projects[projectIndex].timeline[index];
    if (!event) return;

    // 复用添加模态框但修改标题
    const modal = document.getElementById('addTimelineEventModal');
    if (!modal) return;

    modal.classList.add('show');
    document.getElementById('eventTitleInput').value = event.title || '';
    document.getElementById('eventTimeInput').value = event.time || '';
    document.getElementById('eventDescInput').value = event.description || '';

    // 使用独立变量，不要污染 currentEditingCharacter
    currentEditingTimeline = index;

    // 修改确认按钮（关闭时由 closeAddTimelineEventModal 恢复）
    const confirmBtn = modal.querySelector('.modal-btn.confirm');
    if (confirmBtn) {
        confirmBtn.textContent = '保存';
        confirmBtn.onclick = () => saveTimelineEvent(index);
    }
}

function saveTimelineEvent(index) {
    const title = document.getElementById('eventTitleInput')?.value.trim();
    const time = document.getElementById('eventTimeInput')?.value.trim();
    const description = document.getElementById('eventDescInput')?.value.trim();

    if (!title) {
        showToast('请输入事件名称', 'error');
        return;
    }

    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();
    projects[projectIndex].timeline[index] = {
        title,
        time: time || '',
        description: description || ''
    };

    localStorage.setItem('moyun_projects', JSON.stringify(projects));

    closeAddTimelineEventModal();
    renderTimeline(projects[projectIndex]);
    showToast('时间节点已保存', 'success');
    // 按钮恢复由 closeAddTimelineEventModal 统一处理
}

// ==================== 阅读模式 ====================
function openReadingMode() {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();
    const project = projects[projectIndex];
    const chapter = project.chapters[chapterIndex];

    if (!chapter || !chapter.content) {
        showToast('当前章节暂无内容', 'error');
        return;
    }

    const modal = document.getElementById('readingModeModal');
    if (!modal) return;

    document.getElementById('readingModeTitle').textContent = `第${chapterIndex + 1}章 · ${chapter.title}`;
    document.getElementById('readingModeBody').textContent = chapter.content;

    modal.classList.add('show');
}

function closeReadingMode() {
    const modal = document.getElementById('readingModeModal');
    if (modal) modal.classList.remove('show');
}

// ==================== 内容编辑 ====================
function saveCurrentChapterLocal() {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();
    const chapter = projects[projectIndex]?.chapters?.[chapterIndex];
    if (chapter) {
        const contentEditor = document.getElementById('contentEditor');
        if (contentEditor) {
            chapter.content = contentEditor.value;
            localStorage.setItem('moyun_projects', JSON.stringify(projects));
        }
    }
}

function saveCurrentChapter() {
    saveCurrentChapterLocal();
    showToast('保存成功！', 'success');
}

function updateWordCount() {
    const contentEditor = document.getElementById('contentEditor');
    const countEl = document.getElementById('currentWordCount');
    if (contentEditor && countEl) {
        countEl.textContent = `${contentEditor.value.length} 字`;
    }
}

function goBack() {
    window.location.href = 'index.html';
}

// ==================== 导出 ====================
function exportCurrentProject() {
    const saved = localStorage.getItem('moyun_projects');
    if (!saved) return;

    const projects = safeLoadProjects();
    const project = projects[projectIndex];

    if (!project.chapters || project.chapters.length === 0) {
        showToast('没有可导出的内容', 'error');
        return;
    }

    let content = `# ${project.title}\n\n`;
    content += `> **类型**: ${getTypeName(project.type)}\n\n`;
    content += `${project.description || ''}\n\n`;

    // 角色信息
    if (project.characters && project.characters.length > 0) {
        content += `---\n\n## 角色\n\n`;
        project.characters.forEach(char => {
            content += `- **${char.name}** (${char.role}): ${char.description || '暂无描述'}\n`;
        });
        content += '\n';
    }

    // 世界观设定
    if (project.worldSetting) {
        const ws = project.worldSetting;
        if (ws.era || ws.society || ws.geography || ws.rules) {
            content += `---\n\n## 世界观设定\n\n`;
            if (ws.era) content += `- **时代背景**: ${ws.era}\n`;
            if (ws.society) content += `- **社会环境**: ${ws.society}\n`;
            if (ws.geography) content += `- **地理设定**: ${ws.geography}\n`;
            if (ws.rules) content += `- **特殊规则**: ${ws.rules}\n`;
            content += '\n';
        }
    }

    // 时间线
    if (project.timeline && project.timeline.length > 0) {
        content += `---\n\n## 时间线\n\n`;
        project.timeline.forEach((event, i) => {
            content += `### ${i + 1}. ${event.title}\n`;
            if (event.time) content += `> ${event.time}\n`;
            if (event.description) content += `${event.description}\n`;
        });
        content += '\n';
    }

    // 章节内容
    content += `---\n\n## 章节内容\n\n`;
    project.chapters.forEach((chapter, i) => {
        content += `### 第${i + 1}章 · ${chapter.title}\n\n`;
        if (chapter.summary) {
            content += `> ${chapter.summary}\n\n`;
        }
        content += `${chapter.content || '（待撰写）'}\n\n---\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

function getTypeName(type) {
    // 优先使用 NovelCommon 的实现
    if (typeof NovelCommon !== 'undefined' && NovelCommon.getTypeName) {
        return NovelCommon.getTypeName(type);
    }
    const types = {
        romance: '言情', fantasy: '玄幻', xianxia: '仙侠',
        mystery: '悬疑', scifi: '科幻', wuxia: '武侠',
        urban: '都市', historical: '历史', horror: '恐怖',
        game: '游戏', apocalypse: '末世'
    };
    return types[type] || '其他';
}

function updateParentStats() {
    // 更新父窗口的统计数据（如果存在）
    if (window.opener) {
        try {
            const saved = localStorage.getItem('moyun_projects');
            if (saved) {
                const projects = safeLoadProjects();
                const totalChars = projects.reduce((sum, p) => sum + (p.characters?.length || 0), 0);
                window.opener.postMessage({ type: 'statsUpdate', charCount: totalChars }, '*');
            }
        } catch (e) {}
    }
}

// ==================== Toast 通知 ====================
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== 工具函数 ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// ==================== 设置模态框 ====================
function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    modal.classList.add('show');
    const providerEl = document.getElementById('apiProvider');
    const apiKeyEl = document.getElementById('apiKeyInput');
    const baseUrlEl = document.getElementById('baseUrlInput');
    const modelEl = document.getElementById('modelInput');
    if (providerEl) providerEl.value = aiSettings.provider;
    if (apiKeyEl) apiKeyEl.value = aiSettings.apiKey;
    if (baseUrlEl) baseUrlEl.value = aiSettings.baseUrl;
    if (modelEl) modelEl.value = aiSettings.model;
    const maxTokensInput = document.getElementById('maxTokensInput');
    if (maxTokensInput) maxTokensInput.value = aiSettings.maxTokens;
    const temperatureInput = document.getElementById('temperatureInput');
    if (temperatureInput) temperatureInput.value = aiSettings.temperature;
    const temperatureValue = document.getElementById('temperatureValue');
    if (temperatureValue) temperatureValue.textContent = aiSettings.temperature;
    onApiProviderChange();
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('show');
}

function onApiProviderChange() {
    const provider = document.getElementById('apiProvider').value;
    ['apiKeyGroup', 'baseUrlGroup', 'modelGroup'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = provider === 'local' ? 'none' : 'block';
    });
}

function saveSettings() {
    aiSettings.provider = document.getElementById('apiProvider').value;
    aiSettings.apiKey = document.getElementById('apiKeyInput').value;
    aiSettings.baseUrl = document.getElementById('baseUrlInput').value;
    aiSettings.model = document.getElementById('modelInput').value;
    const maxTokensInput = document.getElementById('maxTokensInput');
    if (maxTokensInput) aiSettings.maxTokens = parseInt(maxTokensInput.value);
    const temperatureInput = document.getElementById('temperatureInput');
    if (temperatureInput) aiSettings.temperature = parseFloat(temperatureInput.value);

    localStorage.setItem('moyun_ai_settings', JSON.stringify(aiSettings));
    closeSettingsModal();
    updateAIStatus();
    showToast('设置已保存！', 'success');
}

function updateAIStatus() {
    const status = document.getElementById('aiStatus');
    if (!status) return;

    if (aiSettings.provider === 'local') {
        status.textContent = '📍 本地模式';
    } else if (aiSettings.apiKey) {
        status.textContent = '✅ ' + (aiSettings.model || aiSettings.provider.toUpperCase());
    } else {
        status.textContent = '⚠️ 未配置API';
    }
}

// ==================== AI 提示词（11 种类型完整支持）====================
function getThemePrompt(themeType) {
    // 优先使用 NovelCommon 的实现（如果存在）
    if (typeof NovelCommon !== 'undefined' && NovelCommon.getThemePrompt) {
        return NovelCommon.getThemePrompt(themeType);
    }
    const prompts = {
        romance: '你是一位专业的言情小说写作助手，擅长细腻的情感描写和人物心理刻画。请用中文回答。',
        fantasy: '你是一位专业的玄幻小说写作助手，擅长构建奇幻世界观和力量体系。请用中文回答。',
        xianxia: '你是一位专业的仙侠小说写作助手，擅长描绘修仙之路和仙魔之争。请用中文回答。',
        mystery: '你是一位专业的悬疑小说写作助手，擅长铺设悬念和设计推理逻辑。请用中文回答。',
        scifi: '你是一位专业的科幻小说写作助手，擅长设计科技设定和未来场景。请用中文回答。',
        wuxia: '你是一位专业的武侠小说写作助手，擅长描绘江湖规矩和武功招式。请用中文回答。',
        urban: '你是一位专业的都市小说写作助手，擅长描绘现代都市生活。请用中文回答。',
        historical: '你是一位专业的历史小说写作助手，擅长还原时代背景和人物风貌。请用中文回答。',
        horror: '你是一位专业的恐怖小说写作助手，擅长营造恐怖氛围和心理恐惧。请用中文回答。',
        game: '你是一位专业的游戏小说写作助手，擅长描绘游戏世界和副本冒险。请用中文回答。',
        apocalypse: '你是一位专业的末世小说写作助手，擅长描绘末日生存和人性的挣扎。请用中文回答。'
    };
    return prompts[themeType] || prompts.romance;
}

// ==================== API 调用（本地完整实现 + NovelLLMClient 委托后备）====================
const API_PRESETS = {
    anthropic: { name: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com/v1', authHeader: 'x-api-key' },
    openai: { name: 'OpenAI (GPT)', baseUrl: 'https://api.openai.com/v1', authHeader: 'bearer' },
    deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', authHeader: 'bearer' },
    minimax: { name: 'MiniMax', baseUrl: 'https://api.minimaxi.com/v1', authHeader: 'bearer' },
    kimi: { name: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', authHeader: 'bearer' },
    glm: { name: 'GLM', baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4', authHeader: 'bearer' }
};

function inferApiProfile(baseUrl, model) {
    const nb = String(baseUrl || '').trim().toLowerCase();
    const nm = String(model || '').trim().toLowerCase();

    if (/\/anthropic\b/i.test(nb)) return 'anthropic';
    if (/api\.anthropic\.com/i.test(nb)) return 'anthropic';
    if (/api\.deepseek\.com/i.test(nb)) return 'deepseek';
    if (/api\.minimax\.chat/i.test(nb)) return 'minimax';
    if (/api\.moonshot\.cn/i.test(nb)) return 'kimi';
    if (/bigmodel\.cn/i.test(nb)) return 'glm';
    if (/api\.openai\.com/i.test(nb)) return 'openai';

    if (nm.startsWith('deepseek-')) return 'deepseek';
    if (nm.startsWith('minimax-')) return 'minimax';
    if (nm.startsWith('glm-')) return 'glm';
    if (nm.startsWith('moonshot-')) return 'kimi';
    if (/claude/i.test(nm)) return 'anthropic';

    return null;
}

function buildApiEndpoint(baseUrl, provider) {
    const normalized = (baseUrl || '').replace(/\/+$/, '');
    if (normalized) {
        return provider === 'anthropic' ? `${normalized}/v1/messages` : `${normalized}/v1/chat/completions`;
    }
    const endpoints = {
        anthropic: 'https://api.anthropic.com/v1/messages',
        deepseek: 'https://api.deepseek.com/v1/chat/completions',
        minimax: 'https://api.minimaxi.com/v1/chat_completions',
        kimi: 'https://api.moonshot.cn/v1/chat/completions',
        glm: 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions'
    };
    return endpoints[provider] || 'https://api.openai.com/v1/chat/completions';
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
        return { model: modelName, system: systemPrompt, messages, max_tokens: maxTokens || 2048 };
    }
    return {
        model: modelName,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 2048
    };
}

async function callAI(messages, systemPrompt) {
    // 优先委托到 NovelLLMClient（如果可用），签名差异：llm-client 签名 callAI(aiSettings, messages, systemPrompt)
    if (typeof NovelLLMClient !== 'undefined' && NovelLLMClient.callAI) {
        try {
            return await NovelLLMClient.callAI(aiSettings, messages, systemPrompt);
        } catch (e) {
            console.warn('NovelLLMClient.callAI 失败，回落到本地实现:', e);
        }
    }

    if (aiSettings.provider === 'local') {
        return new Promise(r => setTimeout(() => r('【本地模拟】夜风轻拂，星光点点，他望着远方的山峦，心中涌起无限思绪。'), 1000));
    }

    const provider = inferApiProfile(aiSettings.baseUrl, aiSettings.model) || aiSettings.provider;
    const endpoint = buildApiEndpoint(aiSettings.baseUrl, provider);
    const headers = buildApiHeaders(provider, aiSettings.apiKey);
    const body = buildApiBody(provider, aiSettings.model, systemPrompt, messages, aiSettings.temperature, aiSettings.maxTokens);

    const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${err.error?.message || '未知错误'}`);
    }

    const data = await response.json();
    return provider === 'anthropic' ? (data.content?.[0]?.text || '') : (data.choices?.[0]?.message?.content || '');
}

// ==================== AI 功能 ====================
async function aiWrite() {
    const content = document.getElementById('contentEditor')?.value;
    if (!content) { showToast('请先输入一些内容', 'error'); return; }

    const btn = document.querySelector('.toolbar-btn.primary');
    if (btn) { btn.textContent = '⏳ AI思考中...'; btn.disabled = true; }

    try {
        const saved = localStorage.getItem('moyun_projects');
        const projects = safeLoadProjects();
        const project = projects[projectIndex];
        const continuation = await callAI([{ role: 'user', content: `续写150-300字：\n\n${content}` }], getThemePrompt(project?.type));
        const editor = document.getElementById('contentEditor');
        if (editor) {
            editor.value = content + continuation;
            saveCurrentChapterLocal();
            updateWordCount();
        }
    } catch (error) {
        showToast('AI调用失败：' + error.message, 'error');
    }

    if (btn) { btn.textContent = '✍️ AI续写'; btn.disabled = false; }
}

async function aiPolish() {
    const content = document.getElementById('contentEditor')?.value;
    if (!content) { showToast('请先输入内容', 'error'); return; }

    const btns = document.querySelectorAll('.toolbar-btn');
    const btn = btns[1];
    if (btn) { btn.textContent = '⏳ AI润色中...'; btn.disabled = true; }

    try {
        const polished = await callAI([{ role: 'user', content: `润色：\n\n${content}` }], '你是专业的中文写作润色专家。');
        const editor = document.getElementById('contentEditor');
        if (editor) {
            editor.value = polished;
            saveCurrentChapterLocal();
            updateWordCount();
        }
    } catch (error) {
        showToast('AI调用失败：' + error.message, 'error');
    }

    if (btn) { btn.textContent = '🎨 AI润色'; btn.disabled = false; }
}

async function aiImprove() {
    const content = document.getElementById('contentEditor')?.value;
    if (!content) { showToast('请先输入内容', 'error'); return; }

    const btns = document.querySelectorAll('.toolbar-btn');
    const btn = btns[2];
    if (btn) { btn.textContent = '⏳ AI分析中...'; btn.disabled = true; }

    try {
        const saved = localStorage.getItem('moyun_projects');
        const projects = safeLoadProjects();
        const project = projects[projectIndex];
        const suggestion = await callAI([{ role: 'user', content: `提供改进建议：\n\n${content.slice(0, 500)}` }], getThemePrompt(project?.type));
        showToast('💡 改进建议：\n\n' + suggestion, 'info');
    } catch (error) {
        showToast('AI调用失败：' + error.message, 'error');
    }

    if (btn) { btn.textContent = '💡 AI建议'; btn.disabled = false; }
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', init);