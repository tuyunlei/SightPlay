# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

SightPlay (视弹) is a piano sight-reading practice app built with React + TypeScript + Vite. It helps users improve their ability to read sheet music and play the correct notes on the piano.

**Core Features:**

- **Staff display** — Shows target notes on treble or bass clef
- **MIDI keyboard input** — Detects notes played via Web MIDI API
- **Microphone input** — For acoustic pianos without MIDI output, uses pitch detection to identify played notes
- **AI Coach** — Gemini AI generates personalized practice challenges (e.g., melodies, scales)
- **Real-time feedback** — Score tracking, streak counter, "too high/too low" hints

## Common Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (port 3000)
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # ESLint rules check
npm run format     # Prettier formatting
npm run typecheck  # TypeScript strict type checking
npm run test:ci    # Vitest coverage gate
npm run lint:arch  # Architecture/dead code/file size checks
```

## Environment Configuration

Set `GEMINI_API_KEY` in `.env.local`. Vite injects it into the frontend via `process.env.API_KEY`.

## Architecture

### Directory Structure

- `App.tsx` - Main app component containing all state and business logic
- `components/` - Visual components (StaffDisplay staff, PianoDisplay keyboard)
- `services/` - Core service layer
- `types.ts` - TypeScript type definitions
- `constants.ts` - Music constants (notes, frequencies, MIDI mapping)
- `i18n.ts` - Bilingual i18n (Chinese/English)
- `config/` - Runtime configuration layer (depends only on shared)
- `domain/` - Domain layer (no UI dependency)
- `hooks/` - Business hooks
- `features/` - Feature modules
- `store/` - Global state management

### i18n Development Guideline

All user-facing copy must go through i18n (see `i18n.ts`). Do not hard-code strings directly in components or services.

### Service Layer

| File               | Responsibility                                                       |
| ------------------ | -------------------------------------------------------------------- |
| `audioService.ts`  | Microphone pitch detection for acoustic pianos (autocorrelation)     |
| `midiService.ts`   | Web MIDI API wrapper with hot-plug support                           |
| `geminiService.ts` | Gemini AI interaction returning structured JSON (dialog + exercises) |

### Core Data Flow

1. User sees target note on staff
2. User plays the note on piano (MIDI keyboard or acoustic piano via microphone)
3. System detects the played note → `detectedNote`
4. `noteQueue` stores the current queue of target notes (max 20)
5. When the detected pitch matches the head note for 80ms → trigger `handleCorrectNote`
6. On success, the head moves to `exitingNotes` (exit animation), and the queue is replenished

### Note System

- Use MIDI numbers as the core identifier (C4 = 60)
- `createNoteFromMidi()` consistently generates Note objects
- Treble clef range: MIDI 60-79; bass clef range: MIDI 40-60

### AI Challenge Mode

Gemini returns `challengeData` containing a note sequence (scientific pitch notation like "C4"). `loadChallenge()` converts it into a Note array and replaces `noteQueue`.

## Quality Gates

### Local Gates

- ESLint + Prettier: `eslint.config.js`, `.prettierrc`, `.prettierignore`
- TypeScript strict: `tsconfig.json`
- Tests and coverage: `vitest.config.ts`
- Architecture constraints: `.dependency-cruiser.cjs`
- Dead code: `knip.json`
- File size gate: `scripts/check-file-size.js`
- Git hooks: `.husky/` + `lint-staged`

### CI/CD

- GitHub Actions: `.github/workflows/ci.yml`
