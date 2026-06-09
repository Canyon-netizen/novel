Warning: Identity file /home/zhourui/.ssh/id_ed25519 not accessible: No such file or directory.
# 仓库级 Agent 规则

## 提交作者规则

- 本仓库为单人维护项目，所有 commit 的 author / committer 必须统一为 `Canyon-netizen <1327107233@qq.com>`，**不再追加 `Co-Authored-By` trailer**。
- 在本仓库做提交前必须确认 git 身份已配置正确：

  ```bash
  git config user.name  "Canyon-netizen"
  git config user.email "1327107233@qq.com"
  ```

  临时切回默认身份可用 `git config --local` 只改当前仓库。

## 目录规范

- **前端模块**（UMD 命名空间 `NovelXxx`）：放在 `app/`，单一职责
- **后端 Python**：放在 `src/`，编号化流程（参考 daily-paper-reader）
- **测试**：放在 `tests/`，分 `unit/` 和 `e2e/`
- **CI/CD**：放在 `.github/workflows/`

## 合并主分支规则

- 工作分支合并到 `main` 前，必须先确认本次提交只包含可上游同步的代码、模板与测试改动。
- 默认不得合并以下用户运行态/部署产物路径，除非用户明确要求：
  - `.venv/`
  - `__pycache__/`
  - `.env`
  - `*.local.*`
- 推荐的主分支合并方式是快进合并：

```bash
git switch main
git merge --ff-only <work-branch>
git push origin main
```

## 模块导出规范

所有前端模块必须用 UMD 模式：

```javascript
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NovelXxxUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // ... 实现
  return { /* 公开 API */ };
});
```

命名空间：`NovelCommon` / `NovelLLMClient` / `NovelGistShare` / `NovelViews`。
