// ==================== Novel Gist UI Module ==================== //
// Gist 数据同步的 UI 层 (输入框/按钮/状态显示) + connect/sync/load 操作。
// 三个页面 (index/create/editor) 共用, 避免代码漂移。
// 业务状态 (gistSettings) 走 localStorage 'moyun_gist_settings', 与
// NovelCommon.saveGistSettings / loadGistSettings 保持兼容。
// 实际 HTTP 请求复用 auto-sync.js 的 performSync 路径。

(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.NovelGistUI = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const GIST_FILENAME = 'moyun_data.json';
    const STORAGE_KEY = 'moyun_gist_settings';

    let _showToast = (msg, type) => console.log(`[toast] ${type || 'info'}: ${msg}`);
    let _autoSyncEnabled = true; // mirror of localStorage setting, used by scheduleAutoSync

    // ==================== 状态读写 ====================
    function readSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { token: '', gistId: '', lastSync: null, autoSyncEnabled: true };
            return Object.assign({ token: '', gistId: '', lastSync: null, autoSyncEnabled: true }, JSON.parse(raw));
        } catch (e) {
            return { token: '', gistId: '', lastSync: null, autoSyncEnabled: true };
        }
    }

    function writeSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('[gist-ui] write settings failed', e);
        }
    }

    // 读最新 settings 并同步 autoSyncEnabled 镜像
    function getSettings() {
        const s = readSettings();
        _autoSyncEnabled = s.autoSyncEnabled !== false;
        return s;
    }

    function saveToken(token) {
        const s = getSettings();
        s.token = token;
        writeSettings(s);
    }

    function setGistId(id) {
        const s = getSettings();
        s.gistId = id;
        writeSettings(s);
    }

    function setLastSync(time) {
        const s = getSettings();
        s.lastSync = time;
        writeSettings(s);
    }

    function isAutoSyncEnabled() {
        _autoSyncEnabled = readSettings().autoSyncEnabled !== false;
        return _autoSyncEnabled;
    }

    // ==================== 数据源 (默认从 localStorage 读) ====================
    function getSyncData() {
        return {
            projects: readJsonSafe('moyun_projects', []),
            aiSettings: readJsonSafe('moyun_ai_settings', {}),
            userTemplates: readJsonSafe('moyun_user_templates', []),
            userName: localStorage.getItem('moyun_user_name') || 'yyy',
            theme: localStorage.getItem('moyun_theme') || 'dark',
            syncTime: new Date().toISOString()
        };
    }

    function readJsonSafe(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch (_) {
            return fallback;
        }
    }

    // ==================== UI 状态显示 ====================
    function updateGistStatus() {
        const statusEl = document.getElementById('gistStatus');
        const statusText = document.getElementById('gistStatusText');
        const syncBtn = document.getElementById('syncBtn');
        const loadBtn = document.getElementById('loadFromGistBtn');

        const s = getSettings();
        if (!statusEl) return;

        if (s.token) {
            statusEl.style.display = 'block';
            if (syncBtn) syncBtn.disabled = false;
            if (loadBtn) loadBtn.disabled = false;
            if (statusText) {
                if (s.gistId) {
                    statusText.textContent = `✅ 已连接 Gist (ID: ${s.gistId.slice(0, 8)}...) 上次同步: ${s.lastSync || '从未'}`;
                } else {
                    statusText.textContent = '⚠️ Token 已设置,点击"连接/更新 Gist"创建或更新 Gist';
                }
            }
        } else {
            statusEl.style.display = 'none';
            if (syncBtn) syncBtn.disabled = true;
            if (loadBtn) loadBtn.disabled = true;
        }

        // 同步 autoSync checkbox
        const autoEl = document.getElementById('autoSyncCheckbox');
        if (autoEl) autoEl.checked = isAutoSyncEnabled();
    }

    function loadGistSettings() {
        const input = document.getElementById('githubTokenInput');
        const s = getSettings();
        if (input && s.token) input.value = s.token;
        updateGistStatus();
    }

    // ==================== 操作 ====================
    async function connectGist() {
        const input = document.getElementById('githubTokenInput');
        const token = input ? input.value.trim() : '';
        if (!token) {
            _showToast('请输入 GitHub Token', 'error');
            return;
        }

        saveToken(token);
        const s = getSettings();
        const gistData = JSON.stringify(getSyncData(), null, 2);

        try {
            if (s.gistId) {
                const response = await fetch(`https://api.github.com/gists/${s.gistId}`, {
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

                setLastSync(new Date().toLocaleString('zh-CN'));
                updateGistStatus();
                _showToast('✅ Gist 已更新!', 'success');
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
                setGistId(result.id);
                setLastSync(new Date().toLocaleString('zh-CN'));
                updateGistStatus();
                _showToast('✅ Gist 创建成功!\n\nGist ID: ' + result.id, 'success');
            }
        } catch (error) {
            _showToast('❌ Gist 操作失败: ' + (error.message || error), 'error');
        }
    }

    async function syncToGist() {
        const s = getSettings();
        if (!s.token || !s.gistId) {
            _showToast('请先点击"连接/更新 Gist"', 'error');
            return;
        }

        const syncBtn = document.getElementById('syncBtn');
        const originalText = syncBtn ? syncBtn.textContent : '';
        if (syncBtn) {
            syncBtn.textContent = '同步中...';
            syncBtn.disabled = true;
        }

        try {
            const response = await fetch(`https://api.github.com/gists/${s.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${s.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: '墨韵AI 数据同步',
                    files: { [GIST_FILENAME]: { content: JSON.stringify(getSyncData(), null, 2) } }
                })
            });
            if (!response.ok) throw new Error(`同步失败 (${response.status})`);

            setLastSync(new Date().toLocaleString('zh-CN'));
            updateGistStatus();
            _showToast('✅ 数据已同步到 Gist!', 'success');
        } catch (error) {
            _showToast('❌ 同步失败: ' + (error.message || error), 'error');
        } finally {
            if (syncBtn) {
                syncBtn.textContent = originalText;
                syncBtn.disabled = false;
            }
        }
    }

    async function loadFromGist() {
        const s = getSettings();
        if (!s.token || !s.gistId) {
            _showToast('请先连接 Gist', 'error');
            return;
        }

        if (!confirm('从 Gist 加载会覆盖本地数据,确定吗?')) return;

        try {
            const response = await fetch(`https://api.github.com/gists/${s.gistId}`, {
                headers: { 'Authorization': `Bearer ${s.token}` }
            });
            if (!response.ok) throw new Error(`读取失败 (${response.status})`);

            const gist = await response.json();
            const file = gist.files && gist.files[GIST_FILENAME];
            if (!file) throw new Error('Gist 中没有找到数据文件');

            const data = JSON.parse(file.content);
            if (data.projects) localStorage.setItem('moyun_projects', JSON.stringify(data.projects));
            if (data.aiSettings) localStorage.setItem('moyun_ai_settings', JSON.stringify(data.aiSettings));
            if (data.userTemplates) localStorage.setItem('moyun_user_templates', JSON.stringify(data.userTemplates));
            if (data.userName) localStorage.setItem('moyun_user_name', data.userName);
            if (data.theme) localStorage.setItem('moyun_theme', data.theme);

            setLastSync(new Date().toLocaleString('zh-CN'));
            updateGistStatus();
            _showToast('✅ 数据已从 Gist 加载!', 'success');
            setTimeout(() => window.location.reload(), 800);
        } catch (error) {
            _showToast('❌ 加载失败: ' + (error.message || error), 'error');
        }
    }

    function toggleAutoSync(enabled) {
        const s = getSettings();
        s.autoSyncEnabled = enabled !== false;
        writeSettings(s);
        _autoSyncEnabled = s.autoSyncEnabled;
        _showToast(enabled ? '已开启自动同步' : '已关闭自动同步', 'success');
    }

    // ==================== Debounced auto-sync (跨页面共用) ====================
    let autoSyncTimer = null;
    let lastSyncedProjects = null;
    const LAST_SYNCED_KEY = 'moyun_projects_last_synced';

    function scheduleAutoSync() {
        const s = getSettings();
        if (!s.token || !s.gistId) return;
        if (!isAutoSyncEnabled()) return;
        let current;
        try { current = localStorage.getItem('moyun_projects') || ''; } catch (_) { return; }
        if (!current || current === lastSyncedProjects) return;
        if (autoSyncTimer) clearTimeout(autoSyncTimer);
        autoSyncTimer = setTimeout(async () => {
            autoSyncTimer = null;
            try {
                await syncToGist();
                lastSyncedProjects = current;
                localStorage.setItem(LAST_SYNCED_KEY, current);
            } catch (e) {
                console.warn('[gist-ui] auto-sync failed', e);
            }
        }, 5000);
    }

    // ==================== Mount: 注入 toast 回调 ====================
    function mount(opts) {
        if (opts && typeof opts.showToast === 'function') {
            _showToast = opts.showToast;
        }
        loadGistSettings();
    }

    // 立即挂全局, 让 inline onclick="loadFromGist()" 等能调到
    // factory 闭包内拿不到外层 IIFE 的 root 参数, 走 globalThis
    (typeof globalThis !== 'undefined' ? globalThis : this).connectGist = connectGist;
    (typeof globalThis !== 'undefined' ? globalThis : this).syncToGist = syncToGist;
    (typeof globalThis !== 'undefined' ? globalThis : this).loadFromGist = loadFromGist;
    (typeof globalThis !== 'undefined' ? globalThis : this).toggleAutoSync = toggleAutoSync;
    (typeof globalThis !== 'undefined' ? globalThis : this).loadGistSettings = loadGistSettings;

    // ==================== 跨页面 storage 监听 ====================
    function checkForChangesSinceLastVisit() {
        try {
            const current = localStorage.getItem('moyun_projects') || '';
            if (!current) return;
            const lastSynced = localStorage.getItem(LAST_SYNCED_KEY);
            if (lastSynced !== null && current !== lastSynced) {
                if (window.NovelAutoSync && typeof window.NovelAutoSync.perform === 'function') {
                    window.NovelAutoSync.perform(current);
                }
            }
            if (lastSynced === null) {
                localStorage.setItem(LAST_SYNCED_KEY, current);
            } else {
                lastSyncedProjects = lastSynced;
            }
        } catch (e) { /* ignore */ }
    }

    return {
        GIST_FILENAME,
        STORAGE_KEY,
        getSettings,
        loadGistSettings,
        updateGistStatus,
        connectGist,
        syncToGist,
        loadFromGist,
        toggleAutoSync,
        scheduleAutoSync,
        checkForChangesSinceLastVisit,
        mount
    };
});
