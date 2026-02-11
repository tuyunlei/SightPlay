# SightPlay Roadmap v2

> 战略方向按优先级排列，具体任务在执行时细化。

## 质量标准

### develop → main 准入条件

- CI 全绿（lint + typecheck + arch + 单元测试 + E2E + build）
- 所有 commit 经过 review
- 覆盖率 ≥ 70%（逐步提升）
- ROADMAP 进度表已更新

### 覆盖率规则

- vitest 配置 coverage.thresholds，低于阈值 CI 失败
- 排除列表每项必须写注释说明理由，定期 review
- 禁止为凑覆盖率写无意义测试（只断言函数被调用等）

### CI 分层

| 检查项                       | 合入 develop | 合入 main |
| ---------------------------- | :----------: | :-------: |
| lint + typecheck + arch      |      ✅      |    ✅     |
| 单元测试 + 覆盖率            |      ✅      |    ✅     |
| E2E 测试                     |      —       |    ✅     |
| build（含 Sentry sourcemap） |      —       |    ✅     |

---

## P0 — 质量门禁

强化项目的质量保障体系，确保每次改动都有信心。

### E2E 测试

- [x] Playwright 框架搭建 ← `596170a`
- [x] CI 集成 E2E job ← `b1a576d`
- [x] 基础 UI 存在性测试（页面加载、元素可见） ← `75f5dc9`
- [ ] 练习交互 E2E（模拟键盘输入 → 音符判定 → 分数变化）
- [ ] 认证流程 E2E（完整的 mock passkey 登录 → 进入练习）
- [ ] AI 对话 E2E（发送消息 → 收到回复，mock API）
- [ ] 移动端 viewport E2E（手机竖屏、iPad 横屏）

### 覆盖率

- [x] 配置 vitest coverage.thresholds（阈值 70%） ← vitest.config.ts
- [x] 梳理现有未覆盖代码，合理标注排除项 ← vitest.config.ts exclude 列表
- [x] 补充高价值单元测试：usePracticeSession + PasskeyManagement ← `93724a7`

### 技术债

- [x] Sentry sourcemap 上传配置 ← `5bca201` + `5639436`
- [x] package-lock.json 同步修复 ← `659b239`
- [x] lint warnings 清理 ← `9c625ae`
- [x] error-report.ts 清理 ← 已验证干净
- [x] CORS_HEADERS 统一 ← `0fedaa1`

## P1 — 移动端体验

全面优化手机和 iPad 的使用体验。

- [x] 修复白边 / safe-area 问题 ← `251e8a7`
- [x] 响应式布局优化（手机竖屏、iPad 横屏） ← `8a668a4`
- [ ] 触控交互适配（钢琴键盘触控、手势）
- [ ] 移动端 passkey 注册验证

## P2 — 五线谱能力增强

强化五线谱引擎的基础能力，支撑更丰富的练习场景。

- [ ] 节拍 / 时值支持（全音符、半音符、四分音符等，节拍线）
- [ ] 升降号 / 半音显示与练习
- [ ] 双手 / 大谱表（高低音谱同时显示）
- [ ] 内置曲库（分难度、分类，跟谱练习）

## P3 — AI 融入体验

弱化独立聊天框，将 AI 能力自然融入练习流程。

- [ ] AI 以上下文提示 / 引导形式出现，而非独立聊天框
- [ ] 练习中的智能提示（弹错时自动给建议）
- [ ] 基于练习数据的个性化推荐

## P4 — 课程机制

引入结构化课程，引导用户逐步练习、逐步进步。

- [ ] （细节待定，做到时再规划）

---

## 进度记录

| 日期       | 内容                                       | Commit                          |
| ---------- | ------------------------------------------ | ------------------------------- |
| 2026-02-10 | Roadmap 建立                               | —                               |
| 2026-02-11 | E2E 框架 + 基础 UI 测试 + CI 集成          | `596170a`, `75f5dc9`, `b1a576d` |
| 2026-02-12 | 移动端 safe-area 修复                      | `251e8a7`                       |
| 2026-02-12 | 响应式布局优化                             | `8a668a4`                       |
| 2026-02-12 | Sentry sourcemap 配置 + CI env             | `5bca201`, `5639436`            |
| 2026-02-12 | lint warnings 修复 + package-lock 同步     | `9c625ae`, `659b239`            |
| 2026-02-12 | Roadmap v2：质量标准、E2E 拆细、覆盖率规则 | —                               |
| 2026-02-12 | 覆盖率配置验证 + CORS_HEADERS 统一         | `0fedaa1`                       |
