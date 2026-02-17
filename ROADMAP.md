# SightPlay Roadmap v2

> 战略方向按优先级排列，具体任务在执行时细化。

## 质量标准

### develop → main 准入条件

- CI 全绿（lint + typecheck + arch + 单元测试 + E2E + build）
- 所有 commit 经过 review
- 覆盖率 ≥ 当前阈值（70% → 逐步提升至 80%，见 P4.4）
- ROADMAP 进度表已更新

### 覆盖率规则

- vitest 配置 coverage.thresholds，低于阈值 CI 失败
- 排除列表每项必须写注释说明理由，定期 review
- 禁止为凑覆盖率写无意义测试（只断言函数被调用等）
- 不可测试或低价值代码可申请审批加白（需 tuyunlei 确认）

### 开发流程约束（P4 起生效）

- 新增 UI 文本必须走 i18n，不允许硬编码中文或英文
- 新增样式必须使用 design token（颜色变量），不允许硬编码颜色值
- 所有用户可见的功能路径必须有 Sentry 日志

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
- [x] 练习交互 E2E（模拟键盘输入 → 音符判定 → 分数变化） ← `868cfda`
- [x] 认证流程 E2E（完整的 mock passkey 登录 → 进入练习） ← `ce684d2`
- [x] AI 对话 E2E（发送消息 → 收到回复，mock API） ← `920a329`
- [x] 移动端 viewport E2E（手机竖屏、iPad 横屏） ← `69ad15f`

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
- [x] 触控交互适配（钢琴键盘触控、手势） ← `c50d9f3`
- [x] 移动端 passkey 注册验证 ← `5b5d1a1`

## P2 — 五线谱能力增强

强化五线谱引擎的基础能力，支撑更丰富的练习场景。

- [x] 节拍 / 时值支持 Phase 1（Duration 数据模型 + 音符形状渲染） ← `f6f50f6`
- [x] 节拍 / 时值支持 Phase 2（小节线、拍号显示、节拍分组） ← `63b5287`
- [x] 升降号 / 半音显示与练习 ← `25588da`
- [x] 双手 / 大谱表 Phase 1（视觉渲染：双谱表+花括号+时间对齐） ← `84b35e7`
- [x] 双手 / 大谱表 Phase 2（双手练习逻辑） ← `5373d32`
- [x] 内置曲库（分难度、分类，跟谱练习） ← `3910550`

## P3 — AI 融入体验

弱化独立聊天框，将 AI 能力自然融入练习流程。

- [x] AI 以上下文提示 / 引导形式出现，而非独立聊天框 ← `4f3e82b`
- [x] 练习中的智能提示（弹错时自动给建议） ← `d43b6d6`
- [x] 基于练习数据的个性化推荐 ← `cb736ac`

## P4 — 邀请码 + 本地化 + 深浅色 + 覆盖率提升

### P4.1 — 邀请码机制

将邀请链接改为邀请码机制，所有注册（含首个用户）都需要邀请码。

- [x] 邀请码数据模型（KV 存储，字段：code、createdBy、usedBy、expiresAt） ← `d1f4daf`
- [x] 邀请码格式：8 位 `XXXX-XXXX`，字符集 32 个（排除 0/O/I/1/L） ← `d1f4daf`
- [x] API：管理员生成邀请码（`X-Admin-Secret` 鉴权，支持批量） ← `d1f4daf`
- [x] API：已注册用户生成邀请码（每码限用一次，一周过期） ← `d1f4daf`
- [x] 注册页面改造：移除邀请链接入口，改为输入邀请码 ← `d1f4daf`
- [x] 注册流程：验证邀请码 → 注册 → 标记已使用 ← `d1f4daf`
- [x] Rate limiting：KV 计数，同 IP 10s >10 次 → 封禁 1h（429） ← `d1f4daf`
- [x] 移除旧的邀请链接相关代码 ← `d1f4daf`
- [x] Review 修复：auth 组件硬编码字符串 → i18n ← `3764950`
- [x] Review 修复：admin secret 改用 constant-time 比较 ← `9fd9d6f`
- [x] Review 修复：endpoint 级安全测试 ← `672f6dd`
- [x] Review 修复：E2E 测试适配邀请码流程 ← `ca4577e`
- 已知限制：KV 竞态（get+put 非原子），当前用户规模可接受

### P4.1.5 — 登录注册 UX 优化

优化首屏体验，让登录/注册流程更自然。

- [x] 首屏改造：登录按钮 + "没有账号？用邀请码注册"链接 ← `674939a`
- [x] 登录失败后：错误提示 + 高亮/展开注册区域 ← `674939a`
- [x] 邀请码链接：`/register?code=XXXX-XXXX` 直接进注册，邀请码预填 ← `674939a`
- [x] 注册流程：填邀请码 → 发起 passkey 注册 ← `674939a`

### P4.2 — 中英文本地化

全面支持中英文，覆盖所有页面（含登录注册）。

- [x] 拆分 i18n.ts → i18n/index.ts + en.ts + zh.ts（解决文件过大问题） ← `dcd4869`
- [x] 审计全部源码，本地化所有硬编码用户文本（140 keys，en/zh 完整） ← `5299ee8` `cc1f061`
- [x] 开发流程约束：新增 UI 文本必须走 i18n，不允许硬编码

### P4.3 — 深浅色模式

全面支持深浅色模式，跟随系统自动切换。

- [x] 设计 token 体系（颜色变量），支持 light/dark 两套
- [x] 全面适配所有页面（含登录注册、练习、设置等）
- [x] 跟随系统 `prefers-color-scheme` 自动切换
- [x] 开发流程约束：新增样式必须使用 design token，不允许硬编码颜色值

### P4.4 — 覆盖率提升

逐步提升测试覆盖率准入门槛至 80%。

- [x] 阈值 70% → 73%（73.66%，补了 inviteCode 工具函数测试） ← `5a37aa0`
- [x] 阈值 73% → 76%（76.34%，补了 useAuth/useRecommendations/noteHandlers 测试） ← `fe480df`
- [x] 阈值 76% → 80%（80.11%，补了 platform adapter + auth endpoint 测试） ← `b9b4961`
- [ ] 每次提升前 review 排除列表，确保排除项合理
- [ ] 规则：不为凑覆盖率而测试；不可测试或低价值代码可申请审批加白

## P5 — 迁移至 Cloudflare Pages + Workers

从 EdgeOne 迁移到 Cloudflare，解决国内访问需要备案的问题。

- [x] 平台抽象层（`PlatformContext` + EdgeOne/CF adapters） ← `fa8fd18`, `561b9bd`
- [x] CF Pages Functions 路由文件 + 共享 handler 提取 ← `e3f09ad`
- [x] CF Pages 项目创建 + KV namespace + 环境变量配置（API）
- [x] 自定义域名 `sightplay.xclz.org` + SSL 证书
- [x] `WEBAUTHN_RP_ID` 环境变量支持（预览部署 passkey 共享） ← `1a2392f`
- [x] 预览环境验证通过（注册/登录正常）
- [x] 合并 develop → main，生产环境部署 ← `a94324c`
- [x] Production/Preview KV 隔离（独立 namespace）
- [ ] 国内访问速度验证（待涂涂从国内确认）

---

## 进度记录

| 日期       | 内容                                                       | Commit                          |
| ---------- | ---------------------------------------------------------- | ------------------------------- |
| 2026-02-10 | Roadmap 建立                                               | —                               |
| 2026-02-11 | E2E 框架 + 基础 UI 测试 + CI 集成                          | `596170a`, `75f5dc9`, `b1a576d` |
| 2026-02-12 | 移动端 safe-area 修复                                      | `251e8a7`                       |
| 2026-02-12 | 响应式布局优化                                             | `8a668a4`                       |
| 2026-02-12 | Sentry sourcemap 配置 + CI env                             | `5bca201`, `5639436`            |
| 2026-02-12 | lint warnings 修复 + package-lock 同步                     | `9c625ae`, `659b239`            |
| 2026-02-12 | Roadmap v2：质量标准、E2E 拆细、覆盖率规则                 | —                               |
| 2026-02-12 | 覆盖率配置验证 + CORS_HEADERS 统一                         | `0fedaa1`                       |
| 2026-02-12 | 练习交互 E2E 测试（MIDI 模拟 + 3 测试）                    | `868cfda`                       |
| 2026-02-12 | 认证流程 E2E 测试（注册 + 登录 + 6 测试）                  | `ce684d2`                       |
| 2026-02-12 | AI 对话 E2E 测试（多轮对话 + mock API）                    | `920a329`                       |
| 2026-02-12 | 移动端 viewport E2E（手机竖屏 + iPad 横屏，9 测试）        | `69ad15f`                       |
| 2026-02-12 | 触控交互适配（钢琴键盘 touch 支持 + E2E 测试）             | `c50d9f3`                       |
| 2026-02-13 | 移动端 passkey 兼容（WebAuthn 检查 + 错误提示 + 触觉反馈） | `5b5d1a1`                       |
| 2026-02-13 | P2 时值支持 Phase 1（Duration 模型 + 5 种音符渲染）        | `f6f50f6`                       |
| 2026-02-13 | P2 Phase 2（拍号显示 + 小节线 + DetectedGhost 提取）       | `63b5287`                       |
| 2026-02-13 | P2 升降号/半音（♭ 渲染 + staff 定位修正 + 半音练习模式）   | `25588da`                       |
| 2026-02-14 | P2 大谱表 Phase 1（双谱表+花括号+组件提取+时间对齐修复）   | `84b35e7`                       |
| 2026-02-14 | P2 大谱表 Phase 2（双手练习逻辑+模式切换+判定）            | `5373d32`                       |
| 2026-02-14 | P2 内置曲库（8首曲目+难度分级+跟谱练习+成绩评级）          | `3910550`                       |
| 2026-02-15 | P3 上下文提示系统（HintBubble + 聊天改为抽屉式）           | `4f3e82b`                       |
| 2026-02-15 | P3 智能错误分析（mistakeTracker + 模式检测 + 针对性建议）  | `d43b6d6`                       |
| 2026-02-15 | P3 个性化练习推荐（准确率分析 + 难度建议 + 曲目推荐）      | `cb736ac`                       |
| 2026-02-16 | P5 平台抽象层 + EdgeOne adapter 重构                       | `fa8fd18`                       |
| 2026-02-16 | P5 Cloudflare adapter + wrangler 配置                      | `561b9bd`                       |
| 2026-02-16 | P5 CF Pages Functions + 共享 handler 提取                  | `e3f09ad`                       |
| 2026-02-16 | P5 CF Pages 项目 + KV + 自定义域名 + 环境变量              | API                             |
| 2026-02-16 | P5 WEBAUTHN_RP_ID 环境变量 + 预览环境验证通过              | `1a2392f`                       |
