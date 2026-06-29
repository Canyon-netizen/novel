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
    setupProjectSwitcher();
    if (typeof loadGistSettings === 'function') loadGistSettings();
    renderBatchCard();
    setupPopState();
    if (window.NovelAutoSync && window.NovelAutoSync.setErrorHandler) {
        window.NovelAutoSync.setErrorHandler((message) => {
            if (typeof showToast === 'function') {
                showToast(message, 'error', 6000);
            }
        });
    }
}

// ==================== Project Switcher (header dropdown) ====================
function readProjects() {
    try {
        const raw = localStorage.getItem('moyun_projects');
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch (_) {
        return [];
    }
}

function formatTimeAgo(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const diff = Date.now() - t;
    if (diff < 60_000) return '刚刚';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
    if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
    return new Date(iso).toLocaleDateString('zh-CN');
}

function setupProjectSwitcher() {
    const btn = document.getElementById('projectSwitcherBtn');
    const menu = document.getElementById('projectSwitcherMenu');
    const titleEl = document.getElementById('projectSwitcherTitle');
    if (!btn || !menu || !titleEl) return;

    const render = () => {
        const projects = readProjects();
        const current = projects[projectIndex];
        titleEl.textContent = current ? current.title : '未选择项目';

        if (projects.length === 0) {
            menu.innerHTML = '<div class="project-switcher__empty">还没有项目,先去 <a href="index.html">首页</a> 创建一个吧</div>';
            return;
        }

        menu.innerHTML = projects.map((p, i) => {
            const isActive = i === projectIndex;
            const chapterCount = Array.isArray(p.chapters) ? p.chapters.length : 0;
            const meta = `${chapterCount} 章 · ${formatTimeAgo(p.updatedAt || p.createdAt)}`;
            const safeTitle = String(p.title || '未命名').replace(/[<>&"]/g, (c) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;'})[c]);
            return `<button type="button" class="project-switcher__item ${isActive ? 'is-active' : ''}" data-index="${i}" role="option" aria-selected="${isActive}">
                <span class="project-switcher__item-title">${safeTitle}</span>
                <span class="project-switcher__item-meta">${meta}</span>
            </button>`;
        }).join('');

        menu.querySelectorAll('.project-switcher__item').forEach((el) => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = parseInt(el.getAttribute('data-index'), 10);
                if (Number.isNaN(target) || target === projectIndex) {
                    close();
                    return;
                }
                window.location.href = `editor.html?project=${target}&chapter=0`;
            });
        });
    };

    const open = () => {
        render();
        menu.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
    };

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menu.hidden) open();
        else close();
    });

    document.addEventListener('click', (e) => {
        if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !menu.hidden) close();
    });

    render();
}

function setupPopState() {
    window.addEventListener('popstate', () => {
        const urlChapter = parseInt(new URL(window.location).searchParams.get('chapter') || '0', 10);
        if (!Number.isNaN(urlChapter) && urlChapter !== chapterIndex) {
            selectChapterByIndex(urlChapter);
        }
    });
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
    } else if (tabName === 'quality') {
        renderQualityTab();
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
    if (!project || !Array.isArray(project.chapters)) return;
    if (index < 0 || index >= project.chapters.length) {
        showToast(`章节索引 ${index} 越界 (共 ${project.chapters.length} 章)`, 'error');
        return;
    }
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
    if (!project || !Array.isArray(project.chapters) || index < 0 || index >= project.chapters.length) return;
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
        summaryEl.textContent = summary || '暂无大纲 — 点击下方按钮让 AI 生成,或在工具栏跑「AI 规划大纲」';
        summaryEl.classList.toggle('empty', !summary);

        // Refresh "AI 生成此章大纲" button — show only when summary is empty
        const card = document.getElementById('outlineCurrent');
        if (card) {
            let btn = card.querySelector('[data-action="plan-one"]');
            if (!summary) {
                if (!btn) {
                    btn = document.createElement('button');
                    btn.className = 'toolbar-btn';
                    btn.dataset.action = 'plan-one';
                    btn.textContent = 'AI 生成此章大纲';
                    btn.addEventListener('click', aiPlanOneOutline);
                    card.appendChild(btn);
                }
            } else if (btn) {
                btn.remove();
            }
        }
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
        status.onclick = null;
        status.classList.remove('ai-status--clickable');
    } else if (aiSettings.apiKey) {
        status.textContent = '✅ ' + (aiSettings.model || aiSettings.provider.toUpperCase());
        status.onclick = null;
        status.classList.remove('ai-status--clickable');
    } else {
        status.textContent = '⚠️ 未配置 API · 点此配置';
        status.onclick = openSettingsModal;
        status.classList.add('ai-status--clickable');
    }
}

// ==================== AI 提示词（委托 NovelCommon）====================
// 类型/题材提示词统一在 app/common.js 的 THEME_PROMPTS（11 种全覆盖），
// 这里不再保留副本，避免三处漂移。
function getThemePrompt(themeType) {
    if (typeof NovelCommon !== 'undefined' && NovelCommon.getThemePrompt) {
        return NovelCommon.getThemePrompt(themeType);
    }
    return '你是一位专业的中文小说写作助手。请用中文回答。';
}

// ==================== API 调用（统一委托 NovelLLMClient）====================
// 之前这里有一份完整的 LLM 调用栈副本（API_PRESETS/inferApiProfile/buildApiEndpoint/
// buildApiHeaders/buildApiBody/callAI），已经全部搬到 app/llm-client.js。
// 这里的 callAI 直接走公共模块——batch state、reasoning 模型适配、401/403/404
// 错误分类都只在 llm-client.js 维护一份。
if (typeof NovelLLMClient === 'undefined') {
    console.error('NovelLLMClient 模块未加载，editor.js 无法调用 LLM。请检查 editor.html 的 <script> 顺序。');
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
        const targetWords = detectChapterTargetWords(chapter);

        const continuation = await NovelLLMClient.callAI(aiSettings,
            [{ role: 'user', content: `${outlineContext}\n\n请基于以上全书大纲和上文正文,直接续写本章剩余内容（${targetWords}字左右,允许 ±20% 浮动），严格遵循本章大纲规划的情节走向,输出纯正文不要任何解释或注释：\n\n${content}` }],
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
        const wc = detectChapterTargetWords(c);
        const wcTag = wc ? ` [目标 ${wc}字]` : '';
        lines.push(`${i + 1}. ${c.title || `第${i + 1}章`}${summary}${wcTag} ${marker}`.trim());
    });
    return lines.join('\n');
}

// Parse the per-chapter word-count target from the title. Recognizes
// patterns like:
//   "【单章1.4w字】" / "[单章8000字]" / "(约12000字)" / "1.4w字"
// Returns null when no explicit target is found, in which case the
// caller should fall back to a sane default.
function detectChapterTargetWords(chapter) {
    if (!chapter) return null;
    const title = chapter.title || '';
    const summary = chapter.summary || '';
    const blob = title + ' ' + summary;
    // 1.4w / 2.5w / 1万 / 1.2万 / 8000字 / 12000字
    const wanMatch = blob.match(/(\d+(?:\.\d+)?)\s*w\s*字?/i) || blob.match(/(\d+(?:\.\d+)?)\s*万\s*字?/);
    if (wanMatch) return String(Math.round(parseFloat(wanMatch[1]) * 10000));
    const kMatch = blob.match(/(\d{3,5})\s*字/);
    if (kMatch) {
        const n = parseInt(kMatch[1], 10);
        // ignore tiny numbers that look like scene markers ("8字对话")
        if (n >= 1000) return String(n);
    }
    return null;
}

function buildWriteSystemPrompt(project, chapter) {
    return NovelLLMClient.buildWriteSystemPrompt({
        type: project?.type,
        chapter: chapter
    });
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
    userApproved: false,    // when 'all' is chosen after sampling
    pendingChapterSegments: 0,    // segments to write in current chapter (long-chapter mode)
    completedChapterSegments: 0   // segments written so far
};

const BATCH_ACTIONS = {
    sample: () => aiBatchStart('sample'),
    all: () => aiBatchStart('all'),
    pause: () => aiBatchPause(),
    resume: () => aiBatchResume(),
    cancel: () => aiBatchCancel(),
    reset: () => aiBatchReset(),
    retry: () => aiBatchRetry()
};

function renderQualityTab() {
    const list = document.getElementById('qualityList');
    const avgEl = document.getElementById('qualityAvgScore');
    const anaEl = document.getElementById('qualityAnalyzed');
    const warnEl = document.getElementById('qualityWarnCount');
    if (!list || !avgEl || !anaEl || !warnEl) return;

    const projects = safeLoadProjects();
    const project = projects[projectIndex];
    if (!project?.chapters?.length) {
        list.innerHTML = '<div class="quality-empty">暂无章节</div>';
        return;
    }

    const chapters = project.chapters;
    const analyzed = chapters.filter(c => c.quality?.metrics);
    const scores = analyzed.map(c => c.quality.score || 0);
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
    const warnCount = analyzed.filter(c => c.quality.metrics.needsAiReview).length;

    avgEl.textContent = avg;
    anaEl.textContent = `${analyzed.length}/${chapters.length}`;
    warnEl.textContent = warnCount;
    // 警告变红
    warnEl.style.color = warnCount > 0 ? '#b54242' : '';

    if (analyzed.length === 0) {
        list.innerHTML = '<div class="quality-empty">还没写章节,无法评估质量</div>';
        return;
    }

    list.innerHTML = analyzed.map((c, i) => {
        const m = c.quality.metrics;
        const score = c.quality.score || 0;
        const scoreClass = score >= 7.5 ? 'is-high' : score >= 5 ? 'is-mid' : 'is-low';
        const targetPct = Math.round(m.wordCountRatio * 100);
        const targetStatus = m.wordCountRatio >= 0.8 ? 'is-ok' : 'is-warn';
        const keywordPct = Math.round(m.keywordHitRate * 100);
        const keywordStatus = m.keywordHitRate >= 0.5 ? 'is-ok' : 'is-warn';
        const dialoguePct = Math.round(m.dialogueRatio * 100);
        const dialogueStatus = m.dialogueRatio >= 0.05 && m.dialogueRatio <= 0.6 ? 'is-ok' : 'is-warn';
        const sensoryPct = (m.sensoryDensity * 100).toFixed(2);
        const sensoryStatus = m.sensoryDensity >= 0.01 ? 'is-ok' : 'is-warn';
        const paraStatus = m.paragraphCount >= 3 ? 'is-ok' : 'is-warn';
        return `<div class="quality-item" onclick="selectChapterByIndex(${i})">
            <div class="quality-item-head">
                <div class="quality-item-title">${escapeHtml(c.title)}</div>
                <div class="quality-item-score ${scoreClass}">${score}</div>
            </div>
            <div class="quality-item-metrics">
                <div class="quality-item-metric ${targetStatus}">📝 ${m.wordCount}/${m.targetWords} (${targetPct}%)</div>
                <div class="quality-item-metric ${keywordStatus}">🔑 关键词 ${m.keywordHits.length}/${m.keywords.length} (${keywordPct}%)</div>
                <div class="quality-item-metric ${dialogueStatus}">💬 对话 ${dialoguePct}%</div>
                <div class="quality-item-metric ${sensoryStatus}">👁 感官 ${sensoryPct}%</div>
                <div class="quality-item-metric ${paraStatus}">¶ 段落 ${m.paragraphCount}</div>
                <div class="quality-item-metric">📊 字数比 ${targetPct}%</div>
            </div>
        </div>`;
    }).join('');
}

function renderBatchCard() {
    const card = document.getElementById('batchCard');
    if (!card) return;
    const body = document.getElementById('batchCardBody');
    const actions = document.getElementById('batchCardActions');
    card.classList.remove('error');
    // One-time delegated click handler on the actions container. Each time
    // renderBatchCard rewrites actions.innerHTML, this single listener
    // survives because it's bound to the parent, not the buttons. The
    // lookup is by data-batch-action at click time, so we don't need to
    // re-attach after every re-render.
    if (actions && !actions.__delegated) {
        actions.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-batch-action]');
            if (!btn) return;
            const action = btn.dataset.batchAction;
            const fn = BATCH_ACTIONS[action];
            if (fn) fn();
        });
        actions.__delegated = true;
    }

    const s = batchState;
    const fmt = (sec) => {
        const m = Math.floor(sec / 60);
        const ss = Math.round(sec % 60);
        return m > 0 ? `${m}分${ss}秒` : `${ss}秒`;
    };

    if (s.phase === 'idle') {
        body.textContent = `基于本章大纲，AI 可一次性按顺序生成所有章节。点击「试写 ${s.sampleSize} 章」先看效果,满意后一键生成剩余;或直接「一键全量」跳过试写。`;
        actions.innerHTML = `
            <button class="toolbar-btn primary" data-batch-action="sample">试写 ${s.sampleSize} 章</button>
            <button class="toolbar-btn" data-batch-action="all">一键全量</button>
        `;
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
        // 用最近 5 段平均 (旧数据会拖慢反应)
        const recent = s.durations.slice(-5);
        const avgSegment = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
        // 剩余段数 = 当前章剩余段 + pending 章按目标字数估算的段数
        const currentSegRemaining = Math.max(0, s.pendingChapterSegments - s.completedChapterSegments);
        // pending 章用首章段数作为估算(没精确数据, 简化)
        // pending[0] 是正在写的章, 从已完成章(idx=done)开始算
        const segPerChapter = Array.isArray(s.segmentsPerChapter) ? s.segmentsPerChapter : [];
        // pending 章里 idx >= done+1 的段数总和 (因为 pending[0] 是当前章, 在 s.pendingChapterSegments 里追踪)
        const pendingSegRemaining = s.pending.slice(1).reduce((sum, idx) => sum + (segPerChapter[idx] || 1), 0);
        const totalSegRemaining = currentSegRemaining + pendingSegRemaining;
        const eta = avgSegment * totalSegRemaining;
        const status = s.phase === 'paused' ? '⏸ 已暂停' : '正在生成';
        const segInfo = s.pendingChapterSegments > 1
            ? ` · 本章 ${s.completedChapterSegments}/${s.pendingChapterSegments} 段`
            : '';
        body.innerHTML = `${status}第 <strong>${done + 1}</strong> / ${total} 章${segInfo} · 预计剩余 ${fmt(eta / 1000)}
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
        body.textContent = `第 ${index + 1} 章失败:${error}`;
        actions.innerHTML = `<button class="toolbar-btn primary" data-batch-action="retry">重试第 ${index + 1} 章</button>
            <button class="toolbar-btn" data-batch-action="cancel">终止</button>`;
        return;
    }

    attachBatchActionHandlers();
}

function attachBatchActionHandlers() {
    // Kept as a no-op for callers that haven't been updated to use the
    // delegated handler installed once in renderBatchCard. Safe to delete
    // once all external references are gone.
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
    // 预计算每章段数 (用于 ETA 估算)
    batchState.segmentsPerChapter = indexes.map((i) => {
        const c = project.chapters[i];
        const tw = parseInt(detectChapterTargetWords(c) || '2500', 10);
        return Math.max(1, Math.ceil(tw / 2500));
    });
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

    const CONCURRENCY = 5; // 5 章同时跑, 5x 加速 (用户确认接受 429 风险)

    while (batchState.pending.length > 0) {
        if (batchState.phase === 'idle' || batchState.phase === 'done' || batchState.phase === 'paused') return;
        // 取一批 N 章
        const batch = batchState.pending.slice(0, CONCURRENCY);
        const t0 = Date.now();
        try {
            // 并发跑这一批
            const results = await Promise.allSettled(batch.map(idx => aiBatchWriteOne(project, idx)));
            // 记录整章耗时
            batchState.chapterDurations = batchState.chapterDurations || [];
            batchState.chapterDurations.push(Date.now() - t0);
            // 处理结果: 成功 push 到 completed, 失败 push 到 failedAt (但继续)
            for (let i = 0; i < batch.length; i++) {
                const idx = batch[i];
                const r = results[i];
                // 从 pending 移除 (无论成功失败)
                batchState.pending.shift();
                if (r.status === 'fulfilled') {
                    batchState.completed.push(idx);
                } else {
                    // 失败: 记录但不中断 batch
                    console.warn(`第 ${idx + 1} 章失败:`, r.reason?.message);
                    batchState.failedAt = batchState.failedAt || { index: idx, error: r.reason?.message };
                }
            }
            renderOutlineTab();
            renderBatchCard();
            // 章间无 throttle (5 章并发已分散请求, 章间再 1s 限流更稳)
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            // 不应该到这里 (Promise.allSettled 不会 throw)
            console.error('aiBatchRun unexpected error:', e);
            batchState.failedAt = { index: batch[0], error: e.message };
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
    const targetWords = parseInt(detectChapterTargetWords(chapter) || '2500', 10);
    const chunkSize = 1500; // 减小段大小, AI 一次返回更快 (2500 -> 1500, 段数约 +1.6x 但单段时间减半)
    const totalChunks = Math.max(1, Math.ceil(targetWords / chunkSize));
    const isLongChapter = totalChunks > 1;

    const systemPrompt = buildWriteSystemPrompt(project, chapter);

    // 上文衔接: 仅当 idx > 0 时的前章末尾 (用于章内第 1 段)
    // 章内并发段不依赖前段实际内容 - 牺牲一定衔接性换 2x 加速
    let accumulatedContent = chapter.content?.trim() || '';
    const prev = idx > 0 ? project.chapters[idx - 1] : null;
    const crossTail = prev?.content?.trim() ? prev.content.trim().slice(-200) : '';

    // 构建每段 prompt
    const buildPrompt = (chunkIdx) => {
        const isFirst = chunkIdx === 0;
        const isLast = chunkIdx === totalChunks - 1;
        const wordsThisChunk = isLast
            ? Math.max(1000, targetWords - chunkSize * (totalChunks - 1))  // last chunk may be smaller
            : chunkSize;
        // 章内段并发: 不传前段实际内容, 只传 crossTail (前章末尾)
        const tail = isFirst ? crossTail : '';
        const outlineContext = buildOutlineContext(project, idx);
        return `${outlineContext}
${tail ? `\n\n【衔接上文】\n…${tail}` : ''}

${isLongChapter ? `\n【长章节分段】本章共 ${targetWords}字,这是第 ${chunkIdx + 1}/${totalChunks} 段,本段约 ${wordsThisChunk}字。\n` : ''}请基于全书大纲${tail ? '和上文衔接' : ''},${isFirst ? '开始写本章' : '继续写本章'}正文（约${wordsThisChunk}字,允许 ±20% 浮动），严格遵循本章大纲规划的情节走向,输出纯正文不要任何解释或注释。`;
    };

    // 单段执行函数
    const runSegment = async (chunkIdx) => {
        if (batchState.abort && batchState.abort.signal && batchState.abort.signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        const segStart = Date.now();
        const text = await NovelLLMClient.callAI(aiSettings,[{ role: 'user', content: buildPrompt(chunkIdx) }], systemPrompt);
        if (!text || !text.trim()) throw new Error(`第 ${idx + 1} 章第 ${chunkIdx + 1} 段 AI 返回内容为空`);
        batchState.durations.push(Date.now() - segStart);
        return { chunkIdx, text: text.trim() };
    };

    // 章内段并发 2 批
    const CONCURRENCY = 2;
    for (let batch = 0; batch < totalChunks; batch += CONCURRENCY) {
        if (batchState.abort && batchState.abort.signal && batchState.abort.signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        // 构造这一批的段索引
        const batchSegs = [];
        for (let k = 0; k < CONCURRENCY && batch + k < totalChunks; k++) {
            batchSegs.push(batch + k);
        }
        // 并发跑这一批
        const results = await Promise.allSettled(batchSegs.map(i => runSegment(i)));
        // 检查 + 合并结果
        const sorted = results
            .map((r, idx) => ({ r, chunkIdx: batchSegs[idx] }))
            .filter(x => x.r.status === 'fulfilled')
            .sort((a, b) => a.chunkIdx - b.chunkIdx);
        if (sorted.length === 0) {
            // 全部失败, 抛首个错误
            const first = results.find(x => x.r.status === 'rejected');
            throw first.r.reason;
        }
        // 按顺序 append
        for (const { r } of sorted) {
            const { text } = r.value;
            accumulatedContent = accumulatedContent
                ? accumulatedContent + '\n\n' + text
                : text;
        }
        // 持久化 (一节/批写一次)
        chapter.content = accumulatedContent;
        chapter.lastEditedAt = Date.now();
        const all = safeLoadProjects();
        all[projectIndex] = project;
        project.lastEditedAt = new Date().toISOString();
        localStorage.setItem('moyun_projects', JSON.stringify(all));
        // UI 段数更新
        if (isLongChapter) {
            const segmentsDone = Math.min(batch + CONCURRENCY, totalChunks);
            batchState.pendingChapterSegments = totalChunks;
            batchState.completedChapterSegments = segmentsDone;
            renderBatchCard();
        }
        // 批间节流 1s (避免连续批瞬间打 2 请求)
        if (batch + CONCURRENCY < totalChunks) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // Extract characters + world setting from the now-complete chapter
    try {
        const extracted = await aiExtractFromChapter(project, chapter);
        mergeExtractedEntities(project, extracted);
    } catch (e) {
        console.warn(`第 ${idx + 1} 章实体提取失败:`, e);
    }

    // 质量评估 (前端指标, 0 token)
    try {
        const metrics = analyzeChapterQuality(chapter);
        const overallScore = calculateOverallScore(metrics);
        chapter.quality = { metrics, score: overallScore, aiReview: null };
        // 同步到 localStorage
        const all = safeLoadProjects();
        all[projectIndex] = project;
        localStorage.setItem('moyun_projects', JSON.stringify(all));
    } catch (e) {
        console.warn(`第 ${idx + 1} 章质量评估失败:`, e);
    }

    renderBatchCard();
    return accumulatedContent;
}

async function aiExtractFromChapter(project, chapter) {
    // Skip extraction on the stub provider — it returns prose, not JSON,
    // and we don't want to seed fake characters from it.
    if (aiSettings.provider === 'local') return { newCharacters: [], newWorldSetting: {} };

    const systemPrompt = '你是一个小说实体抽取助手。从给定章节正文中抽取首次出现的角色和世界设定,只输出 JSON。';
    const knownNames = (project.characters || []).map(c => c.name).filter(Boolean).join('、');
    const userPrompt = `从以下章节抽取新角色和世界设定。

【已知角色（不要重复）】${knownNames || '（暂无）'}

【章节正文】
${chapter.content}

输出格式（仅返回 JSON，不要其它文字）：
{
  "newCharacters": [
    {"name": "角色名", "role": "主角/配角/反派", "description": "一句话描述（含外貌/性格/身份）"}
  ],
  "newWorldSetting": {
    "era": "时代背景（如：现代/架空王朝）",
    "society": "社会环境",
    "geography": "地理设定",
    "rules": "特殊规则/力量体系/江湖规矩"
  }
}

规则：
- newCharacters 只包含本章新出现的角色（已知角色不要重复）
- 如果本章没有新角色，newCharacters 为空数组
- newWorldSetting 只填本章有补充的字段，没提到的留空字符串`;

    const raw = await NovelLLMClient.callAI(aiSettings,[{ role: 'user', content: userPrompt }], systemPrompt);
    return parseExtractionJson(raw);
}

function parseExtractionJson(raw) {
    const result = { newCharacters: [], newWorldSetting: {} };
    if (!raw) return result;
    // Strip <think> blocks and code fences
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```[\s\S]*?```/g, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return result;
    try {
        const data = JSON.parse(m[0]);
        if (Array.isArray(data.newCharacters)) {
            result.newCharacters = data.newCharacters
                .filter(c => c && c.name)
                .map(c => ({
                    name: String(c.name).trim(),
                    role: String(c.role || '配角').trim(),
                    description: String(c.description || '').trim()
                }));
        }
        if (data.newWorldSetting && typeof data.newWorldSetting === 'object') {
            const w = data.newWorldSetting;
            result.newWorldSetting = {
                era: String(w.era || '').trim(),
                society: String(w.society || '').trim(),
                geography: String(w.geography || '').trim(),
                rules: String(w.rules || '').trim()
            };
        }
    } catch { /* keep result empty */ }
    return result;
}

function mergeExtractedEntities(project, extracted) {
    if (!project.characters) project.characters = [];
    if (!project.worldSetting) project.worldSetting = {};

    // Dedup characters by name (case-insensitive)
    const existing = new Set(project.characters.map(c => (c.name || '').toLowerCase()));
    for (const c of extracted.newCharacters) {
        if (!c.name || existing.has(c.name.toLowerCase())) continue;
        project.characters.push(c);
        existing.add(c.name.toLowerCase());
    }

    // Merge world setting: only overwrite fields that are currently empty
    // (so manual edits aren't clobbered by the model's later guesses).
    const w = extracted.newWorldSetting || {};
    if (w.era && !project.worldSetting.era) project.worldSetting.era = w.era;
    if (w.society && !project.worldSetting.society) project.worldSetting.society = w.society;
    if (w.geography && !project.worldSetting.geography) project.worldSetting.geography = w.geography;
    if (w.rules && !project.worldSetting.rules) project.worldSetting.rules = w.rules;
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

        const raw = await NovelLLMClient.callAI(aiSettings,[{ role: 'user', content: userPrompt }], themePrompt);

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

async function aiPlanOneOutline() {
    const projects = safeLoadProjects();
    const project = projects[projectIndex];
    const chapter = project?.chapters?.[chapterIndex];
    if (!project || !chapter) { showToast('当前项目没有章节', 'error'); return; }

    const btn = document.querySelector('[data-action="plan-one"]');
    if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }

    try {
        const themePrompt = getThemePrompt(project?.type);
        const meta = [
            project.title && `书名：《${project.title}》`,
            project.protagonist && `主角：${project.protagonist}`,
            project.description && `简介：${project.description}`,
            project.tropes?.length && `要素：${project.tropes.join('、')}`,
            project.audience && `目标读者：${project.audience}`
        ].filter(Boolean).join('\n');

        const chapterList = project.chapters.map((c, i) => {
            const has = c.summary?.trim() ? '✓' : '✗';
            return `${i + 1}. ${c.title || `第${i + 1}章`} [${has}]`;
        }).join('\n');

        const userPrompt = `为以下小说的「第 ${chapterIndex + 1} 章 · ${chapter.title || '未命名'}」撰写 80-150 字大纲，说明本章主要情节与冲突。

小说背景：
${meta}

全书章节列表（✓ 表示已有大纲，✗ 表示缺失）：
${chapterList}

要求：仅返回 JSON：{"summary":"..."}`;

        const raw = await NovelLLMClient.callAI(aiSettings,[{ role: 'user', content: userPrompt }], themePrompt);
        let summary = '';
        // Try JSON first; fall back to treating the whole response as prose
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
            try {
                const data = JSON.parse(m[0]);
                if (data.summary) summary = String(data.summary);
            } catch { /* not JSON */ }
        }
        if (!summary) {
            // Strip <think>...</think> and code fences; take the first prose line(s)
            summary = raw
                .replace(/<think>[\s\S]*?<\/think>/g, '')
                .replace(/```[\s\S]*?```/g, '')
                .trim();
        }
        if (!summary) throw new Error('AI 返回内容为空');

        chapter.summary = summary.slice(0, 800);
        const all = safeLoadProjects();
        all[projectIndex] = project;
        localStorage.setItem('moyun_projects', JSON.stringify(all));
        renderOutlineTab();
        showToast(`第 ${chapterIndex + 1} 章大纲已生成`, 'success');
    } catch (error) {
        showToast('大纲生成失败：' + error.message, 'error');
    }

    if (btn) { btn.disabled = false; btn.textContent = 'AI 生成此章大纲'; }
}

async function aiPolish() {
    const content = document.getElementById('contentEditor')?.value;
    if (!content) { showToast('请先输入内容', 'error'); return; }

    const btns = document.querySelectorAll('.toolbar-btn');
    const btn = btns[1];
    if (btn) { btn.innerHTML = '<span class="novel-spinner"></span> AI 润色中...'; btn.disabled = true; }

    try {
        const polished = await NovelLLMClient.callAI(aiSettings,[{ role: 'user', content: `润色：\n\n${content}` }], '你是专业的中文写作润色专家。');
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
        const suggestion = await NovelLLMClient.callAI(aiSettings,[{ role: 'user', content: `提供改进建议：\n\n${content.slice(0, 500)}` }], getThemePrompt(project?.type));
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

// ==================== 章节质量评估 (前端指标, 0 token) ====================
//
// 5 个客观指标, 不调 AI, 每次 batch 写完自动跑, 结果存 chapter.quality
// AI 评分 (可选) 触发条件: 任意指标 < 阈值

const QUALITY_THRESHOLDS = {
    wordCountRatio: 0.8,        // 字数达标率 (实际/目标)
    keywordHitRate: 0.5,        // 大纲关键词命中率
    dialogueRatioMax: 0.6,       // 对话比例上限 (> 60% 视为灌水)
    dialogueRatioMin: 0.05,      // 对话比例下限 (< 5% 视为过少)
    sensoryDensity: 0.01,        // 感官词密度下限
    paragraphCount: 3            // 段落数下限
};

const SENSORY_WORDS = {
    // 视觉
    sight: ['看见', '看到', '望去', '注视', '凝视', '瞥见', '俯视', '仰望', '眺望', '视野', '光线', '明亮', '黑暗', '阴影', '灯光', '阳光', '月光', '色彩', '颜色', '红', '黄', '蓝', '白', '黑'],
    // 听觉
    sound: ['听见', '听到', '声音', '响声', '噪音', '寂静', '沉默', '低声', '高声', '呼唤', '喊道', '耳语', '音乐', '笑声', '哭泣', '叹息'],
    // 触觉
    touch: ['抚摸', '触碰', '摩擦', '光滑', '粗糙', '冰冷', '温暖', '温热', '炎热', '冰凉', '刺痛', '柔软', '坚硬', '沉重', '轻盈'],
    // 嗅觉
    smell: ['气味', '味道', '芳香', '臭味', '清香', '腐烂', '汗味', '烟味', '木质', '花香味'],
    // 味觉
    taste: ['甜', '苦', '辣', '酸', '咸', '涩', '鲜美', '苦涩', '清甜', '醇厚']
};

// 提取大纲关键词: 找【】、·、:、，等分隔, 取 2-6 字片段
function extractOutlineKeywords(summary) {
    if (!summary) return [];
    const keywords = new Set();
    // 1. 【】 里的内容 (如 【单章1.4w字】 不算; 但 【核心冲突】算)
    const brackets = summary.matchAll(/【([^】]+)】/g);
    for (const m of brackets) {
        const t = m[1].trim();
        if (!/\d/.test(t) && t.length >= 2 && t.length <= 8) {
            keywords.add(t);
        }
    }
    // 2. 冒号/句号/逗号/分号/换行/空格 后的人名/地名/事物 (2-5 字)
    const parts = summary.split(/[。:：,，;；\n\s]+/);
    for (const p of parts) {
        const t = p.trim();
        if (t.length >= 2 && t.length <= 5 && !/\d/.test(t) && !/字$/.test(t) && !/主线|剧情|支线|弱|强/.test(t)) {
            keywords.add(t);
        }
    }
    return [...keywords].slice(0, 20);  // 最多 20 个关键词
}

// 数对话字符数 (中英文双引号 + 中文引号)
function countDialogueChars(text) {
    if (!text) return 0;
    const matches = text.match(/[「」"""][^「」"""]*[「」"""]/g) || [];
    return matches.reduce((sum, m) => sum + m.length, 0);
}

// 数段落数 (按双换行分)
function countParagraphs(text) {
    if (!text) return 0;
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
}

// 数感官词出现次数
function countSensoryWords(text) {
    if (!text) return { count: 0, density: 0 };
    let count = 0;
    const charCount = text.length;
    for (const words of Object.values(SENSORY_WORDS)) {
        for (const w of words) {
            const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const m = text.match(re);
            if (m) count += m.length;
        }
    }
    return { count, density: charCount > 0 ? count / charCount : 0 };
}

// 主分析函数
function analyzeChapterQuality(chapter) {
    const content = chapter.content || '';
    const summary = chapter.summary || '';
    const targetWords = parseInt(detectChapterTargetWords(chapter) || '2500', 10);
    const actualChars = content.length;
    const actualWords = actualChars;  // 中文按字符计字数

    const wordCountRatio = targetWords > 0 ? actualWords / targetWords : 0;
    const keywords = extractOutlineKeywords(summary);
    const keywordHits = keywords.filter(kw => content.includes(kw));
    const keywordHitRate = keywords.length > 0 ? keywordHits.length / keywords.length : 1;
    const dialogueChars = countDialogueChars(content);
    const dialogueRatio = actualChars > 0 ? dialogueChars / actualChars : 0;
    const paragraphCount = countParagraphs(content);
    const sensory = countSensoryWords(content);

    // 是否需要 AI 复评
    const needsAiReview = (
        wordCountRatio < QUALITY_THRESHOLDS.wordCountRatio ||
        keywordHitRate < QUALITY_THRESHOLDS.keywordHitRate ||
        dialogueRatio > QUALITY_THRESHOLDS.dialogueRatioMax ||
        dialogueRatio < QUALITY_THRESHOLDS.dialogueRatioMin ||
        sensory.density < QUALITY_THRESHOLDS.sensoryDensity ||
        paragraphCount < QUALITY_THRESHOLDS.paragraphCount
    );

    return {
        wordCount: actualWords,
        targetWords,
        wordCountRatio: Math.round(wordCountRatio * 1000) / 1000,
        keywords,
        keywordHits,
        keywordHitRate: Math.round(keywordHitRate * 1000) / 1000,
        dialogueRatio: Math.round(dialogueRatio * 1000) / 1000,
        sensoryCount: sensory.count,
        sensoryDensity: Math.round(sensory.density * 10000) / 10000,
        paragraphCount,
        needsAiReview,
        analyzedAt: new Date().toISOString()
    };
}

// 给章节质量打分 (纯前端 0-10, 不调 AI)
function calculateOverallScore(metrics) {
    let score = 0;
    let weight = 0;
    // 字数 (25%)
    const wordScore = Math.min(1, metrics.wordCountRatio) * 10;
    score += wordScore * 0.25; weight += 0.25;
    // 关键词 (20%)
    score += metrics.keywordHitRate * 10 * 0.2; weight += 0.2;
    // 对话比例 (15%) - 中间值 15-30% 最佳
    let dialogueScore = 5;
    if (metrics.dialogueRatio >= 0.1 && metrics.dialogueRatio <= 0.35) {
        dialogueScore = 10;
    } else if (metrics.dialogueRatio >= 0.05 && metrics.dialogueRatio <= 0.5) {
        dialogueScore = 7;
    }
    score += dialogueScore * 0.15; weight += 0.15;
    // 感官词 (20%)
    const sensoryScore = Math.min(1, metrics.sensoryDensity / 0.02) * 10;
    score += sensoryScore * 0.2; weight += 0.2;
    // 段落数 (10%)
    const paraScore = Math.min(1, metrics.paragraphCount / 20) * 10;
    score += paraScore * 0.1; weight += 0.1;
    // 字数达标率额外奖励 (10%)
    if (metrics.wordCountRatio >= 0.95) score += 10 * 0.1;
    else if (metrics.wordCountRatio >= 0.8) score += 7 * 0.1;
    weight += 0.1;
    return Math.round((score / weight) * 10) / 10;
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', init);