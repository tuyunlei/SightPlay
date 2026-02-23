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
- 传给子组件的 callback prop 必须保证引用稳定（React Compiler 自动处理；Compiler bail out 的场景需手动 useCallback 或 ref 模式）
- 新增功能必须有对应的 E2E 用户路径覆盖（不只是单元测试）
- **零白屏原则**：任何用户可达的页面/状态组合都不能出现白屏，E2E 必须覆盖验证
- **TEST_PLAN.md 同步维护**：ROADMAP 新增功能时，必须同步在 `e2e/TEST_PLAN.md` 添加对应场景；开发提交时更新覆盖状态；Review 时检查 TEST_PLAN 一致性

### CI 分层

| 检查项                       | 合入 develop | 合入 main |
| ---------------------------- | :----------: | :-------: |
| lint + typecheck + arch      |      ✅      |    ✅     |
| 单元测试 + 覆盖率            |      ✅      |    ✅     |
| E2E 测试                     |      —       |    ✅     |
| build（含 Sentry sourcemap） |      —       |    ✅     |
| 集成测试（组件协作）         |      ✅      |    ✅     |

### 测试策略分层

| 层级     | 覆盖什么             | 工具         | 能发现的问题                             |
| -------- | -------------------- | ------------ | ---------------------------------------- |
| 单元测试 | 单个函数/组件的逻辑  | vitest       | 逻辑错误、边界条件                       |
| 集成测试 | 多组件协作、状态联动 | vitest + RTL | render loop、prop 不稳定、store 联动 bug |
| E2E 测试 | 完整用户路径         | Playwright   | 页面级故障、流程断裂                     |

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
- [x] Rate limiting：KV 计数，同 IP 60s >10 次 → 封禁 1h（429，CF KV TTL ≥60s） ← `d1f4daf`
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
- [x] 阈值 73% → 76%（76.34%） ← `fe480df`
- [x] 阈值 76% → 80%（80.11%） ← `b9b4961`
- [x] 每次提升前 review 排除列表，确保排除项合理
- [x] 规则：不为凑覆盖率而测试；不可测试或低价值代码可申请审批加白

### P4.5 — 后端可观测性

补充后端日志，目标：出现问题时能快速定位。

- [x] 所有 API endpoint 的 catch block 记录结构化错误日志（error message + stack + request context） ← `0e25e39`
- [x] 关键业务路径加结构化 breadcrumb 日志（注册、登录、邀请码验证） ← `0e25e39`
- [x] 错误响应包含 request ID，方便关联日志 ← `0e25e39`
- [x] 共享 logger 工具 + 单元测试（logError、logBreadcrumb、errorResponse、createRequestContext） ← `0e25e39`

### P4.6 — 质量体系升级

现有测试只能回答"代码被执行了吗"，无法保证组件交互正确性和用户路径完整性。需要系统性补强。

#### P0：立即止血

- [x] 修复 ContentView.tsx render loop（所有 callback props 加 useCallback） ← `ae7704e`
- [x] 修复 SongPractice.tsx usePracticeStore selector 加 useShallow ← `ae7704e`
- [x] 加 ErrorBoundary 兜住运行时崩溃，Sentry 上报 + i18n 降级 UI ← `ae7704e`

#### P1：静态分析收紧（自动拦截一整类问题）

- [x] eslint-plugin-react-hooks 所有规则改 error（exhaustive-deps: error） ← `07dc58b`
- [x] React StrictMode 已启用（index.tsx）
- [x] @typescript-eslint/strict 配置 ← `dc8da18`
- [x] 建立 `e2e/TEST_PLAN.md`：系统性测试计划，按模块×场景组织，活文档持续维护 ← `e2e/TEST_PLAN.md`
  - 已梳理 41 个场景（24 已覆盖 / 15 待补 / 2 不可测），覆盖率 58.5%
  - [x] 曲库练习 E2E ← `68d65c5`
  - [x] AI 对话 E2E（多轮 + 错误 + 空消息 + 历史 + 加载态） ← `8379ac8`
  - [x] 🔴 关键路径 E2E（ErrorBoundary、导航不白屏、歌曲完成、登出） ← `eaf65a8`
  - [x] 🟡 功能验证 E2E（passkey 管理、邀请码、手模式、练习范围） ← `0609143`
  - [x] 🟢 剩余场景 E2E（注册错误、智能提示、语言切换、深浅色） ← `f3bc685`
  - TEST_PLAN 覆盖率：41/41（100%），51 个 E2E 测试
- [x] 开发流程绑定：新功能同时更新 TEST_PLAN + E2E

#### P2：集成测试层建立（防住组件交互 bug）

- [x] 建立集成测试规范：多组件 + zustand store 联动的 render 测试 ← `c2dd234`
- [x] ContentView + SongPractice 集成测试（render loop 防护 + viewMode 切换 + callback 稳定性） ← `c2dd234`
- [x] AuthGate + LoginScreen + RegisterCard 集成测试（未认证 → 登录 → 失败 → 注册 → 认证通过） ← `c2dd234`
- [x] 每个主要页面（练习、曲库、设置）至少一个多组件联动测试 ← ContentView + AuthGate + PasskeyManagement

#### P3：长期演进

- [x] 评估 React Compiler（React 19+）— 自动 memoize，根治引用稳定性问题
  - **结论：推荐引入。** React Compiler 1.0 已于 2025-10-07 正式发布，Meta 生产验证，完全稳定。
  - SightPlay 环境兼容：React 19.2 + Vite 6 + TS 5.8，满足所有要求
  - 安装：`pnpm add -D babel-plugin-react-compiler` + vite.config.ts 配置
  - 预期收益：自动 memoize 所有组件和 hooks，根治 P4.6-P0 那类 render loop（无需手动 useCallback/useMemo）
  - 风险：低。编译器是 Babel 插件，不改运行时；已有 441 单测 + 51 E2E 做回归保护
  - **建议作为 P6 第一步引入，移除手动 memoize 后简化代码**
- [x] 评估 mutation testing（Stryker）— 度量测试真实有效性，而非覆盖率
  - **结论：暂不引入。** Stryker 支持 vitest，但运行极慢（每个 mutation 跑完整测试套件）
  - 441 个测试 × 数百个 mutation = 数小时运行时间，不适合 CI 常规流程
  - 适合阶段性手动跑（如每月一次），评估测试质量趋势
  - **建议：等项目规模再大或测试质量有疑问时再引入，当前 84% 覆盖率 + 集成测试已足够**
- [x] 评估性能回归检测：React Profiler 检测不必要重渲染，设阈值报警
  - **结论：引入 React Compiler 后再评估。** 当前手动 useCallback/useMemo 已解决已知 render loop
  - React Compiler 自动 memoize 后，大部分重渲染问题将被编译器消除
  - 如果引入 Compiler 后仍有性能问题，再加 React Profiler 集成测试检测
  - ContentView 集成测试已有 render count 断言（< 15 次），可作为基础扩展

## P6 — React Compiler + 代码简化

引入 React Compiler 自动 memoize，移除手动 useCallback/useMemo/React.memo，简化代码。

### P6.1 — 引入 React Compiler

- [x] 安装 `babel-plugin-react-compiler` + `eslint-plugin-react-compiler`，配置 vite.config.ts + eslint ← `4d47179`
- [x] 修复 compiler 不兼容的 hook 模式（useMicInput 动态 hook 传递 → 直接 import；usePracticeRefs 显式调用） ← `4d47179`
- [x] 验证编译产物正确（441 单测 + 51 E2E 全通过） ← `4d47179`
- [x] 剩余 12 个 compiler warnings（warn 级别，prop mutation 等），不影响功能

### P6.2 — 移除手动 memoize

- [x] 移除 18 个文件中的 useCallback/useMemo/React.memo（净减 73 行） ← `0993343`
- [x] 保留 3 处需要稳定引用的 useCallback（checkSession、initializeQueue、selectSong）
- [x] 清理 'use no memo' 指令和未使用 import
- [x] 全量测试回归验证（441 单测 + 51 E2E 全过） ← `0993343`

### P6.3 — MIDI 回调稳定性修复

- [x] useMidiInput 改用 callback ref 模式，MIDI 只初始化一次 ← `05cae97`
- [x] 更新 useMidiInput 测试（验证 ref 委托行为） ← `05cae97`

---

## P7 — MIDI 输入测试保障

P6.2 移除 useCallback 后 MIDI 输入静默失效，现有测试体系未能捕获。
根因：MIDI 是硬件接口，之前的测试要么 mock 太浅（只验 initialize 调用），要么完全绕过（E2E 用虚拟键盘）。
目标：建立完整的 MIDI 输入测试链路，确保"钢琴插上能弹"这个核心用例有回归保障。

### P7.1 — MidiService 集成测试

Mock `navigator.requestMIDIAccess` 返回假 MIDIAccess/MIDIInput，验证：

- [x] 设备连接/断开 → onConnectionChange 回调 ← `9a1b704`
- [x] Note On 消息（0x90 + velocity > 0）→ onNoteOn 回调，参数正确 ← `9a1b704`
- [x] Note Off 消息（0x80 或 velocity=0）→ onNoteOff 回调 ← `9a1b704`
- [x] 热插拔：运行中连接新设备 → 自动绑定 ← `9a1b704`
- [x] 回调更新后，MIDI 事件仍能正确传递到最新回调（P6.3 的回归测试） ← `9a1b704`

### P7.2 — E2E WebMIDI 模拟

通过 Playwright `page.addInitScript` 注入 WebMIDI mock：

- [x] 编写 WebMIDI mock（假 MIDIAccess + MIDIInput + 事件分发） ← `bbdc716`
- [x] 暴露 `window.__simulateMidiNoteOn(midi)` / `__simulateMidiNoteOff(midi)` 供 E2E 调用 ← `bbdc716`
- [x] E2E：MIDI 设备连接 → 按正确键 → 音符高亮 + 得分变化 + 下一个音符 ← `bbdc716`
- [x] E2E：按错误键 → 错误反馈 ← `bbdc716`
- [x] E2E：双手模式 → 同时按两个正确键 → 通过 ← `bbdc716`

### P7.3 — 练习流程 MIDI 集成测试

vitest + jsdom 环境，mock WebMIDI，渲染 usePracticeSession：

- [ ] 模拟 MIDI Note On → 验证 store 中 detectedNote 更新
- [ ] 模拟正确音符 → 验证 noteQueue 推进
- [ ] 模拟错误音符 → 验证 hasMistakeForCurrent 标记
- [ ] 组件 rerender 后 → MIDI 事件仍正常处理（回归守卫）

---

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
- [x] 国内访问速度验证 — itdog 全国测速：平均 2.2s，157/159 节点正常，联通/移动约 2.0s，电信约 2.5s ← 2026-02-20

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
