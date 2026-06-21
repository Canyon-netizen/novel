"""
Gist 同步路由 - 替代前端裸调 GitHub API
"""
import json
import os
from typing import Any, Dict, Optional

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import storage

router = APIRouter()

GIST_FILENAME = "moyun_data.json"


class SyncRequest(BaseModel):
    token: str
    gist_id: Optional[str] = None
    data: Dict[str, Any]


@router.post("/sync")
def sync_to_gist(req: SyncRequest):
    """创建/更新 Gist"""
    headers = {
        "Authorization": f"Bearer {req.token}",
        "Accept": "application/vnd.github+json",
    }
    payload = {
        "description": "墨韵AI - 小说项目备份",
        "public": False,
        "files": {GIST_FILENAME: {"content": json.dumps(req.data, ensure_ascii=False, indent=2)}},
    }

    if req.gist_id:
        # 更新现有 gist
        url = f"https://api.github.com/gists/{req.gist_id}"
        resp = requests.patch(url, headers=headers, json=payload, timeout=15)
    else:
        # 创建新 gist
        url = "https://api.github.com/gists"
        resp = requests.post(url, headers=headers, json=payload, timeout=15)

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])

    result = resp.json()
    return {
        "gist_id": result.get("id"),
        "html_url": result.get("html_url"),
        "updated_at": result.get("updated_at"),
    }


@router.get("/load/{gist_id}")
def load_from_gist(gist_id: str, token: str):
    """从 Gist 加载数据"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
    url = f"https://api.github.com/gists/{gist_id}"
    resp = requests.get(url, headers=headers, timeout=15)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])

    result = resp.json()
    files = result.get("files", {})
    file_data = files.get(GIST_FILENAME, {})
    content = file_data.get("content", "{}")
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="gist content not valid JSON")
