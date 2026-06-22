// ==================== Keyboard Shortcuts ====================
(function (root) {
    'use strict';

    const handlers = new Map(); // scope -> array of {combo, action}

    function combo(e) {
        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push('mod');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        parts.push(e.key.toLowerCase());
        return parts.join('+');
    }

    function onKeydown(e) {
        // Skip when typing in inputs/textareas/contenteditable
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
            return;
        }
        const c = combo(e);
        for (const arr of handlers.values()) {
            for (const h of arr) {
                if (h.combo === c) {
                    e.preventDefault();
                    h.action(e);
                    return;
                }
            }
        }
    }

    function bind(scope, key, ctrl, action) {
        const parts = [];
        if (ctrl) parts.push('mod');
        parts.push(key.toLowerCase());
        const c = parts.join('+');
        if (!handlers.has(scope)) handlers.set(scope, []);
        handlers.get(scope).push({ combo: c, action });
    }

    function unbind(scope) {
        handlers.delete(scope);
    }

    function init() {
        document.addEventListener('keydown', onKeydown);
    }

    root.NovelShortcuts = { bind, unbind, init };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
