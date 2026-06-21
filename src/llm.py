"""
多 provider LLM 客户端（参考 daily-paper-reader/src/llm.py）
支持: anthropic / openai / deepseek / minimax / kimi / glm / local
"""
import os
import re
import time
from typing import Any, Dict, List, Optional

import requests


class LLMClient:
    """LLM 客户端基类"""

    def __init__(self, api_key: str, model: str, base_url: str):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.tokens = {"prompt": 0, "content": 0, "total": 0}

    def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        raise NotImplementedError

    def _build_url(self, path: str) -> str:
        url = self.base_url
        if not re.search(r"/v\d+$", url):
            url = f"{url}/v1"
        return f"{url}{path}"


class AnthropicClient(LLMClient):
    """Anthropic Claude API"""

    def chat(self, messages, system_prompt=None, temperature=0.7, max_tokens=2048):
        url = self._build_url("/messages")
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        body = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
        }
        if system_prompt:
            body["system"] = system_prompt
        resp = requests.post(url, headers=headers, json=body, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        content = data.get("content") or []
        if content and content[0].get("type") == "text":
            return content[0].get("text", "")
        return ""


class OpenAIClient(LLMClient):
    """OpenAI 兼容客户端（OpenAI / DeepSeek / MiniMax / Kimi / GLM 通用）"""

    def chat(self, messages, system_prompt=None, temperature=0.7, max_tokens=2048):
        url = self._build_url("/chat/completions")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        msgs = []
        if system_prompt:
            msgs.append({"role": "system", "content": system_prompt})
        msgs.extend(messages)
        body = {
            "model": self.model,
            "messages": msgs,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        resp = requests.post(url, headers=headers, json=body, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        choices = data.get("choices") or []
        if choices:
            return choices[0].get("message", {}).get("content", "")
        return ""


def infer_provider(base_url: str, model: str) -> str:
    """根据 baseUrl / model 推断 provider"""
    base = (base_url or "").lower()
    m = (model or "").lower()

    if "anthropic" in base:
        return "anthropic"
    if "deepseek" in base or m.startswith("deepseek-"):
        return "openai"
    if "minimax" in base or "MiniMax" in (model or ""):
        return "openai"
    if "moonshot" in base or m.startswith("moonshot-"):
        return "openai"
    if "bigmodel" in base or m.startswith("glm-"):
        return "openai"
    if "openai" in base:
        return "openai"
    if m.startswith("claude"):
        return "anthropic"
    return "openai"


def create_client(api_key: str, model: str, base_url: str) -> LLMClient:
    """工厂方法"""
    provider = infer_provider(base_url, model)
    if provider == "anthropic":
        return AnthropicClient(api_key, model, base_url)
    return OpenAIClient(api_key, model, base_url)
