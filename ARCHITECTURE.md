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
├── index.html                # 首页（项目列表）
├── create.html               # 创建页（模板选择/配置）
├── editor.html               # 编辑页（章节撰写）
├── login.html                # 登录页
├── AGENTS.md                 # 仓库规则
├── ARCHITECTURE.md           # 本文档
│
├── app/                      # 前端模块（UMD 命名空间 NovelXxx）
│   ├── common.js             # NovelCommon：auth/storage/settings/theme
│   ├── llm-client.js         # NovelLLMClient：多 provider LLM 客户端
│   ├── autosave.js           # NovelAutosave：自动保存与草稿恢复
│   ├── undo-stack.js         # NovelUndoStack：撤销/重做
│   ├── writing-stats.js      # NovelStats：写作统计（字数/目标/连击）
│   ├── inspiration.js        # NovelInspiration：AI 灵感/讨论
│   ├── exporter.js           # NovelExporter：多格式导出（md/html/txt/json/pdf）
│   └── settings-test.js      # 连接测试与基础 URL 校验
│
├── js/                       # view 层逻辑（按页面拆分）
│   ├── app.js                # 首页
│   ├── create.js             # 创建页
│   ├── editor.js             # 编辑页
│   ├── create-integration.js # 接入 app/ 模块
│   └── editor-integration.js # 接入 app/ 模块
│
├── src/                      # Python 后端（FastAPI）
│   ├── __init__.py
│   ├── main.py               # FastAPI 入口
│   ├── llm.py                # 多 provider LLM 客户端
│   ├── storage.py            # 项目 CRUD（SQLite）
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

> **当前状态**：前端仍走 `js/*.js` + `app/` 模块组合，FastAPI 后端尚未被前端调用。`app/views/` 已合并进 `js/`，不再单独存在。

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
