// ==================== Empty / Error / Loading States ====================
(function (root) {
    'use strict';

    const ICONS = {
        empty: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>',
        error: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        loading: '<div class="novel-spinner" style="width:24px;height:24px;border-width:3px;"></div>'
    };

    function render(mountEl, options) {
        if (!mountEl) return;
        const opts = Object.assign({ type: 'empty', title: '', desc: '', action: null }, options || {});
        const cls = `novel-state novel-state--${opts.type}`;
        const html = `
            <div class="${cls}">
                <div class="novel-state__icon">${ICONS[opts.type] || ICONS.empty}</div>
                ${opts.title ? `<div class="novel-state__title"></div>` : ''}
                ${opts.desc ? `<div class="novel-state__desc"></div>` : ''}
                ${opts.action ? `<div class="novel-state__action"></div>` : ''}
            </div>
        `;
        mountEl.innerHTML = html;
        if (opts.title) {
            const t = mountEl.querySelector('.novel-state__title');
            if (t) t.textContent = opts.title;
        }
        if (opts.desc) {
            const d = mountEl.querySelector('.novel-state__desc');
            if (d) d.textContent = opts.desc;
        }
        if (opts.action) {
            const a = mountEl.querySelector('.novel-state__action');
            if (a) {
                const btn = document.createElement('button');
                btn.className = 'btn-primary';
                btn.type = 'button';
                btn.textContent = opts.action.label;
                if (opts.action.onClick) btn.addEventListener('click', opts.action.onClick);
                a.appendChild(btn);
            }
        }
    }

    root.NovelStates = { render, ICONS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
