# Dwa na Jeden — Wedding Dance AI Coach 💃🕺

**An AI-powered interactive coach for learning the Polish wedding dance step “Dwa na Jeden” (Szuraniec / Disco Fox 2-to-1).**

🌐 **Live demo:** https://dwanajeden.netlify.app/
🎥 **Demo video:** https://www.youtube.com/watch?v=6MDFggcT04g
📡 **WebMCP manifest:** https://dwanajeden.netlify.app/.well-known/mcp.json

Dwa na Jeden is a web application that helps people learn, practice, and improve a popular Polish wedding dance step through rhythm-based guidance, visual instructions, and interactive audio cues. It exposes structured tools through **WebMCP**, allowing AI agents to interact with the application directly.

---

## 🎥 Demo Video
**▶️ [Dwa na Jeden — Wedding Dance AI Coach Demo](https://www.youtube.com/watch?v=6MDFggcT04g)**
The demo showcases the interactive dance-learning experience, music integration, and the WebMCP integration workflow.

---

# 🎯 The Problem
Learning a wedding dance is a multi-tasking challenge. A beginner must understand footwork, weight distribution, and syncopation simultaneously. Traditional tutorials are static. **Dwa na Jeden** provides a real-time practice environment and makes the app's knowledge available to AI agents via WebMCP.

---

# 🕺 The Dance: “Dwa na Jeden”
The movement consists of four phases (1 + 1 + 0.5 + 0.5 = 3 beats):

| Phase | Timing | Movement |
| :--- | :--- | :--- |
| **1 — One** | 1 beat | Left foot moves sideways; weight on the right. |
| **2 — Two** | 1 beat | Right foot closes in and takes the weight. |
| **3 — Three** | 0.5 beat | Quick movement of the leading foot. |
| **and** | 0.5 beat | Syncopated closing movement. |

---

# 🌐 Why WebMCP Is a Natural Fit
WebMCP allows an agent to act as a personal coach. Instead of scraping the UI, the agent accesses:
* **`get_wedding_songs`**: Database of 13 wedding hits (BPM, YouTube ID).
* **`get_step_instructions`**: Structured 4-phase methodology.
* **`recommend_song_by_bpm`**: Level-based recommendations (beginner, intermediate, advanced).

---

# 🧠 Human + Agent + Application Model
```text
Human (“Help me practice”) -> AI Agent -> WebMCP -> Dwa na Jeden App
🎵 13 Polish Wedding Songs
#	Artist — Song	BPM
1	Akcent — Życie To Są Chwile	120
2	Boys — Najpiękniejsza Dziewczyno	124
3	Akcent — Prawdziwa Miłość to Ty	124
4	Masters — Żono moja	125
5	MIG — Miód Malina	126
6	Boys — Jesteś Szalona	128
7	Boys — Moja kochana	128
8	Daj to głośniej — Mama ostrzegała	128
9	Boys — Wolność	130
10	Weekend — Ona Tańczy Dla Mnie	130
11	Czadoman — Ruda tańczy jak szalona	132
12	Akcent — Przez Twe Oczy Zielone	135
13	Piękni i Młodzi — Niewiara	138
🔊 Tech Stack
Framework: Next.js, React, TypeScript.
Protocol: WebMCP (Model Context Protocol).
APIs: Web Audio API, Web Vibration API, YouTube IFrame API.
Hosting: Netlify.
🚀 Running Locally
pnpm install
pnpm dev
Open http://localhost:3000
📜 License
Licensed under the MIT License. (Requirement for The WebMCP Challenge).
🏆 The WebMCP Challenge
Created for The WebMCP Challenge. It demonstrates how WebMCP turns a traditional website into a set of tools that both people and AI agents can interact with to solve real-world problems.
Dwa na Jeden — Wedding Dance AI Coach
