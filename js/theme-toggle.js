// ==================== Theme Toggle Component ====================
(function (root) {
    'use strict';

    const STORAGE_KEY = 'moyun_theme';
    const DEFAULT_THEME = 'light';

    function getCurrent() {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    }

    // Apply the saved theme to <html> as early as possible so the
    // first paint already has the right background. Without this,
    // pages flash light -> dark when navigation switches pages.
    function applyStoredTheme() {
        const theme = getCurrent();
        document.documentElement.setAttribute('data-theme', theme);
    }
    applyStoredTheme();

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
        render();
    }

    function render() {
        const mount = document.getElementById('themeToggle');
        if (!mount) return;
        const current = getCurrent();
        const themes = [
            { id: 'light', label: '亮' },
            { id: 'dark', label: '暗' }
        ];
        mount.innerHTML = themes.map(t => {
            const isActive = t.id === current;
            return `<button class="theme-btn ${isActive ? 'theme-btn--active' : ''}"
                            data-theme="${t.id}"
                            type="button"
                            aria-pressed="${isActive}">${t.label}</button>`;
        }).join('');
        mount.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => apply(btn.dataset.theme));
        });
    }

    root.NovelThemeToggle = { apply, getCurrent, render };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyStoredTheme();
            render();
        });
    } else {
        render();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
