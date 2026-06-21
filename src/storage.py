"""
项目存储（SQLite）
"""
import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).parent.parent / "data" / "novel.db"


def _get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """初始化表结构"""
    with _get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                type TEXT,
                description TEXT,
                content TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)")


def list_projects(user_id: str) -> List[Dict[str, Any]]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        ).fetchall()
        return [_row_to_project(r) for r in rows]


def get_project(user_id: str, project_id: str) -> Optional[Dict[str, Any]]:
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM projects WHERE user_id = ? AND id = ?",
            (user_id, project_id),
        ).fetchone()
        return _row_to_project(row) if row else None


def create_project(user_id: str, project: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat() + "Z"
    new_id = project.get("id") or str(uuid.uuid4())
    with _get_conn() as conn:
        conn.execute(
            """
            INSERT INTO projects (id, user_id, title, type, description, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                new_id,
                user_id,
                project.get("title", "未命名"),
                project.get("type", "romance"),
                project.get("description", ""),
                json.dumps(project.get("chapters", []), ensure_ascii=False),
                now,
                now,
            ),
        )
    return get_project(user_id, new_id)


def update_project(user_id: str, project_id: str, project: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat() + "Z"
    with _get_conn() as conn:
        cursor = conn.execute(
            """
            UPDATE projects
            SET title=?, type=?, description=?, content=?, updated_at=?
            WHERE user_id=? AND id=?
            """,
            (
                project.get("title", "未命名"),
                project.get("type", "romance"),
                project.get("description", ""),
                json.dumps(project.get("chapters", []), ensure_ascii=False),
                now,
                user_id,
                project_id,
            ),
        )
        if cursor.rowcount == 0:
            return None  # type: ignore[return-value]
    return get_project(user_id, project_id)  # type: ignore[return-value]


def delete_project(user_id: str, project_id: str) -> bool:
    with _get_conn() as conn:
        cursor = conn.execute(
            "DELETE FROM projects WHERE user_id=? AND id=?",
            (user_id, project_id),
        )
        return cursor.rowcount > 0


def _row_to_project(row: sqlite3.Row) -> Dict[str, Any]:
    chapters = []
    try:
        chapters = json.loads(row["content"] or "[]")
    except (json.JSONDecodeError, TypeError):
        chapters = []
    return {
        "id": row["id"],
        "title": row["title"],
        "type": row["type"],
        "description": row["description"],
        "chapters": chapters,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }
