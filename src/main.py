"""
墨韵AI 后端 - FastAPI 入口
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routes import projects, llm_chat, gist_sync, auth

app = FastAPI(title="墨韵AI", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产应该限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(llm_chat.router, prefix="/api/llm", tags=["llm"])
app.include_router(gist_sync.router, prefix="/api/gist", tags=["gist"])


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "moyun-ai"}


# 静态文件（生产部署时启用）
# app.mount("/", StaticFiles(directory="../docs", html=True), name="static")
