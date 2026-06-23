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
    renderBatchCard();
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
    document.querySelectorAll('.sidebar-tab-icon').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // 切换内容显示
    document.querySelectorAll('.sidebar-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName + 'Tab');
    });

    // 大纲 tab 切换时刷新内容
    if (tabName === 'outline') {
        renderOutlineTab();
        renderBatchCard();
    }
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
    renderOutlineTab();
}

function selectChapter(project, index) {
    chapterIndex = index;
    const chapter = project.chapters[index];
    const editorTitle = document.getElementById('editorTitle');
    const contentEditor = document.getElementById('contentEditor');

    if (editorTitle) editorTitle.textContent = `第${index + 1}章 · ${chapter.title}`;
    if (contentEditor) contentEditor.value = chapter.content || '';
    updateWordCount();
    renderOutlineTab();
}

function renderOutlineTab() {
    const projects = safeLoadProjects();
    const project = projects[projectIndex];
    const titleEl = document.getElementById('outlineCurrentTitle');
    const summaryEl = document.getElementById('outlineCurrentSummary');
    const listEl = document.getElementById('outlineList');
    if (!titleEl || !summaryEl || !listEl) return;

    const chapter = project?.chapters?.[chapterIndex];
    if (chapter) {
        const rawTitle = (chapter.title || '').trim();
        const hasPrefix = /^第\s*[一二三四五六七八九十百零\d]+\s*[章节回]/.test(rawTitle);
        titleEl.textContent = hasPrefix ? rawTitle : `第${chapterIndex + 1}章 · ${rawTitle}`;
        const summary = (chapter.summary || '').trim();
        summaryEl.textContent = summary || '暂无大纲 — 可点击工具栏的「AI 规划大纲」自动生成';
        summaryEl.classList.toggle('empty', !summary);
    } else {
        titleEl.textContent = '未选择章节';
        summaryEl.textContent = '';
    }

    const chapters = project?.chapters || [];
    listEl.innerHTML = chapters.map((c, i) => {
        const isActive = i === chapterIndex;
        const rawTitle = (c.title || '').trim();
        const hasPrefix = /^第\s*[一二三四五六七八九十百零\d]+\s*[章节回]/.test(rawTitle);
        const displayTitle = hasPrefix ? rawTitle : `第${i + 1}章 · ${rawTitle}`;
        const summary = (c.summary || '').trim();
        const preview = summary
            ? summary.replace(/\n+/g, ' ').slice(0, 80) + (summary.length > 80 ? '…' : '')
            : '（无大纲）';
        return `
            <div class="outline-item ${isActive ? 'active' : ''}" data-chapter-index="${i}" onclick="selectChapterByIndex(${i}); renderOutlineTab();">
                <div class="outline-item-title">${escapeHtml(displayTitle)}</div>
                <div class="outline-item-preview">${escapeHtml(preview)}</div>
            </div>
        `;
    }).join('');
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
    const project = projects[projectIndex];
    const chapter = project?.chapters?.[chapterIndex];
    if (!project || !chapter) return;

    const contentEditor = document.getElementById('contentEditor');
    if (contentEditor) {
        chapter.content = contentEditor.value;
    }
    // 标记项目最近编辑时间（驱动首页「最近写作」区块）
    project.lastEditedAt = new Date().toISOString();
    // 同步 mtime，让「最近写作」有排序依据
    project.updatedAt = project.lastEditedAt;
    if (!project.createdAt) project.createdAt = project.lastEditedAt;

    localStorage.setItem('moyun_projects', JSON.stringify(projects));
    // 同步当前项目索引到 localStorage（页面刷新后能恢复）
    localStorage.setItem('moyun_current_project', String(projectIndex));
    localStorage.setItem('moyun_current_chapter', String(chapterIndex));

    // 触发 Gist 自动同步（debounced 5s 合并多次编辑，跨页面不依赖 timer 存活）
    if (window.NovelAutoSync && window.NovelAutoSync.perform) {
        if (window.__editorAutoSyncTimer) clearTimeout(window.__editorAutoSyncTimer);
        const snapshot = JSON.stringify(projects);
        window.__editorAutoSyncTimer = setTimeout(() => {
            window.NovelAutoSync.perform(snapshot);
        }, 5000);
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
        minimax: 'https://api.minimaxi.com/v1/chat/completions',
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
    const editor = document.getElementById('contentEditor');
    const content = editor?.value;
    if (!content) { showToast('请先输入一些内容', 'error'); return; }

    const btn = document.querySelector('.toolbar-btn.primary');
    if (btn) { btn.innerHTML = '<span class="novel-spinner"></span> AI 思考中...'; btn.disabled = true; }

    try {
        const projects = safeLoadProjects();
        const project = projects[projectIndex];
        const chapter = project?.chapters?.[chapterIndex] || {};

        const outlineContext = buildOutlineContext(project, chapterIndex);
        const systemPrompt = buildWriteSystemPrompt(project, chapter);

        const continuation = await callAI(
            [{ role: 'user', content: `${outlineContext}\n\n请基于以上全书大纲和上文正文，直接续写本章剩余内容（约2000-3000字），严格遵循本章大纲规划的情节走向，输出纯正文不要任何解释或注释：\n\n${content}` }],
            systemPrompt
        );
        if (editor) {
            editor.value = content + continuation;
            saveCurrentChapterLocal();
            updateWordCount();
        }
    } catch (error) {
        showToast('AI调用失败：' + error.message, 'error');
    }

    if (btn) { btn.innerHTML = 'AI 续写'; btn.disabled = false; }
}

function buildOutlineContext(project, currentIdx) {
    const chapters = project?.chapters || [];
    if (chapters.length === 0) return '【全书大纲】暂无章节大纲，请先在创建时导入或生成大纲。';

    const lines = ['【全书大纲】'];
    chapters.forEach((c, i) => {
        const marker = i === currentIdx ? '← 当前章节' : '';
        const summary = c.summary?.trim()
            ? ` — ${c.summary.slice(0, 200)}`
            : ' — （本章尚无大纲）';
        lines.push(`${i + 1}. ${c.title || `第${i + 1}章`}${summary} ${marker}`.trim());
    });
    return lines.join('\n');
}

function buildWriteSystemPrompt(project, chapter) {
    const themePrompt = getThemePrompt(project?.type);
    const summaryLine = chapter.summary?.trim()
        ? `\n\n【本章大纲】\n${chapter.summary}`
        : '\n\n【本章大纲】暂无规划。';
    return `${themePrompt}${summaryLine}\n\n严格遵循本章大纲的剧情走向，保持人物语气与世界设定一致。`;
}

// ==================== AI 批量生成 ====================
// 状态机：sampling → awaiting-approval → running ↔ paused → done / error
const batchState = {
    phase: 'idle',          // 'idle' | 'sampling' | 'awaiting-approval' | 'running' | 'paused' | 'done' | 'error'
    abort: null,             // AbortController
    sampleSize: 2,
    pending: [],             // chapter indexes still to write in current run
    completed: [],           // chapter indexes written this run
    failedAt: null,          // { index, error } when phase === 'error'
    startedAt: 0,
    durations: [],          // ms per chapter (for ETA)
    userApproved: false     // when 'all' is chosen after sampling
};

function renderBatchCard() {
    const card = document.getElementById('batchCard');
    if (!card) return;
    const body = document.getElementById('batchCardBody');
    const actions = document.getElementById('batchCardActions');
    card.classList.remove('error');

    const s = batchState;
    const fmt = (sec) => {
        const m = Math.floor(sec / 60);
        const ss = Math.round(sec % 60);
        return m > 0 ? `${m}分${ss}秒` : `${ss}秒`;
    };

    if (s.phase === 'idle') {
        body.textContent = `基于本章大纲，AI 可一次性按顺序生成所有章节。点击「试写 ${s.sampleSize} 章」先看效果，满意再一键全量生成。`;
        actions.innerHTML = `<button class="toolbar-btn primary" data-batch-action="sample">试写 ${s.sampleSize} 章</button>`;
        return;
    }

    if (s.phase === 'sampling') {
        const total = s.pending.length + s.completed.length;
        const done = s.completed.length;
        const pct = total ? Math.round(done / total * 100) : 0;
        body.innerHTML = `正在试写第 <strong>${done + 1}</strong> / ${total} 章…
            <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>`;
        actions.innerHTML = `<button class="toolbar-btn" data-batch-action="pause">暂停</button>
            <button class="toolbar-btn" data-batch-action="cancel">取消</button>`;
        return;
    }

    if (s.phase === 'awaiting-approval') {
        body.innerHTML = `已写 ${s.completed.length} 章样章。满意后点击下方按钮一键生成剩余章节。`;
        actions.innerHTML = `<button class="toolbar-btn primary" data-batch-action="all">✓ 一键全量生成</button>
            <button class="toolbar-btn" data-batch-action="sample">↻ 重新试写</button>
            <button class="toolbar-btn" data-batch-action="reset">取消</button>`;
        return;
    }

    if (s.phase === 'running' || s.phase === 'paused') {
        const total = s.completed.length + s.pending.length;
        const done = s.completed.length;
        const pct = total ? Math.round(done / total * 100) : 0;
        const avg = s.durations.length ? s.durations.reduce((a, b) => a + b, 0) / s.durations.length : 0;
        const eta = avg * s.pending.length;
        const status = s.phase === 'paused' ? '⏸ 已暂停' : '正在生成';
        body.innerHTML = `${status}第 <strong>${done + 1}</strong> / ${total} 章 · 预计剩余 ${fmt(eta / 1000)}
            <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
            <div style="font-size:0.75rem; color:var(--text-muted);">已完成 ${s.completed.length} 章 · 失败 0 · 跳过 0</div>`;
        if (s.phase === 'paused') {
            actions.innerHTML = `<button class="toolbar-btn primary" data-batch-action="resume">继续</button>
                <button class="toolbar-btn" data-batch-action="cancel">终止</button>`;
        } else {
            actions.innerHTML = `<button class="toolbar-btn" data-batch-action="pause">暂停</button>
                <button class="toolbar-btn" data-batch-action="cancel">终止</button>`;
        }
        return;
    }

    if (s.phase === 'done') {
        const total = s.completed.length;
        const ms = Date.now() - s.startedAt;
        body.innerHTML = `✓ 已生成 ${total} 章 (耗时 ${fmt(ms / 1000)})。`;
        actions.innerHTML = `<button class="toolbar-btn" data-batch-action="reset">清除</button>`;
        return;
    }

    if (s.phase === 'error') {
        card.classList.add('error');
        const { index, error } = s.failedAt || {};
        body.innerHTML = `第 ${index + 1} 章失败:${error}`;
        actions.innerHTML = `<button class="toolbar-btn primary" data-batch-action="retry">重试第 ${index + 1} 章</button>
            <button class="toolbar-btn" data-batch-action="cancel">终止</button>`;
        return;
    }

    attachBatchActionHandlers();
}

function attachBatchActionHandlers() {
    const actions = document.getElementById('batchCardActions');
    if (!actions) return;
    const map = {
        sample: () => aiBatchStart('sample'),
        all: () => aiBatchStart('all'),
        pause: () => aiBatchPause(),
        resume: () => aiBatchResume(),
        cancel: () => aiBatchCancel(),
        reset: () => aiBatchReset(),
        retry: () => aiBatchRetry()
    };
    actions.querySelectorAll('[data-batch-action]').forEach(btn => {
        const action = btn.dataset.batchAction;
        const fn = map[action];
        if (fn) btn.addEventListener('click', fn);
    });
}

async function aiBatchStart(mode) {
    const projects = safeLoadProjects();
    const project = projects[projectIndex];
    if (!project?.chapters?.length) { showToast('当前项目没有章节', 'error'); return; }

    // Build list of chapters to write (skip non-empty unless retrying)
    const retry = mode === 'retry';
    const indexes = project.chapters
        .map((c, i) => ({ c, i }))
        .filter(({ c, i }) => retry ? i === batchState.failedAt?.index : !c.content?.trim())
        .map(({ i }) => i);

    if (indexes.length === 0) {
        showToast('所有章节已有内容', 'warning');
        return;
    }

    if (mode === 'sample') {
        batchState.pending = indexes.slice(0, batchState.sampleSize);
        batchState.phase = 'sampling';
        batchState.userApproved = false;
    } else {
        batchState.userApproved = true;
        batchState.pending = mode === 'retry' ? indexes : indexes;
        batchState.phase = 'running';
    }
    batchState.completed = [];
    batchState.failedAt = null;
    batchState.durations = [];
    batchState.startedAt = Date.now();
    batchState.abort = new AbortController();
    renderBatchCard();
    await aiBatchRun();
}

async function aiBatchResume() {
    if (batchState.phase !== 'paused') return;
    batchState.phase = 'running';
    batchState.abort = new AbortController();
    renderBatchCard();
    await aiBatchRun();
}

function aiBatchPause() {
    if (batchState.phase !== 'sampling' && batchState.phase !== 'running') return;
    if (batchState.abort) batchState.abort.abort();
    batchState.phase = 'paused';
    renderBatchCard();
}

function aiBatchCancel() {
    if (batchState.abort) batchState.abort.abort();
    batchState.phase = 'idle';
    batchState.pending = [];
    batchState.completed = [];
    batchState.failedAt = null;
    renderBatchCard();
    showToast('已终止批量生成', 'info');
}

function aiBatchReset() {
    batchState.phase = 'idle';
    batchState.pending = [];
    batchState.completed = [];
    batchState.failedAt = null;
    renderBatchCard();
}

async function aiBatchRetry() {
    if (!batchState.failedAt) return;
    const idx = batchState.failedAt.index;
    batchState.failedAt = null;
    batchState.phase = batchState.completed.length > 0 ? 'running' : 'sampling';
    batchState.pending = [idx, ...batchState.pending];
    batchState.abort = new AbortController();
    renderBatchCard();
    await aiBatchRun();
}

async function aiBatchRun() {
    const projects = safeLoadProjects();
    const project = projects[projectIndex];
    if (!project?.chapters?.length) return;

    while (batchState.pending.length > 0) {
        if (batchState.phase === 'idle' || batchState.phase === 'done' || batchState.phase === 'paused') return;
        const idx = batchState.pending[0];
        const t0 = Date.now();
        try {
            await aiBatchWriteOne(project, idx);
            batchState.durations.push(Date.now() - t0);
            batchState.pending.shift();
            batchState.completed.push(idx);
            // Persist after each chapter so user can navigate to a finished one
            saveCurrentChapterLocal();
            renderOutlineTab();
        } catch (e) {
            if (e.name === 'AbortError' || batchState.phase === 'paused') {
                // Pause: leave the failed chapter at the head of pending
                return;
            }
            batchState.failedAt = { index: idx, error: e.message };
            batchState.phase = 'error';
            renderBatchCard();
            return;
        }
    }
    // Done
    if (batchState.phase !== 'idle') {
        if (batchState.completed.length === batchState.sampleSize && !batchState.userApproved) {
            batchState.phase = 'awaiting-approval';
        } else {
            batchState.phase = 'done';
        }
        renderBatchCard();
    }
}

async function aiBatchWriteOne(project, idx) {
    const chapter = project.chapters[idx];
    const prev = idx > 0 ? project.chapters[idx - 1] : null;
    const prevTail = prev?.content?.trim() ? prev.content.trim().slice(-200) : '';
    const systemPrompt = buildWriteSystemPrompt(project, chapter);
    const outlineContext = buildOutlineContext(project, idx);
    const userPrompt = `${outlineContext}
${prevTail ? `\n\n【上一章结尾（用于衔接）】\n…${prevTail}` : ''}

请基于全书大纲${prevTail ? '和上一章结尾' : ''}，直接续写本章正文（约2000-3000字），严格遵循本章大纲规划的情节走向，输出纯正文不要任何解释或注释。`;

    const text = await callAI([{ role: 'user', content: userPrompt }], systemPrompt);
    if (!text || !text.trim()) throw new Error('AI 返回内容为空');
    chapter.content = (chapter.content?.trim() ? chapter.content.trim() + '\n\n' : '') + text.trim();
    chapter.lastEditedAt = Date.now();
    // Persist the entire project (chapterIndex global may not match the idx we're writing)
    const all = safeLoadProjects();
    all[projectIndex] = project;
    project.lastEditedAt = new Date().toISOString();
    localStorage.setItem('moyun_projects', JSON.stringify(all));
    renderBatchCard();
    return text;
}

async function aiPlanOutline() {
    const projects = safeLoadProjects();
    const project = projects[projectIndex];
    if (!project || !project.chapters?.length) {
        showToast('当前项目没有章节', 'error');
        return;
    }

    const hasAnySummary = project.chapters.some(c => c.summary?.trim());
    if (hasAnySummary) {
        const ok = confirm('当前已有章节大纲，将被 AI 重新规划覆盖，是否继续？');
        if (!ok) return;
    }

    const btn = document.querySelector('.toolbar-btn.secondary-plan');
    if (btn) { btn.innerHTML = '<span class="novel-spinner"></span> 规划中...'; btn.disabled = true; }

    try {
        const themePrompt = getThemePrompt(project?.type);
        const meta = [
            project.title && `书名：《${project.title}》`,
            project.protagonist && `主角：${project.protagonist}`,
            project.description && `简介：${project.description}`,
            project.tropes?.length && `要素：${project.tropes.join('、')}`,
            project.audience && `目标读者：${project.audience}`
        ].filter(Boolean).join('\n');

        const chapterList = project.chapters.map((c, i) => `${i + 1}. ${c.title || `第${i + 1}章`}`).join('\n');

        const userPrompt = `请为以下小说的全部章节撰写简短大纲（每章 80-150 字，说明本章主要情节与冲突），严格按章节顺序输出 JSON 数组：\n\n${meta}\n\n章节列表：\n${chapterList}\n\n输出格式（仅返回 JSON，不要其它文字）：\n[{"index":1,"summary":"..."},{"index":2,"summary":"..."}]`;

        const raw = await callAI([{ role: 'user', content: userPrompt }], themePrompt);

        const parsed = parseOutlineJson(raw);
        if (!parsed) {
            throw new Error('AI 返回的不是有效 JSON');
        }

        project.chapters.forEach((c, i) => {
            const entry = parsed.find(p => p.index === i + 1) || parsed[i];
            if (entry?.summary) c.summary = String(entry.summary).slice(0, 800);
        });

        saveCurrentChapterLocal();
        renderChapters(project, chapterIndex);
        showToast(`已为 ${parsed.length} 章生成大纲`, 'success');
    } catch (error) {
        showToast('大纲生成失败：' + error.message, 'error');
    }

    if (btn) { btn.innerHTML = 'AI 规划大纲'; btn.disabled = false; }
}

function parseOutlineJson(raw) {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try {
        const data = JSON.parse(match[0]);
        if (!Array.isArray(data)) return null;
        return data.filter(d => d && (d.summary || d.index !== undefined));
    } catch {
        return null;
    }
}

async function aiPolish() {
    const content = document.getElementById('contentEditor')?.value;
    if (!content) { showToast('请先输入内容', 'error'); return; }

    const btns = document.querySelectorAll('.toolbar-btn');
    const btn = btns[1];
    if (btn) { btn.innerHTML = '<span class="novel-spinner"></span> AI 润色中...'; btn.disabled = true; }

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

    if (btn) { btn.innerHTML = 'AI 润色'; btn.disabled = false; }
}

async function aiImprove() {
    const content = document.getElementById('contentEditor')?.value;
    if (!content) { showToast('请先输入内容', 'error'); return; }

    const btns = document.querySelectorAll('.toolbar-btn');
    const btn = btns[2];
    if (btn) { btn.innerHTML = '<span class="novel-spinner"></span> AI 分析中...'; btn.disabled = true; }

    try {
        const saved = localStorage.getItem('moyun_projects');
        const projects = safeLoadProjects();
        const project = projects[projectIndex];
        const suggestion = await callAI([{ role: 'user', content: `提供改进建议：\n\n${content.slice(0, 500)}` }], getThemePrompt(project?.type));
        showToast('💡 改进建议：\n\n' + suggestion, 'info');
    } catch (error) {
        showToast('AI调用失败：' + error.message, 'error');
    }

    if (btn) { btn.innerHTML = 'AI 建议'; btn.disabled = false; }
}

// ==================== Keyboard Shortcuts ====================
if (typeof NovelShortcuts !== 'undefined') {
    NovelShortcuts.bind('editor', 's', true, () => { saveCurrentChapter(); });
    NovelShortcuts.bind('editor', 'Enter', true, (e) => { e.preventDefault(); aiWrite(); });
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', init);