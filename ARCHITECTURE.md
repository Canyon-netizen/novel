# 墨韵AI 架构设计

> 参考 daily-paper-reader 的模块化做法，对 novel 项目做 SPA + 后端分离重构。

## 设计目标

1. **消除 4 个 JS 文件 60% 重复代码**（auth/settings/theme/storage）
2. **消除 4 个 HTML 重复的 header/footer/settings 弹窗**
3. **API Key 不再明文存 localStorage** — 走后端代理
4. **项目数据可跨设备同步**（后端存储替代 localStorage）

## 目录结构

```
novel/
├── index.html                # 唯一入口（SPA 启动）
├── login.html                # 登录（独立页，因为是入口拦截）
├── AGENTS.md                 # 仓库规则
├── ARCHITECTURE.md           # 本文档
│
├── app/                      # 前端模块（UMD 命名空间 NovelXxx）
│   ├── app.css               # 共享样式
│   ├── common.js             # NovelCommon：auth/storage/settings/theme
│   ├── llm-client.js         # NovelLLMClient：多 provider LLM 客户端
│   ├── gist-share.js         # NovelGistShare：Gist 同步
│   ├── router.js             # NovelRouter：hash router
│   └── views/
│       ├── dashboard.js      # NovelViews.dashboard
│       ├── create-novel.js
│       ├── editor.js
│       └── chat.js
│
├── src/                      # Python 后端（FastAPI）
│   ├── __init__.py
│   ├── main.py               # FastAPI 入口
│   ├── llm.py                # 多 provider LLM 客户端
│   ├── storage.py            # 项目 CRUD（SQLite）
│   ├── auth.py               # 简单账号 / GitHub OAuth
│   └── routes/
│       ├── __init__.py
│       ├── projects.py
│       ├── llm_chat.py       # 代理 LLM（隐藏 API Key）
│       └── gist_sync.py
│
├── tests/
│   ├── unit/
│   └── e2e/
│
└── .github/workflows/
    ├── deploy-pages.yml      # push → 部署
    └── test.yml              # push → E2E
```

## 数据流

### 当前（localStorage）
```
[页面] → fetch(LLM endpoint) ← API Key 存 localStorage
   ↓
[localStorage] ← 存项目/章节/草稿
```

### 改造后（后端）
```
[index.html] → 加载 SPA → NovelRouter 路由
   ↓
[NovelViews.*] → 调用 NovelLLMClient
   ↓                              ↓
[POST /api/llm/chat] ────→ [FastAPI src/routes/llm_chat.py]
                                ↓
                          [src/llm.py] → 调真实 LLM
                          (API Key 存后端 .env，不下发到前端)
```

## 路由表

| 路径 | View | 说明 |
|---|---|---|
| `#/` | dashboard | 主页：项目列表、统计 |
| `#/create` | create-novel | 新建小说向导 |
| `#/editor/:projectId/:chapterId` | editor | 章节编辑 + AI 续写 |
| `#/chat/:projectId` | chat | 与 AI 角色对话 |

## API 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录 |
| GET | `/api/projects` | 列出我的项目 |
| POST | `/api/projects` | 创建项目 |
| GET | `/api/projects/{id}` | 获取项目 |
| PUT | `/api/projects/{id}` | 更新项目 |
| DELETE | `/api/projects/{id}` | 删除项目 |
| POST | `/api/llm/chat` | LLM 对话（隐藏 API Key） |
| POST | `/api/gist/sync` | 同步到 Gist |

## 部署

- **前端**：GitHub Pages（`canyon-netizen.github.io/novel`）
- **后端**：本地开发用 `uvicorn src.main:app --reload`；生产可部署到 Vercel/Railway
- **CI/CD**：`.github/workflows/deploy-pages.yml` push 触发
