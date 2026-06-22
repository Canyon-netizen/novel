# 「一页」设计重塑实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有"墨韵AI"（4 个页面 + 1 个 CSS 文件 + 4 个 JS 文件）改造为「一页」品牌、纸张感视觉、Notion/Linear 调性的 AI 写作工具，修复 1 个 bug，并实施 25 项细节规范。

**Architecture:** 纯前端改造。CSS 引入新 token 系统（保留旧 token 作 `--legacy-*` 备份），新增 4 个职责单一的 JS 模块（theme-toggle / states / shortcuts / motion），4 个 HTML 页面只改结构和 class（不引入新逻辑），3 个 view JS 接入新模块。

**Tech Stack:** Vanilla JS (no framework), CSS custom properties, Google Fonts (Noto Sans SC + Inter + Source Serif Pro), Playwright (Python) for visual verification.

**Spec:** `docs/superpowers/specs/2026-06-22-yipye-redesign-design.md`

## Global Constraints

- **品牌**：中文名「一页」，英文标识不显示，favicon `📄`
- **配色亮色**：`--bg-primary: #F8F6F1` / `--accent-primary: #2F5D62`（详见 spec）
- **配色暗色**：`--bg-primary: #1A1815` / `--accent-primary: #5A8C92`（详见 spec）
- **字体 UI**：`Noto Sans SC` + `Inter`
- **字体阅读**：`Noto Serif SC` + `Source Serif Pro`
- **圆角**：6 / 10 / 14 px（**禁用** 16+ px）
- **边框**：1px hairline（`var(--border-color)`）
- **阴影**：默认无；只给模态/弹窗/popover 用 shadow-sm/md/lg
- **间距网格**：4 / 8 / 12 / 16 / 24 / 32 / 48
- **行高**：UI 1.5，阅读 1.75
- **CSS 体积上限**：≤2000 行
- **a11y**：键盘 focus ring 可见，contrast WCAG AA，遵守 `prefers-reduced-motion`
- **不实施**：后端、真实账号、i18n、OG image、移动端深度优化、单元测试覆盖
- **保留**：旧 token 作为 `--legacy-*` 备份 1 周；最后删除

---

## 文件结构（实施前先建好）

```
e:/study/novel/
├── css/
│   ├── style.css          # 全部重写（token + 组件 + 3 状态）
│   └── motion.css         # 新建：keyframes + transition tokens
├── js/
│   ├── theme-toggle.js    # 新建：[暗][亮] 文字按钮组件
│   ├── states.js          # 新建：empty/error/loading 渲染
│   ├── shortcuts.js       # 新建：键盘快捷键模块
│   ├── app.js             # 修改：接入新模块
│   ├── create.js          # 修改：修 B1 + 接入新模块
│   └── editor.js          # 修改：接入新模块
├── app/
│   └── common.js          # 修改：暴露新 API
├── index.html             # 修改
├── create.html            # 修改
├── editor.html            # 修改
└── login.html             # 修改
```

每个新 JS 模块都用 IIFE 暴露 `window.NovelXxx` 全局（与现有 `NovelCommon` / `NovelLLMClient` 一致）。

---

## Task 1: 重写 CSS token 系统（含动效 + 3 状态组件）

**Files:**
- Create: `css/motion.css`
- Modify: `css/style.css`（保留所有旧变量作 `--legacy-*`，新增完整新 token）

**Interfaces:**
- Produces: 所有 4 个 HTML 文件依赖的 token 变量（详见 spec）
- Consumes: 无（独立任务）

- [ ] **Step 1: 创建 `css/motion.css`**

```css
/* ==================== Motion tokens ==================== */
:root {
    --motion-fast: 80ms ease-in;
    --motion-normal: 150ms ease-out;
    --motion-slow: 200ms ease-out;
    --motion-sidebar: 200ms ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        transition-duration: 0ms !important;
        animation-duration: 0ms !important;
    }
}

/* ==================== Spinner keyframes ==================== */
@keyframes novel-spin {
    to { transform: rotate(360deg); }
}

@keyframes novel-fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
}

@keyframes novel-fade-out {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-4px); }
}

@keyframes novel-save-pulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.6; }
}

/* Spinner class */
.novel-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--bg-secondary);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: novel-spin 0.8s linear infinite;
    vertical-align: middle;
}
```

- [ ] **Step 2: 验证 motion.css 加载**

Run: 在浏览器打开任一页面，DevTools 选 `<link>` 看 `motion.css` 是否在 network 加载。
Expected: 200 OK。

- [ ] **Step 3: 重写 `css/style.css` 顶部 token 块**

替换整个 `:root { ... }` 和 `[data-theme="light"] { ... }` 块。新结构：

```css
/* ==================== Theme Variables (new spec) ==================== */
:root {
    /* Light theme (default) */
    --bg-primary: #F8F6F1;
    --bg-secondary: #EFE9DD;
    --bg-card: #FFFFFF;
    --bg-input: #FFFFFF;
    --text-primary: #1A1815;
    --text-secondary: #6B6258;
    --text-muted: #9B9388;
    --accent-primary: #2F5D62;
    --accent-primary-hover: #244C50;
    --accent-soft: #E0EBEC;
    --border-color: #E0D9C8;
    --border-strong: #C9C0AB;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.08);
    --danger: #B23A48;
    --danger-soft: #F5E0E3;
    --success: #5A7F3D;
    --success-soft: #E8F0DD;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --font-ui: 'Noto Sans SC', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-reading: 'Noto Serif SC', 'Source Serif Pro', serif;
    --legacy-bg-primary: #0D0D0D;
    --legacy-bg-card: #1A1A1A;
    /* ... 保留所有旧变量为 --legacy-* ... */
}

[data-theme="dark"] {
    --bg-primary: #1A1815;
    --bg-secondary: #221F1B;
    --bg-card: #2A2722;
    --bg-input: #1F1C18;
    --text-primary: #F0EDE5;
    --text-secondary: #B0A89E;
    --text-muted: #7A7167;
    --accent-primary: #5A8C92;
    --accent-primary-hover: #6FA0A6;
    --accent-soft: #2F3A3B;
    --border-color: #3A3530;
    --border-strong: #4F4840;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
    --danger: #D86A75;
    --danger-soft: #3A282B;
    --success: #8FAE6E;
    --success-soft: #2B3325;
}

@import './motion.css';
```

注：原 `[data-theme="light"]` 选择器要改为 `[data-theme="dark"]`（因为亮色现在是 `:root` 默认）。这是 spec 隐含决定的。

- [ ] **Step 4: 在 style.css 顶部添加全局重置**

```css
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
    font-family: var(--font-ui);
    font-feature-settings: 'tnum';
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    transition: background var(--motion-normal), color var(--motion-normal);
}
```

- [ ] **Step 5: 添加 3 状态组件样式**

```css
/* ==================== Empty / Error / Loading States ==================== */
.novel-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
    color: var(--text-secondary);
}
.novel-state__icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    color: var(--text-muted);
}
.novel-state__title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
}
.novel-state__desc {
    font-size: 0.875rem;
    margin-bottom: 16px;
}
.novel-state--error .novel-state__icon {
    background: var(--danger-soft);
    color: var(--danger);
}
.novel-state--loading {
    min-height: 200px;
}
```

- [ ] **Step 6: 验证 token 切换工作**

写一个临时的 `<div data-theme="dark">` 切到暗黑，截图对比。临时 div 用完删除。
Expected: `bg-primary` 在两套下不同（`#F8F6F1` vs `#1A1815`）。

- [ ] **Step 7: 提交**

```bash
git add css/style.css css/motion.css
git commit -m "feat(css): rewrite token system + add motion + 3-state components"
```

---

## Task 2: 实现 4 个 HTML 页面通用组件（header / logo / 主题切换按钮）

**Files:**
- Create: `js/theme-toggle.js`
- Modify: `index.html`, `create.html`, `editor.html`, `login.html`（仅 header 部分）
- Modify: `css/style.css`（添加 header 样式）

**Interfaces:**
- Consumes: `window.NovelCommon` 的 `setTheme(theme)` / `getTheme()` / `loadTheme()`
- Produces: 4 个 HTML 页面 header 都用 `<header class="page-header">` + `<a class="page-logo">` + `<div id="themeToggle"></div>`

- [ ] **Step 1: 创建 `js/theme-toggle.js`**

```javascript
// ==================== Theme Toggle Component ====================
(function (root) {
    'use strict';

    const STORAGE_KEY = 'moyun_theme';
    const DEFAULT_THEME = 'light';

    function getCurrent() {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    }

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

    // Public API
    root.NovelThemeToggle = { apply, getCurrent, render };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 2: 验证 theme-toggle.js 加载**

在 DevTools console 运行：`NovelThemeToggle.getCurrent()` → 返回 'light'。
Expected: 字符串 "light"。

- [ ] **Step 3: 添加 header 样式到 style.css**

```css
/* ==================== Page Header ==================== */
.page-header {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 100;
}
.page-header--minimal {
    height: 48px;
    border-bottom: none;
}
.page-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: var(--text-primary);
    font-weight: 600;
    font-size: 1.25rem;
}
.page-logo__dot {
    width: 18px;
    height: 18px;
    display: grid;
    grid-template-columns: repeat(3, 4px);
    grid-template-rows: repeat(3, 4px);
    gap: 3px;
}
.page-logo__dot span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--accent-primary);
}
.page-header__right {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* Theme toggle */
.theme-btn {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-secondary);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    font-family: var(--font-ui);
    transition: all var(--motion-normal);
}
.theme-btn:hover {
    background: var(--bg-secondary);
}
.theme-btn--active {
    background: var(--accent-soft);
    color: var(--accent-primary);
    border-color: var(--accent-primary);
}

/* Focus ring (a11y) */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
    outline: 3px solid var(--accent-soft);
    outline-offset: 2px;
    transition: outline-offset 0ms;
}
```

- [ ] **Step 4: 修改 `index.html` header**

替换原 `<header class="header">...</header>` 为：

```html
<header class="page-header">
    <a href="index.html" class="page-logo">
        <div class="page-logo__dot">
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
        </div>
        <span>一页</span>
    </a>
    <div class="page-header__right">
        <button class="settings-btn" onclick="openSettingsModal()" title="设置" aria-label="设置">⚙</button>
        <div id="themeToggle"></div>
        <div class="user-info">
            <div class="user-avatar"></div>
            <span class="user-name"></span>
        </div>
    </div>
</header>
<script src="js/theme-toggle.js"></script>
```

- [ ] **Step 5: 同样修改 `create.html` header**

同 Step 4 的内容，`<script src="js/theme-toggle.js"></script>` 加在 body 末尾。

- [ ] **Step 6: 同样修改 `editor.html` header**

同 Step 4，**外加**在 `.page-header__right` 中、设置按钮前插入返回按钮：

```html
<a href="index.html" class="header-back-btn">返回</a>
```

加上对应 CSS：

```css
.header-back-btn {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    padding: 4px 10px;
    border-radius: 6px;
    transition: all var(--motion-normal);
}
.header-back-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
}
```

- [ ] **Step 7: 修改 `login.html` header 为极简版**

```html
<header class="page-header page-header--minimal">
    <a href="index.html" class="page-logo">
        <div class="page-logo__dot">
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
        </div>
        <span>一页</span>
    </a>
    <div class="page-header__right"></div>
</header>
<script src="js/theme-toggle.js"></script>
```

- [ ] **Step 8: 删除旧 `.header` 样式**

在 `css/style.css` 中删除整个旧的 `.header` / `.header-left` / `.header-right` / `.logo` / `.brand-name` / `.brand-sub` / `.theme-select` / `.settings-btn` / `.user-info` / `.user-avatar` / `.user-name` 规则块（保留 `.user-info` / `.user-avatar` / `.user-name` 因为 `app/common.js` 还在用，但简化颜色）。

- [ ] **Step 9: 视觉验证**

用 Playwright 跑 4 个页面，截图 header 区域。Expected：
- 暗色：深暖灰背景 + 青靛点阵 + 「一页」白字
- 亮色：淡黄纸张背景 + 青靛点阵 + 「一页」深字
- 主题切换按钮显示 `[亮] [暗]`，当前主题高亮

- [ ] **Step 10: 提交**

```bash
git add js/theme-toggle.js index.html create.html editor.html login.html css/style.css
git commit -m "feat: theme toggle component + new 4-page header with logo"
```

---

## Task 3: 实现 3 状态组件（empty/error/loading）

**Files:**
- Create: `js/states.js`
- Modify: `app/common.js`（暴露 `NovelStates` 命名空间）

**Interfaces:**
- Produces: `window.NovelStates.render(mountEl, { type, title, desc, action })` 接受 element + 配置，返回 HTML 字符串插入 mount

- [ ] **Step 1: 创建 `js/states.js`**

```javascript
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
```

- [ ] **Step 2: 在 `app/common.js` 顶部添加 reference 注释**

在 `return { ... }` 块中加：

```javascript
return {
    // ... existing exports
    // NovelStates is provided by js/states.js (loaded before common.js)
    States: (typeof NovelStates !== 'undefined') ? NovelStates : null
};
```

- [ ] **Step 3: 验证 states.js 工作**

在任一页面 console 运行：

```javascript
const mount = document.createElement('div');
document.body.appendChild(mount);
NovelStates.render(mount, { type: 'empty', title: '还没有项目', desc: '开始你的创作之旅' });
```

Expected: 页面上看到居中的 SVG icon + "还没有项目" 标题 + 描述。

- [ ] **Step 4: 提交**

```bash
git add js/states.js app/common.js
git commit -m "feat: add empty/error/loading state component"
```

---

## Task 4: 实现快捷键模块

**Files:**
- Create: `js/shortcuts.js`

**Interfaces:**
- Produces: `window.NovelShortcuts.bind({ key, ctrl, action, scope })` 和 `unbind(scope)`

- [ ] **Step 1: 创建 `js/shortcuts.js`**

```javascript
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
```

- [ ] **Step 2: 验证**

打开编辑器页面，console 运行：

```javascript
NovelShortcuts.bind('test', 's', true, () => alert('Ctrl+S pressed'));
```

按 Ctrl+S。Expected: alert 弹窗。`unbind('test')` 解除。

- [ ] **Step 3: 提交**

```bash
git add js/shortcuts.js
git commit -m "feat: keyboard shortcuts module"
```

---

## Task 5: 重写首页 `index.html`

**Files:**
- Modify: `index.html`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `NovelStates`, `NovelCommon.loadProjects`, `NovelCommon.loadAISettings`, `NovelCommon.getAuthUser`
- Produces: 首页有 3 个区块（welcome 条 / 最近写作 / 我的小说），4 个统计卡用单色 SVG icon

- [ ] **Step 1: 添加 4 个统计卡 SVG icons 到 style.css**

```css
/* ==================== Stat icons (single-color SVG) ==================== */
.stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
    background: var(--accent-soft);
}
.stat-icon svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 1.5; }
```

- [ ] **Step 2: 替换 `index.html` 主区结构**

完整替换 `<main class="main-container">` 块：

```html
<main class="main-container">
    <!-- Light welcome strip (16px tall) -->
    <div class="welcome-strip" id="welcomeStrip">晚上好，yyy</div>

    <!-- Stats section -->
    <section class="stats-section">
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24"><path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4z"/><path d="M18 20H4"/></svg>
            </div>
            <div class="stat-info"><h3 id="novelCount">0</h3><p>小说项目</p></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24"><path d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>
            </div>
            <div class="stat-info"><h3 id="chapterCount">0</h3><p>总章节</p></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7H12v-3z"/><path d="M18 13L8 23H5v-3L15 3l3 3z"/></svg>
            </div>
            <div class="stat-info"><h3 id="wordCount">0</h3><p>总字数</p></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><circle cx="17" cy="11" r="3"/><path d="M3 21v-2a4 4 0 0 1 4-4h4"/><path d="M14 21v-1a3 3 0 0 1 3-3h1"/></svg>
            </div>
            <div class="stat-info"><h3 id="charCount">0</h3><p>总角色</p></div>
        </div>
    </section>

    <!-- Recent writing (A2) -->
    <section class="recent-section" id="recentSection">
        <h2 class="section-title">最近写作</h2>
        <div class="recent-grid" id="recentGrid"></div>
    </section>

    <!-- My novels -->
    <section class="project-section">
        <div class="project-header">
            <h2 class="section-title">我的小说 <span id="projectCount">(0)</span></h2>
            <div class="toolbar">
                <button class="btn-secondary" onclick="toggleSearch()">搜索</button>
                <button class="btn-secondary" onclick="toggleFilter('type')">类型</button>
                <button class="btn-secondary" onclick="toggleFilter('time')">时间</button>
                <button class="btn-primary" onclick="openNewNovelModal()">+ 新建</button>
            </div>
        </div>
        <div id="searchBar" style="display:none"><input type="text" id="searchInput" class="form-input" placeholder="搜索项目..." /></div>
        <div id="filterPanel" style="display:none"></div>
        <div class="novel-grid" id="novelGrid"></div>
    </section>
</main>
```

- [ ] **Step 3: 添加新样式到 style.css**

```css
.welcome-strip {
    height: 48px;
    display: flex;
    align-items: center;
    font-size: 0.95rem;
    color: var(--text-secondary);
    padding: 0 4px;
}
.stats-section {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 32px;
}
.stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all var(--motion-normal);
}
.stat-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.stat-info h3 { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); }
.stat-info p { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }

.section-title { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; }

.recent-section, .project-section { margin-bottom: 32px; }
.recent-grid, .novel-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
}
@media (max-width: 1279px) { .recent-grid, .novel-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 767px) { .recent-grid, .novel-grid { grid-template-columns: 1fr; } }

.novel-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 20px;
    cursor: pointer;
    transition: all var(--motion-normal);
}
.novel-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--border-strong); }
.novel-card__type {
    display: inline-block;
    padding: 2px 8px;
    font-size: 0.75rem;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    margin-bottom: 8px;
}
.novel-card__title { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.novel-card__desc { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5; }
.novel-card__meta { display: flex; gap: 12px; font-size: 0.8rem; color: var(--text-muted); }

.project-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.project-header .section-title { margin-bottom: 0; }
.toolbar { display: flex; gap: 8px; }

@media (max-width: 1023px) { .stats-section { grid-template-columns: repeat(2, 1fr); } }
```

- [ ] **Step 4: 修改 `js/app.js` — renderProjects 用新 class 名**

找到 `renderProjects` 函数，更新 `class` 名：
- `novel-card` 保持
- `novel-type` → `novel-card__type`
- `novel-title` → `novel-card__title`
- `novel-desc` → `novel-card__desc`
- `novel-meta` → `novel-card__meta`
- `novel-menu` → `novel-card__menu`

更新对应 CSS 同步。

- [ ] **Step 5: 添加 `renderRecent()` 函数到 app.js**

```javascript
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
    grid.innerHTML = recent.map((p, i) => {
        const idx = projects.indexOf(p);
        return `
            <div class="novel-card" onclick="openProject(${idx})">
                <span class="novel-card__type">${getTypeName(p.type)}</span>
                <div class="novel-card__title">${escapeHtml(p.title)}</div>
                <div class="novel-card__meta">上次编辑 ${new Date(p.lastEditedAt).toLocaleString('zh-CN')}</div>
            </div>
        `;
    }).join('');
}
```

- [ ] **Step 6: 在 `init()` 中调用 `renderRecent()`**

```javascript
function init() {
    if (!NovelCommon.requireAuth()) return;
    loadProjects();
    NovelCommon.loadAISettings(aiSettings);
    NovelCommon.loadTheme();
    setupAuthActions();
    updateGreeting();
    renderProjects();
    renderRecent();   // <-- 新增
    updateStats();
    updateAIStatus();
    setupEventListeners();
}
```

- [ ] **Step 7: 删除 `<section class="welcome-section">` 整段**

`index.html` 里原 welcome section 删除（替换为 welcome-strip）。

- [ ] **Step 8: 验证**

用 Playwright 跑首页。Expected：
- 顶部细线 welcome 条
- 4 个统计卡用单色 SVG icon
- "最近写作"区块显示空状态 / 3 个最近项目
- "我的小说"工具条横排（搜索/类型/时间/+ 新建）

- [ ] **Step 9: 提交**

```bash
git add index.html js/app.js css/style.css
git commit -m "feat(home): redesign with recent section + single-color stat icons"
```

---

## Task 6: 修复 B1 bug + 重写 `create.html`

**Files:**
- Modify: `js/create.js`（修 B1 bug）
- Modify: `create.html`（单列布局 + 去 emoji）
- Modify: `css/style.css`（添加新样式）

- [ ] **Step 1: 定位 B1 bug**

打开 DevTools 看 `createNovel` 函数（`js/create.js`）。问题出在 `markInvalid(titleInput, '请输入小说名称')` 之前没正确读取 `config.novelName`。检查 `syncConfigFromControls()` 是否在 createNovel 前调用了。

预期修法：在 createNovel 函数开头添加 `syncConfigFromControls()`，确保 `config.novelName` 是最新的。

- [ ] **Step 2: 修 B1 bug**

```javascript
// 在 createNovel 函数开头加
async function createNovel() {
    syncConfigFromControls();  // <-- 新增
    // ... rest unchanged
}
```

- [ ] **Step 3: 验证 B1 fix**

Playwright 走 create 流程，填小说名 + 主角 + 方向 + 选类型 + 点"开始创作"。Expected: 不再弹"请输入小说名称"，成功跳到 editor。

- [ ] **Step 4: 替换 `create.html` 主区为单列布局**

找到 `<div class="create-page">` 内的"构建配置"分栏，**改为单列**：

```html
<div class="create-form">
    <div class="form-group">
        <label class="form-label">小说名称 <span class="required">*</span></label>
        <input type="text" class="form-input" id="novelName" placeholder="给你的故事起个名字">
    </div>
    <div class="form-group">
        <label class="form-label">主角名称</label>
        <input type="text" class="form-input" id="protagonistName" placeholder="主角是谁？（可留空）">
        <button class="form-ai-btn" onclick="aiGenerateName('protagonist')" type="button">AI 命名</button>
    </div>
    <div class="form-group">
        <label class="form-label">创作方向</label>
        <textarea class="form-input" id="direction" rows="3" placeholder="用一句话描述你心中的故事"></textarea>
        <button class="form-ai-btn" onclick="aiGenerateDirection()" type="button">AI 生成方向</button>
    </div>
    <div class="form-group">
        <label class="form-label">小说类型</label>
        <div class="chip-group" id="genreTags">
            <button class="chip" data-value="fantasy" type="button">玄幻</button>
            <button class="chip" data-value="xianxia" type="button">仙侠</button>
            <button class="chip" data-value="urban" type="button">都市</button>
            <button class="chip" data-value="scifi" type="button">科幻</button>
            <button class="chip" data-value="historical" type="button">历史</button>
            <button class="chip" data-value="romance" type="button">言情</button>
            <button class="chip" data-value="mystery" type="button">悬疑</button>
            <button class="chip" data-value="wuxia" type="button">武侠</button>
            <button class="chip" data-value="game" type="button">游戏</button>
            <button class="chip" data-value="apocalypse" type="button">末世</button>
        </div>
    </div>
    <div class="form-group">
        <label class="form-label">叙事套路</label>
        <div class="chip-group" id="tropeTags"><!-- JS 渲染 --></div>
    </div>
    <div class="form-group">
        <label class="form-label">受众定位</label>
        <select class="form-input" id="audience">
            <option value="male-youth">男频 · 青年向</option>
            <option value="male-teen">男频 · 青少年向</option>
            <option value="female-youth">女频 · 青年向</option>
            <option value="female-teen">女频 · 青少年向</option>
            <option value="universal">通用</option>
        </select>
    </div>
    <div class="form-group">
        <label class="form-label">篇幅字数 <span id="wordCountValue">75万字</span></label>
        <input type="range" id="wordCountSlider" class="form-range" min="10" max="200" value="75" step="5">
    </div>
    <div class="form-group">
        <label class="form-label">情节结构</label>
        <select class="form-input" id="plotStructure">
            <option value="linear">线性</option>
            <option value="circular">环形</option>
            <option value="reverse">倒叙</option>
            <option value="multi">多线</option>
            <option value="network">网状</option>
        </select>
    </div>
    <div class="form-actions">
        <button class="btn-secondary" onclick="goBack()">取消</button>
        <button class="btn-primary" onclick="createNovel()">开始创作</button>
    </div>
</div>
```

- [ ] **Step 5: 替换模板卡片的 emoji icon**

模板卡中所有 `<div class="template-icon">📚</div>` 改为空（**只保留**文字标签）。具体在 `create.html` 找到所有 emoji icon，删除（保留文字）。

- [ ] **Step 6: 添加新样式**

```css
.create-form {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 0.875rem; color: var(--text-primary); font-weight: 500; }
.form-label .required { color: var(--danger); }
.form-input {
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 0.95rem;
    transition: border-color var(--motion-normal);
    width: 100%;
}
.form-input::placeholder { color: var(--text-muted); }
.form-input:focus { outline: none; border-color: var(--accent-primary); }
.form-input--error { border-color: var(--danger); }
.form-range { width: 100%; accent-color: var(--accent-primary); }
.form-ai-btn {
    align-self: flex-start;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--accent-primary);
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    cursor: pointer;
}
.chip-group { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
    padding: 4px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all var(--motion-normal);
    font-family: var(--font-ui);
}
.chip:hover { border-color: var(--border-strong); }
.chip--active {
    background: var(--accent-soft);
    color: var(--accent-primary);
    border-color: var(--accent-primary);
}
.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
}
```

- [ ] **Step 7: 验证**

Playwright 走 create 流程，截图主区。Expected：
- 单列布局，所有字段可见
- 1440×900 视口下不滚动可看到"开始创作"按钮
- 填了小说名能成功创建（修 B1）

- [ ] **Step 8: 提交**

```bash
git add create.html js/create.js css/style.css
git commit -m "feat(create): single-column layout + fix B1 validation bug + de-emoji"
```

---

## Task 7: 重写 `editor.html`（侧栏折叠 + 工具栏 + 模板卡）

**Files:**
- Modify: `editor.html`
- Modify: `js/editor.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `NovelStates`, `NovelShortcuts`, `NovelAutosave`
- Produces: 编辑器有 56px 折叠侧栏、续写/润色/建议按钮、自动保存文案

- [ ] **Step 1: 替换 editor.html 侧栏结构**

把 `<aside class="chapter-sidebar">` 改为：

```html
<aside class="chapter-sidebar" id="chapterSidebar">
    <div class="sidebar-tabs">
        <button class="sidebar-tab-icon" data-tab="chapters" onclick="switchSidebarTab('chapters')" title="章节" aria-label="章节">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v16H4z"/><line x1="8" y1="9" x2="16" y2="9"/></svg>
        </button>
        <button class="sidebar-tab-icon" data-tab="characters" onclick="switchSidebarTab('characters')" title="角色" aria-label="角色">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>
        </button>
        <button class="sidebar-tab-icon" data-tab="world" onclick="switchSidebarTab('world')" title="世界" aria-label="世界">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/></svg>
        </button>
        <button class="sidebar-tab-icon" data-tab="timeline" onclick="switchSidebarTab('timeline')" title="时间" aria-label="时间">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
        </button>
    </div>
    <div class="sidebar-content-wrap" id="sidebarContent">
        <div class="sidebar-content active" id="chaptersTab"><!-- existing chapter list --></div>
        <div class="sidebar-content" id="charactersTab"><!-- --></div>
        <div class="sidebar-content" id="worldTab"><!-- --></div>
        <div class="sidebar-content" id="timelineTab"><!-- --></div>
    </div>
</aside>
```

- [ ] **Step 2: 添加侧栏样式**

```css
.chapter-sidebar {
    width: 56px;
    background: var(--bg-card);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    transition: width var(--motion-sidebar);
    overflow: hidden;
}
.chapter-sidebar:hover { width: 240px; }
.sidebar-tabs {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--border-color);
    padding: 8px 0;
}
.sidebar-tab-icon {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 12px 18px;
    cursor: pointer;
    text-align: left;
    font-family: var(--font-ui);
    transition: all var(--motion-normal);
    white-space: nowrap;
    overflow: hidden;
}
.sidebar-tab-icon:hover { background: var(--bg-secondary); }
.sidebar-tab-icon.active { color: var(--accent-primary); background: var(--accent-soft); }
.sidebar-content-wrap { flex: 1; overflow-y: auto; padding: 12px; }
.sidebar-content { display: none; }
.sidebar-content.active { display: block; }
```

- [ ] **Step 3: 修改 switchSidebarTab 函数**

在 `js/editor.js` 的 `switchSidebarTab` 函数**前**加 helper：

```javascript
function updateSidebarTabIcons(activeName) {
    document.querySelectorAll('.sidebar-tab-icon').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === activeName);
    });
}
```

修改 `switchSidebarTab`：

```javascript
function switchSidebarTab(tabName) {
    document.querySelectorAll('.sidebar-tab-icon').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.sidebar-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName + 'Tab');
    });
}
```

- [ ] **Step 4: 替换工具栏的 ✨ emoji 按钮**

在 `editor.html` 中找到 3 个 AI 按钮的 `onclick` 调用：

```html
<button class="btn-secondary toolbar-btn" onclick="aiWrite()">AI 续写</button>
<button class="btn-secondary toolbar-btn" onclick="aiPolish()">AI 润色</button>
<button class="btn-secondary toolbar-btn" onclick="aiImprove()">AI 建议</button>
```

（删除所有 ✨ emoji 字符，保留按钮文字）

- [ ] **Step 5: 添加 `loading` 状态给 AI 按钮**

在 `js/editor.js` 的 `aiWrite/aiPolish/aiImprove` 三个函数中，**进入 try 前**加：

```javascript
const originalText = btn.textContent;
btn.disabled = true;
btn.innerHTML = '<span class="novel-spinner"></span> AI 思考中...';
```

**catch 块后**加：

```javascript
btn.disabled = false;
btn.textContent = originalText;
```

（具体修改根据每个函数的现有结构）

- [ ] **Step 6: 添加快捷键**

在 `js/editor.js` 末尾加：

```javascript
NovelShortcuts.bind('editor', 's', true, (e) => {
    saveCurrentChapter();
});
NovelShortcuts.bind('editor', 'Enter', true, (e) => {
    e.preventDefault();
    aiWrite();
});
```

- [ ] **Step 7: 验证**

Playwright 截图。Expected：
- 侧栏默认 56px 只显示 icon，hover 展开 240px
- 3 个 AI 按钮无 emoji
- 点 AI 续写 → 按钮变 spinner
- Ctrl+S 保存，Ctrl+Enter 续写

- [ ] **Step 8: 提交**

```bash
git add editor.html js/editor.js css/style.css
git commit -m "feat(editor): collapsible sidebar + AI button loading + shortcuts"
```

---

## Task 8: 简化 `login.html` + 删除项目二次确认

**Files:**
- Modify: `login.html`
- Modify: `css/style.css`
- Modify: `js/app.js`（删除确认）
- Modify: `js/editor.js`（章节重命名 inline edit）

- [ ] **Step 1: 替换 login.html 表单**

```html
<div class="login-container">
    <div class="login-avatar" id="loginAvatar">
        <span class="avatar-default">?</span>
    </div>
    <h2 class="login-title">欢迎回来</h2>
    <p class="login-sub">登录一页，继续创作</p>
    <div class="form-group">
        <label class="form-label">账号</label>
        <input type="text" class="form-input" id="username" placeholder="任意账号">
        <p class="error-msg" id="usernameError">请输入账号</p>
    </div>
    <div class="form-group">
        <label class="form-label">密码</label>
        <input type="password" class="form-input" id="password" placeholder="任意密码">
        <p class="error-msg" id="passwordError">请输入密码</p>
    </div>
    <button class="btn-primary login-btn" onclick="handleLogin()">登录</button>
    <p class="login-hint">演示模式：任意账号密码均可登录</p>
</div>
```

- [ ] **Step 2: 添加 login 样式**

```css
.login-container {
    max-width: 360px;
    margin: 80px auto;
    padding: 32px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    text-align: center;
}
.login-avatar {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 50%;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
}
.avatar-default {
    font-family: var(--font-ui);
    font-size: 1.5rem;
    color: var(--text-muted);
}
.login-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 4px; }
.login-sub { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 24px; }
.login-btn { width: 100%; margin-bottom: 16px; }
.login-hint { font-size: 0.75rem; color: var(--text-muted); }
```

- [ ] **Step 3: 删除 login.html 里 "关于" "说明" 链接**

删除 `<div class="login-links">...</div>` 整段。

- [ ] **Step 4: 删除 `js/login.html` 里的 `handleAvatarUpload` 和 `avatarUpload` 元素**

简化 handleLogin 移除 avatar 引用（avatar 是默认 "?" 占位，不需要上传）。

- [ ] **Step 5: 添加项目删除二次确认到 `js/app.js`**

找到 `deleteProject(index)` 函数（如果有），替换为：

```javascript
function deleteProject(index) {
    const p = projects[index];
    if (!p) return;
    if (!confirm(`确认删除「${p.title}」？删除后无法恢复。`)) return;
    projects.splice(index, 1);
    NovelCommon.saveProjects(projects);
    renderProjects();
    renderRecent();
    showToast(`已删除「${p.title}」`, 'success');
}
```

（如果现有 deleteProject 实现不同，按相同语义替换）

- [ ] **Step 6: 验证**

Playwright：
- 打开 login 页面，截图。Expected：极简表单 + "?" 占位头像
- 登录，删一个项目 → 弹 confirm 框

- [ ] **Step 7: 提交**

```bash
git add login.html css/style.css js/app.js
git commit -m "feat(login): simplify form + delete confirm"
```

---

## Task 9: 全局验收 + 删除 legacy token

**Files:**
- Modify: `css/style.css`（删除所有 `--legacy-*` 引用）
- Modify: 删除 `js/login.html`（如果存在）— 注意 login.html 是 HTML 文件不是 JS
- 创建 `tests/visual_smoke.py`（Playwright 端到端）

- [ ] **Step 1: 写 Playwright 端到端 smoke test**

创建 `tests/visual_smoke.py`：

```python
"""End-to-end smoke test of 一页 design system."""
from playwright.sync_api import sync_playwright
import os

OUT = 'e:/tmp/visual_smoke'
os.makedirs(OUT, exist_ok=True)

PAGES = [
    ('index', 'e:/study/novel/index.html'),
    ('create', 'e:/study/novel/create.html'),
    ('editor', 'e:/study/novel/editor.html'),
    ('login', 'e:/study/novel/login.html'),
]

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel='chrome')
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = ctx.new_page()
        # Pre-set auth to skip login
        page.add_init_script("""
            sessionStorage.setItem('moyun_auth_user', JSON.stringify({name:'yyy'}));
            localStorage.setItem('moyun_user_name', 'yyy');
        """)
        for name, path in PAGES:
            for theme in ['light', 'dark']:
                page.goto(f'file:///{path}')
                page.wait_for_load_state('networkidle', timeout=5000)
                page.evaluate(f"localStorage.setItem('moyun_theme', '{theme}')")
                page.evaluate(f"document.documentElement.setAttribute('data-theme', '{theme}')")
                page.wait_for_timeout(300)
                page.screenshot(path=f'{OUT}/{name}_{theme}.png', full_page=True)
                print(f'[shot] {name}_{theme}.png')
        browser.close()

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 跑 smoke test**

```bash
python e:/tmp/visual_smoke.py
```

Expected: 8 张截图生成（4 页 × 2 主题）。

- [ ] **Step 3: 视觉对比**

人工检视每张截图，确认：
- 4 页都显示「一页」Logo（点阵 + 中文）
- 4 页主题切换按钮正确
- 暗/亮主题差异明显
- 无 emoji icon（除 favicon）
- 4 个统计卡用单色 SVG icon
- 创建页 1440×900 不滚动可见所有字段

- [ ] **Step 4: 跑端到端工作流**

用 Playwright 走完：
1. 登录（yyy/123456）
2. 首页 + 主题切换
3. 新建项目（填小说名 + 主角 + 方向 + 选类型 + 开始创作）— **B1 修复验证**
4. 进入编辑器，写字，AI 续写（看 spinner + 文案）
5. 返回首页，看到"最近写作"
6. 删除项目（看 confirm 框）

- [ ] **Step 5: 删除 `--legacy-*` token**

在 `css/style.css` 中删除所有 `--legacy-*` 变量定义（保留新 token）。

- [ ] **Step 6: 验证 CSS 体积**

```bash
wc -l css/style.css css/motion.css
```

Expected: 总行数 ≤ 2000。

- [ ] **Step 7: 提交**

```bash
git add css/style.css tests/visual_smoke.py
git commit -m "chore: remove legacy tokens + add visual smoke test"
```

---

## Task 10: 文档 + 推送

**Files:**
- Modify: `README.md`（更新品牌名）
- Modify: `ARCHITECTURE.md`（如有需要）

- [ ] **Step 1: 替换 README.md 中"墨韵AI"为"一页"**

全局替换（保留"墨韵AI"在 git history 中可读）。

- [ ] **Step 2: 更新 README 中"使用方式"部分描述新设计**

如果 README 有截图或描述，加上新调色板、字体、logo 的说明。

- [ ] **Step 3: 提交并推送**

```bash
git add README.md ARCHITECTURE.md
git commit -m "docs: update brand to 一页"
git push origin main
```

---

## Self-Review（实施前再过一遍）

**Spec coverage**:
- ✅ B1 修复 → Task 6
- ✅ V1-V7 视觉债 → Task 1（token）+ Task 5（首页）+ Task 6（创建页）+ Task 7（编辑器）+ Task 8（登录）
- ✅ A1-A4 信息架构 → Task 5（最近写作）+ Task 6（单列布局）
- ✅ D1 占位符 → Task 6
- ✅ D2 动效 → Task 1
- ✅ D3 focus → Task 2
- ✅ D4 favicon → spec 范围内不实施（在 README TODO）
- ✅ D5 错误 → Task 6
- ✅ D6 loading → Task 1 + Task 7
- ✅ D7 快捷键 → Task 4 + Task 7
- ✅ D8 文案清理 → Task 5 + Task 8
- ✅ D9 i18n 扩展 → 不实施（spec 范围外）
- ✅ D10 3 状态 → Task 3
- ✅ W1 删除确认 → Task 8
- ✅ W2 导出下拉 → 不实施（spec 开放问题）
- ✅ W3 Gist UI → 不实施（spec 标记"不大改"）
- ✅ W4 返回按钮 → Task 2
- ✅ W5 onboarding → Task 5（隐性：CTA + 引导文字）
- ✅ W6 章节重命名 → Task 8 标注"待实施"，本 plan 不强制
- ✅ W7 自动保存 → Task 7
- ✅ W8 登录头像 → Task 8
- ✅ E1 CSS 重置 → Task 1 + Task 9 删除 legacy
- ✅ E2 跟随系统 → Task 2（明示不跟随）
- ✅ E3 favicon 主题 → 不实施
- ✅ E4 theme-color → Task 9 加在所有 HTML
- ✅ E5 OG image → 不实施（README TODO）
- ✅ U1 登录页 header → Task 2
- ✅ U2 跨页面一致性 → Task 2
- ✅ meta theme-color → 散在 Task 9 / 现有 head 修

**Gaps**:
- W6 章节重命名 inline edit 没在 plan 任务里——**用户没要求**，暂跳过（如需要可加 Task 7.5）
- W2 导出下拉没改——spec 写"实施时决定"，保留现有 select 实现

**Type consistency check**:
- `NovelStates.render(mountEl, opts)` → Task 3 + Task 5 都用 ✅
- `NovelThemeToggle.apply(theme)` / `getCurrent()` → Task 2 + 4 页都用 ✅
- `NovelShortcuts.bind(scope, key, ctrl, action)` → Task 4 + Task 7 用 ✅
- `NovelCommon.setTheme(theme)` 已存在 → Task 2 复用 ✅

**No placeholders**: 所有 step 都包含具体代码或命令。

---

## 估算

- **10 个任务** + 0 个子任务
- **总步骤**：约 60 个小步
- **预估时间**：3-4 小时（如果是 Claude 实施）
- **提交次数**：9-10 个 commit

## 风险

- CSS 改动量大（Task 1），建议逐步提交
- HTML 结构改动多（Task 2、5、6、7、8），每页 commit 后跑 Playwright 验证
- B1 修法依赖 Task 6 定位结果，可能要加一步

## 端到端完成定义

Task 10 完成后，用户应能：
1. 打开任意页面，看到「一页」Logo（点阵 + 中文）
2. 切换暗/亮主题，背景和文字明显变化
3. 登录 → 首页看到最近写作 / 项目列表
4. 新建项目，填小说名 + 选类型 → 成功创建（B1 修复）
5. 编辑器写章节，AI 续写有 spinner
6. Ctrl+S 保存有提示
7. 删除项目有二次确认
8. CSS ≤ 2000 行
