// ==================== Gist Auto-Sync Module ==================== //
// Shared between pages so the editor's chapter saves immediately push
// to Gist (instead of waiting for the home page to detect changes).
(function (root) {
    'use strict';

    const LAST_SYNCED_KEY = 'moyun_projects_last_synced';
    const ERROR_THROTTLE_KEY = 'moyun_sync_error_throttle';
    const ERROR_THROTTLE_MS = 60_000; // 同一错误 60s 内不重复 toast
    let onSyncError = null;

    function setErrorHandler(fn) {
        onSyncError = (typeof fn === 'function') ? fn : null;
    }

    function shouldNotify(message) {
        // throttle: 同一消息 60s 内只通知一次
        try {
            const raw = localStorage.getItem(ERROR_THROTTLE_KEY);
            const last = raw ? JSON.parse(raw) : {};
            const now = Date.now();
            if (last.message === message && now - (last.ts || 0) < ERROR_THROTTLE_MS) {
                return false;
            }
            // 记录这次 (仅在将真要通知时写)
            return true;
        } catch (_) {
            return true;
        }
    }

    function markNotified(message) {
        try {
            localStorage.setItem(ERROR_THROTTLE_KEY, JSON.stringify({ message, ts: Date.now() }));
        } catch (_) { /* ignore */ }
    }

    function notifyError(message) {
        console.warn('[auto-sync]', message);
        if (!shouldNotify(message)) return;
        markNotified(message);
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
                clearErrorThrottle(); // 成功后清掉, 下次 401 能正常提示
            } else {
                notifyError(`Gist 同步失败 HTTP ${response.status}`);
            }
        } catch (e) {
            notifyError(`Gist 同步异常: ${e && e.message ? e.message : e}`);
        }
    }

    function clearErrorThrottle() {
        try { localStorage.removeItem(ERROR_THROTTLE_KEY); } catch (_) { /* ignore */ }
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
