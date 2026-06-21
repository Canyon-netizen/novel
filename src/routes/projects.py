"""
项目 CRUD 路由
"""
from typing import Any, Dict, List

from fastapi import APIRouter, Header, HTTPException

from .. import storage

router = APIRouter()


def _get_user_id(authorization: str = Header(None)) -> str:
    """从 Authorization 头取 user_id（演示项目：token = username）"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing Authorization header")
    return authorization[7:].strip()


@router.get("", response_model=List[Dict[str, Any]])
def list_projects(authorization: str = Header(None)):
    user_id = _get_user_id(authorization)
    return storage.list_projects(user_id)


@router.post("", response_model=Dict[str, Any])
def create_project(project: Dict[str, Any], authorization: str = Header(None)):
    user_id = _get_user_id(authorization)
    return storage.create_project(user_id, project)


@router.get("/{project_id}", response_model=Dict[str, Any])
def get_project(project_id: str, authorization: str = Header(None)):
    user_id = _get_user_id(authorization)
    proj = storage.get_project(user_id, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="project not found")
    return proj


@router.put("/{project_id}", response_model=Dict[str, Any])
def update_project(project_id: str, project: Dict[str, Any], authorization: str = Header(None)):
    user_id = _get_user_id(authorization)
    updated = storage.update_project(user_id, project_id, project)
    if not updated:
        raise HTTPException(status_code=404, detail="project not found")
    return updated


@router.delete("/{project_id}")
def delete_project(project_id: str, authorization: str = Header(None)):
    user_id = _get_user_id(authorization)
    ok = storage.delete_project(user_id, project_id)
    if not ok:
        raise HTTPException(status_code=404, detail="project not found")
    return {"ok": True}
