"""
LLM 代理路由 - 隐藏 API Key，统一多 provider 调用
"""
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..llm import create_client, infer_provider

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    # 用户的 LLM 配置
    provider: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: str
    messages: List[ChatMessage]
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048


class ChatResponse(BaseModel):
    content: str
    provider: str


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """代理 LLM 调用。API Key 可以从前端传，也可以在后端 .env 配置（优先级更高）"""
    if req.provider == "local" or req.model == "local":
        return ChatResponse(
            content="【本地模拟】这是一段模拟的AI续写内容。夜风轻拂，星光点点。",
            provider="local",
        )

    # 后端 .env 优先级 > 前端传的 key
    env_key = (
        os.getenv(f"LLM_API_KEY_{req.model.upper().replace('-', '_')}", "")
        or os.getenv("LLM_API_KEY", "")
    )
    api_key = req.api_key or env_key
    if not api_key:
        raise HTTPException(status_code=400, detail="API key required (前端传或后端 LLM_API_KEY 环境变量)")

    # base_url 默认值
    base_url = req.base_url
    if not base_url:
        env_url = os.getenv("LLM_BASE_URL", "")
        base_url = env_url

    provider = infer_provider(base_url or "", req.model)
    client = create_client(api_key, req.model, base_url or "")

    try:
        messages = [m.model_dump() for m in req.messages]
        content = client.chat(
            messages,
            system_prompt=req.system_prompt,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM call failed: {str(e)}")

    return ChatResponse(content=content, provider=provider)
