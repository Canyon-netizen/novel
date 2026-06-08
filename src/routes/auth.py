"""
简单账号认证（生产应该换 GitHub OAuth / JWT）
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str  # 演示项目，不做校验


class LoginResponse(BaseModel):
    username: str
    token: str  # 演示项目，token 跟 username 一样


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    """演示登录：任意 username + password 都通过"""
    if not req.username.strip():
        raise HTTPException(status_code=400, detail="username required")
    return LoginResponse(username=req.username, token=req.username)
