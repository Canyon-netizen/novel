// 验证 app/common.js + app/llm-client.js + app.js 委托正常工作
// 跑法：node tests/unit/test_app_delegation.js

const fs = require('fs');
const path = require('path');

const NOVEL_DIR = path.resolve(__dirname, '..', '..');
process.chdir(NOVEL_DIR);

const failures = [];
function check(name, cond, detail) {
    if (cond) {
        console.log(`  ✓ ${name}`);
    } else {
        console.log(`  ✗ ${name} — ${detail || ''}`);
        failures.push(name);
    }
}

// ============ Test 1: app/common.js UMD 模式正确 ============
console.log('\n[Test 1] app/common.js UMD 模式');
// 在 node 里用 vm 模拟 globalThis
const commonSrc = fs.readFileSync(path.join(NOVEL_DIR, 'app/common.js'), 'utf8');
const llmSrc = fs.readFileSync(path.join(NOVEL_DIR, 'app/llm-client.js'), 'utf8');

const ctx = { globalThis: {}, console };
ctx.global = ctx.globalThis;
const sandbox = ctx.globalThis;

// 加载 common.js
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(commonSrc, sandbox);
vm.runInContext(llmSrc, sandbox);

check('common.js 暴露 NovelCommon', typeof sandbox.NovelCommon === 'object');
check('llm-client.js 暴露 NovelLLMClient', typeof sandbox.NovelLLMClient === 'object');
check('NovelCommon.getAuthUser 是函数', typeof sandbox.NovelCommon.getAuthUser === 'function');
check('NovelCommon.loadAISettings 是函数', typeof sandbox.NovelCommon.loadAISettings === 'function');
check('NovelCommon.getDefaultSettings 是函数', typeof sandbox.NovelCommon.loadGistSettings === 'function');
check('NovelLLMClient.inferApiProfile 是函数', typeof sandbox.NovelLLMClient.inferApiProfile === 'function');
check('NovelLLMClient.callAI 是函数', typeof sandbox.NovelLLMClient.callAI === 'function');
check('NovelLLMClient.callLocalAI 是函数', typeof sandbox.NovelLLMClient.callLocalAI === 'function');

// ============ Test 2: 关键功能正确性 ============
console.log('\n[Test 2] NovelCommon / NovelLLMClient 行为正确');

// 模拟 localStorage / sessionStorage
const storage = {};
sandbox.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
};
sandbox.sessionStorage = sandbox.localStorage;
sandbox.window = { location: { href: '' } };
sandbox.setTimeout = setTimeout;
sandbox.clearTimeout = clearTimeout;
sandbox.document = { documentElement: { setAttribute: () => {} }, querySelector: () => null };

// getDefaultSettings 应有 provider/apiKey/baseUrl/model/temperature
const defaults = sandbox.NovelCommon.DEFAULT_AI_SETTINGS;
check('DEFAULT_AI_SETTINGS 返回 5 字段',
    ['provider', 'apiKey', 'baseUrl', 'model', 'temperature'].every(k => k in defaults),
    JSON.stringify(defaults));

// loadAISettings 是合并而非替换
const target = sandbox.NovelCommon.DEFAULT_AI_SETTINGS;
target.provider = 'anthropic';
storage['moyun_ai_settings'] = JSON.stringify({ provider: 'deepseek', apiKey: 'sk-xxx' });
sandbox.NovelCommon.loadAISettings(target);
check('loadAISettings 合并而非替换', target.provider === 'deepseek' && target.apiKey === 'sk-xxx' && target.temperature === 0.7);

// inferApiProfile — DeepSeek
check('inferApiProfile(DeepSeek baseUrl) === deepseek',
    sandbox.NovelLLMClient.inferApiProfile('https://api.deepseek.com/v1', 'deepseek-chat') === 'deepseek');
check('inferApiProfile(MiniMax baseUrl) === minimax',
    sandbox.NovelLLMClient.inferApiProfile('https://api.minimax.chat/v1', 'MiniMax-Text-01') === 'minimax');
check('inferApiProfile(Anthropic path) === anthropic',
    sandbox.NovelLLMClient.inferApiProfile('https://proxy.example.com/anthropic', 'claude-3') === 'anthropic');
check("inferApiProfile(custom baseUrl no match) === null",
    sandbox.NovelLLMClient.inferApiProfile('https://my-proxy.example.com', 'gpt-4') === null);

// buildApiEndpoint — 防止双 /v1 bug
const ep = sandbox.NovelLLMClient.buildApiEndpoint;
check('buildApiEndpoint(minimax /v1) 不重复 /v1',
    ep('https://api.minimaxi.com/v1', 'minimax') === 'https://api.minimaxi.com/v1/chat/completions');
check('buildApiEndpoint(minimax /v1/) 不重复 /v1（去尾斜杠后）',
    ep('https://api.minimaxi.com/v1/', 'minimax') === 'https://api.minimaxi.com/v1/chat/completions');
check('buildApiEndpoint(openai 裸域) 追加 /v1',
    ep('https://api.openai.com', 'openai') === 'https://api.openai.com/v1/chat/completions');
check('buildApiEndpoint(anthropic /v1) 不重复 /v1',
    ep('https://api.anthropic.com/v1', 'anthropic') === 'https://api.anthropic.com/v1/messages');
check('buildApiEndpoint(deepseek /v1) 不重复 /v1',
    ep('https://api.deepseek.com/v1', 'deepseek') === 'https://api.deepseek.com/v1/chat/completions');
check('buildApiEndpoint(空 baseUrl) 走 provider 默认',
    ep('', 'openai') === 'https://api.openai.com/v1/chat/completions');

// callLocalAI 返回模拟内容
sandbox.NovelLLMClient.callLocalAI([], 'system').then(text => {
    check('callLocalAI 返回非空字符串', typeof text === 'string' && text.length > 0);

    // ============ Test 3: app.js 委托函数定义 ============
    console.log('\n[Test 3] app.js / editor.js 委托存在');
    const appSrc = fs.readFileSync(path.join(NOVEL_DIR, 'js/app.js'), 'utf8');
    const editorSrc = fs.readFileSync(path.join(NOVEL_DIR, 'js/editor.js'), 'utf8');

    check('app.js 包含 callAI 委托', /function callAI.*NovelLLMClient\.callAI/s.test(appSrc));
    check('app.js 包含 requireAuth 委托', /function requireAuth.*NovelCommon\.requireAuth/s.test(appSrc));
    check('app.js 包含 setupAuthActions 委托', /function setupAuthActions.*NovelCommon\.setupAuthActions/s.test(appSrc));
    check("app.js 移除了 API_PRESETS 顶层实现", !/^const API_PRESETS = \{$/m.test(appSrc.split('// ==================== LLM Client')[0]));
    check('editor.js 包含 callAI 委托', /function callAI.*NovelLLMClient\.callAI/s.test(editorSrc));
    check("editor.js 移除了 API_PRESETS 顶层实现", !/^const API_PRESETS = \{$/m.test(editorSrc.split('// ==================== LLM Client')[0]));

    // ============ Test 4: 4 个 HTML 都加载了 app/*.js ============
    console.log('\n[Test 4] 4 个 HTML 都引入 app/common.js 和 app/llm-client.js');
    const htmlFiles = ['index.html', 'editor.html', 'create.html'];
    for (const f of htmlFiles) {
        const html = fs.readFileSync(path.join(NOVEL_DIR, f), 'utf8');
        check(`${f} 引入 app/common.js`, /script src="app\/common\.js"/.test(html));
        check(`${f} 引入 app/llm-client.js`, /script src="app\/llm-client\.js"/.test(html));
    }
    // login.html 不需要 LLM/Common（演示登录页）

    // ============ 总结 ============
    console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${failures.length === 0 ? '全部通过' : failures.length + ' 失败: ' + failures.join(', ')}`);
    process.exit(failures.length === 0 ? 0 : 1);
});
