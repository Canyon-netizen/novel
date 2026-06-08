"""
前端 JS 模块集成测试：调用 Node.js 跑 tests/unit/test_app_delegation.js
"""
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
JS_TEST = ROOT / "tests" / "unit" / "test_app_delegation.js"


def _has_node():
    try:
        subprocess.run(["node", "--version"], check=True, capture_output=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


_NODE_AVAILABLE = _has_node()


@pytest.mark.skipif(not _NODE_AVAILABLE, reason="node 不在 PATH")
def test_js_app_delegation():
    """app.js / editor.js 是否正确委托到 NovelCommon / NovelLLMClient"""
    if not JS_TEST.exists():
        pytest.skip(f"找不到 {JS_TEST}")

    result = subprocess.run(
        ["node", str(JS_TEST)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=30,
    )
    print(result.stdout)
    if result.returncode != 0:
        print("STDERR:", result.stderr, file=sys.stderr)
    assert result.returncode == 0, f"JS 测试失败（exit {result.returncode}）"
    assert "全部通过" in result.stdout or "✓" in result.stdout


@pytest.mark.skipif(not _NODE_AVAILABLE, reason="node 不在 PATH")
def test_node_syntax_for_each_module():
    """app/common.js、app/llm-client.js、js/app.js、js/editor.js 必须能通过 node --check"""
    files = [
        ROOT / "app" / "common.js",
        ROOT / "app" / "llm-client.js",
        ROOT / "js" / "app.js",
        ROOT / "js" / "editor.js",
    ]
    for f in files:
        if not f.exists():
            continue
        result = subprocess.run(
            ["node", "--check", str(f)],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, f"{f} 语法错误: {result.stderr}"
