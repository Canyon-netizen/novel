# 一页 - 智能小说创作平台

> 智能小说创作平台，支持多种题材、模板市场、AI写作助手、数据同步

## 设计语言

- **品牌**：一页（点阵 + 思源黑体）
- **配色**：淡黄纸张 `#F8F6F1`（亮）/ 深暖灰 `#1A1815`（暗）+ 青靛 `#2F5D62` 强调色
- **字体**：UI 用思源黑体 + Inter；阅读区用思源宋体 + Source Serif Pro
- **细节规范**：[docs/superpowers/specs/2026-06-22-yipye-redesign-design.md](docs/superpowers/specs/2026-06-22-yipye-redesign-design.md)

## 功能特点

### 小说类型支持
支持 **12种** 小说类型：言情、玄幻、仙侠、悬疑、科幻、武侠、都市、历史、恐怖、游戏、末世。每种类型配备专属的AI提示词系统。

### 预设模板市场
- 12个精心设计的预设模板
- 涵盖男频/女频各类题材
- 支持自定义模板保存和管理
- 模板包含：叙事套路标签、境界设定、势力分布等

### 创作配置
- **小说基本信息**：名称、主角、创作方向
- **类型选择**：点击即可快速配置
- **叙事套路**：系统流、升级流、重生、穿越等15种套路标签
- **受众定位**：男频/女频、青年向/青少年
- **篇幅字数**：滑块调节 + 预设快捷按钮
- **情节结构**：线性、环形、倒叙、多线、网状

### AI写作助手
- **AI续写**：根据当前内容续写150-300字
- **AI润色**：优化文字表达，提升文笔
- **AI建议**：提供写作改进建议
- **AI命名**：智能生成小说名/角色名

### 多API支持
- Anthropic (Claude)
- OpenAI (GPT)
- DeepSeek
- MiniMax
- Kimi (Moonshot)
- GLM (智谱)
- 自定义API
- 本地模拟（无需API Key）

### 数据同步
- LocalStorage本地持久化
- GitHub Gist云端同步（可选）

### 其他功能
- 自动保存到本地Storage
- 导出为Markdown格式
- 亮色/暗色主题切换
- 响应式设计（支持手机、平板）
- 字数统计
- 搜索和筛选功能
- 网格/列表视图切换

## 技术架构

```
novel/
├── index.html              # 首页（项目列表）
├── create.html             # 创建页（模板选择/配置）
├── editor.html             # 编辑页（章节撰写）
├── login.html              # 登录页
│
├── app/                    # 前端模块（UMD 命名空间 NovelXxx）
│   ├── common.js           # NovelCommon：auth/storage/settings/theme/utils
│   ├── llm-client.js       # NovelLLMClient：多 provider LLM 客户端
│   └── autosave.js         # 自动保存
│
├── css/
│   └── style.css
│
├── js/                     # view 层逻辑
│   ├── app.js              # 首页逻辑
│   ├── editor.js           # 编辑页逻辑
│   └── create.js           # 创建页逻辑
│
├── src/                    # FastAPI 后端
│   ├── main.py             # FastAPI 入口
│   ├── llm.py              # 多 provider LLM 客户端
│   ├── storage.py          # SQLite 项目存储
│   └── routes/             # API 路由
│
├── tests/                  # 测试
│
└── .github/workflows/      # CI/CD
```

## 运行方式

### 纯前端模式（推荐，部署到 GitHub Pages）

直接打开 `index.html`：
- 数据存 localStorage
- LLM 调用户配置的 provider

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
| POST | /api/llm/chat | LLM 对话 |
| POST | /api/gist/sync | 同步到 Gist |
| GET  | /api/gist/load/{id}?token= | 从 Gist 加载 |

## 主题专属提示词系统

| 题材 | 核心特点 |
|------|----------|
| 言情 | 情感细腻描写、人物心理刻画 |
| 玄幻 | 世界观构建、魔法体系、修炼等级 |
| 仙侠 | 修仙之路、仙魔之争、意境飘逸 |
| 悬疑 | 悬念铺设、线索埋设、逻辑推理 |
| 科幻 | 科技设定、逻辑自洽、未来推演 |
| 武侠 | 江湖规矩、武功招式、侠义精神 |
| 都市 | 现代生活、人际关系、社会现实 |
| 历史 | 时代还原、历史细节、人物风貌 |
| 恐怖 | 氛围营造、心理恐惧、留白技巧 |
| 游戏 | 副本冒险、技能体系、代入感强 |
| 末世 | 生存挣扎、人性刻画、废土世界 |

## 快速开始

1. 打开 `index.html`
2. 点击「新建小说」开始创作
3. 选择或配置小说类型和套路
4. 从模板市场选择参考
5. 开始章节撰写
6. 使用AI辅助续写/润色

## 测试

```bash
pytest tests/unit -v
```

## 部署

- **前端**：GitHub Pages（`.github/workflows/deploy-pages.yml`）
- **后端**：本地或 Vercel/Railway

## 许可证

MIT License
