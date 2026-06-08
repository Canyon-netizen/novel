"""
src/llm.py 单元测试
"""
import os
import sys

# 把 src 加到 path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.llm import infer_provider, create_client  # noqa: E402


def test_infer_anthropic():
    assert infer_provider("https://api.anthropic.com/v1", "claude-sonnet-4-20250514") == "anthropic"
    assert infer_provider("https://example.com/anthropic", "") == "anthropic"
    assert infer_provider("", "claude-3-5-sonnet-20241022") == "anthropic"


def test_infer_openai_compat():
    # OpenAI / DeepSeek / MiniMax / Kimi / GLM 都用 OpenAIClient
    assert infer_provider("https://api.openai.com/v1", "gpt-4") == "openai"
    assert infer_provider("https://api.deepseek.com/v1", "deepseek-chat") == "openai"
    assert infer_provider("https://api.minimaxi.com/v1", "MiniMax-M2.7") == "openai"
    assert infer_provider("https://api.moonshot.cn/v1", "moonshot-v1-8k") == "openai"
    assert infer_provider("https://open.bigmodel.cn/api/coding/paas/v4", "glm-4") == "openai"


def test_infer_default_openai():
    assert infer_provider("", "") == "openai"
    assert infer_provider("https://example-proxy.com/v1", "custom-model") == "openai"


def test_create_client():
    c1 = create_client("key", "claude-sonnet-4-20250514", "https://api.anthropic.com/v1")
    assert c1.__class__.__name__ == "AnthropicClient"

    c2 = create_client("key", "gpt-4", "https://api.openai.com/v1")
    assert c2.__class__.__name__ == "OpenAIClient"

    c3 = create_client("key", "deepseek-chat", "https://api.deepseek.com/v1")
    assert c3.__class__.__name__ == "OpenAIClient"


if __name__ == "__main__":
    test_infer_anthropic()
    test_infer_openai_compat()
    test_infer_default_openai()
    test_create_client()
    print("✓ all llm tests passed")
