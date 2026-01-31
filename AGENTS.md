# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

PitchPerfect AI 是一个音乐视唱练耳训练应用，使用 React + TypeScript + Vite 构建。支持麦克风音高检测和 MIDI 键盘输入，配合 Gemini AI 提供智能教练功能。

## 常用命令

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器 (端口 3000)
npm run build      # 生产构建
npm run preview    # 预览生产构建
npm run lint       # ESLint 语法/规则检查
npm run format     # Prettier 格式化
npm run typecheck  # TypeScript 严格类型检查
npm run test:ci    # Vitest 覆盖率门禁
npm run lint:arch  # 架构/死代码/文件大小检查
```

## 环境配置

在 `.env.local` 文件中设置 `GEMINI_API_KEY`，Vite 会通过 `process.env.API_KEY` 注入到前端。

## 架构

### 目录结构

- `App.tsx` - 主应用组件，包含所有状态管理和业务逻辑
- `components/` - 可视化组件（StaffDisplay 五线谱、PianoDisplay 钢琴键盘）
- `services/` - 核心服务层
- `types.ts` - TypeScript 类型定义
- `constants.ts` - 音乐常量（音符、频率、MIDI 映射）
- `i18n.ts` - 中英双语国际化
- `config/` - 运行配置层（只依赖 shared）
- `domain/` - 领域层（不依赖 UI）
- `hooks/` - 业务 hooks
- `features/` - 业务功能分区
- `store/` - 全局状态管理

### 服务层

| 文件               | 职责                                             |
| ------------------ | ------------------------------------------------ |
| `audioService.ts`  | 麦克风音高检测，使用自相关算法 (Autocorrelation) |
| `midiService.ts`   | Web MIDI API 封装，支持热插拔                    |
| `geminiService.ts` | Gemini AI 交互，返回结构化 JSON（对话+练习数据） |

### 核心数据流

1. 音频输入（麦克风或 MIDI）→ 检测音高 → `detectedNote`
2. `noteQueue` 保存当前待演奏的音符队列（最多 20 个）
3. 当检测音高与队首音符匹配持续 80ms → 触发 `handleCorrectNote`
4. 正确后队首移至 `exitingNotes`（播放退出动画），队列补充新音符

### 音符系统

- 使用 MIDI 编号作为核心标识（C4 = 60）
- `createNoteFromMidi()` 统一生成 Note 对象
- 高音谱号范围：MIDI 60-79，低音谱号范围：MIDI 40-60

### AI 挑战模式

Gemini 返回的 `challengeData` 包含音符序列（科学音高记谱法如 "C4"），由 `loadChallenge()` 转换为 Note 数组替换 noteQueue。

## 质量门禁

### 本地门禁

- ESLint + Prettier: `eslint.config.js`, `.prettierrc`, `.prettierignore`
- TypeScript strict: `tsconfig.json`
- 测试与覆盖率: `vitest.config.ts`
- 架构约束: `.dependency-cruiser.cjs`
- Dead code: `knip.json`
- 文件大小门禁: `scripts/check-file-size.js`
- Git hooks: `.husky/` + `lint-staged`

### CI/CD

- GitHub Actions: `.github/workflows/ci.yml`
