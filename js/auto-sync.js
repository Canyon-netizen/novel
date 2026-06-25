// ==================== Gist Auto-Sync Module ==================== //
// Shared between pages so the editor's chapter saves immediately push
// to Gist (instead of waiting for the home page to detect changes).
(function (root) {
    'use strict';

    const LAST_SYNCED_KEY = 'moyun_projects_last_synced';
    let onSyncError = null;

    function setErrorHandler(fn) {
        onSyncError = (typeof fn === 'function') ? fn : null;
    }

    function notifyError(message) {
        console.warn('[auto-sync]', message);
        try { if (onSyncError) onSyncError(message); } catch (_) { /* ignore */ }
    }

    function getSettings() {
        try {
            const raw = localStorage.getItem('moyun_gist_settings');
            if (!raw) return { token: '', gistId: '', autoSyncEnabled: true };
            return Object.assign({ autoSyncEnabled: true }, JSON.parse(raw));
        } catch (e) {
            return { token: '', gistId: '', autoSyncEnabled: true };
        }
    }

    async function performSync(snapshot) {
        const settings = getSettings();
        if (!settings.token || !settings.gistId) return;
        if (settings.autoSyncEnabled === false) return;
        if (snapshot === localStorage.getItem(LAST_SYNCED_KEY)) return;
        try {
            const response = await fetch(`https://api.github.com/gists/${settings.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${settings.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: '一页 数据同步',
                    files: { [GIST_FILENAME || 'moyun_data.json']: { content: JSON.stringify(parseSyncData(snapshot), null, 2) } }
                })
            });
            if (response.ok) {
                localStorage.setItem(LAST_SYNCED_KEY, snapshot);
                settings.lastSync = new Date().toLocaleString('zh-CN');
                localStorage.setItem('moyun_gist_settings', JSON.stringify(settings));
            } else {
                notifyError(`Gist 同步失败 HTTP ${response.status}`);
            }
        } catch (e) {
            notifyError(`Gist 同步异常: ${e && e.message ? e.message : e}`);
        }
    }

    function parseSyncData(snapshot) {
        try {
            return { projects: JSON.parse(snapshot), templates: [], lastSync: new Date().toISOString() };
        } catch (e) {
            return { projects: [], templates: [], lastSync: new Date().toISOString() };
        }
    }

    // Gist filename constant (used in app.js syncToGist too)
    const GIST_FILENAME = 'moyun_data.json';

    root.NovelAutoSync = {
        perform: performSync,
        setErrorHandler,
        GIST_FILENAME
    };
})(typeof globalThis !== 'undefined' ? globalThis : this);
