// ==================== Create Page Interaction Layer ====================
(() => {
    'use strict';

    const STORAGE = {
        projects: 'moyun_projects',
        aiSettings: 'moyun_ai_settings',
        theme: 'moyun_theme',
        userName: 'moyun_user_name',
        userTemplates: 'moyun_user_templates'
    };

    const TYPE_LABELS = {
        all: '全部',
        fantasy: '玄幻',
        xianxia: '仙侠',
        urban: '都市',
        scifi: '科幻',
        historical: '历史',
        romance: '言情',
        mystery: '悬疑',
        wuxia: '武侠',
        game: '游戏',
        apocalypse: '末世'
    };

    const NOVEL_TYPES = ['fantasy', 'xianxia', 'urban', 'scifi', 'historical', 'romance', 'mystery', 'wuxia', 'game', 'apocalypse'];

    const DEFAULT_CONFIG = {
        novelName: '',
        protagonistName: '',
        direction: '',
        genre: '',
        tropes: [],
        audience: 'male-youth',
        wordCount: 750000,
        plotStructure: 'linear'
    };

    const DEFAULT_AI_SETTINGS = {
        provider: 'anthropic',
        apiKey: '',
        baseUrl: '',
        model: '',
        maxTokens: 2048,
        temperature: 0.7
    };

    const API_PRESETS = {
        anthropic: {
            label: 'Anthropic (Claude)',
            baseUrl: 'https://api.anthropic.com',
            endpoint: '/v1/messages',
            model: 'claude-sonnet-4-20250514'
        },
        openai: {
            label: 'OpenAI (GPT)',
            baseUrl: 'https://api.openai.com',
            endpoint: '/v1/chat/completions',
            model: 'gpt-4o-mini'
        },
        deepseek: {
            label: 'DeepSeek',
            baseUrl: 'https://api.deepseek.com',
            endpoint: '/v1/chat/completions',
            model: 'deepseek-chat'
        },
        minimax: {
            label: 'MiniMax',
            baseUrl: 'https://api.minimaxi.com',
            endpoint: '/v1/chat/completions',
            model: 'MiniMax-Text-01'
        },
        kimi: {
            label: 'Kimi',
            baseUrl: 'https://api.moonshot.cn',
            endpoint: '/v1/chat/completions',
            model: 'moonshot-v1-8k'
        },
        glm: {
            label: 'GLM',
            baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            endpoint: '/chat/completions',
            model: 'glm-4-flash'
        },
        custom: {
            label: '自定义 API',
            baseUrl: '',
            endpoint: '/v1/chat/completions',
            model: ''
        },
        local: {
            label: '本地模拟',
            baseUrl: '',
            endpoint: '',
            model: 'local-mock'
        }
    };

    const templates = [
        {
            id: 'xianxia-path',
            name: '修仙问道',
            type: 'xianxia',
            icon: '',
            audience: '男频',
            desc: '追求长生与天道，在修炼体系中一步步突破极限',
            tags: ['升级流', '炼功流', '悟道流'],
            framework: '境界设定：炼气 -> 筑基 -> 金丹 -> 元婴 -> 化神'
        },
        {
            id: 'fantasy-world',
            name: '玄幻大世界',
            type: 'fantasy',
            icon: '',
            audience: '男频',
            desc: '广阔天地，万族林立，主角以弱胜强',
            tags: ['系统流', '升级流', '无敌流'],
            framework: '势力分布：宗门 + 帝国 + 种族 + 地域'
        },
        {
            id: 'urban-rebirth',
            name: '都市重生',
            type: 'urban',
            icon: '',
            audience: '男频',
            desc: '重生回炉，弥补遗憾，重登人生巅峰',
            tags: ['重生', '系统流', '商业'],
            framework: '主线：复仇 + 商业 + 情感'
        },
        {
            id: 'urban-power',
            name: '都市异能',
            type: 'urban',
            icon: '',
            audience: '男频',
            desc: '觉醒异能，在都市中守护与征战',
            tags: ['异能', '升级流', '都市'],
            framework: '异能等级 + 组织势力 + 事件副本'
        },
        {
            id: 'cyberpunk',
            name: '赛博朋克',
            type: 'scifi',
            icon: '',
            audience: '男频',
            desc: '高科技低生活，赛博世界的黑客与公司阴影',
            tags: ['科幻', '穿越', '技术流'],
            framework: '科技树 + 公司 + 义体 + 黑客网络'
        },
        {
            id: 'space-opera',
            name: '星际科幻',
            type: 'scifi',
            icon: '',
            audience: '男频',
            desc: '星辰大海，文明战争、资源争夺与未知探索',
            tags: ['科幻', '星际', '升级流'],
            framework: '文明等级 + 战舰体系 + 星域资源'
        },
        {
            id: 'game-system',
            name: '游戏异界',
            type: 'game',
            icon: '',
            audience: '男频',
            desc: '主角进入规则化副本世界，在职业、技能与公会竞争中寻找破局机会',
            tags: ['游戏', '系统流', '升级流'],
            framework: '职业体系 + 副本机制 + 公会势力 + 赛季目标'
        },
        {
            id: 'wuxia-jianghu',
            name: '武侠江湖',
            type: 'wuxia',
            icon: '',
            audience: '通用',
            desc: '刀光剑影，江湖恩怨与侠义抉择',
            tags: ['武侠', '门派', '修炼'],
            framework: '江湖势力 + 武功秘籍 + 门派辈分'
        },
        {
            id: 'history-travel',
            name: '历史穿越',
            type: 'historical',
            icon: '',
            audience: '男频',
            desc: '穿越古代，用现代知识改写历史走向',
            tags: ['穿越', '历史', '权谋'],
            framework: '历史背景 + 势力格局 + 技术差'
        },
        {
            id: 'apocalypse',
            name: '末世危机',
            type: 'apocalypse',
            icon: '',
            audience: '通用',
            desc: '秩序崩塌后的生存、联盟与希望重建',
            tags: ['末世', '生存', '异能'],
            framework: '灾难阶段 + 安全区 + 资源循环'
        },
        {
            id: 'ceo-romance',
            name: '霸道总裁',
            type: 'romance',
            icon: '',
            audience: '女频',
            desc: '豪门总裁与普通女孩在误会和靠近中相爱',
            tags: ['言情', '豪门', '甜宠'],
            framework: '相遇 -> 误会 -> 相知 -> 表白 -> 甜蜜'
        },
        {
            id: 'fantasy-romance',
            name: '玄幻言情',
            type: 'romance',
            icon: '',
            audience: '女频',
            desc: '修仙世界中的双强成长与刻骨铭心之恋',
            tags: ['言情', '玄幻', '甜虐'],
            framework: '升级 + 双强 + 并肩作战 + 情感抉择'
        },
        {
            id: 'mystery-case',
            name: '悬疑推理',
            type: 'mystery',
            icon: '',
            audience: '通用',
            desc: '层层迷雾，抽丝剥茧找出隐藏真相',
            tags: ['悬疑', '推理', '破案'],
            framework: '案件 -> 线索 -> 迷雾 -> 反转 -> 真相'
        }
    ];

    let config = { ...DEFAULT_CONFIG };
    let aiSettings = { ...DEFAULT_AI_SETTINGS };
    let currentTemplateFilter = 'all';
    let selectedTemplateId = null;
    let importedOutline = null;
    let discussHistory = [];
    let discussBusy = false;

    const $ = (id) => document.getElementById(id);
    const qs = (selector, root = document) => root.querySelector(selector);
    const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    document.addEventListener('DOMContentLoaded', init);

    exposeGlobals();

    function exposeGlobals() {
        // showToast 是旧版本使用的全局别名（兼容 app.js / editor.js 中以 window.showToast 调用的代码）
        const showToast = (message, type = 'info', title = '') => toast(message, type, title);
        Object.assign(window, {
            aiGenerateName,
            aiGenerateDirection,
            clearImportedOutline,
            closeSaveTemplateModal,
            closeSettingsModal,
            closeSettingsModalOnOverlay,
            closeUserNameModal,
            confirmSaveTemplate,
            createNovel,
            editUserName,
            filterTemplates,
            goBack,
            handleOutlineFile,
            onApiProviderChange,
            openSaveTemplateModal,
            openSettingsModal,
            resetConfig,
            saveSettings,
            saveUserName,
            searchTemplates,
            selectOutlineFile,
            selectTemplate,
            sendDiscussMessage,
            setWordCount,
            showToast,
            switchTab,
            testApiConnection,
            toggleCollapsible,
            toggleTheme
        });
    }

    function init() {
        if (!requireAuth()) return;
        injectInteractionStyles();
        enhanceStaticMarkup();
        loadSettings();
        loadTheme();
        loadUserName();
        syncConfigFromControls();
        bindEvents();
        renderTemplates();
        updateFilterCounts();
        updateGenreTags();
        updateTropeTags();
        updateWordCountLabel();
        updateTabChrome('build');
    }

    // ==================== DOM Setup ====================
    function injectInteractionStyles() {
        if ($('moyunInteractionStyles')) return;

        const style = document.createElement('style');
        style.id = 'moyunInteractionStyles';
        style.textContent = `
            .moyun-toast-wrap {
                position: fixed;
                right: 20px;
                bottom: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                width: min(360px, calc(100vw - 40px));
                pointer-events: none;
            }
            .moyun-toast {
                pointer-events: auto;
                display: grid;
                grid-template-columns: 8px 1fr auto;
                gap: 12px;
                align-items: start;
                padding: 12px 14px 12px 0;
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 10px;
                color: var(--text-primary);
                box-shadow: 0 14px 38px rgba(0, 0, 0, 0.35);
                animation: moyunToastIn 0.18s ease-out;
            }
            .moyun-toast::before {
                content: '';
                align-self: stretch;
                border-radius: 10px 0 0 10px;
                background: var(--accent-blue);
            }
            .moyun-toast.success::before { background: var(--accent-teal); }
            .moyun-toast.warning::before { background: var(--accent-gold); }
            .moyun-toast.error::before { background: #EF4444; }
            .moyun-toast-title {
                display: block;
                font-size: 0.9rem;
                font-weight: 700;
                margin-bottom: 2px;
            }
            .moyun-toast-message {
                display: block;
                color: var(--text-secondary);
                font-size: 0.82rem;
                line-height: 1.5;
            }
            .moyun-toast-close {
                background: transparent;
                border: 0;
                color: var(--text-muted);
                cursor: pointer;
                font-size: 1.05rem;
                line-height: 1;
                padding: 2px;
            }
            .moyun-toast-close:hover { color: var(--text-primary); }
            .input-error {
                border-color: #EF4444 !important;
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
            }
            .template-card.selected {
                border-color: var(--accent-blue);
                background: rgba(59, 130, 246, 0.12);
                box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.18);
            }
            .import-status {
                max-width: 640px;
                margin: 1.5rem auto 0;
                padding: 1rem;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 10px;
                text-align: left;
                color: var(--text-secondary);
                font-size: 0.86rem;
                line-height: 1.6;
            }
            .import-status strong {
                color: var(--text-primary);
                display: block;
                margin-bottom: 0.35rem;
            }
            .import-status ul {
                margin: 0.5rem 0 0;
                padding-left: 1.2rem;
            }
            .inline-action-row {
                display: flex;
                justify-content: center;
                gap: 0.75rem;
                flex-wrap: wrap;
            }
            .is-busy {
                opacity: 0.72;
                cursor: wait !important;
            }
            button:disabled,
            .disabled {
                opacity: 0.58;
                cursor: not-allowed !important;
            }
            @keyframes moyunToastIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @media (max-width: 640px) {
                .moyun-toast-wrap {
                    left: 16px;
                    right: 16px;
                    bottom: 16px;
                    width: auto;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function enhanceStaticMarkup() {
        ensureToastContainer();
        enhanceImportPanel();
        enhanceTemplateToolbar();
        enhanceLogout();

        const maxTokens = $('maxTokensInput');
        if (maxTokens) {
            maxTokens.min = maxTokens.min || '256';
            maxTokens.max = maxTokens.max || '8192';
            maxTokens.step = maxTokens.step || '256';
        }
    }

    function enhanceImportPanel() {
        const importPanel = $('tabContentImport');
        if (!importPanel) return;

        let fileInput = $('outlineFileInput');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'outlineFileInput';
            fileInput.accept = '.md,.markdown,.json,.txt,application/json,text/markdown,text/plain';
            fileInput.style.display = 'none';
            fileInput.addEventListener('change', handleOutlineFile);
            importPanel.appendChild(fileInput);
        }

        const chooseButton = qs('button.toolbar-btn', importPanel);
        if (chooseButton) {
            chooseButton.textContent = '选择大纲文件';
            chooseButton.setAttribute('onclick', 'selectOutlineFile()');
        }

        if (!$('importStatus')) {
            const status = document.createElement('div');
            status.id = 'importStatus';
            status.className = 'import-status';
            status.style.display = 'none';
            importPanel.appendChild(status);
        }
    }

    function enhanceTemplateToolbar() {
        const searchInput = $('templateSearchInput');
        if (!searchInput) return;

        searchInput.value = '';
        searchInput.setAttribute('autocomplete', 'off');
        searchInput.setAttribute('spellcheck', 'false');
    }

    function enhanceLogout() {
        const userInfo = qs('.user-info');
        if (!userInfo) return;

        userInfo.setAttribute('role', 'button');
        userInfo.setAttribute('tabindex', '0');
        userInfo.title = '用户菜单';

        let menu = qs('.user-menu', userInfo);
        if (!menu) {
            menu = document.createElement('div');
            menu.className = 'user-menu';
            menu.hidden = true;

            const user = document.createElement('div');
            user.className = 'user-menu-user';
            user.textContent = localStorage.getItem(STORAGE.userName) || '当前用户';

            const logoutBtn = document.createElement('button');
            logoutBtn.type = 'button';
            logoutBtn.textContent = '退出登录';
            logoutBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                handleLogout();
            });

            menu.append(user, logoutBtn);
            userInfo.appendChild(menu);
        } else {
            menu.hidden = true;
        }

        userInfo.addEventListener('click', (event) => {
            event.stopPropagation();
            const open = !userInfo.classList.contains('open');
            userInfo.classList.toggle('open', open);
            menu.hidden = !open;
        });
        userInfo.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const open = !userInfo.classList.contains('open');
                userInfo.classList.toggle('open', open);
                menu.hidden = !open;
            }
            if (event.key === 'Escape') {
                userInfo.classList.remove('open');
                menu.hidden = true;
            }
        });
        document.addEventListener('click', () => {
            userInfo.classList.remove('open');
            menu.hidden = true;
        });
    }

    function bindEvents() {
        $('templateSearchInput')?.addEventListener('input', searchTemplates);
        $('genreTags')?.addEventListener('click', handleGenreClick);
        $('tropeTags')?.addEventListener('click', handleTropeClick);
        $('wordCountSlider')?.addEventListener('input', (event) => {
            setWordCount(Number(event.target.value), { silent: true });
        });
        $('audience')?.addEventListener('change', syncConfigFromControls);
        $('plotStructure')?.addEventListener('change', syncConfigFromControls);
        $('novelName')?.addEventListener('input', syncConfigFromControls);
        $('protagonistName')?.addEventListener('input', syncConfigFromControls);
        $('direction')?.addEventListener('input', syncConfigFromControls);
        $('createNovelBtn')?.addEventListener('click', createNovel);
        $('discussInput')?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendDiscussMessage();
            }
        });

        qsa('.modal-overlay').forEach((overlay) => {
            overlay.addEventListener('click', (event) => {
                if (event.target !== overlay) return;
                closeModalById(overlay.id);
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeTopModal();
        });
    }

    // ==================== Feedback Helpers ====================
    function ensureToastContainer() {
        let container = $('moyunToastWrap');
        if (!container) {
            container = document.createElement('div');
            container.id = 'moyunToastWrap';
            container.className = 'moyun-toast-wrap';
            document.body.appendChild(container);
        }
        return container;
    }

    function toast(message, type = 'info', title = '') {
        const container = ensureToastContainer();
        const titles = {
            info: '提示',
            success: '已完成',
            warning: '请注意',
            error: '操作失败'
        };

        const node = document.createElement('div');
        node.className = `moyun-toast ${type}`;

        const text = document.createElement('div');
        const titleEl = document.createElement('span');
        titleEl.className = 'moyun-toast-title';
        titleEl.textContent = title || titles[type] || titles.info;

        const messageEl = document.createElement('span');
        messageEl.className = 'moyun-toast-message';
        messageEl.textContent = message;

        const close = document.createElement('button');
        close.className = 'moyun-toast-close';
        close.type = 'button';
        close.textContent = '×';
        close.addEventListener('click', () => removeToast(node));

        text.append(titleEl, messageEl);
        node.append(text, close);
        container.appendChild(node);

        window.setTimeout(() => removeToast(node), type === 'error' ? 5200 : 3200);
    }

    function removeToast(node) {
        if (!node || !node.parentNode) return;
        node.style.opacity = '0';
        node.style.transform = 'translateY(8px)';
        window.setTimeout(() => node.remove(), 160);
    }

    async function withButtonBusy(button, label, task) {
        if (!button) return task();
        const originalText = button.textContent;
        button.textContent = label;
        button.disabled = true;
        button.classList.add('is-busy');
        try {
            return await task();
        } finally {
            button.textContent = originalText;
            button.disabled = false;
            button.classList.remove('is-busy');
        }
    }

    function markInvalid(input, message) {
        if (!input) {
            toast(message, 'error');
            return;
        }
        input.classList.add('input-error');
        input.focus();
        toast(message, 'error');
        window.setTimeout(() => input.classList.remove('input-error'), 2200);
    }

    function showCreateActionStatus(message, type = 'info') {
        let status = $('createActionStatus');
        const actions = qs('.bottom-actions');
        if (!status && actions) {
            status = document.createElement('span');
            status.id = 'createActionStatus';
            status.className = 'create-action-status';
            actions.insertBefore(status, actions.firstChild);
        }
        if (!status) return;
        status.textContent = message;
        status.className = `create-action-status ${type}`;
    }

    function clearCreateActionStatus() {
        const status = $('createActionStatus');
        if (status) status.textContent = '';
    }

    // ==================== Storage ====================
    function readJson(key, fallback) {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn(`Invalid JSON in ${key}`, error);
            return fallback;
        }
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    // ==================== Theme & User ====================
    function loadTheme() {
        const theme = localStorage.getItem(STORAGE.theme) || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        const select = qs('.theme-select');
        if (select) select.value = theme;
    }

    function toggleTheme() {
        const select = qs('.theme-select');
        const theme = select?.value || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE.theme, theme);
    }

    function loadUserName() {
        const saved = localStorage.getItem(STORAGE.userName) || 'yyy';
        updateUserNameDisplay(saved);
    }

    function updateUserNameDisplay(name) {
        const display = $('userName');
        const avatar = qs('.user-avatar');
        if (display) display.textContent = name;
        if (avatar) avatar.textContent = (name.trim().charAt(0) || 'Y').toUpperCase();
    }

    function editUserName() {
        const input = $('userNameInput');
        if (input) input.value = localStorage.getItem(STORAGE.userName) || 'yyy';
        openModalById('userNameModal');
        input?.focus();
    }

    function closeUserNameModal() {
        closeModalById('userNameModal');
    }

    function saveUserName() {
        const input = $('userNameInput');
        const name = input?.value.trim();
        if (!name) {
            markInvalid(input, '请输入用户名');
            return;
        }
        localStorage.setItem(STORAGE.userName, name);
        updateUserNameDisplay(name);
        closeUserNameModal();
        toast('用户名已更新', 'success');
    }

    function handleLogout() {
        sessionStorage.removeItem('moyun_auth_user');
        localStorage.removeItem('moyun_auth_user');
        localStorage.removeItem('user');
        toast('正在返回登录页', 'info');
        window.setTimeout(() => {
            window.location.href = 'login.html';
        }, 350);
    }

    function requireAuth() {
        const auth = getAuthUser();
        if (!auth) {
            window.location.href = 'login.html';
            return false;
        }
        localStorage.setItem(STORAGE.userName, auth.name);
        return true;
    }

    function getAuthUser() {
        const current = readSessionJson('moyun_auth_user');
        if (current?.name) return current;
        return null;
    }

    function readSessionJson(key) {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    }

    // ==================== Settings ====================
    function loadSettings() {
        aiSettings = {
            ...DEFAULT_AI_SETTINGS,
            ...readJson(STORAGE.aiSettings, {})
        };
    }

    function openSettingsModal() {
        loadSettings();
        const provider = $('apiProvider');
        const apiKey = $('apiKeyInput');
        const baseUrl = $('baseUrlInput');
        const model = $('modelInput');
        const maxTokens = $('maxTokensInput');

        if (provider) provider.value = aiSettings.provider || DEFAULT_AI_SETTINGS.provider;
        if (apiKey) apiKey.value = aiSettings.apiKey || '';
        if (baseUrl) baseUrl.value = aiSettings.baseUrl || '';
        if (model) model.value = aiSettings.model || '';
        if (maxTokens) maxTokens.value = aiSettings.maxTokens || DEFAULT_AI_SETTINGS.maxTokens;

        onApiProviderChange({ silent: true });
        openModalById('settingsModal');
    }

    function closeSettingsModal() {
        closeModalById('settingsModal');
    }

    function closeSettingsModalOnOverlay(event) {
        if (event.target?.id === 'settingsModal') closeSettingsModal();
    }

    function onApiProviderChange(options = {}) {
        const provider = $('apiProvider')?.value || 'anthropic';
        const preset = API_PRESETS[provider] || API_PRESETS.custom;
        const isLocal = provider === 'local';

        setDisplay('apiKeyGroup', !isLocal);
        setDisplay('baseUrlGroup', !isLocal);
        setDisplay('modelGroup', !isLocal);

        const baseUrl = $('baseUrlInput');
        const model = $('modelInput');
        if (baseUrl) {
            baseUrl.placeholder = preset.baseUrl || 'https://your-api.example.com';
            // 仅当字段为空时自动填入默认 baseUrl，避免覆盖用户已填的
            if (!baseUrl.value.trim() && preset.baseUrl) {
                baseUrl.value = preset.baseUrl;
            }
        }
        if (model) {
            model.placeholder = preset.model || '输入模型名称';
        }

    }

    function setDisplay(id, visible) {
        const node = $(id);
        if (node) node.style.display = visible ? 'block' : 'none';
    }

    function saveSettings() {
        const provider = $('apiProvider')?.value || 'anthropic';
        const maxTokensInput = $('maxTokensInput');
        const maxTokens = clamp(Number(maxTokensInput?.value || DEFAULT_AI_SETTINGS.maxTokens), 256, 8192);

        if (maxTokensInput && String(maxTokens) !== maxTokensInput.value) {
            maxTokensInput.value = maxTokens;
        }

        aiSettings = {
            provider,
            apiKey: $('apiKeyInput')?.value.trim() || '',
            baseUrl: $('baseUrlInput')?.value.trim() || '',
            model: $('modelInput')?.value.trim() || '',
            maxTokens,
            temperature: aiSettings.temperature || DEFAULT_AI_SETTINGS.temperature
        };

        writeJson(STORAGE.aiSettings, aiSettings);
        closeSettingsModal();
        toast('AI 设置已保存', 'success');
    }

    async function testApiConnection() {
        const button = $('testBtn');
        await withButtonBusy(button, '测试中...', async () => {
            const provider = $('apiProvider')?.value || aiSettings.provider;
            const apiKey = $('apiKeyInput')?.value.trim() || '';
            const baseUrlInput = $('baseUrlInput');
            const baseUrl = $('baseUrlInput')?.value.trim() || '';
            const model = $('modelInput')?.value.trim() || '';
            const maxTokens = clamp(Number($('maxTokensInput')?.value || 256), 256, 8192);

            if (provider === 'local') {
                await delay(500);
                toast('本地模拟模式可用', 'success');
                return;
            }

            if (!apiKey) {
                markInvalid($('apiKeyInput'), '请先输入 API Key');
                return;
            }
            if (!model) {
                markInvalid($('modelInput'), '请先输入模型名称');
                return;
            }

            try {
                const detectedProvider = inferApiProfile(baseUrl, model) || provider;
                let endpoint = '';
                try {
                    endpoint = buildApiEndpoint(baseUrl, detectedProvider);
                } catch (error) {
                    markInvalid(baseUrlInput, error.message);
                    return;
                }
                console.info('[Moyun] Testing AI endpoint:', endpoint);
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: buildApiHeaders(detectedProvider, apiKey),
                    body: JSON.stringify(buildConnectivityTestPayload(detectedProvider, model, maxTokens))
                });

                if (!response.ok) {
                    throw new Error(formatApiHttpError(response.status, endpoint, await readError(response)));
                }

                const data = await response.json();
                const reply = extractAIText(data, detectedProvider);
                if (reply.toLowerCase().includes('hello')) {
                    toast(`连接成功，模型回复：${reply.slice(0, 80)}`, 'success');
                } else {
                    toast(`连接成功，但回复不是预期文本：${reply.slice(0, 80) || '空回复'}`, 'warning');
                }
            } catch (error) {
                toast(normalizeNetworkError(error), 'error', '连接测试失败');
            }
        });
    }

    // ==================== Config Controls ====================
    function syncConfigFromControls() {
        config.novelName = $('novelName')?.value.trim() || '';
        config.protagonistName = $('protagonistName')?.value.trim() || '';
        config.direction = $('direction')?.value.trim() || '';
        config.audience = $('audience')?.value || DEFAULT_CONFIG.audience;
        config.plotStructure = $('plotStructure')?.value || DEFAULT_CONFIG.plotStructure;
        const sliderValue = Number($('wordCountSlider')?.value || 75);
        config.wordCount = sliderValue * 10000;
        // 暴露给集成层（create-integration.js 等）读取当前 genre
        window.__currentGenre = config.genre || '';
    }

    function handleGenreClick(event) {
        const button = event.target.closest('.tag-btn');
        if (!button || !button.dataset.value) return;
        config.genre = button.dataset.value;
        updateGenreTags();
        filterTemplates(config.genre, { silent: true, syncGenre: false });
    }

    function handleTropeClick(event) {
        const button = event.target.closest('.tag-btn');
        if (!button || !button.dataset.value) return;

        const value = button.dataset.value;
        if (config.tropes.includes(value)) {
            config.tropes = config.tropes.filter((item) => item !== value);
        } else {
            if (config.tropes.length >= 15) {
                toast('最多选择 15 个叙事套路', 'warning');
                return;
            }
            config.tropes.push(value);
        }
        updateTropeTags();
    }

    function updateGenreTags() {
        qsa('#genreTags .tag-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.value === config.genre);
        });
    }

    function updateTropeTags() {
        qsa('#tropeTags .tag-btn').forEach((button) => {
            button.classList.toggle('active', config.tropes.includes(button.dataset.value));
        });
        updateTropeCount();
    }

    function updateTropeCount() {
        const count = qs('#narrativeTropes .collapsible-header span');
        if (count) count.textContent = `已选 ${config.tropes.length}/15`;
    }

    function setWordCount(value, options = {}) {
        const numericValue = clamp(Number(value) || 75, 5, 300);
        config.wordCount = numericValue * 10000;
        const slider = $('wordCountSlider');
        if (slider) slider.value = numericValue;
        updateWordCountLabel();
        qsa('.preset-btn').forEach((button) => {
            const match = button.getAttribute('onclick')?.match(/setWordCount\((\d+)/);
            button.classList.toggle('active', Number(match?.[1]) === numericValue);
        });
    }

    function updateWordCountLabel() {
        const label = $('wordCountValue');
        if (!label) return;
        const value = Math.round(config.wordCount / 10000);
        label.textContent = `${value}万`;
    }

    function resetConfig() {
        config = { ...DEFAULT_CONFIG, tropes: [] };
        selectedTemplateId = null;
        importedOutline = null;

        setValue('novelName', '');
        setValue('protagonistName', '');
        setValue('direction', '');
        setValue('audience', DEFAULT_CONFIG.audience);
        setValue('plotStructure', DEFAULT_CONFIG.plotStructure);
        setWordCount(75, { silent: true });

        currentTemplateFilter = 'all';
        $('templateSearchInput') && ($('templateSearchInput').value = '');
        updateGenreTags();
        updateTropeTags();
        clearImportedOutline({ silent: true });
        renderTemplates();
        updateFilterButtons();
    }

    function setValue(id, value) {
        const node = $(id);
        if (node) node.value = value;
    }

    function toggleCollapsible(id) {
        const collapsible = $(id);
        if (!collapsible) {
            toast('未找到可展开区域', 'error');
            return;
        }
        collapsible.classList.toggle('open');
    }

    // ==================== Templates ====================
    function allTemplates() {
        return [...templates, ...getUserTemplates()];
    }

    function updateFilterCounts() {
        qsa('#templateFilters .filter-btn').forEach((button) => {
            const filter = button.dataset.filter;
            const baseText = button.textContent.replace(/\s+\d+$/, '').trim();
            button.textContent = `${baseText} ${countTemplates(filter)}`;
        });
    }

    function countTemplates(filter) {
        const source = allTemplates();
        if (!filter || filter === 'all') return source.length;
        return source.filter((item) => item.type === filter).length;
    }

    function renderTemplates(filter = currentTemplateFilter) {
        const grid = $('templateGrid');
        if (!grid) return;

        currentTemplateFilter = filter || 'all';
        const query = ($('templateSearchInput')?.value || '').trim().toLowerCase();
        let filtered = [];
        try {
            filtered = getFilteredTemplates(currentTemplateFilter, query);
        } catch (error) {
            console.error('Render templates failed:', error);
            filtered = templates.filter((template) => currentTemplateFilter === 'all' || template.type === currentTemplateFilter);
            toast('本地模板数据异常，已先显示内置模板', 'warning');
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="import-status" style="display:block;grid-column:1/-1;text-align:center;">
                    <strong>没有找到匹配模板</strong>
                    换一个类型或搜索词试试。
                </div>
            `;
            updateFilterButtons();
            return;
        }

        grid.innerHTML = filtered.map((template) => `
            <div class="template-card ${template.id === selectedTemplateId ? 'selected' : ''}" onclick="selectTemplate('${template.id}')">
                <div class="template-card-header">
                    <div class="template-icon ${template.type || 'custom'}">${template.icon || '📚'}</div>
                    <div class="template-info">
                        <h4>${escapeHtml(template.name)}</h4>
                        <span>${escapeHtml(template.audience)}</span>
                    </div>
                </div>
                <p class="template-desc">${escapeHtml(template.desc)}</p>
                <div class="template-tags">
                    ${(template.tags || []).map((tag) => `<span class="template-tag">#${escapeHtml(tag)}</span>`).join('')}
                </div>
                <div class="template-framework">📋 ${escapeHtml(template.framework)}</div>
            </div>
        `).join('');
        updateFilterButtons();
    }

    function getFilteredTemplates(filter, query) {
        return allTemplates().filter((template) => {
            const matchesFilter = filter === 'all'
                || template.type === filter;
            const searchable = [
                template.name,
                template.desc,
                template.audience,
                template.framework,
                ...(template.tags || [])
            ].join(' ').toLowerCase();
            return matchesFilter && (!query || searchable.includes(query));
        });
    }

    function updateFilterButtons() {
        qsa('#templateFilters .filter-btn').forEach((button) => {
            button.classList.toggle('active', button.dataset.filter === currentTemplateFilter);
        });
    }

    function filterTemplates(filter, options = {}) {
        currentTemplateFilter = filter || 'all';
        const searchInput = $('templateSearchInput');
        if (!options.keepSearch && searchInput?.value) {
            searchInput.value = '';
        }
        renderTemplates(currentTemplateFilter);
        if (!options.syncGenre && filter !== 'all' && $('genreTags')) {
            config.genre = filter;
            updateGenreTags();
        }
    }

    function searchTemplates() {
        renderTemplates(currentTemplateFilter);
    }

    function selectTemplate(id) {
        const template = allTemplates().find((item) => item.id === id);
        if (!template) {
            toast('模板不存在或已被移除', 'error');
            return;
        }

        selectedTemplateId = id;
        config.genre = normalizeNovelType(template.type, config.genre || 'fantasy');
        config.tropes = template.tropeValues || mapTagsToTropeValues(template.tags || []);
        setValue('novelName', template.name);
        setValue('direction', template.desc);
        updateGenreTags();
        updateTropeTags();
        renderTemplates();
        syncConfigFromControls();
        toast(`已应用模板：${template.name}`, 'success');
    }

    function mapTagsToTropeValues(tags) {
        const map = {
            '系统流': 'system',
            '升级流': 'levelup',
            '无敌流': 'invincible',
            '种田流': 'farming',
            '炼功流': 'cultivation',
            '技术流': 'tech',
            '签到流': 'checkin',
            '重生': 'rebirth',
            '穿越': 'transmigration',
            '悟道流': 'comprehension',
            '媚宠流': 'seductive',
            '后宫': 'harem',
            '脑子战': 'brainwar',
            '御兽': 'beast',
            '炼丹': 'alchemy'
        };
        return tags.map((tag) => map[tag]).filter(Boolean);
    }

    // ==================== Saved Templates ====================
    function getUserTemplates() {
        const saved = readJson(STORAGE.userTemplates, []);
        return Array.isArray(saved) ? saved : [];
    }

    function normalizeNovelType(type, fallback = 'fantasy') {
        return NOVEL_TYPES.includes(type) ? type : fallback;
    }

    function saveUserTemplates(list) {
        writeJson(STORAGE.userTemplates, list);
    }

    function openSaveTemplateModal() {
        syncConfigFromControls();
        const type = normalizeNovelType(config.genre || (currentTemplateFilter !== 'all' ? currentTemplateFilter : ''), 'fantasy');
        setValue('templateNameInput', config.novelName || '');
        setValue('templateIconInput', '📚');
        setValue('templateTypeInput', type);
        setValue('templateAudienceInput', config.audience || DEFAULT_CONFIG.audience);
        setValue('templateDescInput', config.direction || '');
        setTemplateTropePicker(config.tropes);
        openModalById('saveTemplateModal');
        $('templateNameInput')?.focus();
    }

    function closeSaveTemplateModal() {
        closeModalById('saveTemplateModal');
    }

    function confirmSaveTemplate() {
        syncConfigFromControls();
        const nameInput = $('templateNameInput');
        const name = nameInput?.value.trim();
        const type = normalizeNovelType($('templateTypeInput')?.value, 'fantasy');
        const audience = $('templateAudienceInput')?.value || 'universal';
        const tropeValues = getTemplateTropeValues();
        const desc = $('templateDescInput')?.value.trim() || `${TYPE_LABELS[type] || '模板'}创作模板`;
        if (!name) {
            markInvalid(nameInput, '请输入模板名称');
            return;
        }

        const saved = getUserTemplates();
        const template = {
            id: `user-${Date.now()}`,
            name,
            type,
            icon: $('templateIconInput')?.value.trim() || '📚',
            audience: audienceLabel(audience),
            desc,
            tags: tropeValues.map(tropeLabel),
            tropeValues,
            framework: `${TYPE_LABELS[type] || '模板'} · ${tropeValues.length ? tropeValues.map(tropeLabel).join(' + ') : '自由构建'}`
        };
        saved.push(template);
        saveUserTemplates(saved);
        selectedTemplateId = template.id;
        currentTemplateFilter = type;
        updateFilterCounts();
        renderTemplates(type);
        closeSaveTemplateModal();
        toast(`模板已创建：${name}`, 'success');
    }

    function setTemplateTropePicker(values) {
        qsa('#templateTropePicker input[type="checkbox"]').forEach((input) => {
            input.checked = values.includes(input.value);
        });
    }

    function getTemplateTropeValues() {
        return qsa('#templateTropePicker input[type="checkbox"]:checked').map((input) => input.value);
    }

    // ==================== Import Outline ====================
    function selectOutlineFile() {
        const input = $('outlineFileInput');
        if (!input) {
            toast('文件选择器初始化失败，请刷新页面重试', 'error');
            return;
        }
        input.value = '';
        input.click();
    }

    async function handleOutlineFile(event) {
        const file = event.target.files?.[0];
        if (!file) {
            toast('未选择文件', 'warning');
            return;
        }

        try {
            const text = await file.text();
            const parsed = parseOutlineFile(file.name, text);
            importedOutline = parsed;
            renderImportStatus(parsed, file.name);
            toast(`已导入 ${parsed.chapters.length} 个章节`, 'success');
        } catch (error) {
            importedOutline = null;
            renderImportError(error.message);
            toast(error.message, 'error', '导入失败');
        }
    }

    function parseOutlineFile(filename, text) {
        const trimmed = text.trim();
        if (!trimmed) throw new Error('文件内容为空');

        const lowerName = filename.toLowerCase();
        if (lowerName.endsWith('.json')) {
            return parseJsonOutline(trimmed);
        }
        return parseMarkdownOutline(trimmed);
    }

    function parseJsonOutline(text) {
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error('JSON 格式无法解析');
        }

        const source = Array.isArray(data)
            ? data
            : data.chapters || data.outline || data.items || [];
        if (!Array.isArray(source) || source.length === 0) {
            throw new Error('JSON 中没有找到章节数组');
        }

        const chapters = source.map((item, index) => {
            if (typeof item === 'string') {
                return { title: cleanTitle(item) || `第${index + 1}章`, summary: '', content: '' };
            }
            return {
                title: cleanTitle(item.title || item.name || item.chapter || `第${index + 1}章`),
                summary: String(item.summary || item.desc || item.description || '').trim(),
                content: String(item.content || '').trim()
            };
        }).filter((chapter) => chapter.title);

        if (chapters.length === 0) throw new Error('JSON 中没有有效章节');
        return { type: 'json', chapters };
    }

    function parseMarkdownOutline(text) {
        const lines = text.split(/\r?\n/);
        const chapters = [];
        let current = null;

        lines.forEach((line) => {
            const heading = line.match(/^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/);
            if (heading) {
                const title = cleanTitle(heading[2]);
                if (/^(大纲|简介|设定|世界观|人物|角色)$/i.test(title)) return;
                current = { title, summaryLines: [] };
                chapters.push(current);
                return;
            }

            const ordered = line.match(/^\s*(?:第?\d+[章节回]?|[-*+]|\d+[.)、])\s*[:：、.-]?\s*(.+)$/);
            if (ordered && !current) {
                chapters.push({ title: cleanTitle(ordered[1]), summaryLines: [] });
                return;
            }

            if (current && line.trim()) {
                current.summaryLines.push(line.trim());
            }
        });

        const normalized = chapters
            .map((chapter, index) => ({
                title: cleanTitle(chapter.title) || `第${index + 1}章`,
                summary: chapter.summaryLines.join('\n').slice(0, 800),
                content: ''
            }))
            .filter((chapter) => chapter.title);

        if (normalized.length === 0) {
            const fallback = text.split(/\n{2,}/)
                .map((block, index) => ({
                    title: cleanTitle(block.split(/\r?\n/)[0]) || `第${index + 1}章`,
                    summary: block.split(/\r?\n/).slice(1).join('\n').trim(),
                    content: ''
                }))
                .slice(0, 80);
            if (fallback.length > 0) return { type: 'markdown', chapters: fallback };
            throw new Error('没有识别到章节标题');
        }

        return { type: 'markdown', chapters: normalized.slice(0, 200) };
    }

    function renderImportStatus(parsed, filename) {
        const status = $('importStatus');
        if (!status) return;
        const preview = parsed.chapters.slice(0, 6);
        status.style.display = 'block';
        status.innerHTML = `
            <strong>已导入：${escapeHtml(filename)}（${parsed.chapters.length} 章）</strong>
            创建小说时会自动带入这些章节。
            <ul>
                ${preview.map((chapter, index) => `<li>第${index + 1}章 · ${escapeHtml(chapter.title)}</li>`).join('')}
            </ul>
            ${parsed.chapters.length > preview.length ? `<div style="margin-top:0.5rem;">还有 ${parsed.chapters.length - preview.length} 章未显示。</div>` : ''}
            <div style="margin-top:0.8rem;">
                <button class="toolbar-btn" type="button" onclick="clearImportedOutline()">清除导入</button>
            </div>
        `;
    }

    function renderImportError(message) {
        const status = $('importStatus');
        if (!status) return;
        status.style.display = 'block';
        status.innerHTML = `<strong>导入失败</strong>${escapeHtml(message)}`;
    }

    function clearImportedOutline(options = {}) {
        importedOutline = null;
        const status = $('importStatus');
        if (status) {
            status.style.display = 'none';
            status.innerHTML = '';
        }
        const input = $('outlineFileInput');
        if (input) input.value = '';
        if (!options.silent) toast('已清除导入的大纲', 'success');
    }

    // ==================== Tabs & Modals ====================
    function switchTab(tabName) {
        const normalized = ['build', 'import', 'discuss'].includes(tabName) ? tabName : 'build';
        const capitalized = capitalize(normalized);
        const tab = $(`tab${capitalized}`);
        const content = $(`tabContent${capitalized}`);
        if (!tab || !content) {
            toast('目标页签不存在', 'error');
            return;
        }

        qsa('.template-tab').forEach((node) => node.classList.remove('active'));
        qsa('.tab-content').forEach((node) => {
            node.style.display = 'none';
        });
        tab.classList.add('active');
        content.style.display = 'block';
        updateTabChrome(normalized);

        // 双向联动 B: 切到探讨模式时，把构建 tab 已填字段作为上下文
        if (normalized === 'discuss') {
            injectBuildContextToDiscuss();
        }
    }

  // 双向联动 B: 把构建 tab 的字段注入探讨模式
  let discussContextInjected = false;
  let discussContext = '';
  function injectBuildContextToDiscuss() {
        syncConfigFromControls();
        const ctx = describeCurrentNovel();
        if (!ctx || ctx.length < 2) {
            discussContext = '你是一位专业的中文小说创作助手。';
            return;
        }
        discussContext = '你是一位专业的中文小说创作助手。当前用户正在创建以下项目：\n' + ctx + '\n请基于此项目情况回答问题；当用户要求时，帮忙补全字段。';

        if (!discussContextInjected) {
            const userMsg = '[项目上下文] ' + ctx;
            const aiMsg = '已了解项目「' + (config.novelName || '未命名') + '」的配置。我们来讨论：你可以问世界观、人物设定、情节冲突、写作技巧，或让我帮你补全字段。';
            discussHistory.push({ role: 'user', content: userMsg });
            discussHistory.push({ role: 'assistant', content: aiMsg });
            appendDiscussMessage('user', userMsg);
            appendDiscussMessage('assistant', aiMsg);
            discussContextInjected = true;
        }
    }

    function updateTabChrome(tabName) {
        const toolbar = qs('.template-toolbar');
        if (toolbar) toolbar.style.display = tabName === 'build' ? 'grid' : 'none';
    }

    function openModalById(id) {
        const modal = $(id);
        if (!modal) {
            toast('弹窗不存在', 'error');
            return;
        }
        modal.classList.add('show');
    }

    function closeModalById(id) {
        const modal = $(id);
        if (modal) modal.classList.remove('show');
    }

    function closeTopModal() {
        const openModals = qsa('.modal-overlay.show');
        if (openModals.length === 0) return;
        openModals[openModals.length - 1].classList.remove('show');
    }

    // ==================== AI Name & Discussion ====================
    async function aiGenerateName(type) {
        syncConfigFromControls();
        const input = type === 'protagonist' ? $('protagonistName') : $('novelName');
        const button = findAiButton(type);
        const label = type === 'protagonist' ? '生成主角名中...' : '生成书名中...';

        await withButtonBusy(button, label, async () => {
            let generated = '';
            const canUseRemote = hasRemoteAIConfig();

            if (canUseRemote) {
                try {
                    const target = type === 'protagonist' ? '主角名字' : '小说书名';
                    const prompt = `请为${describeCurrentNovel()}生成一个${target}。只返回名称，不要解释，不要加引号。`;
                    generated = await callAI([{ role: 'user', content: prompt }], getCreationSystemPrompt());
                } catch (error) {
                    toast(`远程 AI 失败，已改用本地模拟：${normalizeNetworkError(error)}`, 'warning');
                }
            }

            if (!generated) {
                await delay(420);
                generated = generateLocalName(type);
            }

            generated = sanitizeGeneratedName(generated, type);
            if (input) input.value = generated;
            syncConfigFromControls();
            toast(type === 'protagonist' ? `主角名：${generated}` : `书名：${generated}`, 'success');
        });
    }

    async function aiGenerateDirection() {
        syncConfigFromControls();
        const input = $('direction');
        const button = qs('.mini-ai-btn[onclick*="aiGenerateDirection"]');

        await withButtonBusy(button, '生成中...', async () => {
            let generated = '';
            if (hasRemoteAIConfig()) {
                try {
                    const prompt = [
                        `请为${describeCurrentNovel()}生成一个清晰的小说创作方向。`,
                        `要求：80到140字，包含主线矛盾、主角目标、故事看点；只输出创作方向，不要标题和解释。`,
                        config.tropes.length ? `已选叙事套路：${selectedTropeLabels().join('、')}` : ''
                    ].filter(Boolean).join('\n');
                    generated = await callAI([{ role: 'user', content: prompt }], getCreationSystemPrompt());
                } catch (error) {
                    toast(`远程 AI 失败，已改用本地模拟：${normalizeNetworkError(error)}`, 'warning');
                }
            }

            if (!generated) {
                await delay(420);
                generated = generateLocalDirection();
            }

            generated = sanitizeGeneratedDirection(generated);
            if (input) input.value = generated;
            syncConfigFromControls();
            toast('创作方向已生成', 'success');
        });
    }

    function findAiButton(type) {
        return qsa('.ai-btn').find((button) => button.getAttribute('onclick')?.includes(`'${type}'`));
    }

    function hasRemoteAIConfig() {
        return aiSettings.provider !== 'local' && aiSettings.apiKey && aiSettings.model;
    }

    function generateLocalName(type) {
        const genre = config.genre || currentTemplateFilter || 'fantasy';
        const names = {
            novel: {
                romance: ['《予你星河》', '《月色偏爱你》', '《春风不晚》'],
                fantasy: ['《万象归墟》', '《长夜问天》', '《九霄剑录》'],
                xianxia: ['《青云问道》', '《一念成仙》', '《长生劫》'],
                urban: ['《重启黄金年代》', '《都市无双》', '《逆流人生》'],
                scifi: ['《群星回声》', '《机械黎明》', '《深空边界》'],
                game: ['《无限副本日志》', '《第九赛季》', '《异界玩家》'],
                wuxia: ['《风雪照江湖》', '《一剑山河》', '《侠骨长歌》'],
                historical: ['《山河旧梦》', '《长安策》', '《青史无名》'],
                mystery: ['《第七封信》', '《雾中证词》', '《暗室回声》'],
                apocalypse: ['《废土长明》', '《末日归途》', '《最后安全区》']
            },
            protagonist: {
                romance: ['林晚', '沈知意', '顾清辞'],
                fantasy: ['叶玄', '秦无夜', '陆沉'],
                xianxia: ['云澈', '谢长生', '沈问道'],
                urban: ['陈远', '许归尘', '林川'],
                scifi: ['陆星野', '许弦', '程砚'],
                game: ['顾言', '林昼', '许星河'],
                wuxia: ['谢寒舟', '顾行云', '江照夜'],
                historical: ['裴景行', '沈砚之', '李怀瑾'],
                mystery: ['季白', '韩疏影', '许未央'],
                apocalypse: ['周烬', '林却', '宋北辰']
            }
        };
        const pool = names[type][genre] || names[type].fantasy;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function generateLocalDirection() {
        const genre = config.genre || currentTemplateFilter || 'fantasy';
        const protagonist = config.protagonistName || '主角';
        const title = config.novelName ? `《${config.novelName.replace(/[《》]/g, '')}》` : '这部作品';
        const directions = {
            romance: `${title}讲述${protagonist}在事业与亲密关系的双重压力中重新确认自我。故事以一次误会或契约关系为引线，推动两位主角从互相试探走向并肩选择，核心看点是情感拉扯、成长代价与关系修复。`,
            fantasy: `${title}以${protagonist}从低谷觉醒为起点，围绕失落传承、宗门势力和更高层世界的秘密展开。主线矛盾是个人成长与旧秩序压迫的冲突，卖点放在升级节奏、世界观揭露和阶段性强敌。`,
            xianxia: `${title}围绕${protagonist}求道破局展开。主角因一桩旧案或异宝卷入仙门纷争，在修炼、因果和人心试炼中逐步接近真相，故事看点是境界突破、师门恩怨与大道选择。`,
            urban: `${title}以${protagonist}重返关键人生节点为开端，通过商业、情感和现实压力交织推进。主线目标是弥补遗憾并重建秩序，冲突来自旧对手、资源竞争和身份变化后的选择。`,
            scifi: `${title}设定在技术剧变后的未来，${protagonist}因一次异常信号或系统事故发现文明危机。故事围绕探索真相、突破封锁和重新定义人类边界展开，突出科技悬念和群体抉择。`,
            game: `${title}以${protagonist}进入规则化游戏世界为起点，通过职业选择、副本挑战和阵营竞争推进主线。故事重点放在成长路径、机制破解、团队协作和最终赛季目标上。`,
            wuxia: `${title}从${protagonist}卷入江湖旧怨开始，以门派、秘笈和侠义抉择推动主线。主角目标是查清真相或守住承诺，冲突来自正邪立场、师门规矩和个人情义。`,
            historical: `${title}让${protagonist}置身时代转折点，在权力夹缝中寻找生路。故事以一场政治危机或家族变故切入，卖点是谋略博弈、制度差异和人物命运与时代洪流的碰撞。`,
            mystery: `${title}以${protagonist}追查一桩看似普通的案件开始，线索逐步指向更深的关系网络。主线矛盾是事实、记忆和利益之间的冲突，重点营造反转、证据链和人物隐秘动机。`,
            apocalypse: `${title}从灾难爆发后的秩序崩塌写起，${protagonist}必须在资源短缺、信任危机和外部威胁中建立生存据点。主线看点是团队磨合、规则重建和末世中的人性选择。`
        };
        return directions[genre] || directions.fantasy;
    }

    async function sendDiscussMessage() {
        const input = $('discussInput');
        const message = input?.value.trim();
        if (!message) {
            toast('请输入要讨论的问题', 'warning');
            input?.focus();
            return;
        }
        if (discussBusy) {
            toast('上一条消息仍在处理中', 'warning');
            return;
        }

        const sendButton = qs('.discuss-send-btn');
        appendDiscussMessage('user', message);
        input.value = '';
        discussHistory.push({ role: 'user', content: message });
        discussBusy = true;

        await withButtonBusy(sendButton, '发送中...', async () => {
            const loading = appendDiscussMessage('assistant', 'AI思考中...', { loading: true });
            try {
                let response;
                if (hasRemoteAIConfig()) {
                    response = await callAI(
                        discussHistory.slice(-8),
                        discussContext || '你是一位专业的中文小说创作助手，擅长世界观设定、人物塑造、情节设计和写作技巧。请给出具体、可执行的建议。'
                    );
                } else {
                    await delay(650);
                    response = localDiscussReply(message);
                }
                loading.remove();
                appendDiscussMessage('assistant', response);
                discussHistory.push({ role: 'assistant', content: response });
            } catch (error) {
                loading.remove();
                const detail = normalizeNetworkError(error);
                appendDiscussMessage('assistant', `抱歉，AI回复失败：${detail}`);
                toast(detail, 'error', '讨论失败');
            } finally {
                discussBusy = false;
            }
        });
    }

    function appendDiscussMessage(role, content, options = {}) {
        const messagesEl = $('discussMessages');
        if (!messagesEl) return document.createElement('div');

        const message = document.createElement('div');
        message.className = `message ${role === 'user' ? 'user-message' : 'bot-message'}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? '👤' : '🤖';

        const body = document.createElement('div');
        body.className = 'message-content';
        if (options.loading) {
            const loading = document.createElement('div');
            loading.className = 'discuss-loading';
            loading.textContent = content;
            body.appendChild(loading);
        } else {
            body.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');
            // 双向联动 A: AI 回复（非 loading）加"应用到创作方向"按钮
            if (role === 'assistant' && !options.loading) {
                const actions = document.createElement('div');
                actions.className = 'message-actions';
                const applyBtn = document.createElement('button');
                applyBtn.type = 'button';
                applyBtn.className = 'discuss-apply-btn';
                applyBtn.textContent = '应用到创作方向';
                applyBtn.addEventListener('click', () => applyDiscussToDirection(content));
                actions.appendChild(applyBtn);
                body.appendChild(actions);
            }
        }

        message.append(avatar, body);
        messagesEl.appendChild(message);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return message;
    }

    // 双向联动 A: 把 AI 聊天回答应用为"创作方向"字段
    function applyDiscussToDirection(text) {
        const dirInput = $('direction');
        if (!dirInput) return;
        const existing = dirInput.value.trim();
        const newVal = existing ? existing + '\n\n' + text : text;
        dirInput.value = newVal;
        // 触发 input 事件让 syncConfigFromControls 同步
        dirInput.dispatchEvent(new Event('input', { bubbles: true }));
        toast('已应用为创作方向', 'success');
    }

    function localDiscussReply(message) {
        const genre = TYPE_LABELS[config.genre] || '小说';
        const title = config.novelName || '当前作品';
        return [
            `可以先围绕《${title}》的${genre}定位来拆解。`,
            `1. 明确主角此刻最想要什么，以及失去它会付出什么代价。`,
            `2. 把冲突落到一个可写的场景里：对手、限制、倒计时三者至少保留两个。`,
            `3. 下一章结尾留一个选择题，而不是单纯的信息揭示。`,
            `你刚才的问题是：“${message}”。建议先写 300 字试场，再根据人物反应调整设定。`
        ].join('\n');
    }

    // ==================== Create Project ====================
    async function createNovel() {
        const button = $('createNovelBtn') || qs('.action-create');
        await withButtonBusy(button, '创建中...', async () => {
            try {
                clearCreateActionStatus();
                syncConfigFromControls();
                const titleInput = $('novelName');
                if (!config.novelName) {
                    markInvalid(titleInput, '请输入小说名称');
                    showCreateActionStatus('请输入小说名称后再开始创作', 'error');
                    return;
                }

                const projects = readJson(STORAGE.projects, []);
                const chapters = importedOutline?.chapters?.length
                    ? importedOutline.chapters.map((chapter) => ({
                        title: chapter.title,
                        summary: chapter.summary || '',
                        content: chapter.content || ''
                    }))
                    : [{
                        title: '第一章',
                        summary: config.direction || '开篇章节',
                        content: ''
                    }];

                const genre = config.genre || inferGenreFromFilter() || 'fantasy';
                const project = {
                    title: config.novelName,
                    type: genre,
                    description: config.direction,
                    protagonist: config.protagonistName,
                    tropes: [...config.tropes],
                    audience: config.audience,
                    wordCount: config.wordCount,
                    plotStructure: config.plotStructure,
                    chapters,
                    characters: config.protagonistName ? [{ name: config.protagonistName, role: '主角' }] : [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                projects.push(project);
                const newIndex = projects.length - 1;
                writeJson(STORAGE.projects, projects);
                localStorage.setItem('moyun_current_project', String(newIndex));
                localStorage.setItem('moyun_current_chapter', '0');

                showCreateActionStatus('创建成功，正在进入编辑器...', 'success');
                toast(`小说《${config.novelName}》已创建，正在进入编辑器`, 'success');
                await delay(450);
                window.location.href = `editor.html?project=${newIndex}&chapter=0`;
            } catch (error) {
                const message = error?.message || '创建失败，请稍后重试';
                showCreateActionStatus(message, 'error');
                toast(message, 'error', '创建失败');
            }
        });
    }

    function inferGenreFromFilter() {
        return currentTemplateFilter !== 'all' ? currentTemplateFilter : '';
    }

    function goBack() {
        window.setTimeout(() => {
            window.location.href = 'index.html';
        }, 250);
    }

    // ==================== API Helpers ====================
    async function callAI(messages, systemPrompt) {
        if (!aiSettings.baseUrl && aiSettings.provider !== 'local') {
            throw new Error(`AI 设置中 Base URL 为空。Provider=${aiSettings.provider} 时必须填 Base URL（如 https://api.minimaxi.com/v1）。请打开设置重新填写并保存。`);
        }
        const provider = inferApiProfile(aiSettings.baseUrl, aiSettings.model) || aiSettings.provider || 'openai';
        const endpoint = buildApiEndpoint(aiSettings.baseUrl, provider);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: buildApiHeaders(provider, aiSettings.apiKey),
            body: JSON.stringify(buildApiBody(provider, aiSettings.model, systemPrompt, messages))
        });

        if (!response.ok) {
            throw new Error(formatApiHttpError(response.status, endpoint, await readError(response)));
        }
        return extractAIText(await response.json(), provider);
    }

    function inferApiProfile(baseUrl, model) {
        const normalizedBaseUrl = String(baseUrl || '').toLowerCase();
        const normalizedModel = String(model || '').toLowerCase();

        if (/anthropic|claude/.test(normalizedBaseUrl) || /claude/.test(normalizedModel)) return 'anthropic';
        if (/deepseek/.test(normalizedBaseUrl) || normalizedModel.startsWith('deepseek-')) return 'deepseek';
        if (/minimax/.test(normalizedBaseUrl) || normalizedModel.startsWith('minimax-')) return 'minimax';
        if (/moonshot|kimi/.test(normalizedBaseUrl) || normalizedModel.startsWith('moonshot-')) return 'kimi';
        if (/bigmodel|glm/.test(normalizedBaseUrl) || normalizedModel.startsWith('glm-')) return 'glm';
        if (/openai/.test(normalizedBaseUrl)) return 'openai';
        return normalizedBaseUrl ? null : 'openai';
    }

    function buildApiEndpoint(baseUrl, provider) {
        const preset = API_PRESETS[provider] || API_PRESETS.openai;
        const normalized = normalizeApiBaseUrl(baseUrl || preset.baseUrl || '');
        if (/\/(messages|chat\/completions|chat_completions)$/i.test(normalized)) return normalized;
        if (/\/v1$/i.test(normalized) && preset.endpoint.startsWith('/v1/')) {
            return `${normalized}${preset.endpoint.replace(/^\/v1/, '')}`;
        }
        return `${normalized}${preset.endpoint}`;
    }

    function normalizeApiBaseUrl(baseUrl) {
        const normalized = String(baseUrl || '').trim().replace(/\/+$/, '');
        if (!normalized) throw new Error('请填写 Base URL，例如：https://api.openai.com');
        if (!/^https?:\/\//i.test(normalized)) {
            throw new Error('Base URL 必须是完整地址，并以 http:// 或 https:// 开头，不能只填 /v1 或 api.xxx.com');
        }
        return normalized;
    }

    function buildApiHeaders(provider, apiKey) {
        const headers = { 'Content-Type': 'application/json' };
        if (provider === 'anthropic') {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
        } else {
            headers.Authorization = `Bearer ${apiKey}`;
        }
        return headers;
    }

    function buildConnectivityTestPayload(provider, model, maxTokens) {
        if (provider === 'anthropic') {
            return {
                model,
                max_tokens: Math.min(maxTokens || 256, 256),
                system: 'Reply with exactly: hello world',
                messages: [{ role: 'user', content: 'hello world' }]
            };
        }
        return {
            model,
            messages: [
                { role: 'system', content: 'Reply with exactly: hello world' },
                { role: 'user', content: 'hello world' }
            ],
            temperature: 0,
            max_tokens: Math.min(maxTokens || 256, 256)
        };
    }

    function buildApiBody(provider, model, systemPrompt, messages) {
        const modelName = model || API_PRESETS[provider]?.model || API_PRESETS.openai.model;
        const maxTokens = aiSettings.maxTokens || DEFAULT_AI_SETTINGS.maxTokens;

        if (provider === 'anthropic') {
            return {
                model: modelName,
                system: systemPrompt,
                messages: normalizeMessages(messages, true),
                max_tokens: maxTokens,
                temperature: aiSettings.temperature
            };
        }

        return {
            model: modelName,
            messages: [{ role: 'system', content: systemPrompt }, ...normalizeMessages(messages, false)],
            temperature: aiSettings.temperature,
            max_tokens: maxTokens
        };
    }

    function normalizeMessages(messages, anthropic) {
        return messages.map((message) => ({
            role: anthropic && message.role === 'assistant' ? 'assistant' : (message.role === 'assistant' ? 'assistant' : 'user'),
            content: message.content
        }));
    }

    function extractAIText(data, provider) {
        let text = '';
        if (provider === 'anthropic') {
            text = data.content?.map((item) => item.text || '').join('\n') || '';
        } else {
            text = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
        }
        return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }

    async function readError(response) {
        const text = await response.text().catch(() => '');
        if (!text) return '无法读取错误详情';
        try {
            const data = JSON.parse(text);
            return data.error?.message || data.message || text.slice(0, 220);
        } catch {
            return text.slice(0, 220);
        }
    }

    function formatApiHttpError(status, endpoint, detail) {
        if (status === 404) {
            return `API 地址返回 404：${endpoint}。请检查 Provider 和 Base URL 是否匹配，OpenAI 兼容接口通常填 https://你的域名/v1 或 https://你的域名，不要填当前网页地址或相对路径。`;
        }
        if (status === 401 || status === 403) {
            return `API 鉴权失败 HTTP ${status}：请检查 API Key、模型权限和 Provider。${detail}`;
        }
        return `HTTP ${status}: ${detail}`;
    }

    function normalizeNetworkError(error) {
        const message = error?.message || String(error);
        if (/Failed to fetch|NetworkError|CORS/i.test(message)) {
            return '网络请求失败，可能是浏览器跨域限制或 API 地址不可访问';
        }
        return message;
    }

    // ==================== Labels & Text Helpers ====================
    function selectedTropeLabels() {
        const labels = {};
        qsa('#tropeTags .tag-btn').forEach((button) => {
            labels[button.dataset.value] = button.textContent.replace(/[^\p{Script=Han}A-Za-z0-9]/gu, '').trim();
        });
        return config.tropes.map((value) => labels[value] || value);
    }

    function tropeLabel(value) {
        const labels = {
            system: '系统流',
            levelup: '升级流',
            invincible: '无敌流',
            farming: '种田流',
            cultivation: '炼功流',
            tech: '技术流',
            checkin: '签到流',
            rebirth: '重生',
            transmigration: '穿越',
            comprehension: '悟道流',
            seductive: '媚宠流',
            harem: '后宫',
            brainwar: '脑子战',
            beast: '御兽',
            alchemy: '炼丹'
        };
        return labels[value] || value;
    }

    function audienceLabel(value) {
        const labels = {
            'male-youth': '男频 · 青年向',
            'male-teen': '男频 · 青少年',
            'female-youth': '女频 · 青年向',
            'female-teen': '女频 · 青少年',
            universal: '通用'
        };
        return labels[value] || '通用';
    }

    function plotStructureLabel(value) {
        const labels = {
            linear: '线性叙事',
            rings: '环形结构',
            flashback: '倒叙插叙',
            parallel: '多线并行',
            network: '网状结构'
        };
        return labels[value] || '用户配置';
    }

    function describeCurrentNovel() {
        const parts = [
            config.genre ? `${TYPE_LABELS[config.genre] || config.genre}小说` : '中文小说',
            config.direction ? `创作方向：${config.direction}` : '',
            config.protagonistName ? `主角名：${config.protagonistName}` : ''
        ].filter(Boolean);
        return parts.join('，');
    }

    function getCreationSystemPrompt() {
        return '你是一位专业中文小说策划，擅长生成有辨识度、适合网文创作的书名和人物名。输出必须简洁。';
    }

    function sanitizeGeneratedName(value, type) {
        const fallback = generateLocalName(type);
        return String(value || fallback)
            .replace(/^[\s"'“”‘’《]+|[\s"'“”‘’》]+$/g, '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)[0]
            ?.slice(0, 32) || fallback;
    }

    function sanitizeGeneratedDirection(value) {
        return String(value || generateLocalDirection())
            .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '')
            .replace(/^创作方向[:：]\s*/, '')
            .replace(/\n{2,}/g, '\n')
            .trim()
            .slice(0, 260) || generateLocalDirection();
    }

    function cleanTitle(value) {
        return String(value || '')
            .replace(/^第?\s*\d+\s*[章节回幕、.:-]?\s*/u, '')
            .replace(/^[#*\-\s>]+/, '')
            .trim()
            .slice(0, 80);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function capitalize(value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function delay(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }
})();
