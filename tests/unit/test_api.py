"""
FastAPI 集成测试：用 TestClient 模拟 HTTP 请求
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi.testclient import TestClient
import src.main as main

# 用 TestClient 但不真起服务
client = TestClient(main.app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_login():
    resp = client.post("/api/auth/login", json={"username": "yyy", "password": "123456"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "yyy"
    assert data["token"] == "yyy"


def test_login_empty_username():
    resp = client.post("/api/auth/login", json={"username": "", "password": "x"})
    assert resp.status_code == 400


def test_projects_crud():
    headers = {"Authorization": "Bearer alice"}

    # list（空）
    resp = client.get("/api/projects", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []

    # create
    resp = client.post(
        "/api/projects",
        json={"title": "集成测试小说", "type": "romance", "chapters": []},
        headers=headers,
    )
    assert resp.status_code == 200
    proj = resp.json()
    assert proj["title"] == "集成测试小说"
    project_id = proj["id"]

    # get
    resp = client.get(f"/api/projects/{project_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "集成测试小说"

    # update
    resp = client.put(
        f"/api/projects/{project_id}",
        json={"title": "改名", "type": "romance", "chapters": [{"title": "c1", "content": "..."}]},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "改名"
    assert len(resp.json()["chapters"]) == 1

    # list（应该有一个）
    resp = client.get("/api/projects", headers=headers)
    assert len(resp.json()) == 1

    # delete
    resp = client.delete(f"/api/projects/{project_id}", headers=headers)
    assert resp.status_code == 200

    # get（应该 404）
    resp = client.get(f"/api/projects/{project_id}", headers=headers)
    assert resp.status_code == 404


def test_projects_no_auth():
    resp = client.get("/api/projects")
    assert resp.status_code == 401


def test_chat_local_mode():
    """local 模式不需要 API key"""
    resp = client.post(
        "/api/llm/chat",
        json={
            "provider": "local",
            "model": "local",
            "messages": [{"role": "user", "content": "hi"}],
            "system_prompt": "你是助手",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "本地模拟" in data["content"]


def test_chat_no_api_key():
    """没传 api key 也没后端 LLM_API_KEY 环境变量 → 400"""
    resp = client.post(
        "/api/llm/chat",
        json={
            "model": "gpt-4",
            "messages": [{"role": "user", "content": "hi"}],
        },
    )
    assert resp.status_code == 400


if __name__ == "__main__":
    test_health()
    test_login()
    test_login_empty_username()
    test_projects_crud()
    test_projects_no_auth()
    test_chat_local_mode()
    test_chat_no_api_key()
    print("✓ all integration tests passed")
