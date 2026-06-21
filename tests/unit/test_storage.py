"""
src/storage.py 单元测试
"""
import os
import sys
import tempfile
from pathlib import Path

# 把 src 加到 path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# 用临时 db 覆盖默认
import src.storage as storage  # noqa: E402

_tmp_db = Path(tempfile.gettempdir()) / "moyun_test.db"
storage.DB_PATH = _tmp_db
if _tmp_db.exists():
    _tmp_db.unlink()
storage.init_db()


def test_create_and_list():
    user = "alice"
    p1 = storage.create_project(user, {"title": "测试小说 1", "type": "romance"})
    p2 = storage.create_project(user, {"title": "测试小说 2", "type": "fantasy"})

    projects = storage.list_projects(user)
    assert len(projects) == 2
    titles = {p["title"] for p in projects}
    assert "测试小说 1" in titles
    assert "测试小说 2" in titles


def test_get_project():
    user = "bob"
    p = storage.create_project(user, {"title": "Bob 的小说", "type": "scifi"})
    fetched = storage.get_project(user, p["id"])
    assert fetched is not None
    assert fetched["title"] == "Bob 的小说"
    assert fetched["type"] == "scifi"


def test_get_other_user_project():
    storage.create_project("alice", {"title": "Alice 私密", "type": "romance"})
    fetched = storage.get_project("bob", "nonexistent")
    assert fetched is None


def test_update_project():
    user = "carol"
    p = storage.create_project(user, {"title": "旧标题", "type": "romance"})
    updated = storage.update_project(user, p["id"], {"title": "新标题", "type": "romance", "chapters": [{"title": "第1章", "content": "正文"}]})
    assert updated is not None
    assert updated["title"] == "新标题"
    assert len(updated["chapters"]) == 1


def test_delete_project():
    user = "dave"
    p = storage.create_project(user, {"title": "临时", "type": "romance"})
    assert storage.delete_project(user, p["id"]) is True
    assert storage.get_project(user, p["id"]) is None
    assert storage.delete_project(user, "nonexistent") is False


if __name__ == "__main__":
    test_create_and_list()
    test_get_project()
    test_get_other_user_project()
    test_update_project()
    test_delete_project()
    print("✓ all storage tests passed")
