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
    // 先去掉所有反斜杠 (中文输入法把半角点转义成 \. )
    const blob = (title + ' ' + summary).replace(/\\/g, '');
    // 1.4w / 2.5w / 1万 / 1.2万 / 8000字 / 12000字
    const wanMatch = blob.match(/(\d+(?:\.\d+)?)\s*[wW万]\s*字?/);
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
    // 自动回填缺失的 quality (旧章节没存 或 老 shape 缺 description 字段)
    let needSave = false;
    chapters.forEach(ch => {
        if (ch.content && needsReanalysis(ch.quality)) {
            const m = analyzeChapterQuality(ch);
            const oldAiReview = ch.quality?.aiReview || null;
            ch.quality = { metrics: m, score: calculateOverallScore(m), aiReview: oldAiReview };
            needSave = true;
        }
    });
    if (needSave) {
        const all = safeLoadProjects();
        all[projectIndex] = project;
        localStorage.setItem('moyun_projects', JSON.stringify(all));
    }
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
        const targetStatus = m.wordCountRatio >= QUALITY_THRESHOLDS.wordCountRatio ? 'is-ok' : 'is-warn';
        const keywordPct = Math.round(m.keywordHitRate * 100);
        const keywordStatus = m.keywordHitRate >= QUALITY_THRESHOLDS.keywordHitRate ? 'is-ok' : 'is-warn';
        const dialoguePct = Math.round(m.dialogueRatio * 100);
        const dialogueStatus = m.dialogueRatio >= QUALITY_THRESHOLDS.dialogueRatioMin && m.dialogueRatio <= QUALITY_THRESHOLDS.dialogueRatioMax ? 'is-ok' : 'is-warn';
        const paraStatus = m.paragraphCount >= QUALITY_THRESHOLDS.paragraphCount ? 'is-ok' : 'is-warn';
        const d = m.description.densities;
        const descChips = [
            { emoji: '🏃', label: '动作', value: (d.action * 100).toFixed(2) + '%',
              ok: d.action >= QUALITY_THRESHOLDS.descActionMin },
            { emoji: '🌄', label: '景物', value: (d.scenery * 100).toFixed(2) + '%',
              ok: d.scenery >= QUALITY_THRESHOLDS.descSceneryMin },
            { emoji: '💭', label: '心理', value: (d.psychology * 100).toFixed(2) + '%',
              ok: d.psychology >= QUALITY_THRESHOLDS.descPsychologyMin },
            { emoji: '🪶', label: '白描', value: Math.round(d.whiteSpace * 100) + '%',
              ok: d.whiteSpace >= QUALITY_THRESHOLDS.descWhiteSpaceMin },
            { emoji: '👁', label: '视觉', value: (d.visual * 100).toFixed(2) + '%',
              ok: d.visual >= QUALITY_THRESHOLDS.descVisualMin },
            { emoji: '👂', label: '听觉', value: (d.audio * 100).toFixed(2) + '%',
              ok: d.audio >= QUALITY_THRESHOLDS.descAudioMin },
            { emoji: '✋', label: '触觉', value: (d.touch * 100).toFixed(2) + '%',
              ok: d.touch >= QUALITY_THRESHOLDS.descTouchMin }
        ];
        const descHtml = descChips.map(c =>
            `<div class="quality-item-metric ${c.ok ? 'is-ok' : 'is-warn'}">${c.emoji} ${c.label} ${c.value}</div>`
        ).join('');
        return `<div class="quality-item" onclick="selectChapterByIndex(${i})">
            <div class="quality-item-head">
                <div class="quality-item-title">${escapeHtml(c.title)}</div>
                <div class="quality-item-score ${scoreClass}">${score}</div>
            </div>
            <div class="quality-item-metrics">
                ${descHtml}
                <div class="quality-item-metric ${targetStatus}">📝 字数 ${m.wordCount}/${m.targetWords} (${targetPct}%)</div>
                <div class="quality-item-metric ${keywordStatus}">🔑 关键词 ${m.keywordHits.length}/${m.keywords.length} (${keywordPct}%)</div>
                <div class="quality-item-metric ${dialogueStatus}">💬 对话 ${dialoguePct}%</div>
                <div class="quality-item-metric ${paraStatus}">¶ 段落 ${m.paragraphCount}</div>
            </div>
            ${c.quality.aiReview ? renderAiReview(c.quality.aiReview) : ''}
            <button class="quality-item-btn" onclick="event.stopPropagation(); triggerAIReview(${i})" title="调用 AI 评分 (烧 token)">
                🤖 AI 评分
            </button>
        </div>`;
    }).join('');
}

function renderAiReview(review) {
    const dims = [
        { key: 'plot', label: '情节' },
        { key: 'character', label: '人物' },
        { key: 'writing', label: '文笔' },
        { key: 'outline', label: '大纲' },
        { key: 'word', label: '字数' }
    ];
    const dimBars = dims.map(d => {
        const s = review[d.key] || 0;
        const w = Math.min(100, s * 10);
        return `<div class="ai-review-dim">
            <span class="ai-review-dim-label">${d.label}</span>
            <div class="ai-review-bar"><div class="ai-review-bar-fill" style="width:${w}%"></div></div>
            <span class="ai-review-dim-score">${s}</span>
        </div>`;
    }).join('');
    const issues = (review.issues || []).map(i => `<li>${escapeHtml(i)}</li>`).join('');
    const suggestions = (review.suggestions || []).map(s => `<li>${escapeHtml(s)}</li>`).join('');
    return `<div class="ai-review" onclick="event.stopPropagation()">
        <div class="ai-review-header">
            <span>🤖 AI 评语</span>
            <span class="ai-review-overall">${review.overall || 0} / 10</span>
        </div>
        <div class="ai-review-dims">${dimBars}</div>
        ${issues ? `<div class="ai-review-section"><b>问题:</b><ul>${issues}</ul></div>` : ''}
        ${suggestions ? `<div class="ai-review-section"><b>建议:</b><ul>${suggestions}</ul></div>` : ''}
        ${review.autoTriggered ? '<div class="ai-review-note">(自动触发)</div>' : ''}
    </div>`;
}

async function triggerAIReview(chapterIndex) {
    if (!confirm('调用 AI 评分? 会消耗 token (约 2000-3000 input + 300 output).')) return;
    const projects = safeLoadProjects();
    const project = projects[projectIndex];
    const chapter = project.chapters[chapterIndex];
    if (!chapter) return;
    if (!chapter.quality?.metrics || needsReanalysis(chapter.quality)) {
        const m = analyzeChapterQuality(chapter);
        const oldAiReview = chapter.quality?.aiReview || null;
        chapter.quality = { metrics: m, score: calculateOverallScore(m), aiReview: oldAiReview };
    }
    showToast('AI 评分中...', 'info', 1500);
    const result = await aiReviewChapter(chapter, chapter.quality.metrics);
    if (result.ok) {
        chapter.quality.aiReview = result.review;
        chapter.quality.aiReview.autoTriggered = false;
        const all = safeLoadProjects();
        all[projectIndex] = project;
        localStorage.setItem('moyun_projects', JSON.stringify(all));
        showToast('AI 评分完成', 'success');
        renderQualityTab();
    } else {
        showToast(`AI 评分失败: ${result.error}`, 'error');
    }
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
        // 质量要求 (7 维描写驱动, 提升综合分)
        // 提示用自然语言描述, LLM 不擅长精确计数, 改用"句子里要..." "每个场景..."
        const qualityReqs = `
【质量要求 (本段约 ${wordsThisChunk} 字)】
- 字数: 至少 ${wordsThisChunk} 字, 写满, 不要偷懒
- 对话: 本段须含 3-5 段对话, 推进情节或揭示人物
- 7 维描写 (本段每个场景都要撒, 不要只堆一维):
  * 动作描写: 句子里要穿插具体肢体动作 — 走/跑/转身/推开/抓住/站起身/跌倒/挥手/抬眼/喘气/颤抖, 让读者看见人在动
  * 景物描写: 每个场景都要有环境锚点 — 山/树/光/风/雨/雪/路/灯火/雾气/窗/院落, 配合季节/天气/时辰, 不要让场景悬空
  * 心理描写: 角色有反应时必须写内在活动 — 心想/觉得/感到/意识到/犹豫/心慌/愤怒/害怕, 避免"他很伤心"直白, 改为"他心里一沉"或具体动作暗示
  * 视觉: 看见/看到/目光/影子/色彩/光亮/眉眼/轮廓 等, 让读者看见画面
  * 听觉: 听见/声音/寂静/脚步/笑/哭/风声/雨声/门响 等, 让读者听见声音
  * 触觉: 冰冷/温暖/粗糙/光滑/刺痛/沉重/湿/紧 等, 让读者感到温度和质地
  * 白描/留白: 每章留 2-3 个 1-2 句的短段 (每句 ≤18 字), 不用"很/非常/特别"等修饰词, 不用"命运/灵魂/永恒"等抽象词, 让句子有呼吸感
- 展示而非告诉: "他很伤心" → "他眼眶一热, 转身背过去" (具体动作替代抽象情绪)
- 对话个性化: 每个角色有自己语气习惯 (常用词/句长/口头禅)
- 段落交替: 长段描写与白描短段交替, 既不全是长段也不全是短段堆砌`;
        return `${outlineContext}
${tail ? `\n\n【衔接上文】\n…${tail}` : ''}

${isLongChapter ? `\n【长章节分段】本章共 ${targetWords}字,这是第 ${chunkIdx + 1}/${totalChunks} 段,本段约 ${wordsThisChunk}字。\n` : ''}${qualityReqs}

请基于全书大纲${tail ? '和上文衔接' : ''},${isFirst ? '开始写本章' : '继续写本章'}正文,严格遵循本章大纲规划的情节走向,输出纯正文不要任何解释或注释。`;
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
        // 异常时调 AI 评分 (烧 token, 仅 needsAiReview=true 且 AI 已配)
        if (metrics.needsAiReview && aiSettings?.apiKey && aiSettings.provider !== 'local') {
            try {
                const result = await aiReviewChapter(chapter, metrics);
                if (result.ok) {
                    chapter.quality.aiReview = result.review;
                    chapter.quality.aiReview.autoTriggered = true;
                    const all2 = safeLoadProjects();
                    all2[projectIndex] = project;
                    localStorage.setItem('moyun_projects', JSON.stringify(all2));
                }
            } catch (e) {
                console.warn(`第 ${idx + 1} 章 AI 评分失败:`, e);
            }
        }
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
// 7 维描写评估 (动作/景物/心理/白描/视觉/听觉/触觉) + 4 维结构指标 (字数/关键词/对话/段落).
// 综合分 100% 反映描写; 结构指标仅作 needsAiReview 异常触发器.
// AI 评分 (plot/character/writing/outline/word) 独立, 主观判断, 不与前端混算.

const QUALITY_THRESHOLDS = {
    // 7 维描写密度下限 (任一不及格则 needsAiReview)
    descActionMin: 0.008,         // 动作描写
    descSceneryMin: 0.005,        // 景物描写
    descPsychologyMin: 0.005,     // 心理描写
    descWhiteSpaceMin: 0.10,      // 白描/留白 (10% 段落)
    descVisualMin: 0.008,         // 视觉描写
    descAudioMin: 0.003,          // 听觉描写
    descTouchMin: 0.002,          // 触觉描写
    // 4 维结构异常 (沿用, 略放宽)
    wordCountRatio: 0.7,          // 字数达标率
    keywordHitRate: 0.4,          // 大纲关键词命中率
    dialogueRatioMax: 0.65,       // 对话比例上限
    dialogueRatioMin: 0.03,       // 对话比例下限
    paragraphCount: 2             // 段落数下限
};

const DESCRIPTION_DICTIONARIES = {
    // 1. 动作描写: 身体位移 + 肢体动作 + 状态变化
    action: [
        '走', '走去', '走来', '走开', '走近', '走过', '路过', '踏入', '跨入', '进入', '离开',
        '转身', '回头', '迈步', '踏出', '踏进', '起身', '站起', '坐下', '躺下', '蹲下',
        '跑', '跑来', '跑去', '奔跑', '冲', '冲出', '冲进', '追', '追来', '追去', '逃', '逃走', '逃开', '逃进',
        '跳', '跳起', '跳下', '跃', '跃起', '扑', '扑向', '扑倒', '跌', '跌倒', '摔倒', '滚', '滚落',
        '抓', '抓住', '抓紧', '握', '握住', '握手',
        '推', '推开', '推进', '推倒', '拽', '拉', '拉住', '拉起', '拉回',
        '扯', '扯开', '抽', '抽出', '抬手', '举手', '挥手', '挥拳', '挥刀',
        '举', '举起', '抬', '抬起', '放下', '按', '按住', '按下', '摸', '摸出',
        '打', '打到', '打中', '拍', '拍了', '击', '击中', '砍', '砍去', '劈', '刺', '踢', '踢中',
        '扭头', '侧身', '弯腰', '俯身', '挺身', '倒地', '昏倒',
        '抖', '发抖', '颤抖', '颤动', '战栗', '摇晃', '晃荡', '震动',
        '点头', '摇头', '抬眼', '低头', '仰头', '抬头', '侧头', '回眸', '转眼',
        '睁', '睁开', '眯', '眯起', '睁大', '闭上', '合上', '张嘴', '闭嘴',
        '呼吸', '喘气', '喘息', '叹气', '咳嗽',
        '站定', '站住', '站稳', '停住', '停下', '止步', '驻足'
    ],

    // 2. 景物描写: 自然/建筑/天气/光影/空间
    scenery: [
        '山', '山峰', '山顶', '山脚', '山腰', '山谷', '山崖', '山岭', '山脉', '山峦', '山丘', '山冈',
        '河', '河流', '溪', '溪流', '湖', '湖泊', '湖面', '海', '海面', '海浪', '波涛',
        '江', '江面', '水面', '池塘', '潭', '瀑布',
        '树', '树木', '树林', '树荫', '树影', '树枝', '树叶', '树梢', '树干', '古树',
        '花', '鲜花', '花瓣', '花朵', '花丛', '花园', '花坛', '野花', '花影',
        '草', '草地', '草原', '青草', '野草', '草丛', '草叶',
        '森林', '密林', '竹林', '松林', '林间', '林中',
        '阳光', '日光', '光', '光线', '光亮', '光影', '光芒', '光晕', '反光', '晨光', '暮光',
        '月光', '星光', '灯火', '灯光', '火光', '烛光', '晨曦', '暮色', '霞光', '朝霞', '晚霞',
        '阴影', '阴翳', '影子', '暗影', '树影', '人影', '黑影',
        '雾', '雾气', '云雾', '烟', '烟雾', '炊烟', '云', '云层', '云朵', '云彩',
        '风', '微风', '清风', '寒风', '晚风', '晨风', '凉风', '暖风', '风起', '风声',
        '雨', '雨水', '细雨', '大雨', '小雨', '阵雨', '雨丝', '雨滴', '雨声', '雨点',
        '雪', '雪花', '雪片', '白雪', '飞雪', '大雪', '小雪', '残雪', '雪地', '雪景',
        '霜', '霜雪', '露', '露水', '冰', '冰霜',
        '天', '天空', '天际', '天边', '天色', '苍穹', '大地', '旷野', '原野', '荒原',
        '太阳', '朝阳', '落日', '夕阳', '残阳', '月亮', '明月', '圆月', '残月', '星星', '星辰',
        '路', '道路', '小路', '山路', '大道', '长路', '路口',
        '城', '城墙', '城镇', '村庄', '村落', '宫殿', '庙宇', '寺庙', '楼阁', '高楼',
        '门', '大门', '城门', '房门', '窗户', '窗', '屋檐', '屋脊', '屋顶', '院落', '院子',
        '桌子', '椅子', '床', '床榻', '书架'
    ],

    // 3. 心理描写: 认知/情绪/意志
    psychology: [
        '想', '心想', '想到', '想起', '想去',
        '觉得', '感到', '感觉', '意识到', '明白', '懂', '懂得', '知道', '得知', '晓得',
        '认为', '以为', '猜', '猜测', '猜想', '怀疑', '确信', '相信', '信任',
        '回忆', '忆起', '记起', '记得', '记住', '忘记', '忘掉', '忘却',
        '思考', '思索', '思量', '琢磨', '揣摩', '盘算', '考虑', '思忖', '沉思', '思虑',
        '决定', '决心', '犹豫', '迟疑', '踌躇', '动摇', '挣扎', '纠结', '矛盾',
        '心', '心中', '心里', '内心', '心底', '心头', '心间', '心田', '心坎',
        '心绪', '心情', '情绪', '心境', '心思', '念头', '想法',
        '喜悦', '欢喜', '高兴', '快乐', '愉快', '开心', '欣喜', '欣慰', '满足', '幸福',
        '悲伤', '伤心', '难过', '悲痛', '哀伤', '痛苦', '忧', '忧郁', '郁闷', '愁', '忧愁', '惆怅',
        '愤怒', '恼怒', '怒火', '怒气', '愤恨', '恨', '怨恨', '恼火', '气愤',
        '恐惧', '害怕', '畏惧', '惊恐', '惊慌', '惊惧', '惶恐', '恐慌', '怕', '怯',
        '紧张', '不安', '焦虑', '烦躁', '心烦', '焦急', '急切', '心急',
        '失望', '绝望', '无奈', '无助', '孤独', '寂寞', '空虚', '茫然', '迷惘', '困惑',
        '羞', '羞愧', '惭愧', '愧疚', '后悔', '懊悔', '悔恨', '心疼', '心痛', '心酸'
    ],

    // 4. 白描/留白: 词典为空, 由 computeWhiteSpaceScore 结构法计算
    whiteSpace: [],

    // 5. 视觉描写
    visual: [
        '看见', '看到', '望去', '注视', '凝视', '盯着', '盯住', '瞥见', '扫视',
        '俯视', '俯看', '仰望', '仰视', '眺望', '望见', '望到',
        '视野', '视线', '眼角', '眼底', '眼前', '眼帘', '目送',
        '明亮', '黑暗', '昏黄', '暗淡', '黯淡', '耀目', '刺眼', '刺目', '亮堂', '昏暗',
        '光线', '光影', '光点', '光斑', '光束', '折光',
        '灯', '灯光', '灯火', '烛', '烛光', '油灯', '灯笼', '灯盏',
        '阴影', '阴翳', '影子', '暗影', '虚影', '残影', '幻影',
        '色彩', '颜色', '红色', '黄色', '蓝色', '白色', '黑色', '绿色', '紫色', '灰色', '彩色',
        '红', '黄', '蓝', '白', '黑', '绿', '紫', '灰', '粉', '橙', '金', '银', '棕',
        '清澈', '清晰', '朦胧', '模糊', '透明', '澄澈',
        '样子', '模样', '形态', '形状', '外形', '轮廓', '身影', '容貌', '容颜', '面容', '面庞',
        '眉', '眉毛', '眼眸', '眼睛', '目光', '眼神', '瞳孔', '眼波',
        '面孔', '脸色', '面色', '面颊', '脸颊', '嘴角', '嘴唇',
        '发', '头发', '长发', '短发', '黑发', '白发', '青丝', '鬓发',
        '身材', '身形', '身姿', '体态'
    ],

    // 6. 听觉描写
    audio: [
        '听见', '听到', '听闻', '耳中', '耳畔', '耳里', '耳旁', '耳边', '入耳',
        '声音', '响声', '声响', '噪音', '噪声', '寂静', '沉寂', '沉静',
        '沉默', '默默', '默然', '无声', '悄然', '静默',
        '低声', '高声', '大声', '小声', '轻声', '细声', '微声',
        '呼唤', '呼喊', '喊', '喊道', '叫', '叫喊', '吼', '吼叫', '呼叫', '大喊',
        '耳语', '私语', '低语', '喃喃', '呢喃', '嘀咕', '嘟囔',
        '音乐', '歌声', '唱', '唱起', '唱了', '乐曲', '琴声', '笛声', '箫声', '鼓声',
        '笑', '大笑', '笑了', '笑出声', '笑声',
        '哭', '哭泣', '哭声', '抽泣', '啜泣', '呜咽', '哭喊',
        '叹气', '叹息', '感慨', '感叹', '长叹',
        '叮当', '叮咚', '噼啪', '哗啦', '轰鸣', '响', '响起', '响彻', '回荡',
        '砰', '哐当', '咔嚓', '嘶嘶', '嗖嗖', '簌簌', '窸窣',
        '脚步', '脚步声', '足音', '马蹄', '马蹄声',
        '钟', '钟声', '鼓', '鼓声', '铃声', '铃铛', '铃响'
    ],

    // 7. 触觉描写
    touch: [
        '抚摸', '抚', '抚上', '抚过', '抚着', '触碰', '触', '触到', '接触',
        '摩擦', '摩挲', '蹭', '擦', '擦过', '划过',
        '光滑', '粗糙', '毛糙', '细腻', '柔软', '柔嫩', '柔滑', '坚硬', '硬邦邦',
        '冰冷', '冷', '凉', '冰凉', '寒', '寒冷', '凉飕飕', '冷冰冰',
        '温暖', '温', '温热', '热', '炎热', '滚烫', '烫', '灼热', '暖', '暖意', '暖流', '热乎乎',
        '刺痛', '痛', '疼痛', '疼', '胀痛', '酸痛', '钝痛', '麻', '麻木', '酥麻', '痒', '瘙痒',
        '沉重', '沉', '沉甸甸', '轻', '轻盈', '轻飘飘', '轻巧',
        '湿', '湿润', '潮湿', '干', '干燥', '干涸', '润', '润滑',
        '紧', '紧绷', '松', '松弛', '松软', '松垮'
    ]
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
    // 2. 中文标点分割后, 提取 2-6 字片段 (放宽长度)
    const parts = summary.split(/[。:：,，;；\n\s【】()（）]+/);
    for (const p of parts) {
        const t = p.trim();
        // 放宽: 2-6 字 (含专有名词)
        // 排除: 含数字 / 含"字" / 长噪音词
        if (t.length < 2 || t.length > 6) continue;
        if (/\d/.test(t)) continue;
        if (/字$/.test(t) || /字字/.test(t)) continue;  // "1.4w字" 等
        if (/^(主线|剧情|支线|弱|强|当下|主线|实写|终场|剧场|卷[一二三四五六]|年|全程|自然|剧情)/.test(t)) continue;  // 噪音词
        if (/^[^一-龥a-zA-Z]+$/.test(t)) continue;  // 纯符号/数字
        keywords.add(t);
    }
    return [...keywords].slice(0, 30);
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

// 白描/留白: 1-2 句 + 每句≤18 字 + 无程度副词 + 无抽象名词 的段落占比
function computeWhiteSpaceScore(text) {
    if (!text) return 0;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (!paragraphs.length) return 0;
    const intensifiers = /[很非常特别极其无比相当十分万分格外分外]/;
    const abstracts = /(命运|灵魂|永恒|真理|思想|意识|存在|哲理|本质|奥义|玄机|大道|天道|轮回)/;
    const sentEnd = /[。！？]/g;
    let white = 0;
    for (const para of paragraphs) {
        const trimmed = para.replace(/\s+/g, '');
        const sents = trimmed.split(sentEnd).filter(s => s.length > 0);
        if (!sents.length) continue;
        const allShort = sents.every(s => s.length <= 18);
        const tooMany = sents.length > 2;
        const noIntens = !intensifiers.test(trimmed);
        const noAbs = !abstracts.test(trimmed);
        if (allShort && !tooMany && noIntens && noAbs) white++;
    }
    return white / paragraphs.length;
}

function zeroDescription() {
    const empty = { action: 0, scenery: 0, psychology: 0, whiteSpace: 0, visual: 0, audio: 0, touch: 0 };
    return { counts: { ...empty }, densities: { ...empty }, charCount: 0 };
}

// 7 维描写计数: 6 维词袋 + 1 维白描结构
function countDescription(text) {
    if (!text) return zeroDescription();
    const charCount = text.length;
    const counts = {};
    for (const [dim, words] of Object.entries(DESCRIPTION_DICTIONARIES)) {
        if (dim === 'whiteSpace') continue;
        let c = 0;
        for (const w of words) {
            const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const m = text.match(re);
            if (m) c += m.length;
        }
        counts[dim] = c;
    }
    counts.whiteSpace = computeWhiteSpaceScore(text);
    const densities = {};
    for (const k of Object.keys(counts)) {
        // 6 维词袋: density = 字符密度 (count / charCount)
        // whiteSpace: 已是 0-1 段落比例, 单位不同, 不除以 charCount
        if (k === 'whiteSpace') {
            densities[k] = counts[k];
        } else {
            densities[k] = charCount > 0 ? counts[k] / charCount : 0;
        }
    }
    return { counts, densities, charCount };
}

// 老 quality 记录 (无 description 字段) 需重分析
function needsReanalysis(quality) {
    return !quality?.metrics || !quality.metrics.description;
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
    const description = countDescription(content);

    const d = description.densities;
    // 7 维描写异常 OR 4 维结构异常
    const needsAiReview = (
        d.action < QUALITY_THRESHOLDS.descActionMin ||
        d.scenery < QUALITY_THRESHOLDS.descSceneryMin ||
        d.psychology < QUALITY_THRESHOLDS.descPsychologyMin ||
        d.whiteSpace < QUALITY_THRESHOLDS.descWhiteSpaceMin ||
        d.visual < QUALITY_THRESHOLDS.descVisualMin ||
        d.audio < QUALITY_THRESHOLDS.descAudioMin ||
        d.touch < QUALITY_THRESHOLDS.descTouchMin ||
        wordCountRatio < QUALITY_THRESHOLDS.wordCountRatio ||
        keywordHitRate < QUALITY_THRESHOLDS.keywordHitRate ||
        dialogueRatio > QUALITY_THRESHOLDS.dialogueRatioMax ||
        dialogueRatio < QUALITY_THRESHOLDS.dialogueRatioMin ||
        paragraphCount < QUALITY_THRESHOLDS.paragraphCount
    );

    // 派生: 旧字段 sensoryCount/sensoryDensity = visual+audio+touch (供旧 AI prompt / 旧测试用)
    const legacySensoryCount = description.counts.visual + description.counts.audio + description.counts.touch;
    const legacySensoryDensity = d.visual + d.audio + d.touch;

    return {
        wordCount: actualWords,
        targetWords,
        wordCountRatio: Math.round(wordCountRatio * 1000) / 1000,
        keywords,
        keywordHits,
        keywordHitRate: Math.round(keywordHitRate * 1000) / 1000,
        dialogueRatio: Math.round(dialogueRatio * 1000) / 1000,
        paragraphCount,
        description,
        descriptionDensities: d,
        sensoryCount: legacySensoryCount,
        sensoryDensity: Math.round(legacySensoryDensity * 10000) / 10000,
        needsAiReview,
        analyzedAt: new Date().toISOString()
    };
}

// 给章节质量打分 (纯前端 0-10, 不调 AI): 100% 描写 (7 维加权)
function calculateOverallScore(metrics) {
    const DESC_WEIGHTS = {
        action: 0.18, scenery: 0.18, psychology: 0.18, whiteSpace: 0.12,
        visual: 0.14, audio: 0.10, touch: 0.10
    };
    const TARGET_DENSITY = 0.02;
    let score = 0, weight = 0;
    const d = metrics.description?.densities || {};
    for (const [dim, w] of Object.entries(DESC_WEIGHTS)) {
        const density = d[dim] || 0;
        let dimScore;
        if (dim === 'whiteSpace') {
            dimScore = Math.min(1, density) * 10;
        } else {
            dimScore = Math.min(1, density / TARGET_DENSITY) * 10;
        }
        score += dimScore * w;
        weight += w;
    }
    return Math.round((score / weight) * 10) / 10;
}

// AI 评分: 烧 token, 仅在 needsAiReview=true 或手动触发
async function aiReviewChapter(chapter, metrics) {
    if (typeof NovelLLMClient === 'undefined' || !NovelLLMClient.callAI) {
        return { ok: false, error: 'AI 未配置' };
    }
    if (aiSettings.provider === 'local' || !aiSettings.apiKey) {
        return { ok: false, error: 'AI 未配置 token' };
    }
    const systemPrompt = '你是文学评论家. 严格按 JSON 输出, 字段名固定: plot/character/writing/outline/word/overall/issues/suggestions. issues 与 suggestions 为字符串数组.';
    const content = chapter.content || '';
    const userPrompt = `【章节标题】${chapter.title || '未命名'}
【目标字数】${metrics.targetWords}
【实际字数】${metrics.wordCount}
【大纲摘要】${(chapter.summary || '').slice(0, 300)}

【章节正文】
${content.slice(0, 4000)}${content.length > 4000 ? '\n...(已截断)' : ''}

【前端指标 (供参考)】
- 关键词命中率: ${(metrics.keywordHitRate * 100).toFixed(0)}%
- 对话比例: ${(metrics.dialogueRatio * 100).toFixed(0)}%
- 感官词密度: ${(metrics.sensoryDensity * 100).toFixed(2)}%

请给以下 5 维评分 (各 0-10, 整数):
1. plot (情节连贯/节奏)
2. character (人物塑造/对话/性格)
3. writing (文笔/细节/感官/文学性)
4. outline (大纲符合度)
5. word (字数达标度)
最后算 overall (5 维平均, 保留 1 位小数)
另外给出 issues (问题数组) 和 suggestions (改进建议数组)

输出严格 JSON 格式:
{"plot":N,"character":N,"writing":N,"outline":N,"word":N,"overall":N.x,"issues":["..."],"suggestions":["..."]}`;
    try {
        const raw = await NovelLLMClient.callAI(aiSettings, [{ role: 'user', content: userPrompt }], systemPrompt);
        // 解析 JSON (容错)
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) return { ok: false, error: 'AI 返回非 JSON' };
        const data = JSON.parse(m[0]);
        // 校验
        const scores = ['plot', 'character', 'writing', 'outline', 'word'];
        for (const k of scores) {
            if (typeof data[k] !== 'number') data[k] = 5;
            data[k] = Math.max(0, Math.min(10, data[k]));
        }
        if (typeof data.overall !== 'number') {
            data.overall = (data.plot + data.character + data.writing + data.outline + data.word) / 5;
        }
        data.overall = Math.round(data.overall * 10) / 10;
        return { ok: true, review: { ...data, reviewedAt: new Date().toISOString() } };
    } catch (e) {
        return { ok: false, error: e.message || 'AI 评分失败' };
    }
}

// 触发 AI 评分 (异常时自动, 手动按钮)
async function maybeReviewChapter(project, chapter) {
    if (!chapter.quality?.metrics || needsReanalysis(chapter.quality)) {
        const m = analyzeChapterQuality(chapter);
        const oldAiReview = chapter.quality?.aiReview || null;
        chapter.quality = { metrics: m, score: calculateOverallScore(m), aiReview: oldAiReview };
    }
    const needs = chapter.quality.metrics.needsAiReview;
    const isAIConfigured = aiSettings?.apiKey && aiSettings.provider !== 'local';
    if (needs && isAIConfigured) {
        const result = await aiReviewChapter(chapter, chapter.quality.metrics);
        if (result.ok) {
            chapter.quality.aiReview = result.review;
        }
    }
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', init);