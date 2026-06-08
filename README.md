# 墨韵AI - 智能小说创作平台

> 重构版（参考 daily-paper-reader 的模块化做法）：单页 + FastAPI 后端 + 公共模块

## 功能特点

- 题材类型选择：8 种小说题材，每种配备专属 AI 提示词
- 主题 / 世界观 / 大纲管理
- AI 续写 / 润色 / 建议（多 provider 支持）
- 数据持久化（后端 SQLite）
- GitHub Gist 同步（备用）

## 目录结构

```
novel/
├── index.html              # 唯一入口（轻量 wrapper）
├── login.html              # 登录页
├── AGENTS.md               # 仓库规则
├── ARCHITECTURE.md         # 架构设计
│
├── app/                    # 前端模块（UMD 命名空间 NovelXxx）
│   ├── common.js           # NovelCommon：auth/storage/settings/theme/utils
│   ├── llm-client.js       # NovelLLMClient：多 provider LLM 客户端
│   └── views/              # 后续可拆 dashboard/editor/create/chat
│
├── css/
│   └── style.css
│
├── js/                     # 旧版 view（逐步迁移到 app/views/）
│   ├── app.js
│   ├── editor.js
│   ├── create.js
│   └── chat.discussion.js
│
├── server.py               # 旧 Flask 后端（已废弃，新代码用 src/）
│
├── src/                    # 新 FastAPI 后端
│   ├── main.py             # FastAPI 入口
│   ├── llm.py              # 多 provider LLM 客户端
│   ├── storage.py          # SQLite 项目存储
│   └── routes/
│       ├── auth.py         # 登录
│       ├── projects.py     # 项目 CRUD
│       ├── llm_chat.py     # LLM 代理
│       └── gist_sync.py    # Gist 同步
│
├── tests/
│   └── unit/               # 16 个测试（pytest + TestClient）
│
└── .github/workflows/
    ├── deploy-pages.yml    # 部署到 GitHub Pages
    └── test.yml            # push 触发 E2E
```

## 运行方式

### 纯前端模式（推荐，部署到 GitHub Pages）

直接打开 `index.html`：
- 数据存 localStorage
- LLM 调用户配置的 provider
- 旧 Flask server.py 不会部署

### 全栈模式（后端 SQLite + LLM 代理）

```bash
# 安装依赖
pip install -r requirements.txt

# 启动 FastAPI
uvicorn src.main:app --reload --port 8000

# 前端调用时把 endpoint 改成 http://localhost:8000
```

## API 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| GET  | /api/health | 健康检查 |
| POST | /api/auth/login | 登录（演示模式任意账号） |
| GET  | /api/projects | 列出我的项目 |
| POST | /api/projects | 创建项目 |
| GET  | /api/projects/{id} | 获取项目 |
| PUT  | /api/projects/{id} | 更新项目 |
| DELETE | /api/projects/{id} | 删除项目 |
| POST | /api/llm/chat | LLM 对话（API Key 优先用后端 LLM_API_KEY） |
| POST | /api/gist/sync | 同步到 Gist |
| GET  | /api/gist/load/{id}?token= | 从 Gist 加载 |

## 测试

```bash
pytest tests/unit -v
```

## 部署

- **前端**：GitHub Pages（`.github/workflows/deploy-pages.yml`）
- **后端**：本地或 Vercel/Railway

## 演进路线

- [x] 抽 `app/llm-client.js`（4 处 LLM 重复）
- [x] 抽 `app/common.js`（auth/storage/settings/theme）
- [x] FastAPI 后端 + SQLite 存储
- [x] LLM 代理（API Key 不下发前端）
- [x] 单元 + 集成测试
- [x] GitHub Actions 部署
- [ ] 4 个 view JS 改用 NovelCommon / NovelLLMClient（逐步迁移）
- [ ] 单页 + hash router
- [ ] 真实认证（GitHub OAuth）
