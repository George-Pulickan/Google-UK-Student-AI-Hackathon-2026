<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# SignBuddy 🖐️

### 🏆 First Place — Google UK Student AI Hackathon 2026

**Team Dice Developers**

An interactive, AI-powered sign language tutor. SignBuddy watches you fingerspell
in British (BSL) or American (ASL) Sign Language through your webcam, tracks your
hands live, and tells you **exactly which joints are wrong** — it doesn't score
you, it corrects you.

## What it does

- **Live hand tracking** — MediaPipe renders a depth-shaded 3D skeleton over your
  hand in real time, one or two hands at once (BSL fingerspelling is two-handed).
- **Per-joint correction** — the camera frame and 21 landmarks per hand go to
  Gemini, which returns the *indices* of the misplaced joints; those joints are
  painted red on your own hand, correct ones green.
- **Hands-free capture** — hold a sign inside the guide box; when your hand
  settles, a 3-2-1 countdown fires and captures automatically. No button.
- **A spoken coach** — Gemini TTS speaks the verdict at a natural pace, leading
  with the outcome so you hear it while still looking at your hand.
- **Real assessment** — a 5-question quiz gives you only the sign's name (no
  diagram, no hint) and scores you out of 5.
- **Any Sign** — make any sign at all; Gemini identifies it and designs its own
  explanation panel (agent-to-UI).
- **Custom mascots** — a coach you can restyle or generate from scratch with
  `gemini-2.5-flash-image`.

## Run locally

**Prerequisites:** Node.js, and the [gcloud CLI](https://cloud.google.com/sdk/docs/install).

SignBuddy calls Gemini through **Vertex AI**, authenticated with Application
Default Credentials — no API key needed.

1. Install dependencies:
   ```
   npm install
   ```
2. Authenticate once with gcloud:
   ```
   gcloud auth application-default login
   ```
3. Copy `.env.example` to `.env` and set your Google Cloud project:
   ```
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_CLOUD_LOCATION=global
   GEMINI_MODEL=gemini-flash-latest
   ```
4. Run the app:
   ```
   npm run dev
   ```
   Then open http://localhost:3000 and allow webcam access.

## Tech

React + Vite + Tailwind on an Express server. Hand tracking via
`@mediapipe/tasks-vision` (wasm and model self-hosted — no CDN). Grading, voice,
sign identification and mascot generation all run on Gemini via Vertex AI.

View the original scaffold in AI Studio: https://ai.studio/apps/007e4b36-cb82-4364-9439-39b3e3835e7d
