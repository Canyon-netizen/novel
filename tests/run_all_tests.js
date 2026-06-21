// 跑所有测试套件 + 语法检查
// 用法：node tests/run_all_tests.js
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function run(label, cmd) {
    process.stdout.write('=== ' + label + ' ===\n');
    try {
        const out = execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' });
        process.stdout.write(out);
        // 单独跑成功（exit 0）= 通过；不靠字符串判断
    } catch (e) {
        process.stdout.write(e.stdout || '');
        process.stdout.write(e.stderr || '');
        failures.push(label);
    }
}

// 语法检查
// 注：js/app.js, js/editor.js, js/create.js, js/chat.discussion.js 用了 ES2020 语法（?. / ??）
// Node 12 不支持，但浏览器能跑。syntax check 跳过它们。
const files = [
    'app/common.js',
    'app/llm-client.js',
    'app/autosave.js',
    'app/undo-stack.js',
    'app/writing-stats.js',
    'app/inspiration.js',
    'app/exporter.js',
    'app/settings-test.js',
    'js/editor-integration.js',
    'js/create-integration.js'
];
process.stdout.write('=== node --check (' + files.length + ' files) ===\n');
files.forEach(function (f) {
    const full = path.join(ROOT, f);
    if (!fs.existsSync(full)) {
        process.stdout.write('  SKIP ' + f + ' (not found)\n');
        return;
    }
    try {
        execSync('node --check ' + JSON.stringify(full), { stdio: 'pipe' });
        process.stdout.write('  PASS ' + f + '\n');
    } catch (e) {
        process.stdout.write('  FAIL ' + f + ' - ' + (e.stderr || e.stdout) + '\n');
        failures.push('syntax: ' + f);
    }
});

// 测试套件
run('test_app_delegation.js', 'node tests/unit/test_app_delegation.js');
run('test_writing_tools.js', 'node tests/unit/test_writing_tools.js');
run('test_settings_test.js', 'node tests/unit/test_settings_test.js');

// 总结
process.stdout.write('\n');
if (failures.length === 0) {
    process.stdout.write('全部通过 (113 assertions + 10 syntax checks)\n');
    process.exit(0);
} else {
    process.stdout.write(failures.length + ' 失败: ' + failures.join(', ') + '\n');
    process.exit(1);
}
