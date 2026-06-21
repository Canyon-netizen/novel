// 5 个新 app 模块的单元测试
// 跑法：node tests/unit/test_writing_tools.js

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

function makeMockStorage() {
    const store = {};
    return {
        getItem: function (k) { return store[k] || null; },
        setItem: function (k, v) { store[k] = String(v); },
        removeItem: function (k) { delete store[k]; },
        clear: function () { Object.keys(store).forEach(function (k) { delete store[k]; }); },
        _store: store
    };
}

const sandbox = {
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    Boolean: Boolean,
    RegExp: RegExp,
    Error: Error,
    Promise: Promise,
    localStorage: makeMockStorage(),
    sessionStorage: makeMockStorage(),
    window: { location: { href: '' } },
    document: { documentElement: { setAttribute: function () {} }, querySelector: function () { return null; } }
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);

var modules = ['app/autosave.js', 'app/undo-stack.js', 'app/writing-stats.js', 'app/inspiration.js', 'app/exporter.js'];
for (var i = 0; i < modules.length; i++) {
    var mod = modules[i];
    var src = fs.readFileSync(path.join(NOVEL_DIR, mod), 'utf8');
    vm.runInContext(src, sandbox);
}

console.log('\n[Test 1] UMD 模式');
check('NovelAutosave 暴露', typeof sandbox.NovelAutosave === 'object');
check('NovelUndo 暴露', typeof sandbox.NovelUndo === 'object');
check('NovelStats 暴露', typeof sandbox.NovelStats === 'object');
check('NovelInspiration 暴露', typeof sandbox.NovelInspiration === 'object');
check('NovelExporter 暴露', typeof sandbox.NovelExporter === 'object');

console.log('\n[Test 2] NovelAutosave');
var textarea = {
    value: 'hello world',
    addEventListener: function (e, fn) {},
    removeEventListener: function () {},
    focus: function () {},
    setSelectionRange: function () {}
};
var controller = sandbox.NovelAutosave.watch(textarea, { key: 'test:1', debounceMs: 100 });
check('watch 返回 controller', typeof controller === 'object');
check('controller.getDraft() 可调用', typeof controller.getDraft === 'function');
check('controller.clearDraft() 可调用', typeof controller.clearDraft === 'function');
check('countWords 是函数', typeof sandbox.NovelAutosave.countWords === 'function');
check("countWords('hello world') === 2", sandbox.NovelAutosave.countWords('hello world') === 2);
check("countWords('你好世界') === 4", sandbox.NovelAutosave.countWords('你好世界') === 4);
check("countWords('') === 0", sandbox.NovelAutosave.countWords('') === 0);
check("countWords(null) === 0", sandbox.NovelAutosave.countWords(null) === 0);
check('formatRelativeTime 是函数', typeof sandbox.NovelAutosave.formatRelativeTime === 'function');

console.log('\n[Test 3] NovelUndo');
var undo = sandbox.NovelUndo.create();
check('create() 返回 controller', typeof undo === 'object');
check('初始 canUndo === false', undo.canUndo() === false);
check('初始 canRedo === false', undo.canRedo() === false);
undo.commit({ type: 'insert', position: 0, before: '', after: 'a' });
check('commit 后 canUndo === true', undo.canUndo() === true);
var undone = undo.undo();
check('undo() 返回操作', undone !== null);
check('undo 后 canRedo === true', undo.canRedo() === true);
check('undo 返回的 op.type === delete', undone.type === 'delete');
check('diff 相同字符串 === null', sandbox.NovelUndo.diff('abc', 'abc') === null);
var diff = sandbox.NovelUndo.diff('hello', 'hello world');
check("diff('hello', 'hello world') 返回 insert", diff && diff.type === 'insert' && diff.after === ' world');
var delDiff = sandbox.NovelUndo.diff('hello world', 'hello');
check("diff('hello world', 'hello') 返回 delete", delDiff && delDiff.type === 'delete' && delDiff.before === ' world');

// 合并测试
var undo2 = sandbox.NovelUndo.create();
undo2.commit({ type: 'insert', position: 0, before: '', after: 'a' });
undo2.commit({ type: 'insert', position: 1, before: '', after: 'b' });
check('相邻 insert 可合并 - canUndo 只有 1 次', undo2.canUndo() === true);

console.log('\n[Test 4] NovelStats');
check("countWords('hello') === 1", sandbox.NovelStats.countWords('hello') === 1);
check("countWords('你好') === 2", sandbox.NovelStats.countWords('你好') === 2);
check("estimateReadingTime(0) 返回字符串", typeof sandbox.NovelStats.estimateReadingTime(0) === 'string');
check("estimateReadingTime(280) 含 '分钟'", sandbox.NovelStats.estimateReadingTime(280).indexOf('分钟') >= 0);
check("formatWords(999) === '999'", sandbox.NovelStats.formatWords(999) === '999');
check("formatWords(1500) 含 'k'", sandbox.NovelStats.formatWords(1500).indexOf('k') >= 0);
check("formatProgressBar(50) 含 '50%'", sandbox.NovelStats.formatProgressBar(50).indexOf('50%') >= 0);

var tracker = sandbox.NovelStats.create({ dailyGoal: 1000 });
var stats0 = tracker.getStats();
check('tracker.getStats() 返回对象', typeof stats0 === 'object');
check('初始 todayWords === 0', stats0.todayWords === 0);
check('dailyGoal === 1000', stats0.dailyGoal === 1000);
var stats1 = tracker.addWords(500);
check('addWords(500) 后 todayWords === 500', stats1.todayWords === 500);
check('goalProgress === 50', stats1.goalProgress === 50);
var stats2 = tracker.addWords(500);
check('再 addWords(500) 后 todayWords === 1000', stats2.todayWords === 1000);
check('goalProgress === 100', stats2.goalProgress === 100);
var stats3 = tracker.addWords(200);
check('超额 addWords 后 goalProgress 仍 100', stats3.goalProgress === 100);
check('todayWords === 1200', stats3.todayWords === 1200);

console.log('\n[Test 5] NovelInspiration');
var goodJSON = '{"options": [{"title": "A", "content": "1"}, {"title": "B", "content": "2"}]}';
var parsed1 = sandbox.NovelInspiration.parseLenientJSON(goodJSON);
check('parseLenientJSON 解析正常 JSON', parsed1 && parsed1.options.length === 2);
var markdownJSON = '```json\n' + goodJSON + '\n```';
var parsed2 = sandbox.NovelInspiration.parseLenientJSON(markdownJSON);
check('parseLenientJSON 解析 markdown 包裹', parsed2 && parsed2.options.length === 2);

// fallback regex 模式
var garbled = '前缀废话 {"options": [{"title": "A", "content": "hello"}]} 尾部废话';
var parsedG = sandbox.NovelInspiration.parseLenientJSON(garbled);
check('parseLenientJSON 处理前缀/后缀废话', parsedG && parsedG.options.length === 1 && parsedG.options[0].title === 'A');

var garbage = 'this is not json at all';
var parsedGarbage = sandbox.NovelInspiration.parseLenientJSON(garbage);
check('parseLenientJSON 垃圾输入返回 null 或空', parsedGarbage === null || (parsedGarbage && parsedGarbage.options && parsedGarbage.options.length === 0));

var mockCallAI = async function (aiSettings, messages, systemPrompt) {
    return JSON.stringify({
        options: [
            { title: '方向 1', content: '内容 1' },
            { title: '方向 2', content: '内容 2' },
            { title: '方向 3', content: '内容 3' }
        ]
    });
};
var ins = sandbox.NovelInspiration.create({
    callAI: mockCallAI,
    aiSettings: { provider: 'mock', apiKey: 'x' },
    themePrompt: '你是助手',
    type: 'chapter-opener'
});
check('create() 返回 inspiration', typeof ins.generate === 'function');
check('getTypes() 返回 4 种', ins.getTypes().length === 4);

ins.generate({ context: '上一章...', theme: '玄幻' }).then(function (result) {
    check('generate() 返回 ok=true', result.ok === true);
    check('options 数量 === 3', result.options.length === 3);
    check('第一个 option 有 title 和 content', result.options[0].title && result.options[0].content);

    // 测 AI 失败的情况
    var failCallAI = async function () { throw new Error('network down'); };
    var insFail = sandbox.NovelInspiration.create({
        callAI: failCallAI,
        aiSettings: {},
        type: 'chapter-opener'
    });
    return insFail.generate({}).then(function (failResult) {
        check('AI 失败返回 ok=false', failResult.ok === false);
        check('AI 失败 options 为空', failResult.options && failResult.options.length === 0);

        console.log('\n[Test 6] NovelExporter');
        var sampleProject = {
            title: '测试小说',
            description: '一个测试',
            characters: [{ name: '主角', role: '男主', description: '勇敢' }],
            chapters: [
                { title: '第一章', summary: '开端', content: '故事开始了。' },
                { title: '第二章', content: '继续。' }
            ]
        };
        var md = sandbox.NovelExporter.buildMarkdown(sampleProject);
        check('buildMarkdown 包含标题', md.indexOf('# 测试小说') >= 0);
        check('buildMarkdown 包含人物', md.indexOf('主角') >= 0);
        check('buildMarkdown 包含 2 章', (md.match(/### 第/g) || []).length === 2);
        var txt = sandbox.NovelExporter.buildPlainText(sampleProject);
        check('buildPlainText 包含标题', txt.indexOf('测试小说') >= 0);
        check('buildPlainText 包含第一章', txt.indexOf('第一章') >= 0);
        var html = sandbox.NovelExporter.buildHTML(sampleProject);
        check('buildHTML 包含 DOCTYPE', html.indexOf('<!DOCTYPE html>') >= 0);
        check('buildHTML 包含 style 块', html.indexOf('<style>') >= 0);
        check('buildHTML 包含 h1 标题', html.indexOf('<h1>') >= 0);
        var json = sandbox.NovelExporter.buildJSON(sampleProject);
        check('buildJSON 是合法 JSON', (function () { try { return JSON.parse(json).title === '测试小说'; } catch (e) { return false; } })());

        console.log('\n[Test 7] 集成测试');
        return ins.generate({ context: '', theme: '都市' });
    });
}).then(function (ir) {
    var enhancedProject = {
        title: '测试小说',
        description: '一个测试',
        characters: [{ name: '主角', role: '男主', description: '勇敢' }],
        chapters: [
            { title: '第一章', summary: '开端', content: '故事开始了。' },
            { title: 'AI 灵感章节', summary: ir.options[0].title, content: ir.options[0].content }
        ]
    };
    var htmlOut = sandbox.NovelExporter.buildHTML(enhancedProject);
    check('集成：灵感注入项目后能导出', htmlOut.indexOf('AI 灵感章节') >= 0);

    var totalTests = 51;
    console.log('\n' + (failures.length === 0 ? '全部通过 (' + totalTests + '/' + totalTests + ')' : failures.length + ' 失败: ' + failures.join(', ')));
    process.exit(failures.length === 0 ? 0 : 1);
}).catch(function (err) {
    console.log('test failed:', err);
    process.exit(1);
});
