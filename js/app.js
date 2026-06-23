// ==================== MoYun AI - 首页应用逻辑 ====================

// ==================== 工具函数 ====================
// 安全的 localStorage 读取 + JSON.parse，损坏的存储会回到空数组
function safeLoadProjects() {
    try {
        const saved = localStorage.getItem('moyun_projects');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error('加载项目失败（localStorage 可能损坏）:', e);
        return [];
    }
}

function safeLoadUserTemplates() {
    try {
        const saved = localStorage.getItem('moyun_user_templates');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error('加载用户模板失败:', e);
        return [];
    }
}

// ==================== 全局状态 ====================
let projects = [];
let currentProjectIndex = -1;
let currentChapterIndex = -1;

let aiSettings = NovelCommon.DEFAULT_AI_SETTINGS;
let gistSettings = { token: '', gistId: '', lastSync: null };

const GIST_FILENAME = 'moyun_data.json';
let currentFilter = { type: null, search: '', timeSort: 'desc' };
let currentView = 'grid';

// ==================== 初始化 ====================
function init() {
    if (!NovelCommon.requireAuth()) return;
    loadProjects();
    NovelCommon.loadAISettings(aiSettings);
    NovelCommon.loadTheme();
    gistSettings = NovelCommon.loadGistSettings();
    if (gistSettings.autoSyncEnabled === undefined) {
        gistSettings.autoSyncEnabled = true; // default ON
    }
    const autoSyncEl = document.getElementById('autoSyncCheckbox');
    if (autoSyncEl) autoSyncEl.checked = gistSettings.autoSyncEnabled;
    setupAuthActions();
    updateGreeting();
    renderProjects();
    renderRecent();
    updateStats();
    updateAIStatus();
    setupEventListeners();
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentFilter.search = this.value;
            filterProjects();
        });
    }
}

// auth 委托
function requireAuth() { return NovelCommon.requireAuth(); }
function getAuthUser() { return NovelCommon.getAuthUser(); }
function handleLogout() { NovelCommon.handleLogout(); }
function setupAuthActions() { NovelCommon.setupAuthActions(); }

function toggleAutoSync(enabled) {
    gistSettings.autoSyncEnabled = enabled;
    NovelCommon.saveGistSettings(gistSettings);
    showToast(enabled ? '已开启自动同步' : '已关闭自动同步', 'success');
}

// storage 委托
function loadProjects() {
    projects = NovelCommon.loadProjects();
}

function saveProjects() {
    NovelCommon.saveProjects(projects);
    scheduleAutoSync();
    window.dispatchEvent(new Event('moyun_projects:changed'));
}

// settings 委托
function loadSettings() {
    NovelCommon.loadAISettings(aiSettings);
}

function saveSettingsToStorage() {
    NovelCommon.saveAISettings(aiSettings);
}

// theme 委托
function loadTheme() {
    NovelCommon.loadTheme();
    const sel = document.querySelector('.theme-select');
    if (sel) sel.value = NovelCommon.getTheme();
}

function toggleTheme() {
    const theme = document.querySelector('.theme-select').value;
    NovelCommon.setTheme(theme);
}

// ==================== 问候语 ====================
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '晚上好';
    if (hour >= 5 && hour < 12) greeting = '早上好';
    else if (hour >= 12 && hour < 18) greeting = '下午好';

    const saved = localStorage.getItem('moyun_user_name');
    const name = saved || 'yyy';

    // Welcome strip (replaces old welcome-section h1)
    const stripEl = document.getElementById('welcomeStrip');
    if (stripEl) stripEl.textContent = `${greeting}，${name}`;

    // Backward-compat: legacy greetingText element
    const greetingEl = document.getElementById('greetingText');
    if (greetingEl) greetingEl.textContent = `${greeting}，${name}`;

    // Also update header user name
    const userNameEl = document.querySelector('.user-name');
    const userAvatarEl = document.querySelector('.user-avatar');
    if (userNameEl) userNameEl.textContent = name;
    if (userAvatarEl) userAvatarEl.textContent = name.charAt(0).toUpperCase();
}

// ==================== 渲染函数 ====================
function renderProjects(filterFn) {
    const grid = document.getElementById('novelGrid');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('projectCount');

    if (!grid || !empty || !count) return;

    let filteredProjects = filterFn ? filterFn(projects) : [...projects];
    count.textContent = `(${filteredProjects.length})`;

    if (filteredProjects.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    grid.innerHTML = filteredProjects.map((project) => {
        const originalIndex = projects.indexOf(project);
        return `
        <div class="novel-card" onclick="openProject(${originalIndex})">
            <div class="novel-card__type">${getTypeName(project.type)}</div>
            <div class="novel-card__title">${escapeHtml(project.title)}</div>
            <div class="novel-card__desc">${escapeHtml(project.description || '暂无简介')}</div>
            <div class="novel-card__meta">
                <span>${project.chapters?.length || 0} 章</span>
                <span>${getProjectWordCount(project)} 字</span>
                <div class="novel-card__actions">
                    <button class="novel-card__menu-btn" onclick="event.stopPropagation(); exportProject(${originalIndex})" title="导出项目" aria-label="导出项目">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button class="novel-card__menu-btn" onclick="event.stopPropagation(); deleteProject(${originalIndex})" title="删除项目" aria-label="删除项目">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

function renderRecent() {
    const grid = document.getElementById('recentGrid');
    if (!grid) return;
    const recent = projects
        .filter(p => p.lastEditedAt)
        .sort((a, b) => new Date(b.lastEditedAt) - new Date(a.lastEditedAt))
        .slice(0, 3);
    if (recent.length === 0) {
        NovelStates.render(grid, {
            type: 'empty',
            title: '还没有最近的写作',
            desc: '开始你的第一个项目，最近的进度会显示在这里'
        });
        return;
    }
    grid.innerHTML = recent.map((p) => {
        const idx = projects.indexOf(p);
        const lastDate = p.lastEditedAt ? new Date(p.lastEditedAt).toLocaleString('zh-CN') : '';
        return `
            <div class="novel-card" onclick="openProject(${idx})">
                <span class="novel-card__type">${getTypeName(p.type)}</span>
                <div class="novel-card__title">${escapeHtml(p.title)}</div>
                <div class="novel-card__meta">上次编辑 ${lastDate}</div>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTypeName(type) {
    const types = {
        romance: '言情',
        fantasy: '玄幻',
        xianxia: '仙侠',
        mystery: '悬疑',
        scifi: '科幻',
        wuxia: '武侠',
        urban: '都市',
        historical: '历史',
        horror: '恐怖',
        game: '游戏',
        apocalypse: '末世'
    };
    return types[type] || '其他';
}

function getProjectWordCount(project) {
    if (!project.chapters) return 0;
    return project.chapters.reduce((sum, ch) => sum + (ch.content?.length || 0), 0);
}

function updateStats() {
    const totalNovels = projects.length;
    const totalChapters = projects.reduce((sum, p) => sum + (p.chapters?.length || 0), 0);
    const totalWords = projects.reduce((sum, p) => sum + getProjectWordCount(p), 0);
    const totalChars = projects.reduce((sum, p) => sum + (p.characters?.length || 0), 0);

    const els = ['novelCount', 'chapterCount', 'wordCount', 'charCount'];
    const vals = [totalNovels, totalChapters, totalWords, totalChars];
    els.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = vals[i];
    });
}

// ==================== 搜索和筛选 ====================
function toggleSearch() {
    const searchBar = document.getElementById('searchBar');
    const filterPanel = document.getElementById('filterPanel');
    if (!searchBar || !filterPanel) return;

    if (searchBar.style.display === 'none') {
        searchBar.style.display = 'block';
        filterPanel.style.display = 'none';
        document.getElementById('searchInput')?.focus();
    } else {
        searchBar.style.display = 'none';
        currentFilter.search = '';
        filterProjects();
    }
}

function toggleFilter(filterType) {
    const searchBar = document.getElementById('searchBar');
    const filterPanel = document.getElementById('filterPanel');
    if (!filterPanel) return;

    if (filterPanel.style.display === 'none' || currentFilter.type !== filterType) {
        filterPanel.style.display = 'block';
        if (searchBar) searchBar.style.display = 'none';
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
    if (!content) return;

    if (filterType === 'type') {
        const types = [
            { value: '', label: '全部' },
            { value: 'romance', label: '言情' },
            { value: 'fantasy', label: '玄幻' },
            { value: 'xianxia', label: '仙侠' },
            { value: 'mystery', label: '悬疑' },
            { value: 'scifi', label: '科幻' },
            { value: 'wuxia', label: '武侠' },
            { value: 'urban', label: '都市' },
            { value: 'historical', label: '历史' },
            { value: 'horror', label: '恐怖' },
            { value: 'game', label: '游戏' },
            { value: 'apocalypse', label: '末世' }
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
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    const grid = document.getElementById('novelGrid');

    if (gridBtn) gridBtn.classList.toggle('active', view === 'grid');
    if (listBtn) listBtn.classList.toggle('active', view === 'list');
    if (grid) {
        grid.style.gridTemplateColumns = view === 'list' ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))';
    }
}

// ==================== 模态框 ====================
function openNewNovelModal() {
    window.location.href = 'create.html';
}

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    modal.classList.add('show');
    const providerEl = document.getElementById('apiProvider');
    const apiKeyEl = document.getElementById('apiKeyInput');
    const baseUrlEl = document.getElementById('baseUrlInput');
    const modelEl = document.getElementById('modelInput');
    const tempInput = document.getElementById('temperatureInput');
    const tempVal = document.getElementById('temperatureValue');
    const tokenEl = document.getElementById('githubTokenInput');
    if (providerEl) providerEl.value = aiSettings.provider;
    if (apiKeyEl) apiKeyEl.value = aiSettings.apiKey;
    if (baseUrlEl) baseUrlEl.value = aiSettings.baseUrl;
    if (modelEl) modelEl.value = aiSettings.model;
    if (tempInput) tempInput.value = aiSettings.temperature;
    if (tempVal) tempVal.textContent = aiSettings.temperature;
    if (tokenEl) tokenEl.value = gistSettings.token || '';
    onApiProviderChange();
    updateGistStatus();
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('show');
}

function closeSettingsModalOnOverlay(event) {
    if (event.target.id === 'settingsModal') {
        closeSettingsModal();
    }
}

// 各 provider 的默认 baseUrl（用户切换 provider 时自动填入）
const PROVIDER_BASE_URL_PRESETS = {
    anthropic: 'https://api.anthropic.com',
    openai: 'https://api.openai.com',
    deepseek: 'https://api.deepseek.com',
    // MiniMax Coding Plan 推荐用 Anthropic 兼容 endpoint（已在 minimaxi.com 验证存在）
    minimax: 'https://api.minimaxi.com/anthropic',
    kimi: 'https://api.moonshot.cn',
    glm: 'https://open.bigmodel.cn/api/coding/paas/v4',
    custom: ''
};

function onApiProviderChange() {
    const provider = document.getElementById('apiProvider').value;
    const fields = ['apiKeyGroup', 'baseUrlGroup', 'modelGroup'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = provider === 'local' ? 'none' : 'block';
    });

    // 自动填入默认 baseUrl（仅当字段为空时，避免覆盖用户已填的）
    if (PROVIDER_BASE_URL_PRESETS[provider] !== undefined) {
        const baseUrlInput = document.getElementById('baseUrlInput');
        if (baseUrlInput && !baseUrlInput.value.trim()) {
            baseUrlInput.value = PROVIDER_BASE_URL_PRESETS[provider];
        }
    }
}

function saveSettings() {
    aiSettings.provider = document.getElementById('apiProvider').value;
    aiSettings.apiKey = document.getElementById('apiKeyInput').value;
    aiSettings.baseUrl = document.getElementById('baseUrlInput').value;
    aiSettings.model = document.getElementById('modelInput').value;
    aiSettings.temperature = parseFloat(document.getElementById('temperatureInput').value);

    saveSettingsToStorage();
    closeSettingsModal();
    updateAIStatus();
    showToast('设置已保存！', 'success');
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

// ==================== Gist 同步 ====================
function loadGistSettings() {
    if (gistSettings.token) {
        const input = document.getElementById('githubTokenInput');
        if (input) input.value = gistSettings.token;
    }
    updateGistStatus();
}

function saveGistSettings() {
    NovelCommon.saveGistSettings(gistSettings);
}

function updateGistStatus() {
    const statusEl = document.getElementById('gistStatus');
    const statusText = document.getElementById('gistStatusText');
    const syncBtn = document.getElementById('syncBtn');
    const loadBtn = document.getElementById('loadFromGistBtn');

    if (!statusEl) return;

    if (gistSettings.token) {
        statusEl.style.display = 'block';
        if (syncBtn) syncBtn.disabled = false;
        if (loadBtn) loadBtn.disabled = false;
        if (statusText) {
            if (gistSettings.gistId) {
                statusText.textContent = `✅ 已连接 Gist (ID: ${gistSettings.gistId.slice(0, 8)}...) 上次同步: ${gistSettings.lastSync || '从未'}`;
            } else {
                statusText.textContent = '⚠️ Token 已设置，点击"连接/更新 Gist"创建或更新 Gist';
            }
        }
    } else {
        statusEl.style.display = 'none';
        if (syncBtn) syncBtn.disabled = true;
        if (loadBtn) loadBtn.disabled = true;
    }
}

function getSyncData() {
    return {
        projects: projects,
        aiSettings: aiSettings,
        userTemplates: safeLoadUserTemplates(),
        userName: localStorage.getItem('moyun_user_name') || 'yyy',
        theme: localStorage.getItem('moyun_theme') || 'dark',
        syncTime: new Date().toISOString()
    };
}

async function connectGist() {
    const token = document.getElementById('githubTokenInput').value.trim();
    if (!token) {
        showToast('请输入 GitHub Token', 'error');
        return;
    }

    gistSettings.token = token;
    saveGistSettings();

    try {
        const data = getSyncData();
        const gistData = JSON.stringify(data, null, 2);

        if (gistSettings.gistId) {
            const response = await fetch(`https://api.github.com/gists/${gistSettings.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: '墨韵AI 数据同步',
                    files: { [GIST_FILENAME]: { content: gistData } }
                })
            });

            if (!response.ok) throw new Error(`更新失败 (${response.status})`);

            gistSettings.lastSync = new Date().toLocaleString('zh-CN');
            saveGistSettings();
            updateGistStatus();
            showToast('✅ Gist 已更新！', 'success');
        } else {
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: '墨韵AI 数据同步',
                    public: false,
                    files: { [GIST_FILENAME]: { content: gistData } }
                })
            });

            if (!response.ok) throw new Error(`创建失败 (${response.status})`);

            const result = await response.json();
            gistSettings.gistId = result.id;
            gistSettings.lastSync = new Date().toLocaleString('zh-CN');
            saveGistSettings();
            updateGistStatus();
            showToast('✅ Gist 创建成功！\n\nGist ID: ' + gistSettings.gistId, 'success');
        }
    } catch (error) {
        showToast('❌ Gist 操作失败：' + error.message, 'error');
    }
}

async function syncToGist() {
    if (!gistSettings.token || !gistSettings.gistId) {
        showToast('请先点击"连接/更新 Gist"', 'error');
        return;
    }

    const syncBtn = document.getElementById('syncBtn');
    const originalText = syncBtn.textContent;
    syncBtn.textContent = '同步中...';
    syncBtn.disabled = true;

    try {
        const response = await fetch(`https://api.github.com/gists/${gistSettings.gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${gistSettings.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: '墨韵AI 数据同步',
                files: { [GIST_FILENAME]: { content: JSON.stringify(getSyncData(), null, 2) } }
            })
        });

        if (!response.ok) throw new Error(`同步失败 (${response.status})`);

        gistSettings.lastSync = new Date().toLocaleString('zh-CN');
        saveGistSettings();
        updateGistStatus();
        showToast('✅ 数据已同步到 Gist！', 'success');
    } catch (error) {
        showToast('❌ 同步失败：' + error.message, 'error');
    } finally {
        syncBtn.textContent = originalText;
        syncBtn.disabled = false;
    }
}

// Debounced auto-sync: when data changes, schedule a sync 5s later.
// Only fires if user has set up Gist (token + gistId).
let autoSyncTimer = null;
let lastSyncedProjects = null;
function scheduleAutoSync() {
    if (!gistSettings || !gistSettings.token || !gistSettings.gistId) return;
    if (gistSettings.autoSyncEnabled === false) return; // user disabled
    // Read from localStorage directly so it works even on editor/create
    // pages where the in-memory `projects` array might be stale.
    let current;
    try {
        current = localStorage.getItem('moyun_projects') || '';
    } catch (e) { return; }
    if (!current || current === lastSyncedProjects) return; // no change
    if (autoSyncTimer) clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(async () => {
        autoSyncTimer = null;
        try {
            await syncToGist();
            lastSyncedProjects = current;
            localStorage.setItem(LAST_SYNCED_KEY, current);
        } catch (e) {
            console.warn("[auto-sync] failed", e);
        }
    }, 5000);
}

// Expose for other pages (editor/create) to trigger.
window.NovelAutoSync = { schedule: scheduleAutoSync, perform: performSync };

// Listen to localStorage writes from any page in the same tab
// (other tabs use the native 'storage' event; same tab needs a
// custom event because the browser doesn't dispatch 'storage'
// for self-writes). Also: detect changes that happened on a
// previous page (editor -> home navigation) by comparing the
// current moyun_projects against a cached baseline.
let cachedProjects = null;
const LAST_SYNCED_KEY = 'moyun_projects_last_synced';
function checkForChangesSinceLastVisit() {
    try {
        const current = localStorage.getItem('moyun_projects') || '';
        if (!current) return;
        const lastSynced = localStorage.getItem(LAST_SYNCED_KEY);
        if (lastSynced !== null && current !== lastSynced) {
            // Run the sync directly, in case the user navigates away before
            // the 5s debounce in scheduleAutoSync fires.
            performSync(current);
        }
        if (lastSynced === null) {
            localStorage.setItem(LAST_SYNCED_KEY, current);
        }
    } catch (e) {}
}

async function performSync(snapshot) {
    if (!gistSettings || !gistSettings.token || !gistSettings.gistId) return;
    if (gistSettings.autoSyncEnabled === false) return;
    // Skip if already up to date
    if (snapshot === localStorage.getItem(LAST_SYNCED_KEY)) return;
    try {
        const response = await fetch("https://api.github.com/gists/" + gistSettings.gistId, {
            method: 'PATCH',
            headers: {
                "Authorization": "Bearer " + gistSettings.token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                description: "一页 数据同步",
                files: { [GIST_FILENAME]: { content: JSON.stringify(parseSyncData(snapshot), null, 2) } }
            })
        });
        if (response.ok) {
            localStorage.setItem(LAST_SYNCED_KEY, snapshot);
        } else {
            console.warn("[auto-sync] HTTP", response.status);
        }
    } catch (e) {
        console.warn("[auto-sync] failed", e);
    }
}

function parseSyncData(snapshot) {
    try {
        return { projects: JSON.parse(snapshot), templates: [], lastSync: new Date().toISOString() };
    } catch (e) {
        return { projects: [], templates: [], lastSync: new Date().toISOString() };
    }
}
window.addEventListener('moyun_projects:changed', scheduleAutoSync);
window.addEventListener('storage', (e) => {
    if (e.key === 'moyun_projects') scheduleAutoSync();
});
// Check on every page load (covers editor -> home nav)
checkForChangesSinceLastVisit();

async function loadFromGist() {
    if (!gistSettings.token) {
        showToast('请先输入 Token 并点击"连接/更新 Gist"', 'error');
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
            headers: { 'Authorization': `Bearer ${gistSettings.token}` }
        });

        if (!response.ok) throw new Error('加载失败，请检查 Gist ID 和 Token');

        const result = await response.json();
        const file = result.files[GIST_FILENAME];

        if (!file) throw new Error('Gist 中未找到数据文件');

        const data = JSON.parse(file.content);

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

        showToast('✅ 数据加载成功！', 'success');
    } catch (error) {
        showToast('❌ 加载失败：' + error.message, 'error');
    } finally {
        loadBtn.textContent = originalText;
        loadBtn.disabled = false;
    }
}

// ==================== API 测试 ====================
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
            showToast('✅ 本地模拟模式可用', 'success');
        }, 500);
        return;
    }

    if (!apiKey) {
        testBtn.textContent = originalText;
        testBtn.disabled = false;
        showToast('请先输入 API Key', 'error');
        return;
    }

    if (!model) {
        testBtn.textContent = originalText;
        testBtn.disabled = false;
        showToast('请先输入 Model 名称', 'error');
        return;
    }

    try {
        const detectedProvider = inferApiProfile(baseUrl, model) || provider;
        const endpoint = buildApiEndpoint(baseUrl, detectedProvider, model);
        const headers = buildApiHeaders(detectedProvider, apiKey);
        const body = buildConnectivityTestPayload(detectedProvider, model);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errData.error?.message || errData.error?.code || '未知错误'}`);
        }

        const data = await response.json();
        let reply = '';
        if (detectedProvider === 'anthropic') {
            reply = data.content?.[0]?.text || '';
        } else {
            reply = data.choices?.[0]?.message?.content || '';
        }

        testBtn.textContent = originalText;
        testBtn.disabled = false;
        showToast('✅ 连接成功！模型回复：' + reply.slice(0, 100), 'success');
    } catch (error) {
        testBtn.textContent = originalText;
        testBtn.disabled = false;
        showToast('❌ 连接失败：' + error.message, 'error');
    }
}

function updateAIStatus() {
    const status = document.getElementById('aiStatus');
    if (!status) return;

    if (aiSettings.provider === 'local') {
        status.textContent = '📍 本地模式';
    } else if (aiSettings.apiKey) {
        const modelDisplay = aiSettings.model || aiSettings.provider.toUpperCase();
        status.textContent = '✅ ' + modelDisplay;
    } else {
        status.textContent = '⚠️ 未配置API';
    }
}

// ==================== CRUD 操作 ====================
function openProject(index) {
    localStorage.setItem('moyun_current_project', index);
    localStorage.setItem('moyun_current_chapter', 0);
    window.location.href = `editor.html?project=${index}&chapter=0`;
}

function goBack() {
    window.location.href = 'index.html';
}


function deleteProject(index) {
    const p = projects[index];
    if (!p) return;
    if (!confirm(`确认删除「${p.title}」？删除后无法恢复。`)) return;
    projects.splice(index, 1);
    saveProjects();
    renderProjects();
    renderRecent();
    updateStats();
    showToast(`已删除「${p.title}」`, 'success');
}

function exportProject(index) {
    const project = projects[index];
    if (!project.chapters || project.chapters.length === 0) {
        showToast('没有可导出的内容', 'error');
        return;
    }

    let content = generateMarkdown(project);

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportCurrentProject() {
    const currentIndex = parseInt(localStorage.getItem('moyun_current_project') || '-1');
    if (currentIndex === -1) {
        showToast('请先打开一个项目', 'error');
        return;
    }
    exportProject(currentIndex);
}

function generateMarkdown(project) {
    let content = `# ${project.title}\n\n`;
    content += `> **类型**: ${getTypeName(project.type)}\n\n`;
    content += `${project.description || ''}\n\n`;
    content += `---\n\n## 章节内容\n\n`;

    (project.chapters || []).forEach((chapter, i) => {
        content += `### 第${i + 1}章 · ${chapter.title}\n\n`;
        if (chapter.summary) {
            content += `> ${chapter.summary}\n\n`;
        }
        content += `${chapter.content || '（待撰写）'}\n\n---\n\n`;
    });

    return content;
}

// ==================== API 预设 ====================
const API_PRESETS = {
    anthropic: { name: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com/v1', authHeader: 'x-api-key', modelPrefix: '' },
    openai: { name: 'OpenAI (GPT)', baseUrl: 'https://api.openai.com/v1', authHeader: 'bearer', modelPrefix: '' },
    deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', authHeader: 'bearer', modelPrefix: 'deepseek-' },
    minimax: { name: 'MiniMax', baseUrl: 'https://api.minimaxi.com/v1', authHeader: 'bearer', modelPrefix: 'MiniMax-' },
    kimi: { name: 'Kimi (Moonshot)', baseUrl: 'https://api.moonshot.cn/v1', authHeader: 'bearer', modelPrefix: 'moonshot-' },
    glm: { name: 'GLM (智谱)', baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4', authHeader: 'bearer', modelPrefix: 'glm-' }
};

function inferApiProfile(baseUrl, model) {
    const normalizedBaseUrl = String(baseUrl || '').trim().toLowerCase();
    const normalizedModel = String(model || '').trim().toLowerCase();

    if (/\/anthropic\b/i.test(normalizedBaseUrl)) return 'anthropic';
    if (/api\.anthropic\.com/i.test(normalizedBaseUrl)) return 'anthropic';
    if (/api\.deepseek\.com/i.test(normalizedBaseUrl)) return 'deepseek';
    if (/api\.minimax\.chat/i.test(normalizedBaseUrl)) return 'minimax';
    if (/api\.moonshot\.cn/i.test(normalizedBaseUrl)) return 'kimi';
    if (/bigmodel\.cn/i.test(normalizedBaseUrl)) return 'glm';
    if (/api\.openai\.com/i.test(normalizedBaseUrl)) return 'openai';

    if (normalizedModel.startsWith('deepseek-')) return 'deepseek';
    if (normalizedModel.startsWith('minimax-')) return 'minimax';
    if (normalizedModel.startsWith('glm-')) return 'glm';
    if (normalizedModel.startsWith('moonshot-')) return 'kimi';
    if (/claude/i.test(normalizedModel)) return 'anthropic';

    return null;
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

    if (normalized) {
        if (provider === 'anthropic') return `${normalized}/v1/messages`;
        return `${normalized}/v1/chat/completions`;
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

function buildApiBody(provider, model, systemPrompt, messages, temperature) {
    const modelName = model || (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4');

    if (provider === 'anthropic') {
        return { model: modelName, system: systemPrompt, messages: messages, max_tokens: 2048 };
    }

    return {
        model: modelName,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: temperature || 0.7,
        max_tokens: 2048
    };
}

async function callAI(messages, systemPrompt) {
    if (aiSettings.provider === 'local') {
        return callLocalAI(messages, systemPrompt);
    }

    // 没填 baseUrl 就走 fallback endpoint（不可靠），主动报错
    if (!aiSettings.baseUrl) {
        throw new Error(`AI 设置中 Base URL 为空。Provider=${aiSettings.provider} 时必须填 Base URL（如 https://api.minimaxi.com/v1）。请打开设置重新填写并保存。`);
    }

    const detectedProvider = inferApiProfile(aiSettings.baseUrl, aiSettings.model) || aiSettings.provider;
    const endpoint = buildApiEndpoint(aiSettings.baseUrl, detectedProvider, aiSettings.model);
    const headers = buildApiHeaders(detectedProvider, aiSettings.apiKey);
    const body = buildApiBody(detectedProvider, aiSettings.model, systemPrompt, messages, aiSettings.temperature);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errData.error?.message || '未知错误'}`);
        }

        const data = await response.json();

        if (detectedProvider === 'anthropic') {
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

function callLocalAI(messages, systemPrompt) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('【本地模拟】夜风轻拂，星光点点，他望着远方的山峦，心中涌起无限思绪。');
        }, 1000);
    });
}

// ==================== AI Functions ====================
function getThemePrompt(themeType) {
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

// ==================== AI 功能 ====================
async function aiWrite() {
    const content = document.getElementById('contentEditor')?.value;
    if (!content) {
        showToast('请先输入一些内容', 'error');
        return;
    }

    showLoading(true);

    try {
        const currentProject = safeLoadProjects();
        const projectIndex = parseInt(localStorage.getItem('moyun_current_project') || '0');
        const chapterIndex = parseInt(localStorage.getItem('moyun_current_chapter') || '0');
        const project = currentProject[projectIndex];

        const messages = [{
            role: 'user',
            content: `请续写以下小说内容，保持相同的风格和节奏，续写150-300字：\n\n${content}`
        }];

        const continuation = await callAI(messages, getThemePrompt(project?.type));
        const editor = document.getElementById('contentEditor');
        if (editor) {
            editor.value = content + continuation;
            currentProject[projectIndex].chapters[chapterIndex].content = editor.value;
            localStorage.setItem('moyun_projects', JSON.stringify(currentProject));
            updateWordCount();
        }
    } catch (error) {
        showToast('AI调用失败：' + error.message, 'error');
    }

    showLoading(false);
}

async function aiPolish() {
    const content = document.getElementById('contentEditor')?.value;
    if (!content) {
        showToast('请先输入内容', 'error');
        return;
    }

    showLoading(true);

    try {
        const messages = [{
            role: 'user',
            content: `请润色以下内容：\n\n${content}`
        }];

        const polished = await callAI(messages, '你是一位专业的中文写作润色专家，擅长优化文字表达。请直接返回润色后的内容。');
        const editor = document.getElementById('contentEditor');
        if (editor) {
            editor.value = polished;
            const currentProject = safeLoadProjects();
            const projectIndex = parseInt(localStorage.getItem('moyun_current_project') || '0');
            const chapterIndex = parseInt(localStorage.getItem('moyun_current_chapter') || '0');
            currentProject[projectIndex].chapters[chapterIndex].content = polished;
            localStorage.setItem('moyun_projects', JSON.stringify(currentProject));
            updateWordCount();
        }
    } catch (error) {
        showToast('AI调用失败：' + error.message, 'error');
    }

    showLoading(false);
}

async function aiImprove() {
    const content = document.getElementById('contentEditor')?.value;
    if (!content) {
        showToast('请先输入内容', 'error');
        return;
    }

    showLoading(true);

    try {
        const currentProject = safeLoadProjects();
        const projectIndex = parseInt(localStorage.getItem('moyun_current_project') || '0');
        const project = currentProject[projectIndex];

        const messages = [{
            role: 'user',
            content: `请为以下小说内容提供改进建议：\n\n${content.slice(0, 500)}`
        }];

        const suggestion = await callAI(messages, getThemePrompt(project?.type));
        showToast('💡 AI改进建议：\n\n' + suggestion, 'info');
    } catch (error) {
        showToast('AI调用失败：' + error.message, 'error');
    }

    showLoading(false);
}

function showLoading(show) {
    const btn = document.querySelector('.toolbar-btn.primary');
    if (!btn) return;

    if (show) {
        btn.textContent = '⏳ AI思考中...';
        btn.disabled = true;
    } else {
        btn.textContent = '✍️ AI续写';
        btn.disabled = false;
    }
}

function updateWordCount() {
    const editor = document.getElementById('contentEditor');
    const countEl = document.getElementById('currentWordCount');
    if (editor && countEl) {
        countEl.textContent = `${editor.value.length} 字`;
    }
}

// ==================== 自动保存 ====================
setInterval(() => {
    if (projects.length > 0) {
        saveProjects();
    }
}, 30000);

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', init);

// Temperature slider
document.getElementById('temperatureInput')?.addEventListener('input', function() {
    const valueEl = document.getElementById('temperatureValue');
    if (valueEl) valueEl.textContent = this.value;
});
