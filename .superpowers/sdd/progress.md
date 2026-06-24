# SDD Progress Ledger — 一页 Redesign

> 按 spec 25 项细节 (D1-D10 / W1-W8 / E1-E5 / U1-U2) 组织, 不再按 plan Task 1-10 组织。
> 状态枚举: complete = 真实现 / partial = 部分实现 / deferred = plan 主动推迟 / n/a = spec 范围外。
> 2026-06-25 retro 重构: 之前按 Task 组织的 ledger 把 "plan 主动推迟" 的 7 项标成 complete, 现按 spec 25 项逐项核对。

## 设计规范层 (D1-D10)

| ID | 名称 | 状态 | 实施 commit | 备注 |
|---|---|---|---|---|
| D1 | 占位符文案 | complete | 0671875 / 19c8554 / 0b9f2c0 | placeholder 字体/颜色/字重规范 + 6 个示例输入框 |
| D2 | 动效体系 | complete | b0fd5a9 / `css/motion.css` | hover/active/focus/进入/退出 5 类, 遵守 prefers-reduced-motion |
| D3 | 焦点态可访问性 | complete | 398d949 | :focus-visible 3px ring + WCAG AA |
| D4 | favicon 暗色适配 | deferred | — | spec: 不实施 (留 README TODO). 见 plan self-review |
| D5 | 错误状态视觉 | complete | b0fd5a9 + 19c8554 | 边框 danger + 红字, 不抖动 |
| D6 | loading 状态 | complete | b0fd5a9 (spinner) + `editor.js` (按钮文案) | CSS spinner + "AI 思考中..." |
| D7 | 键盘快捷键 | complete | ac76daf (shortcuts.js) | Ctrl+S / Ctrl+Enter / Esc 已绑 |
| D8 | 占位文案清理 | complete | 0671875 | 删除 "更新了些新BUG..." 等装饰 |
| D9 | i18n 扩展点 | deferred | — | spec: 不实施 (仅 `lang="zh-CN"`, 无 data-i18n hook) |
| D10 | 空/错误/加载 3 状态统一 | complete | ac76daf (states.js) | `.novel-state--{empty,error,loading}` |

## 工作流层 (W1-W8)

| ID | 名称 | 状态 | 实施 commit | 备注 |
|---|---|---|---|---|
| W1 | 删除项目无确认 / 无恢复 | complete | 0b9f2c0 + 1557b2d | confirm() 二次确认 + 无 undo (符合 spec O6) |
| W2 | 导出按钮反馈 | complete (retro) | `0664d8b` | 接 NovelExporter.exportAs, 5 格式 dropdown |
| W3 | Gist 同步 UI 化 | deferred | — | plan self-review: spec 标 "不大改", 保留 settings modal |
| W4 | 编辑器"返回"按钮 | complete | 398d949 | header `.header-back-btn`, tertiary 样式 |
| W5 | 新用户引导 onboarding | complete | 0671875 (隐性) | spec 要求 "不复杂的 tour", 首页 "开始创作" CTA + 引导文字 |
| W6 | 章节重命名入口 | deferred | — | spec 开放问题, plan self-review 跳过, retro 评估 ROI 2/5 不补 |
| W7 | 自动保存可见性 | complete (retro) | `a1e8e02` | "已保存 · HH:MM:SS" 带时间戳 |
| W8 | 登录页"未登录" 3 字 | complete | 0b9f2c0 | 头像改 "?" SVG 占位 |

## 工程层 (E1-E5)

| ID | 名称 | 状态 | 实施 commit | 备注 |
|---|---|---|---|---|
| E1 | CSS 重置策略 | complete | b0fd5a9 + b0ccced | 保留 legacy 1 周, b0ccced 删除后 grep 验证 0 引用 |
| E2 | 暗色模式跟随系统 | complete | 398d949 | 手动控制, 不实现 prefers-color-scheme (符合 spec) |
| E3 | favicon 主题切换 | deferred | — | spec: 不实施, 单一 📄 |
| E4 | meta theme-color | complete | 0b9f2c0 (4 个 HTML head) | 亮/暗各一, media query |
| E5 | OG image | deferred | — | spec: 不实施 (README TODO) |

## 跨页面一致性 (U1-U2)

| ID | 名称 | 状态 | 实施 commit | 备注 |
|---|---|---|---|---|
| U1 | 登录页 header 不一致 | complete | 398d949 | `.page-header--minimal` 48px, 仅 Logo |
| U2 | 4 页面 header 完全统一 | complete | 398d949 | 主页面 56px + hairline + blur, 登录极简 |

## Spec drift (不在 25 项内, 单独记录)

| 开放问题 | spec 决策 | 代码实际 | commit | 状态 |
|---|---|---|---|---|
| O1 侧栏默认折叠 vs 展开 | spec: 默认 56px 只显示 icon, hover 展开 240px (spec:429) | 实际: `.chapter-sidebar { width: 280px }` 默认展开, 无折叠交互 | `af55dbf` (always-open sidebar) | **drift — spec 未修订, 代码走了 always-open**. 留待未来一次 spec 修订统一处理, 本次 retro 不动 spec 原文 |

## Spec 范围外 (n/a, 仅记录)

- 后端 API (FastAPI), 真实账号系统, 协同编辑, 移动端深度优化, 单元测试覆盖
- i18n 真正实现 (D9 只留 lang 属性)
- OG image (E5)
- favicon 主题切换 (E3)

## Retro 关联

- Plan retro 段: `docs/superpowers/plans/2026-06-22-yipye-redesign.md` 末尾 `## Retro (2026-06-25)` (含 9 commit 序列 `5cbdcc4` / `2de24fb` / `a1e8e02` / `0664d8b` / `f4a23a6` / `c405710` / `125d2ac` / `11754fa` / `6d99da4`)