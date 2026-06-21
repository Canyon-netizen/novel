// ==================== MoYun AI - 创建页逻辑 ====================

// ==================== 全局配置 ====================
let config = {
    novelName: '',
    protagonistName: '',
    direction: '',
    genre: '',
    tropes: [],
    audience: 'male-youth',
    wordCount: 750000,
    plotStructure: 'linear'
};

let aiSettings = {
    provider: 'anthropic',
    apiKey: '',
    baseUrl: '',
    model: '',
    maxTokens: 2048,
    temperature: 0.7
};

let currentMyTemplateFilter = 'all';
let selectedMyTemplate = null;

// ==================== 预设模板 ====================
const templates = [
    { id: 1, name: '修仙问道', type: 'fantasy', icon: '🧧', audience: '男频', desc: '追求长生与天道，在修炼体系中一步步突破极限', tags: ['升级流', '炼功流', '悟道流'], framework: '境界设定：炼气→筑基→金丹→元婴→化神' },
    { id: 2, name: '玄幻大世界', type: 'fantasy', icon: '🐉', audience: '男频', desc: '广阔天地，万族林立，主角以弱胜强', tags: ['系统流', '升级流', '无敌流'], framework: '势力分布：宗门+帝国+种族+地域' },
    { id: 3, name: '都市重生', type: 'urban', icon: '🏙️', audience: '男频', desc: '重生回炉，弥补遗憾，重登人生巅峰', tags: ['重生', '系统流', '商业'], framework: '主线：复仇+商业+情感' },
    { id: 4, name: '都市异能', type: 'urban', icon: '⚡', audience: '男频', desc: '觉醒异能，在都市中守护与征战', tags: ['异能', '升级流', '都市'], framework: '异能等级+组织势力+副本' },
    { id: 5, name: '赛博朋克', type: 'scifi', icon: '🤖', audience: '男频', desc: '高科技低生活，赛博世界的黑客故事', tags: ['科幻', '穿越', '系统流'], framework: '科技树+公司+义体' },
    { id: 6, name: '星际科幻', type: 'scifi', icon: '🚀', audience: '男频', desc: '星辰大海，星际战争与探索', tags: ['科幻', '星际', '升级流'], framework: '文明等级+战舰+资源' },
    { id: 7, name: '武侠江湖', type: 'wuxia', icon: '⚔️', audience: '男频', desc: '刀光剑影，江湖恩怨情仇', tags: ['武侠', '门派', '修炼'], framework: '江湖势力+武功秘籍+辈分' },
    { id: 8, name: '历史穿越', type: 'historical', icon: '👑', audience: '男频', desc: '穿越古代，用现代知识改写历史', tags: ['穿越', '历史', '权谋'], framework: '历史背景+势力格局+科技树' },
    { id: 9, name: '末世危机', type: 'apocalypse', icon: '🌪️', audience: '男频', desc: '丧尸围城，末世生存与希望', tags: ['末世', '生存', '异能'], framework: '灾难阶段+势力+安全区' },
    { id: 10, name: '霸道总裁', type: 'romance', icon: '💕', audience: '女频', desc: '豪门总裁与灰姑娘的爱情故事', tags: ['言情', '豪门', '甜宠'], framework: '相遇→误会→相知→表白→甜蜜' },
    { id: 11, name: '玄幻言情', type: 'romance', icon: '💫', audience: '女频', desc: '修仙世界中的刻骨铭心之恋', tags: ['言情', '玄幻', '甜虐'], framework: '升级+双强+并肩作战' },
    { id: 12, name: '悬疑推理', type: 'mystery', icon: '🔍', audience: '通用', desc: '层层迷雾，抽丝剥茧找出真相', tags: ['悬疑', '推理', '破案'], framework: '案件→线索→迷雾→反转→真相' }
];

// ==================== 初始化 ====================
function init() {
    loadUserName();
    loadSettings();
    loadTheme();
    renderTemplates();
    updateFilterCounts();
    setupEventListeners();
}

function setupEventListeners() {
    // 模板搜索
    const searchInput = document.querySelector('.template-search .search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterTemplatesBySearch(e.target.value.toLowerCase()));
    }

    // 我的模板按钮
    const myTemplatesBtn = document.querySelector('.my-templates-btn');
    if (myTemplatesBtn) {
        myTemplatesBtn.addEventListener('click', showMyTemplates);
    }

    // 类型标签
    document.querySelectorAll('#genreTags .tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#genreTags .tag-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            config.genre = btn.dataset.value;
        });
    });

    // 叙事套路标签
    document.querySelectorAll('#tropeTags .tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const value = btn.dataset.value;
            if (btn.classList.contains('active')) {
                if (!config.tropes.includes(value)) config.tropes.push(value);
            } else {
                config.tropes = config.tropes.filter(t => t !== value);
            }
            updateTropeCount();
        });
    });

    // 字数滑块
    const wordCountSlider = document.getElementById('wordCountSlider');
    if (wordCountSlider) {
        wordCountSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('wordCountValue').textContent = `${value}万`;
            config.wordCount = value * 10000;
        });
    }

    // 筛选按钮
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTemplates(btn.dataset.filter);
        });
    });

    // 字数预设按钮
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// ==================== 用户名 ====================
function loadUserName() {
    const saved = localStorage.getItem('moyun_user_name') || 'yyy';
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = saved;
}

function editUserName() {
    const currentName = localStorage.getItem('moyun_user_name') || 'yyy';
    const input = document.getElementById('userNameInput');
    if (input) input.value = currentName;
    const modal = document.getElementById('userNameModal');
    if (modal) modal.classList.add('show');
}

function closeUserNameModal() {
    const modal = document.getElementById('userNameModal');
    if (modal) modal.classList.remove('show');
}

function saveUserName() {
    const input = document.getElementById('userNameInput');
    const name = input?.value.trim();
    if (name) {
        localStorage.setItem('moyun_user_name', name);
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = name;
    }
    closeUserNameModal();
}

// ==================== 主题 ====================
function loadTheme() {
    const saved = localStorage.getItem('moyun_theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        const select = document.querySelector('.theme-select');
        if (select) select.value = saved;
    }
}

function toggleTheme() {
    const theme = document.querySelector('.theme-select').value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('moyun_theme', theme);
}

// ==================== 设置 ====================
function loadSettings() {
    const saved = localStorage.getItem('moyun_ai_settings');
    if (saved) {
        try {
            aiSettings = JSON.parse(saved);
        } catch (e) {}
    }
}

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    modal.classList.add('show');
    document.getElementById('apiProvider').value = aiSettings.provider;
    document.getElementById('apiKeyInput').value = aiSettings.apiKey;
    document.getElementById('baseUrlInput').value = aiSettings.baseUrl;
    document.getElementById('modelInput').value = aiSettings.model;
    const maxTokensInput = document.getElementById('maxTokensInput');
    if (maxTokensInput) maxTokensInput.value = aiSettings.maxTokens;
    onApiProviderChange();
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('show');
}

function onApiProviderChange() {
    const provider = document.getElementById('apiProvider').value;
    const showFields = provider !== 'local';

    ['apiKeyGroup', 'baseUrlGroup', 'modelGroup'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = showFields ? 'block' : 'none';
    });
}

function saveSettings() {
    aiSettings.provider = document.getElementById('apiProvider').value;
    aiSettings.apiKey = document.getElementById('apiKeyInput').value;
    aiSettings.baseUrl = document.getElementById('baseUrlInput').value;
    aiSettings.model = document.getElementById('modelInput').value;
    const maxTokensInput = document.getElementById('maxTokensInput');
    if (maxTokensInput) aiSettings.maxTokens = parseInt(maxTokensInput.value);

    localStorage.setItem('moyun_ai_settings', JSON.stringify(aiSettings));
    closeSettingsModal();
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

// ==================== 模板 ====================
function updateFilterCounts() {
    const counts = {
        all: templates.length,
        'fantasy-xianxia': templates.filter(t => t.type === 'fantasy' || t.type === 'xianxia').length,
        urban: templates.filter(t => t.type === 'urban').length,
        scifi: templates.filter(t => t.type === 'scifi').length,
        historical: templates.filter(t => t.type === 'historical').length
    };

    document.querySelectorAll('.filter-btn').forEach(btn => {
        const filter = btn.dataset.filter;
        if (counts[filter] !== undefined) {
            const text = btn.textContent.replace(/\s*\d+$/, '');
            btn.textContent = text + ' ' + counts[filter];
        }
    });
}

function renderTemplates(filter = 'all') {
    const grid = document.getElementById('templateGrid');
    if (!grid) return;

    let filteredTemplates = templates;
    if (filter !== 'all') {
        filteredTemplates = templates.filter(t => {
            if (filter === 'fantasy-xianxia') return t.type === 'fantasy' || t.type === 'xianxia';
            if (filter === 'urban') return t.type === 'urban';
            if (filter === 'scifi') return t.type === 'scifi';
            if (filter === 'historical') return t.type === 'historical';
            return true;
        });
    }

    grid.innerHTML = filteredTemplates.map(t => `
        <div class="template-card" onclick="selectTemplate(${t.id})">
            <div class="template-card-header">
                <div class="template-icon ${t.type}">${t.icon}</div>
                <div class="template-info">
                    <h4>${escapeHtml(t.name)}</h4>
                    <span>${t.audience}</span>
                </div>
            </div>
            <p class="template-desc">${escapeHtml(t.desc)}</p>
            <div class="template-tags">
                ${t.tags.map(tag => `<span class="template-tag">#${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="template-framework">📋 ${escapeHtml(t.framework)}</div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function selectTemplate(id) {
    const template = templates.find(t => t.id === id);
    if (!template) return;

    const novelNameEl = document.getElementById('novelName');
    const directionEl = document.getElementById('direction');

    if (novelNameEl) novelNameEl.value = template.name;
    if (directionEl) directionEl.value = template.desc;

    config.genre = template.type;
    config.tropes = [...template.tags];
    updateGenreTags();
    updateTropeTags();
}

function filterTemplatesBySearch(query) {
    const filtered = templates.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.desc.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
    );

    const grid = document.getElementById('templateGrid');
    if (!grid) return;

    grid.innerHTML = filtered.map(t => `
        <div class="template-card" onclick="selectTemplate(${t.id})">
            <div class="template-card-header">
                <div class="template-icon ${t.type}">${t.icon}</div>
                <div class="template-info">
                    <h4>${escapeHtml(t.name)}</h4>
                    <span>${t.audience}</span>
                </div>
            </div>
            <p class="template-desc">${escapeHtml(t.desc)}</p>
            <div class="template-tags">
                ${t.tags.map(tag => `<span class="template-tag">#${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="template-framework">📋 ${escapeHtml(t.framework)}</div>
        </div>
    `).join('');
}

// ==================== 我的模板 ====================
function showMyTemplates() {
    const modal = document.getElementById('myTemplatesModal');
    if (!modal) return;

    modal.classList.add('show');
    const customTypeInput = document.getElementById('customTypeInput');
    const customTagInput = document.getElementById('customTagInput');
    if (customTypeInput) customTypeInput.value = '';
    if (customTagInput) customTagInput.value = '';
    currentMyTemplateFilter = 'all';
    selectedMyTemplate = null;
    renderMyTemplatesList();
    updateMyTemplatesFilterButtons();
    updateMyTemplatesFiltersDisplay();
}

function closeMyTemplatesModal() {
    const modal = document.getElementById('myTemplatesModal');
    if (modal) modal.classList.remove('show');
}

function filterMyTemplates(filter) {
    currentMyTemplateFilter = filter;
    updateMyTemplatesFilterButtons();
    renderMyTemplatesList();
    updateMyTemplatesFiltersDisplay();
}

function updateMyTemplatesFilterButtons() {
    const filters = ['all', 'fantasy', 'urban', 'scifi', 'romance', 'wuxia', 'mystery', 'historical'];
    filters.forEach(f => {
        const btn = document.getElementById('myTemplate' + f.charAt(0).toUpperCase() + f.slice(1) + 'Btn');
        if (btn) btn.classList.toggle('active', f === currentMyTemplateFilter);
    });
}

function updateMyTemplatesFiltersDisplay() {
    const display = document.getElementById('myTemplateFiltersDisplay');
    if (display) {
        display.textContent = `当前筛选：${currentMyTemplateFilter === 'all' ? '全部' : currentMyTemplateFilter}`;
    }
}

function renderMyTemplatesList() {
    const saved = JSON.parse(localStorage.getItem('moyun_user_templates') || '[]');
    const list = document.getElementById('myTemplatesList');
    const empty = document.getElementById('myTemplatesEmpty');

    if (!list || !empty) return;

    if (saved.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    let filtered = saved;
    if (currentMyTemplateFilter !== 'all') {
        filtered = saved.filter(t => t.type === currentMyTemplateFilter);
    }

    if (filtered.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'block';
        empty.textContent = '该类型下暂无模板';
        return;
    }

    empty.style.display = 'none';
    list.style.display = 'block';

    list.innerHTML = filtered.map((t, index) => {
        const originalIndex = saved.indexOf(t);
        const isSelected = selectedMyTemplate === originalIndex;
        return `
        <div class="template-card ${isSelected ? 'selected' : ''}"
             onclick="selectMyTemplate(${originalIndex})"
             style="${isSelected ? 'border-color:var(--accent-blue);background:rgba(59,130,246,0.1);' : ''}">
            <div class="template-card-header">
                <div class="template-icon ${t.type || 'custom'}">${t.icon || '📝'}</div>
                <div class="template-info">
                    <h4>${escapeHtml(t.name)}</h4>
                    <span>${t.audience || '通用'}</span>
                </div>
            </div>
            <p class="template-desc">${escapeHtml(t.desc || '暂无描述')}</p>
            <div class="template-tags">
                ${(t.tags || []).map(tag => `<span class="template-tag">#${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div style="margin-top:0.5rem;font-size:0.8rem;color:var(--text-muted);">类型: ${t.type || 'custom'}</div>
        </div>
    `}).join('');
}

function selectMyTemplate(index) {
    selectedMyTemplate = index;
    renderMyTemplatesList();
}

function applyMyTemplate() {
    const saved = JSON.parse(localStorage.getItem('moyun_user_templates') || '[]');
    if (selectedMyTemplate === null || !saved[selectedMyTemplate]) {
        showToast('请先选择一个模板', 'error');
        return;
    }

    const template = saved[selectedMyTemplate];
    const novelNameEl = document.getElementById('novelName');
    const directionEl = document.getElementById('direction');

    if (novelNameEl) novelNameEl.value = template.name || '';
    if (directionEl) directionEl.value = template.desc || '';

    config.genre = template.type;
    config.tropes = template.tags || [];
    updateGenreTags();
    updateTropeTags();
    closeMyTemplatesModal();
    showToast('模板已应用', 'success');
}

function addCustomType() {
    const input = document.getElementById('customTypeInput');
    const type = input?.value.trim();
    if (!type) return;

    const saved = JSON.parse(localStorage.getItem('moyun_user_templates') || '[]');
    saved.push({
        id: Date.now(),
        name: '自定义-' + type,
        type: type,
        icon: '📝',
        audience: '通用',
        desc: '用户自定义类型',
        tags: [],
        framework: '用户自定义'
    });
    localStorage.setItem('moyun_user_templates', JSON.stringify(saved));
    if (input) input.value = '';
    renderMyTemplatesList();
    showToast('已添加类型：' + type, 'success');
}

function addCustomTag() {
    const input = document.getElementById('customTagInput');
    const tag = input?.value.trim();
    if (!tag) return;

    const saved = JSON.parse(localStorage.getItem('moyun_user_templates') || '[]');
    saved.push({
        id: Date.now(),
        name: '自定义标签-' + tag,
        type: 'custom',
        icon: '🏷️',
        audience: '通用',
        desc: '标签：' + tag,
        tags: [tag],
        framework: '用户自定义标签'
    });
    localStorage.setItem('moyun_user_templates', JSON.stringify(saved));
    if (input) input.value = '';
    renderMyTemplatesList();
    showToast('已添加标签：' + tag, 'success');
}

// ==================== 模板保存 ====================
function openSaveTemplateModal() {
    const modal = document.getElementById('saveTemplateModal');
    if (!modal) return;

    modal.classList.add('show');
    const templateNameInput = document.getElementById('templateNameInput');
    if (templateNameInput) {
        const novelNameEl = document.getElementById('novelName');
        templateNameInput.value = novelNameEl?.value || '';
    }
}

function closeSaveTemplateModal() {
    const modal = document.getElementById('saveTemplateModal');
    if (modal) modal.classList.remove('show');
}

function confirmSaveTemplate() {
    const nameInput = document.getElementById('templateNameInput');
    const iconInput = document.getElementById('templateIconInput');
    const name = nameInput?.value.trim();
    if (!name) {
        showToast('请输入模板名称', 'error');
        return;
    }

    const saved = JSON.parse(localStorage.getItem('moyun_user_templates') || '[]');
    saved.push({
        id: Date.now(),
        name: name,
        type: config.genre || 'custom',
        icon: iconInput?.value.trim() || '📚',
        audience: config.audience === 'male-youth' || config.audience === 'male-teen' ? '男频' : '女频',
        desc: (document.getElementById('direction')?.value) || '用户保存的模板',
        tags: config.tropes || [],
        framework: '用户配置'
    });
    localStorage.setItem('moyun_user_templates', JSON.stringify(saved));
    closeSaveTemplateModal();
    showToast('模板已保存！', 'success');
}

// ==================== 标签更新 ====================
function updateGenreTags() {
    document.querySelectorAll('#genreTags .tag-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === config.genre);
    });
}

function updateTropeTags() {
    document.querySelectorAll('#tropeTags .tag-btn').forEach(btn => {
        btn.classList.toggle('active', config.tropes.includes(btn.dataset.value));
    });
    updateTropeCount();
}

function updateTropeCount() {
    const header = document.querySelector('#narrativeTropes .collapsible-header span');
    if (header) header.textContent = `已选 ${config.tropes.length}/15`;
}

// ==================== 可折叠区域 ====================
function toggleCollapsible(id) {
    const collapsible = document.getElementById(id);
    if (collapsible) collapsible.classList.toggle('open');
}

// ==================== 操作函数 ====================
function setWordCount(value) {
    config.wordCount = value * 10000;
    const slider = document.getElementById('wordCountSlider');
    const valueEl = document.getElementById('wordCountValue');
    if (slider) slider.value = value;
    if (valueEl) valueEl.textContent = `${value}万`;
}

function resetConfig() {
    config = {
        novelName: '',
        protagonistName: '',
        direction: '',
        genre: '',
        tropes: [],
        audience: 'male-youth',
        wordCount: 750000,
        plotStructure: 'linear'
    };

    const fields = ['novelName', 'protagonistName', 'direction'];
    const ids = ['novelName', 'protagonistName', 'direction'];
    ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const audience = document.getElementById('audience');
    if (audience) audience.value = 'male-youth';

    const slider = document.getElementById('wordCountSlider');
    const valueEl = document.getElementById('wordCountValue');
    if (slider) slider.value = 75;
    if (valueEl) valueEl.textContent = '75万';

    document.querySelectorAll('#genreTags .tag-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#tropeTags .tag-btn').forEach(b => b.classList.remove('active'));
    updateTropeCount();
    showToast('配置已重置', 'info');
}

function goBack() {
    window.location.href = 'index.html';
}

// ==================== AI 命名 ====================
async function aiGenerateName(type) {
    const input = type === 'novel' ? document.getElementById('novelName') : document.getElementById('protagonistName');
    if (!input) return;

    if (aiSettings.provider === 'local') {
        const mockNames = {
            novel: ['《星辰变》', '《凡人修仙传》', '《完美世界》', '《斗破苍穹》'],
            protagonist: ['叶尘', '韩立', '萧炎', '林动']
        };
        input.value = mockNames[type][Math.floor(Math.random() * mockNames[type].length)];
        return;
    }

    try {
        const direction = document.getElementById('direction')?.value || '玄幻小说';
        const messages = [{
            role: 'user',
            content: `为一个${direction}类型的小说${type === 'novel' ? '生成一个吸引人的书名' : '生成一个主角名字'}，只需要返回名字，不要解释。`
        }];

        const result = await callAI(messages);
        input.value = result.trim();
    } catch (error) {
        showToast('AI生成失败：' + error.message, 'error');
    }
}

// ==================== API 调用 ====================
async function callAI(messages, systemPrompt = '你是一个助手。') {
    if (aiSettings.provider === 'local') {
        return new Promise((resolve) => {
            setTimeout(() => resolve('模拟名称'), 1000);
        });
    }

    const provider = inferApiProfile(aiSettings.baseUrl, aiSettings.model) || aiSettings.provider;
    const endpoint = buildApiEndpoint(aiSettings.baseUrl, provider, aiSettings.model);
    const headers = buildApiHeaders(provider, aiSettings.apiKey);
    const body = buildApiBody(provider, aiSettings.model, systemPrompt, messages, aiSettings.temperature, aiSettings.maxTokens);

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
        return provider === 'anthropic' ? (data.content?.[0]?.text || '') : (data.choices?.[0]?.message?.content || '');
    } catch (error) {
        throw error;
    }
}

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

function buildApiEndpoint(baseUrl, provider, model) {
    const normalized = (baseUrl || '').replace(/\/+$/, '');

    if (normalized) {
        if (provider === 'anthropic') return `${normalized}/v1/messages`;
        return `${normalized}/v1/chat/completions`;
    }

    const endpoints = {
        anthropic: 'https://api.anthropic.com/v1/messages',
        deepseek: 'https://api.deepseek.com/v1/chat/completions',
        minimax: 'https://api.minimax.chat/v1/chat_completions',
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

function buildApiBody(provider, model, systemPrompt, messages, temperature, maxTokens) {
    const modelName = model || (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4');

    if (provider === 'anthropic') {
        return { model: modelName, system: systemPrompt, messages: messages, max_tokens: maxTokens || 2048 };
    }

    return {
        model: modelName,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 2048
    };
}

// ==================== 创建小说 ====================
function createNovel() {
    const novelNameEl = document.getElementById('novelName');
    const novelName = novelNameEl?.value.trim();

    if (!novelName) {
        showToast('请输入小说名称', 'error');
        return;
    }

    config.novelName = novelName;
    config.protagonistName = document.getElementById('protagonistName')?.value.trim() || '';
    config.direction = document.getElementById('direction')?.value.trim() || '';
    config.audience = document.getElementById('audience')?.value || 'male-youth';
    config.plotStructure = document.getElementById('plotStructure')?.value || 'linear';

    const projects = JSON.parse(localStorage.getItem('moyun_projects') || '[]');
    const newProject = {
        title: config.novelName,
        type: config.genre || 'fantasy',
        description: config.direction,
        protagonist: config.protagonistName,
        tropes: config.tropes,
        audience: config.audience,
        wordCount: config.wordCount,
        plotStructure: config.plotStructure,
        chapters: [],
        characters: [],
        createdAt: new Date().toISOString()
    };

    projects.push(newProject);
    localStorage.setItem('moyun_projects', JSON.stringify(projects));

    const newIndex = projects.length - 1;
    window.location.href = `editor.html?project=${newIndex}&chapter=0`;
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', init);
