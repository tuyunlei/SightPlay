<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# PitchPerfect AI

A piano sight-reading practice app that helps you improve your ability to read sheet music and play the correct notes.

## Features

- **Staff Display** — Target notes shown on treble or bass clef
- **MIDI Keyboard Support** — Connect your MIDI keyboard for instant note detection
- **Microphone Input** — For acoustic pianos without MIDI output
- **AI Coach** — Gemini AI generates personalized practice challenges (melodies, scales, etc.)
- **Real-time Feedback** — Score tracking, streak counter, visual hints
- **Bilingual** — English and Chinese UI

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key

3. Run the app:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## How It Works

1. Choose a clef (treble or bass)
2. Connect your MIDI keyboard, or enable microphone for acoustic piano
3. See target notes on the staff
4. Play the correct note on your piano
5. Get instant feedback and track your progress
6. Ask AI Coach for custom challenges

## Tech Stack

- React + TypeScript + Vite
- TailwindCSS
- Zustand (state management)
- Web MIDI API / Web Audio API
- Google Gemini AI
