// ==================== Create Page Logic ====================

// Current config state
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

// Templates data
const templates = [
    {
        id: 1,
        name: '修仙问道',
        type: 'fantasy',
        icon: '🧧',
        audience: '男频',
        desc: '追求长生与天道，在修炼体系中一步步突破极限',
        tags: ['升级流', '炼功流', '悟道流'],
        framework: '境界设定：炼气→筑基→金丹→元婴→化神'
    },
    {
        id: 2,
        name: '玄幻大世界',
        type: 'fantasy',
        icon: '🐉',
        audience: '男频',
        desc: '广阔天地，万族林立，主角以弱胜强',
        tags: ['系统流', '升级流', '无敌流'],
        framework: '势力分布：宗门+帝国+种族+地域'
    },
    {
        id: 3,
        name: '都市重生',
        type: 'urban',
        icon: '🏙️',
        audience: '男频',
        desc: '重生回炉，弥补遗憾，重登人生巅峰',
        tags: ['重生', '系统流', '商业'],
        framework: '主线：复仇+商业+情感'
    },
    {
        id: 4,
        name: '都市异能',
        type: 'urban',
        icon: '⚡',
        audience: '男频',
        desc: '觉醒异能，在都市中守护与征战',
        tags: ['异能', '升级流', '都市'],
        framework: '异能等级+组织势力+副本'
    },
    {
        id: 5,
        name: '赛博朋克',
        type: 'scifi',
        icon: '🤖',
        audience: '男频',
        desc: '高科技低生活，赛博世界的黑客故事',
        tags: ['科幻', '穿越', '系统流'],
        framework: '科技树+公司+义体'
    },
    {
        id: 6,
        name: '星际科幻',
        type: 'scifi',
        icon: '🚀',
        audience: '男频',
        desc: '星辰大海，星际战争与探索',
        tags: ['科幻', '星际', '升级流'],
        framework: '文明等级+战舰+资源'
    },
    {
        id: 7,
        name: '武侠江湖',
        type: 'wuxia',
        icon: '⚔️',
        audience: '男频',
        desc: '刀光剑影，江湖恩怨情仇',
        tags: ['武侠', '门派', '修炼'],
        framework: '江湖势力+武功秘籍+辈分'
    },
    {
        id: 8,
        name: '历史穿越',
        type: 'historical',
        icon: '👑',
        audience: '男频',
        desc: '穿越古代，用现代知识改写历史',
        tags: ['穿越', '历史', '权谋'],
        framework: '历史背景+势力格局+科技树'
    },
    {
        id: 9,
        name: '末世危机',
        type: 'apocalypse',
        icon: '🌪️',
        audience: '男频',
        desc: '丧尸围城，末世生存与希望',
        tags: ['末世', '生存', '异能'],
        framework: '灾难阶段+势力+安全区'
    },
    {
        id: 10,
        name: '霸道总裁',
        type: 'romance',
        icon: '💕',
        audience: '女频',
        desc: '豪门总裁与灰姑娘的爱情故事',
        tags: ['言情', '豪门', '甜宠'],
        framework: '相遇→误会→相知→表白→甜蜜'
    },
    {
        id: 11,
        name: '玄幻言情',
        type: 'romance',
        icon: '💫',
        audience: '女频',
        desc: '修仙世界中的刻骨铭心之恋',
        tags: ['言情', '玄幻', '甜虐'],
        framework: '升级+双强+并肩作战'
    },
    {
        id: 12,
        name: '悬疑推理',
        type: 'mystery',
        icon: '🔍',
        audience: '通用',
        desc: '层层迷雾，抽丝剥茧找出真相',
        tags: ['悬疑', '推理', '破案'],
        framework: '案件→线索→迷雾→反转→真相'
    }
];

// ==================== Initialize ====================
function init() {
    loadUserName();
    loadSettings();
    loadTheme();
    renderTemplates();
    updateFilterCounts();
    setupEventListeners();
}

// ==================== User Name ====================
function loadUserName() {
    const saved = localStorage.getItem('moyun_user_name') || 'yyy';
    document.getElementById('userName').textContent = saved;
}

function editUserName() {
    const currentName = localStorage.getItem('moyun_user_name') || 'yyy';
    document.getElementById('userNameInput').value = currentName;
    document.getElementById('userNameModal').classList.add('show');
}

function closeUserNameModal() {
    document.getElementById('userNameModal').classList.remove('show');
}

function saveUserName() {
    const name = document.getElementById('userNameInput').value.trim();
    if (name) {
        localStorage.setItem('moyun_user_name', name);
        document.getElementById('userName').textContent = name;
    }
    closeUserNameModal();
}

// ==================== Theme ====================
function loadTheme() {
    const saved = localStorage.getItem('moyun_theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        document.querySelector('.theme-select').value = saved;
    }
}

function toggleTheme() {
    const theme = document.querySelector('.theme-select').value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('moyun_theme', theme);
}

// ==================== Settings ====================
let aiSettings = {
    provider: 'anthropic',
    apiKey: '',
    baseUrl: '',
    model: '',
    maxTokens: 2048
};

function loadSettings() {
    const saved = localStorage.getItem('moyun_ai_settings');
    if (saved) {
        try {
            aiSettings = JSON.parse(saved);
        } catch (e) {}
    }
}

function openSettingsModal() {
    document.getElementById('settingsModal').classList.add('show');
    document.getElementById('apiProvider').value = aiSettings.provider;
    document.getElementById('apiKeyInput').value = aiSettings.apiKey;
    document.getElementById('baseUrlInput').value = aiSettings.baseUrl;
    document.getElementById('modelInput').value = aiSettings.model;
    document.getElementById('maxTokensInput').value = aiSettings.maxTokens;
    onApiProviderChange();
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('show');
}

function onApiProviderChange() {
    const provider = document.getElementById('apiProvider').value;
    const showFields = provider !== 'local';

    document.getElementById('apiKeyGroup').style.display = showFields ? 'block' : 'none';
    document.getElementById('baseUrlGroup').style.display = showFields ? 'block' : 'none';

    const modelGroup = document.getElementById('modelGroup');
    if (provider === 'local') {
        modelGroup.style.display = 'none';
    } else {
        modelGroup.style.display = 'block';
    }
}

function saveSettings() {
    aiSettings.provider = document.getElementById('apiProvider').value;
    aiSettings.apiKey = document.getElementById('apiKeyInput').value;
    aiSettings.baseUrl = document.getElementById('baseUrlInput').value;
    aiSettings.model = document.getElementById('modelInput').value;
    aiSettings.maxTokens = parseInt(document.getElementById('maxTokensInput').value);

    localStorage.setItem('moyun_ai_settings', JSON.stringify(aiSettings));
    closeSettingsModal();
    alert('设置已保存！');
}

// ==================== Templates ====================
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
                    <h4>${t.name}</h4>
                    <span>${t.audience}</span>
                </div>
            </div>
            <p class="template-desc">${t.desc}</p>
            <div class="template-tags">
                ${t.tags.map(tag => `<span class="template-tag">#${tag}</span>`).join('')}
            </div>
            <div class="template-framework">📋 ${t.framework}</div>
        </div>
    `).join('');
}

function selectTemplate(id) {
    const template = templates.find(t => t.id === id);
    if (template) {
        document.getElementById('novelName').value = template.name;
        document.getElementById('direction').value = template.desc;
        config.genre = template.type;
        config.tropes = template.tags;
        updateGenreTags();
        updateTropeTags();
    }
}

// ==================== Event Listeners ====================
function setupEventListeners() {
    // Template search
    const searchInput = document.querySelector('.template-search .search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterTemplatesBySearch(query);
        });
    }

    // My templates button
    const myTemplatesBtn = document.querySelector('.my-templates-btn');
    if (myTemplatesBtn) {
        myTemplatesBtn.addEventListener('click', showMyTemplates);
    }

    // Genre tags
    document.querySelectorAll('#genreTags .tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#genreTags .tag-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            config.genre = btn.dataset.value;
        });
    });

    // Trope tags
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

    // Word count slider
    document.getElementById('wordCountSlider').addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        let label = '';
        if (value <= 20) label = `${value}万`;
        else if (value <= 50) label = `${value}万`;
        else label = `${value}万`;
        document.getElementById('wordCountValue').textContent = label;
        config.wordCount = value * 10000;
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTemplates(btn.dataset.filter);
        });
    });

    // Word count preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function filterTemplatesBySearch(query) {
    const filtered = templates.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.desc.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
    );
    const grid = document.getElementById('templateGrid');
    grid.innerHTML = filtered.map(t => `
        <div class="template-card" onclick="selectTemplate(${t.id})">
            <div class="template-card-header">
                <div class="template-icon ${t.type}">${t.icon}</div>
                <div class="template-info">
                    <h4>${t.name}</h4>
                    <span>${t.audience}</span>
                </div>
            </div>
            <p class="template-desc">${t.desc}</p>
            <div class="template-tags">
                ${t.tags.map(tag => `<span class="template-tag">#${tag}</span>`).join('')}
            </div>
            <div class="template-framework">📋 ${t.framework}</div>
        </div>
    `).join('');
}

function showMyTemplates() {
    document.getElementById('myTemplatesModal').classList.add('show');
    document.getElementById('customTypeInput').value = '';
    document.getElementById('customTagInput').value = '';
    currentMyTemplateFilter = 'all';
    selectedMyTemplate = null;
    renderMyTemplatesList();
    updateMyTemplatesFilterButtons();
    updateMyTemplatesFiltersDisplay();
}

function closeMyTemplatesModal() {
    document.getElementById('myTemplatesModal').classList.remove('show');
}

let currentMyTemplateFilter = 'all';
let selectedMyTemplate = null;

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
    let text = `当前筛选：${currentMyTemplateFilter === 'all' ? '全部' : currentMyTemplateFilter}`;
    display.textContent = text;
}

function renderMyTemplatesList() {
    const saved = JSON.parse(localStorage.getItem('moyun_user_templates') || '[]');
    const list = document.getElementById('myTemplatesList');
    const empty = document.getElementById('myTemplatesEmpty');

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
        return `
        <div class="template-card ${selectedMyTemplate === originalIndex ? 'selected' : ''}" onclick="selectMyTemplate(${originalIndex})" style="${selectedMyTemplate === originalIndex ? 'border-color:var(--accent-blue);background:rgba(59,130,246,0.1);' : ''}">
            <div class="template-card-header">
                <div class="template-icon ${t.type}">${t.icon}</div>
                <div class="template-info">
                    <h4>${t.name}</h4>
                    <span>${t.audience || '通用'}</span>
                </div>
            </div>
            <p class="template-desc">${t.desc || '暂无描述'}</p>
            <div class="template-tags">
                ${(t.tags || []).map(tag => `<span class="template-tag">#${tag}</span>`).join('')}
            </div>
            <div style="margin-top:0.5rem;font-size:0.8rem;color:var(--text-muted);">类型: ${t.type}</div>
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
        alert('请先选择一个模板');
        return;
    }

    const template = saved[selectedMyTemplate];
    document.getElementById('novelName').value = template.name || '';
    document.getElementById('direction').value = template.desc || '';
    config.genre = template.type;
    config.tropes = template.tags || [];
    updateGenreTags();
    updateTropeTags();
    closeMyTemplatesModal();
}

function addCustomType() {
    const input = document.getElementById('customTypeInput');
    const type = input.value.trim();
    if (!type) return;

    const saved = JSON.parse(localStorage.getItem('moyun_user_templates') || '[]');
    const newTemplate = {
        id: Date.now(),
        name: '自定义-' + type,
        type: type,
        icon: '📝',
        audience: '通用',
        desc: '用户自定义类型',
        tags: [],
        framework: '用户自定义'
    };
    saved.push(newTemplate);
    localStorage.setItem('moyun_user_templates', JSON.stringify(saved));
    input.value = '';
    renderMyTemplatesList();
    alert('已添加类型：' + type);
}

function addCustomTag() {
    const input = document.getElementById('customTagInput');
    const tag = input.value.trim();
    if (!tag) return;

    const saved = JSON.parse(localStorage.getItem('moyun_user_templates') || '[]');
    const newTemplate = {
        id: Date.now(),
        name: '自定义标签-' + tag,
        type: 'custom',
        icon: '🏷️',
        audience: '通用',
        desc: '标签：' + tag,
        tags: [tag],
        framework: '用户自定义标签'
    };
    saved.push(newTemplate);
    localStorage.setItem('moyun_user_templates', JSON.stringify(saved));
    input.value = '';
    renderMyTemplatesList();
    alert('已添加标签：' + tag);
}

function closeSaveTemplateModal() {
    document.getElementById('saveTemplateModal').classList.remove('show');
}

function openSaveTemplateModal() {
    document.getElementById('saveTemplateModal').classList.add('show');
    document.getElementById('templateNameInput').value = document.getElementById('novelName').value;
}

function confirmSaveTemplate() {
    const name = document.getElementById('templateNameInput').value.trim();
    const icon = document.getElementById('templateIconInput').value.trim() || '📚';
    if (!name) {
        alert('请输入模板名称');
        return;
    }

    const saved = JSON.parse(localStorage.getItem('moyun_user_templates') || '[]');
    const newTemplate = {
        id: Date.now(),
        name: name,
        type: config.genre || 'custom',
        icon: icon,
        audience: config.audience === 'male-youth' ? '男频' : '女频',
        desc: document.getElementById('direction').value || '用户保存的模板',
        tags: config.tropes || [],
        framework: '用户配置'
    };
    saved.push(newTemplate);
    localStorage.setItem('moyun_user_templates', JSON.stringify(saved));
    closeSaveTemplateModal();
    alert('模板已保存！');
}

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
    header.textContent = `已选 ${config.tropes.length}/15`;
}

// ==================== Collapsible ====================
function toggleCollapsible(id) {
    const collapsible = document.getElementById(id);
    collapsible.classList.toggle('open');
}

// ==================== Actions ====================
function setWordCount(value) {
    config.wordCount = value * 10000;
    document.getElementById('wordCountSlider').value = value;

    let label = '';
    if (value <= 20) label = `${value}万`;
    else if (value <= 50) label = `${value}万`;
    else label = `${value}万`;
    document.getElementById('wordCountValue').textContent = label;
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

    document.getElementById('novelName').value = '';
    document.getElementById('protagonistName').value = '';
    document.getElementById('direction').value = '';
    document.getElementById('audience').value = 'male-youth';
    document.getElementById('wordCountSlider').value = 75;
    document.getElementById('wordCountValue').textContent = '75万';

    document.querySelectorAll('#genreTags .tag-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#tropeTags .tag-btn').forEach(b => b.classList.remove('active'));
    updateTropeCount();
}

function goBack() {
    window.location.href = 'index.html';
}

async function aiGenerateName(type) {
    const input = type === 'novel' ? document.getElementById('novelName') : document.getElementById('protagonistName');

    if (aiSettings.provider === 'local') {
        const mockNames = {
            novel: ['《星辰变》', '《凡人修仙传》', '《完美世界》', '《斗破苍穹》'],
            protagonist: ['叶尘', '韩立', '萧炎', '林动']
        };
        input.value = mockNames[type][Math.floor(Math.random() * mockNames[type].length)];
        return;
    }

    // Use AI to generate name
    try {
        const direction = document.getElementById('direction').value || '玄幻小说';
        const messages = [{
            role: 'user',
            content: `为一个${direction}类型的小说${type === 'novel' ? '生成一个吸引人的书名' : '生成一个主角名字'}，只需要返回名字，不要解释。`
        }];

        const result = await callAI(messages);
        input.value = result.trim();
    } catch (error) {
        alert('AI生成失败，请检查API设置');
    }
}

async function callAI(messages) {
    if (aiSettings.provider === 'local') {
        return new Promise((resolve) => {
            setTimeout(() => resolve('模拟名称'), 1000);
        });
    }

    const headers = { 'Content-Type': 'application/json' };
    let endpoint = aiSettings.baseUrl;
    let body = {};

    if (aiSettings.provider === 'anthropic') {
        headers['x-api-key'] = aiSettings.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        body = {
            model: aiSettings.model,
            max_tokens: aiSettings.maxTokens,
            messages: messages
        };
    } else {
        headers['Authorization'] = `Bearer ${aiSettings.apiKey}`;
        body = {
            model: aiSettings.model,
            messages: messages
        };
    }

    if (!endpoint) {
        if (aiSettings.provider === 'anthropic') {
            endpoint = 'https://api.anthropic.com/v1/messages';
        } else {
            endpoint = 'https://api.openai.com/v1/chat/completions';
        }
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error('API request failed');

    const data = await response.json();

    if (aiSettings.provider === 'anthropic') {
        return data.content[0].text;
    } else {
        return data.choices[0].message.content;
    }
}

function createNovel() {
    const novelName = document.getElementById('novelName').value.trim();
    if (!novelName) {
        alert('请输入小说名称');
        return;
    }

    // Get all config
    config.novelName = novelName;
    config.protagonistName = document.getElementById('protagonistName').value.trim();
    config.direction = document.getElementById('direction').value.trim();
    config.audience = document.getElementById('audience').value;
    config.plotStructure = document.getElementById('plotStructure').value;

    // Create project
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

    // Redirect to editor
    const newIndex = projects.length - 1;
    window.location.href = `editor.html?project=${newIndex}&chapter=0`;
}

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', init);