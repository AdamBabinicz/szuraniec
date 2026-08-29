# 🕺 Dwa na Jeden — Wedding Dance AI Coach
**Real-time web trainer for Poland's iconic wedding dance ("Szuraniec" / "2-on-1").**

Built for the **WebMCP Challenge**, this application bridges the gap between AI agents and physical movement using the Model Context Protocol, WebVibration API, and Web Audio.

---

## 📅 Project Timeline & Hackathon Compliance
- **Project Started:** August 24, 2026 (initial layout and UI).
- **WebMCP Integration:** Started on August 27, 2026.
- **New Work for Hackathon:** All WebMCP logic (`mcp-server.js`), AI tools implementation, and Haptic Metronome integration were developed exclusively during the submission period (Aug 25 - Sep 3).

---

## 🚀 Live Demo & Video
- **Live URL:** [https://dwanajeden.netlify.app](https://dwanajeden.netlify.app)
- **Demo Video:** [Link do Twojego filmu na YouTube - WKLEJ GO POTEM!]

---

## 🧠 The WebMCP Paradigm: How it works
This project uses **WebMCP** to expose structured dance pedagogy to AI agents. The `mcp-server.js` provides:

1.  **Pedagogical Knowledge (`get_step_instructions`):** Structured timing for the 4-phase "Szuraniec" step.
2.  **Adaptive BPM Discovery (`get_wedding_songs`):** A database of Polish hits with verified BPM and YouTube IDs.
3.  **Active Practice Prescription (`recommend_song_by_bpm`):** An agent can analyze a user's skill level and programmatically set the training pace.

---

## ✨ Features
- **Interactive DVS (Dance Visual Sync):** Real-time animation synced with the methodology.
- **Haptic Metronome:** Uses the **WebVibration API** to "pulse" the beat on mobile devices.
- **Two-Way Sync:** Selecting a song through the AI agent automatically updates the trainer's tempo.

---

## 🛠️ Tech Stack
- **Framework:** Next.js 15
- **Agent Protocol:** WebMCP (Model Context Protocol)
- **Styling:** Tailwind CSS + Framer Motion
- **Deployment:** Netlify

---

## 💻 Installation
1. `pnpm install`
2. `pnpm dev`
3. Test MCP: `node mcp-server.js`

---

## 📝 License
[MIT License](LICENSE)
