# 「一页」设计重塑规范

> 把现有"墨韵AI"改造为一个以"一页"为品牌、纸张感为视觉、Notion/Linear 为产品调性的 AI 写作工具。

## 背景与目标

### 现状（基于 Playwright 端到端试用 + 代码审计）

- 项目名"墨韵AI"，主色饱和蓝紫渐变 + Noto Serif SC，4 个页面（index/create/editor/login）
- CSS 1754 行，201 个 class
- 调色板：纯黑/灰/白 + 8 种饱和强调色（蓝/紫/青/金/粉/红/绿）
- 用户工作流有 4 类问题（详见下"问题陈述"）

### 目标

1. **品牌重塑**：从"墨韵AI"改为"一页"，抛弃所有古典象征
2. **视觉现代化**：现代极简/生产力工具调性，纸张感保留作为唯一文化符号
3. **信息架构优化**：解决试用中发现的 4 类问题
4. **修关键 bug**：试用中发现"填了小说名还报请输入小说名称"

### 范围

仅修改视觉层（CSS token、组件样式、HTML 结构）、1 个工作流 bug（创建按钮校验），以及补全 25 项细节规范。**不动后端、不动数据模型、不动主题切换核心逻辑、不动 AI 集成**。

## 问题陈述（4 类 + 25 项细节）

### P0 - 真 bug
- **B1 创建项目校验误判**：填了小说名后点"开始创作"仍提示"请输入小说名称"。原因待实施时查（怀疑与 formId 输入与 select 校验顺序有关）。

### P1 - 视觉债
- **V1 统计卡 4 色 icon 喧宾夺主**：紫/青/金/粉 4 个饱和色块，像游戏 UI
- **V2 类型 chip 用 emoji icon**：📚⚔️💫📜，不可控、卡通化
- **V3 AI 按钮带 ✨ 图标**：视觉噪音
- **V4 主 CTA 颜色不统一**：亮色模式下"开始创作"按钮是亮蓝紫，与品牌色脱节
- **V5 亮色模式"不到位"**：CSS 写的是 `#F5F5F5` 不是 `#FFFFFF`；加上 4 色 icon/emoji 仍饱和，切换后"感觉没变"
- **V6 亮色 select 显示成白底白字**：select 在亮色模式下选项文字看不见
- **V7 登录页头像压字**："未登录"3 个字被圆形头像压成 2 行

### P2 - 信息架构
- **A1 创建页字段溢出视口**：10+ 字段堆左侧，"篇幅字数"滑块被挤出视口
- **A2 没有"继续上次写作"入口**：登录后总是空 dashboard
- **A3 主页入口按钮位置/颜色不统一**：4 个页面的"主操作"位置/颜色都不一样
- **A4 登录页对"演示模式"过重**：大圆头像 + 大表单 + 关于/说明，可以更轻

### P3 - 不在本次范围
- 后端接入、AI 功能增强、协同编辑、移动端优化、单元测试覆盖
- ARCHITECTURE.md 提到但未实现的 FastAPI 路由
- 真正的账号系统

### 25 项细节遗漏（试用中未列入第一版 spec 的）

#### 设计规范层
- **D1 占位符文案**：所有输入框的 placeholder 字体、颜色、字重
- **D2 动效体系**：hover、active、focus、进入、退出 5 类动效规范
- **D3 焦点态可访问性**：键盘 tab focus 的 outline/ring 规范
- **D4 favicon 暗色适配**：favicon 📄 在暗色背景下的对比度
- **D5 错误状态视觉**：是否要 icon？是否要抖动？是否要 toast 提示？
- **D6 loading 状态**：AI 调用、提交、保存中的视觉反馈
- **D7 键盘快捷键**：编辑器 Ctrl+S、侧栏 Tab 切换等
- **D8 占位文案清理**：页脚"更新了些新BUG, 额...是新功能 ✨"等装饰文案
- **D9 i18n 扩展点**：是否预留多语言扩展（即使现在只有中文）
- **D10 空/错误/加载 3 状态统一**：4 个页面是否都用统一的 3 状态组件

#### 工作流层
- **W1 删除项目无确认 / 无恢复**：3 点菜单删除后无确认，无 undo
- **W2 导出按钮反馈**：项目卡"导出"点击后弹什么？
- **W3 Gist 同步 UI 化**：现在是 settings 里的 token 输入，要不要做更明显的"云端同步"按钮
- **W4 编辑器"返回"按钮**：现在有个"返回"按钮，位置/颜色没规范
- **W5 新用户引导 onboarding**：第一次登录后完全没引导
- **W6 章节重命名入口**：建了之后能不能改标题？UI 上没看到
- **W7 自动保存可见性**：`#saveStatus` 已经修好，但"写入中/已保存"等文案规范
- **W8 登录页"未登录"3 字重写**：压字问题已提，具体怎么改

#### 工程层
- **E1 CSS 重置策略**：是"重写整个 :root"还是"加新 token 块"
- **E2 暗色模式跟随系统**：是否 `prefers-color-scheme`？
- **E3 favicon 主题切换**：暗/亮是否用不同 favicon
- **E4 meta theme-color**：移动端浏览器顶部栏颜色
- **E5 OG image**：分享卡片图（现在没有）

#### 跨页面一致性
- **U1 登录页 header 不一致**：登录页 header 与其他 3 页不同（没 settings/主题/用户菜单）
- **U2 4 页面 header 完全统一**：还是按场景区分（登录极简、有 chrome 时完整）

## 设计决策

### 品牌

- **中文名**：一页
- **Logo**：点阵 + 「一」字主笔的组合（思源黑体）— 详见 Logo 设计
- **英文标识**：不显示
- **favicon**：📄 emoji（保持简单，避免引入额外资源）

### 调色板

#### 亮色（默认）

| Token | 值 | 用途 |
|---|---|---|
| `--bg-primary` | `#F8F6F1` | 页面背景（淡黄纸张） |
| `--bg-secondary` | `#EFE9DD` | 次级背景（卡片底、hover） |
| `--bg-card` | `#FFFFFF` | 内容卡片 |
| `--bg-input` | `#FFFFFF` | 输入框 |
| `--text-primary` | `#1A1815` | 主文字（深暖黑） |
| `--text-secondary` | `#6B6258` | 次文字（暖灰） |
| `--text-muted` | `#9B9388` | 三级文字（更淡的暖灰） |
| `--accent-primary` | `#2F5D62` | 主品牌色（青靛） |
| `--accent-primary-hover` | `#244C50` | hover/active |
| `--accent-soft` | `#E0EBEC` | 选中态底色（淡青靛底） |
| `--border-color` | `#E0D9C8` | 1px hairline（暖灰） |
| `--border-strong` | `#C9C0AB` | 强调边框（焦点态） |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | 极轻阴影 |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.06)` | 浮起 |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.08)` | 模态/弹窗 |
| `--danger` | `#B23A48` | 错误 |
| `--danger-soft` | `#F5E0E3` | 错误底色 |
| `--success` | `#5A7F3D` | 成功（深草绿） |
| `--success-soft` | `#E8F0DD` | 成功底色 |

#### 暗色

| Token | 值 | 用途 |
|---|---|---|
| `--bg-primary` | `#1A1815` | 页面背景（深暖灰） |
| `--bg-secondary` | `#221F1B` | 次级背景 |
| `--bg-card` | `#2A2722` | 内容卡片 |
| `--bg-input` | `#1F1C18` | 输入框 |
| `--text-primary` | `#F0EDE5` | 主文字（暖白） |
| `--text-secondary` | `#B0A89E` | 次文字 |
| `--text-muted` | `#7A7167` | 三级文字 |
| `--accent-primary` | `#5A8C92` | 主品牌色（亮青靛） |
| `--accent-primary-hover` | `#6FA0A6` | hover/active |
| `--accent-soft` | `#2F3A3B` | 选中态底色（深青靛） |
| `--border-color` | `#3A3530` | 1px hairline |
| `--border-strong` | `#4F4840` | 强调边框 |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | 极轻阴影 |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | 浮起 |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | 模态/弹窗 |
| `--danger` | `#D86A75` | 错误（亮一些） |
| `--danger-soft` | `#3A282B` | 错误底色 |
| `--success` | `#8FAE6E` | 成功 |
| `--success-soft` | `#2B3325` | 成功底色 |

### 字体

- **UI 字体**（标题、按钮、表单、统计、菜单）：`Noto Sans SC`（思源黑体） + `Inter`（英文/数字）
- **阅读区字体**（章节正文、模板描述、AI 续写结果）：`Noto Serif SC`（思源宋体） + `Source Serif Pro`（英文）
- 加载方式：在 `index.html`/`create.html`/`editor.html`/`login.html` 的 `<head>` 引入 Google Fonts CSS，保留现有 Noto Serif SC，新增 Noto Sans SC + Inter
- 应用规则：body 用 Noto Sans SC；`.reading-area`、`.chapter-content`、`.template-desc`、`.toast-body`、`.ai-reply` 单独用 Noto Serif SC

### 几何

- **圆角**：`6px` / `10px` / `14px` 三档。**去掉** `16px+` 大圆角
- **边框**：所有边框都用 `1px solid var(--border-color)` 的 hairline。**去掉** 2px 装饰边框
- **阴影**：默认无阴影。**只**给模态/弹窗/popover 用 shadow-sm/md/lg
- **间距网格**：4px 基础 — 4 / 8 / 12 / 16 / 24 / 32 / 48
- **行高**：UI 文本 1.5，阅读文本 1.75
- **字符宽度**：UI 用 `tabular-nums`（Inter 字体特性）

### Logo 设计

- 形式：纯文字 + 字符化点阵
- 实现：CSS 拼装，不引入 SVG 文件
- 组成：
  - 文字「一页」：思源黑体，字重 600，字号 `1.25rem`
  - 左侧 3×3 点阵：用 `::before` 伪元素，9 个 2px×2px 圆点，方阵布局，间距 3px
  - 颜色：点阵用 `--accent-primary`；文字用 `--text-primary`
- 出现在所有页面的 header 左侧

### 组件

#### 按钮

- **主 CTA（primary）**：青靛实色背景（`var(--accent-primary)`），白字，圆角 10px
- **次要（secondary）**：白底/暗底 + 1px 边框，hover 加 `--bg-secondary`
- **文字（tertiary）**：无边框无背景，hover 浅底
- **危险（danger）**：错误实色背景
- **禁用（disabled）**：50% 透明度 + cursor not-allowed
- **尺寸**：sm 28px / md 36px / lg 44px 三档
- **所有按钮去掉 emoji** ✨ / 改用 SVG 文字图标或纯文字

#### 卡片

- 白底/暗底 + 1px 边框，圆角 14px，padding 24px
- 默认无阴影，hover 时加 shadow-sm + 微平移 (`translateY(-1px)`)
- 卡片标题：思源黑体 600 1rem
- 卡片内容：思源黑体 400 0.9rem

#### 输入框

- 1px 边框，圆角 8px，padding 10px 14px
- focus：边框变 `--border-strong` (青靛)
- 错误：边框变 `--danger` + 下方红字

#### 模态弹窗

- 圆角 14px，padding 24px
- 背景：白/暗卡片色，shadow-lg
- backdrop：半透明黑（`rgba(0,0,0,0.4)`）+ 8px blur

#### Toast

- 右上角浮卡，1px 边框，shadow-md，圆角 10px
- 3 秒后淡出
- 类型：success（绿）/ error（红）/ warning（金）/ info（青靛）

#### 标签（chip）

- 圆角 6px，padding 2px 8px
- 默认样式：白底/暗底 + 1px 边框 + `--text-secondary` 文字
- 选中样式：`--accent-soft` 底色 + `--accent-primary` 文字 + 边框同色
- **去掉** emoji 前缀

#### 头像

- 圆形 32px，思源黑体 600 字号 0.85rem
- 文字取自用户名的首字（中文取首字，英文大写首字母）

### 动效（D2）

- **hover**：背景/边框/阴影变化，150ms ease-out
- **active**：scale(0.98) + 颜色加深，80ms ease-in
- **focus**：border 变 `--border-strong` + 0 0 0 3px `--accent-soft` ring，0ms（即时）
- **进入（页面 / 模态）**：opacity 0→1 + translateY(4px)→0，200ms ease-out
- **退出（toast / 模态）**：opacity 1→0 + translateY(0)→-4px，150ms ease-in
- **侧栏折叠展开**：width 200ms ease-in-out
- **所有动效遵守 `prefers-reduced-motion: reduce`**：直接 transition: none

### 焦点态可访问性（D3）

- 所有可交互元素：`:focus-visible` 时显示 3px ring（`--accent-soft` 色）
- 颜色对比度满足 WCAG AA：主文字对比度 ≥ 7:1，次文字 ≥ 4.5:1
- 链接/按钮加 `aria-label` 当文字不可见时

### Loading 状态（D6）

- **按钮 loading**：禁用 + 文案变 "处理中..." + 右侧 14px 旋转 spinner
- **页面级 loading**：顶部 2px 进度条（青靛色，从左到右 800ms）
- **AI 调用中**：按钮禁用 + 显示 inline spinner + 文字 "AI 思考中..."
- **保存中（自动保存）**：`#saveStatus` 显示 "保存中..."
- **spinner 实现**：CSS `@keyframes` 旋转 14px 圆环，`border: 2px solid var(--bg-secondary); border-top-color: var(--accent-primary);`

### 错误状态视觉（D5）

- **表单字段错误**：边框 `--danger` + 下方 12px 红字（"请输入小说名称"），无 icon
- **toast 错误**：右上角浮卡，红边框 + 红 icon 圆圈 + 文字
- **页面级错误**：模态弹窗，全宽，红色 header
- **不抖动**：避免分散注意力

### favicon 暗色适配（D4）

- 亮色模式：📄（深色 emoji）
- 暗色模式：📄 自动（多数系统 emoji 跟随主题）
- 实施：在 `<head>` 加 `<meta name="theme-color" content="#F8F6F1">`（亮）和 `<meta name="theme-color" content="#1A1815">`（暗）由 JS 切换

### 占位符文案（D1）

- 字体：Noto Sans SC 400 0.95rem
- 颜色：`--text-muted`
- 字重：normal
- 示例：
  - 小说名称 → "给你的故事起个名字"
  - 主角名称 → "主角是谁？（可留空）"
  - 创作方向 → "用一句话描述你心中的故事"
  - 搜索框 → "搜索项目..."
  - 账号 → "任意账号"
  - 密码 → "任意密码"

### 键盘快捷键（D7）

- `Ctrl/Cmd + S`：保存（编辑器）
- `Ctrl/Cmd + Enter`：AI 续写（编辑器）
- `Ctrl/Cmd + K`：打开搜索（首页）
- `Tab / Shift+Tab`：可访问性 tab 切换
- `Esc`：关闭模态 / toast
- 帮助：长按 `?` 显示快捷键面板

### 占位文案清理（D8）

- 删除页脚"更新了些新BUG, 额...是新功能 ✨"
- 删除空状态多余引导
- 删除装饰性 emoji

### i18n 扩展点（D9）

- 现在不做，但预留：
  - HTML 加 `lang="zh-CN"`
  - 文案放在 `<span data-i18n="key">` 形式（**仅占位**，不实现）
  - 实施时决定是否要 i18n 库

### 空/错误/加载 3 状态统一（D10）

新建 3 个通用组件：
- `.empty-state`：居中、icon（无 emoji）、标题、描述、CTA
- `.error-state`：居中、红边、标题、描述、重试按钮
- `.loading-state`：居中、spinner、文字

### 删除项目（W1）

- 3 点菜单点击"删除" → 弹模态确认（二次确认）
- 文案："确认删除「xxx」？删除后无法恢复。"
- 按钮：取消 + 危险实色"确认删除"
- 删除后 toast："已删除「xxx」"（**无 undo**，符合 spec 范围）

### 导出按钮（W2）

- 项目卡"导出"按钮 → 弹下拉：Markdown / HTML / 纯文本 / JSON / PDF
- 下拉用标准 select 替代文字按钮
- 选中后立即触发下载，toast 反馈

### Gist 同步 UI（W3）

- 在设置弹窗加"云端同步"分区
- 现有 GitHub Token 输入 + 立即同步按钮 + 上次同步时间显示
- 不做大改，保持现有功能

### 编辑器"返回"按钮（W4）

- 位置：header 右侧用户菜单前
- 样式：tertiary 按钮，文字"返回首页"
- 不带箭头 icon

### 新用户引导（W5）

- 不做复杂的 onboarding tour
- 第一次登录后首页：明显的"开始创作" CTA + 一行小字提示"从选一个模板开始，或直接新建"
- 第二次登录后引导消失

### 章节重命名（W6）

- 在章节列表项上 hover 时显示小铅笔 icon
- 点击 → inline edit 模式（输入框替换文字）
- 失焦或按 Enter 保存

### 自动保存可见性（W7）

- 文案规范：
  - 写入中 → "保存中..."
  - 已保存 → "已保存 · 12:34:56"（带时间）
  - 保存失败 → "保存失败，点击重试"（红色，clickable）
- 位置：编辑器 header 工具栏右侧

### 登录页"未登录"3 字（W8）

- 头像不再显示文字
- 改为默认头像 SVG：圆形 + 中央 "?" 字符（思源黑体）
- 用户名首次登录后填入

### CSS 重置策略（E1）

- **不**完全重写 :root
- 在 `:root` 上**新增**所有新 token（覆盖旧值）
- 保留旧 token 作为 `--legacy-*` 备份
- 组件样式**只**用新 token，不引用 `--legacy-*`
- 旧组件类（如 `.btn-primary`）**改用**新 token 变量
- 验证：所有页面跑通后删除 `--legacy-*`

### 暗色模式跟随系统（E2）

- 默认值：`localStorage.getItem('moyun_theme') || 'light'`
- **不**跟随系统（保持手动控制，符合极简产品定位）
- 不实现 `prefers-color-scheme` 检测

### favicon 主题切换（E3）

- 单一 📄 emoji favicon，靠系统自适应
- 不做主题相关切换

### meta theme-color（E4）

- 在所有 4 个页面的 `<head>` 加：
  ```html
  <meta name="theme-color" content="#F8F6F1" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#1A1815" media="(prefers-color-scheme: dark)">
  ```
- 移动端浏览器顶部栏跟随系统主题

### OG image（E5）

- 不实施（spec 范围外）
- 留 TODO 注释在 README

### 登录页 header 一致性（U1 / U2）

- **登录页**：极简 header
  - 左侧：仅 Logo（点阵 + 一页）
  - 右侧：空
  - 高度 48px（比其他页面矮 8px）
  - 无 1px 底边线
- **其他 3 页**：完整 header
  - 左侧：Logo
  - 右侧：返回（仅编辑器）/ 设置 / 主题切换 / 用户头像
  - 高度 56px
  - 1px 底 hairline + blur

### 页面级

#### Header（4 个页面通用）

- 高度：48px（登录页）/ 56px（其他）
- 背景：白/暗卡片色 + 1px 底部 hairline + `backdrop-filter: blur(8px)` 半透明
- 左侧：Logo（点阵 + 一页）
- 右侧：返回（仅编辑器）/ 设置 / 主题切换 / 用户头像
- 主题切换：文字按钮 `[暗] [亮]`

#### index.html（首页）

- 顶部 welcome banner：删除"晚上好，yyy"大 banner，改为 16px 高的轻量条
- 统计卡：4 个统计横向排列，icon 改成单色 hairline SVG（不用 4 色 emoji 色块）
- 项目网格：3 列（≥1280px）/ 2 列（≥768px）/ 1 列（<768px）
- "我的小说"标题：思源黑体 600 1.25rem
- 搜索/筛选/排序：合并为一个"工具条"横排
- 空状态：用文字 + 轻量引导
- "最近写作"区块：3 张最近编辑的项目卡（顶部，紧跟 welcome 条）

#### create.html（创建页）

- 布局改为**单列从上到下**，不再左右分栏
- 顶部：4 个 tab 横排（构建 / 导入 / 探讨 / 我的）
- 主区：表单字段（最简化版）
- 底部："开始创作"按钮在内容底部，不是固定底栏
- 字段间距 24px，最大宽度 720px 居中

#### editor.html（编辑页）

- 顶部工具栏：保存状态、AI 状态、字数统计（同一行，右对齐）
- 中间：思源宋体的章节正文区
- 底部工具栏：续写 / 润色 / 建议（横向，无 icon）
- 左侧 4 tab 侧栏保留，默认折叠为 56px 宽只显示 icon，hover 展开为 240px
- 模板卡：用 1px 边框 + 轻量 hover，**去掉** emoji icon，用文字标签

#### login.html（登录页）

- 简化表单：单列，去掉大圆头像
- 标题："欢迎回来" + 副标"登录一页，继续创作"
- 账号/密码两个输入框
- 登录按钮
- 底部 1 行小字提示："演示模式：任意账号密码均可登录"
- **去掉** 关于/说明 链接
- 头像改为：默认 SVG "?" 占位（首次登录前）

### 信息架构改动（与视觉同步）

#### A1 修复：创建页字段溢出

把"构建配置"从**左右分栏**改为**单列从上到下**布局：

```
[顶部 tab: 构建/导入/探讨/我的]
─────────────────────
[小说名称 *]
[主角名称（可选）]
[创作方向（可选）]
[小说类型]  ← 横向 chip 排列
[叙事套路]  ← 横向 chip 排列
[受众定位]
[篇幅字数]  ← 滑块
[情节结构]
─────────────────────
[取消]                    [开始创作]
```

- 字段从上到下排列，最大宽度 720px 居中
- 1440×900 视口下不需要滚动即可看到所有字段和按钮

#### A2 增加：继续上次写作入口

首页增加"最近写作"区块：3 张最近编辑的项目卡（紧跟 welcome 条之下）。

#### A3 统一：4 个页面 CTA 风格

所有页面的主操作按钮统一为：
- 颜色：`--accent-primary`（青靛）
- 字号：0.95rem
- 高度：44px（lg）
- 圆角：10px

#### B1 修复：创建项目校验误判

实施时定位修复（具体在 js/create.js 的 createNovel 流程）。

### 主题切换 UI

- 不用 select 控件
- 改用文字按钮：右侧 header 放 `[暗] [亮]` 两个文字按钮
- 当前主题按钮高亮（`--accent-soft` 底色）
- 切换瞬间 150ms ease 过渡

## 实施细节

### 文件改动

| 文件 | 改动 |
|---|---|
| `css/style.css` | 全面重写 token；定义 3 状态组件；定义动效；保留 legacy 备份 |
| `index.html` | 替换品牌名；移除渐变；增加"最近写作"；改 header；占位符 |
| `create.html` | 单列布局；移除 emoji；改 header；占位符 |
| `editor.html` | 改 header；模板卡去 emoji；侧栏折叠；占位符；章节重命名 |
| `login.html` | 简化表单；改 header；默认头像；占位符 |
| `js/app.js` | 主题切换按钮；删除确认；导出下拉；最近写作；3 状态组件 |
| `js/create.js` | 修 B1；占位符；单列布局；新建引导 |
| `js/editor.js` | 主题切换按钮；侧栏折叠；自动保存文案；快捷键；loading |
| `app/common.js` | 3 状态组件 API；删除确认 API；快捷键 API |
| `index.html` 等 head | 加 `<meta name="theme-color">` 和 OG/Twitter card（可选） |

### 实施顺序

1. **token 层**：先在 css/style.css 顶部定义新 token，保留旧 token 作为 `--legacy-*` 1 周
2. **动效 + 3 状态 + 通用类**：定义在 css/style.css 顶部
3. **组件层**：按钮、输入框、卡片、模态、Toast、chip 全部按新 token 重写
4. **页面层**：4 个页面按新组件重排
5. **修 B1 bug**：定位校验逻辑
6. **主题切换 UI**：从 select 改为按钮
7. **细节（D / W / E / U）**：占位符、loading、3 状态、空状态、文案、快捷键等
8. **测试**：用 Playwright 跑全流程，截图对比

### 不在范围

- 后端 API 接入（ARCHITECTURE.md 提到的 FastAPI 路由）
- 真正的账号系统
- 协同编辑 / 实时同步
- 移动端深度优化（响应式断点保留，但布局重点是桌面 ≥1280px）
- 单元测试覆盖
- 国际化（仅预留扩展点）
- OG image（留 TODO）

## 验收标准

1. **视觉**：用 Playwright 跑全流程，截图对比新旧版。新版必须：
   - 4 个页面统一用「一页」品牌
   - 没有任何 emoji icon（除 favicon）
   - 4 个统计卡用统一单色 SVG icon
   - 亮色模式切换前后差异明显（背景 `#F8F6F1`，icon 单色）
   - 主 CTA 颜色统一为青靛
   - 登录页头像是 "?" 占位，不是文字
2. **工作流**：填了小说名 + 主角 + 方向 + 选了类型后，**能成功创建项目**（修 B1 bug）
3. **创建页字段**：在 1440×900 视口下，所有字段在初始滚动前可见，"开始创作"按钮在主区底部
4. **主题切换**：从暗切到亮时 select 文字不再变白
5. **动效**：所有 hover/active/focus/进入/退出 动效符合规范
6. **3 状态**：4 个页面都用统一的 empty/error/loading 组件
7. **loading**：AI 调用时有可见 spinner 和"AI 思考中..."文案
8. **快捷键**：编辑器 Ctrl+S 保存、Ctrl+Enter 续写、Esc 关闭模态都工作
9. **删除确认**：删除项目有二次确认模态
10. **favicon + theme-color**：浏览器顶部栏颜色跟随主题
11. **CSS 体积**：≤2000 行
12. **回归**：所有现有功能（创建、编辑、AI 调用、导出、登录、登出、Gist 同步、章节增删改、角色增删改、世界观、时间线）继续工作
13. **a11y**：键盘 tab 可访问，焦点环可见，对比度 WCAG AA

## 风险与回滚

- **风险 1**：CSS 改动可能误伤现有逻辑。回滚方案：保留旧 token 作为 `--legacy-*` 备份
- **风险 2**：HTML 结构改动可能让 JS 找不到元素。回滚方案：分步 commit，每步后跑 Playwright 验证
- **风险 3**：B1 bug 修法不对。回滚方案：在实施时先看 git history 找正确修法
- **风险 4**：动效影响性能。回滚方案：遵守 `prefers-reduced-motion: reduce`
- **风险 5**：快捷键与浏览器/系统快捷键冲突。回滚方案：仅在编辑器内绑定

## 开放问题

- **O1**：章节侧栏的折叠默认是"只 icon（56px）"还是"完全展开"？设计采用前者，但需用户确认
- **O2**：「最近写作」区块在没项目时如何呈现？采用与"我的小说"相同的空状态文字
- **O3**：登录页是否要保留"上传头像"功能？设计采用否（演示模式不需要）
- **O4**：首页"我的小说"标题要不要改成"项目"？设计保留"我的小说"
- **O5**：章节重命名要不要做 inline edit？设计采用
- **O6**：删除项目要不要支持 undo？设计采用**不支持**（YAGNI）

## 后续可做（不在本次范围）

- B1 修法的具体定位（实施时再查）
- 移动端 ≥768px 视口的断点设计
- 章节编辑器富文本（现在只是 textarea）
- 模板市场的"我的模板"管理界面
- 移动端 app 化（PWA）
- 真正的账号系统 + 后端
- 国际化（i18n）
- OG image 分享卡片
- 协同编辑 / 实时同步
