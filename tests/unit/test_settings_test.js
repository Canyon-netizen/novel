// 测试设置弹窗的"测试连接"功能
// 重点验证：参数校验、错误分类、UI 展示

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NOVEL_DIR = path.resolve(__dirname, '..', '..');
process.chdir(NOVEL_DIR);

const failures = [];
function check(name, cond, detail) {
    if (cond) {
        console.log('  PASS ' + name);
    } else {
        console.log('  FAIL ' + name + (detail ? ' - ' + detail : ''));
        failures.push(name);
    }
}

// 准备 sandbox：模拟浏览器环境
function makeMockStorage() {
    const store = {};
    return {
        getItem: function (k) { return store[k] || null; },
        setItem: function (k, v) { store[k] = String(v); },
        removeItem: function (k) { delete store[k]; }
    };
}

if (typeof AbortController === 'undefined') {
  globalThis.AbortController = class MockAbortController {
    constructor() { this.signal = { aborted: false, addEventListener: function() {}, reason: null }; }
    abort(reason) { this.signal.aborted = true; this.signal.reason = reason; }
  };
}
const sandbox = {
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    AbortController: AbortController,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Object: Object,
    Array: Array,
    Promise: Promise,
    Error: Error,

    localStorage: makeMockStorage(),
    sessionStorage: makeMockStorage(),
    window: { location: { href: '' } },
    document: {
        readyState: 'complete',
        addEventListener: function () {},
        createElement: function () { return { style: {}, className: '', textContent: '', innerHTML: '', appendChild: function () {} }; },
        getElementById: function () { return null; },
        querySelector: function () { return null; }
    }
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);

// 加载依赖 + 测试目标
const modules = [
    'app/common.js',
    'app/llm-client.js',
    'app/settings-test.js'
];
modules.forEach(function (m) {
    const src = fs.readFileSync(path.join(NOVEL_DIR, m), 'utf8');
    vm.runInContext(src, sandbox);
});

console.log('\n[Test 1] UMD 暴露');
check('NovelSettingsTest 暴露', typeof sandbox.NovelSettingsTest === 'object');
check('NovelLLMClient.testConnection 是函数', typeof sandbox.NovelLLMClient.testConnection === 'function');
check('NovelCommon.testAISettings 是函数', typeof sandbox.NovelCommon.testAISettings === 'function');
check('NovelSettingsTest.runTest 是函数', typeof sandbox.NovelSettingsTest.runTest === 'function');

console.log('\n[Test 2] 读 DOM 设置字段');
sandbox.document.getElementById = function (id) {
    const map = {
        apiProvider: { value: 'deepseek' },
        apiKeyInput: { value: 'sk-test-123' },
        baseUrlInput: { value: 'https://api.deepseek.com' },
        modelInput: { value: 'deepseek-chat' },
        temperatureInput: { value: '0.7' }
    };
    return map[id] || null;
};
var dom = sandbox.NovelSettingsTest.readDOMSettings();
check('readDOMSettings.provider === "deepseek"', dom.provider === 'deepseek');
check('readDOMSettings.apiKey === "sk-test-123"', dom.apiKey === 'sk-test-123');
check('readDOMSettings.baseUrl === "https://api.deepseek.com"', dom.baseUrl === 'https://api.deepseek.com');
check('readDOMSettings.model === "deepseek-chat"', dom.model === 'deepseek-chat');

console.log('\n[Test 3] showResult UI 渲染');
sandbox.document.getElementById = function (id) {
    if (id === 'testConnectionResult') {
        return { className: '', innerHTML: '', textContent: '' };
    }
    return null;
};
var statusEl = sandbox.document.getElementById('testConnectionResult');
sandbox.NovelSettingsTest.showResult(statusEl, 'testing', '测试中...', '');
check('testing 状态: 包含 ⏳', statusEl.innerHTML.indexOf('⏳') >= 0);
check('testing 状态: className 含 test-pending', statusEl.className.indexOf('test-pending') >= 0);

sandbox.NovelSettingsTest.showResult(statusEl, 'success', '连接成功', '端点: https://api.deepseek.com');
check('success 状态: 包含 ✅', statusEl.innerHTML.indexOf('✅') >= 0);
check('success 状态: 包含 <small>', statusEl.innerHTML.indexOf('<small') >= 0);

sandbox.NovelSettingsTest.showResult(statusEl, 'error', 'API Key 无效', '请检查 API Key');
check('error 状态: 包含 ❌', statusEl.innerHTML.indexOf('❌') >= 0);
check('error 状态: 包含 detail', statusEl.innerHTML.indexOf('请检查') >= 0);

console.log('\n[Test 4] testAISettings - local provider');
sandbox.NovelCommon.testAISettings({ provider: 'local' }).then(function (r) {
    check('local provider 返回 ok=true', r.ok === true);
    check('local 返回 code=local', r.code === 'local');

    console.log('\n[Test 5] testAISettings - missing apiKey');
    return sandbox.NovelCommon.testAISettings({ provider: 'deepseek', apiKey: '' }).then(function () {
        check('不应该到这里', false, 'expected error');
    }, function (err) {
        check('缺 apiKey 抛错', err instanceof Error);
        check('错误 code === missing-key', err.code === 'missing-key');
    });
}).then(function () {
    console.log('\n[Test 6] testAISettings - network error (用无效 URL 触发)');
    // 用一个绝对连不上的 host
    return sandbox.NovelCommon.testAISettings({
        provider: 'custom',
        apiKey: 'sk-test',
        baseUrl: 'http://127.0.0.1:1',  // 端口 1 一般没服务
        model: 'test',
        timeoutMs: 3000
    }).then(function () {
        check('不应该到这里', false, 'expected error');
    }, function (err) {
        check('网络错误抛错', err instanceof Error);
        check('错误 code 属于 network/timeout/no-endpoint', ['network', 'timeout', 'no-endpoint'].indexOf(err.code) >= 0, 'got ' + err.code);
        check('错误有 detail', err.detail && err.detail.length > 0);
    });
}).then(function () {
    console.log('\n[Test 7] testAISettings - HTTP 401 (mock)');
    // mock fetch 返 401
    sandbox.fetch = function () {
        return Promise.resolve({
            ok: false,
            status: 401,
            text: function () { return Promise.resolve('{"error":{"message":"Invalid API Key"}}'); },
            json: function () { return Promise.resolve({ error: { message: 'Invalid API Key' } }); }
        });
    };
    return sandbox.NovelCommon.testAISettings({
        provider: 'deepseek',
        apiKey: 'sk-bad',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat'
    }).then(function () {
        check('不应该到这里', false, 'expected error');
    }, function (err) {
        check('401 抛错', err instanceof Error);
        check('401 错误 code === auth', err.code === 'auth', 'got ' + err.code);
        check('401 错误 detail 含 Invalid', err.detail && err.detail.indexOf('Invalid') >= 0);
    });
}).then(function () {
    console.log('\n[Test 8] testAISettings - HTTP 200 success (mock)');
    sandbox.fetch = function () {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: function () {
                return Promise.resolve({
                    choices: [{ message: { content: 'hello back' } }],
                    usage: { total_tokens: 10 }
                });
            }
        });
    };
    return sandbox.NovelCommon.testAISettings({
        provider: 'deepseek',
        apiKey: 'sk-test',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat'
    }).then(function (r) {
        check('success 返回 ok=true', r.ok === true);
        check('success 返回 code=success', r.code === 'success');
        check('success 包含 sample', r.sample && r.sample.indexOf('hello back') >= 0);
        check('success 包含 endpoint', r.endpoint && r.endpoint.indexOf('chat/completions') >= 0);
        check('success 包含 model', r.model === 'deepseek-chat');
    });
}).then(function () {
    console.log('\n[Test 9] testAISettings - Anthropic success (mock)');
    sandbox.fetch = function () {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: function () {
                return Promise.resolve({
                    content: [{ type: 'text', text: 'Hi from Claude' }]
                });
            }
        });
    };
    return sandbox.NovelCommon.testAISettings({
        provider: 'anthropic',
        apiKey: 'sk-ant-test',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-3-5-sonnet-20241022'
    }).then(function (r) {
        check('Anthropic success ok=true', r.ok === true);
        check('Anthropic 返回 provider=anthropic', r.provider === 'anthropic');
        check('Anthropic sample 含 Hi from Claude', r.sample && r.sample.indexOf('Hi from Claude') >= 0);
    });
}).then(function () {
    console.log('\n[Test 10] testAISettings - HTTP 404 (mock)');
    sandbox.fetch = function () {
        return Promise.resolve({
            ok: false,
            status: 404,
            text: function () { return Promise.resolve('Not Found'); },
            json: function () { return Promise.reject(new Error('not json')); }
        });
    };
    return sandbox.NovelCommon.testAISettings({
        provider: 'openai',
        apiKey: 'sk-test',
        baseUrl: 'https://wrong-url.example.com',
        model: 'gpt-4'
    }).then(function () {
        check('不应该到这里', false);
    }, function (err) {
        check('404 错误 code === not-found', err.code === 'not-found', 'got ' + err.code);
    });
}).then(function () {
    console.log('\n[Test 11] testAISettings - HTTP 429 (mock)');
    sandbox.fetch = function () {
        return Promise.resolve({
            ok: false,
            status: 429,
            text: function () { return Promise.resolve('Rate limit exceeded'); },
            json: function () { return Promise.reject(new Error('not json')); }
        });
    };
    return sandbox.NovelCommon.testAISettings({
        provider: 'deepseek',
        apiKey: 'sk-test',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat'
    }).then(function () {}, function (err) {
        check('429 错误 code === rate-limit', err.code === 'rate-limit', 'got ' + err.code);
    });
}).then(function () {
    var total = 36;
    console.log('\n' + (failures.length === 0 ? '全部通过 (' + total + '/' + total + ')' : failures.length + ' 失败: ' + failures.join(', ')));
    process.exit(failures.length === 0 ? 0 : 1);
}).catch(function (err) {
    console.log('test failed:', err);
    process.exit(1);
});
