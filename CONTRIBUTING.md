# Contributing Guide

## 分支模型

```
main          ← 生产分支，部署到 EdgeOne Pages
  └─ develop  ← 开发集成分支，CI 通过后合入 main
       └─ feature/p0-xxx  ← 单个任务的工作分支
       └─ feature/p1-xxx
       └─ ...
```

### 规则

- **main**：始终可部署，只接受来自 develop 的 fast-forward 合并
- **develop**：集成分支，feature 分支完成后合入
- **feature/\***：从 develop 切出，命名 `feature/<phase>-<简述>`，例如 `feature/p0-e2e-setup`
- 每个 feature 分支只做**一个小任务**，完成后立即合回 develop
- develop 稳定后同步到 main 并触发部署

### 工作流（每次任务）

1. `git checkout develop && git pull`
2. `git checkout -b feature/p0-xxx`
3. 开发、测试、提交
4. `git checkout develop && git merge feature/p0-xxx --no-edit`
5. `git push origin develop`
6. 确认 CI 通过后：`git checkout main && git merge develop --no-edit && git push origin main`
7. 删除 feature 分支：`git branch -d feature/p0-xxx`

### Commit 规范

- `feat:` 新功能
- `fix:` 修复
- `test:` 测试
- `chore:` 工具链 / 配置
- `docs:` 文档
- `refactor:` 重构
- `style:` 格式化（不改逻辑）
