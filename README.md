# Dwa na Jeden — Wedding Dance AI Coach 💃🕺

**An AI-powered interactive coach for learning the Polish wedding dance step “Dwa na Jeden” (Szuraniec / Disco Fox 2-to-1).**

🌐 **Live demo:** https://dwanajeden.netlify.app/
🎥 **Demo video:** https://www.youtube.com/watch?v=6MDFggcT04g
📡 **WebMCP manifest:** https://dwanajeden.netlify.app/.well-known/mcp.json

Dwa na Jeden is a web application that helps people learn, practice, and improve a popular Polish wedding dance step through **rhythm-based guidance, visual footwork instructions, interactive audio cues, adjustable practice speed, and real wedding music**.

The project also exposes structured capabilities through **WebMCP (Model Context Protocol for the Web)**, allowing AI agents to interact with the application using tools instead of simply describing what the user should click.

---

## 🎥 Demo Video

The following video demonstrates the application and its core functionality:

**▶️ [Dwa na Jeden — Wedding Dance AI Coach Demo](https://www.youtube.com/watch?v=6MDFggcT04g)**

The demo showcases the interactive dance-learning experience, including the visual step guidance, rhythm-based practice, music integration, and the overall application workflow.

---

# 🎯 The Problem

Learning a wedding dance is often harder than it looks. A beginner has to simultaneously understand footwork, weight distribution, timing, and syncopation—all while keeping rhythm to music.

Traditional dance tutorials are static and non-interactive. **Dwa na Jeden** combines them into one interactive practice environment and makes the application's knowledge available to AI agents through WebMCP.

---

# 🕺 The Dance: “Dwa na Jeden”

The basic movement consists of four phases (1 + 1 + 0.5 + 0.5 = 3 beats):

| Phase         |   Timing | Movement                                                        |
| ------------- | -------: | --------------------------------------------------------------- |
| **1 — One**   |   1 beat | Left foot moves sideways while weight remains on the right foot |
| **2 — Two**   |   1 beat | Right foot closes in and takes the weight                       |
| **3 — Three** | 0.5 beat | Quick movement of the leading foot                              |
| **and**       | 0.5 beat | Syncopated closing movement                                     |

The direction alternates between bars, creating a continuous mirrored movement.

### Practice methodology
The application follows a beginner-friendly approach based on:
* Bent knees, no jumping.
* Sliding the feet across the floor.
* Small controlled movements.
* Conscious weight transfer.
* Mirrored left/right movement.

### Baby Steps Mode
The **Baby Steps** mode reduces the size of the movements, allowing beginners to focus on rhythm and weight transfer before increasing the amplitude of their steps.

---

# 🎵 13 Polish Wedding Songs

|  # | Artist — Song                                  | BPM |
| -: | ---------------------------------------------- | --: |
|  1 | Akcent — Życie To Są Chwile                    | 120 |
|  2 | Boys — Najpiękniejsza Dziewczyno               | 124 |
|  3 | Akcent — Prawdziwa Miłość to Ty (Cudowna jest) | 124 |
|  4 | Masters — Żono moja                            | 125 |
|  5 | MIG — Miód Malina                              | 126 |
|  6 | Boys — Jesteś Szalona                          | 128 |
|  7 | Boys — Moja kochana                            | 128 |
|  8 | Daj to głośniej — Mama ostrzegała              | 128 |
|  9 | Boys — Wolność                                 | 130 |
| 10 | Weekend — Ona Tańczy Dla Mnie                  | 130 |
| 11 | Czadoman — Ruda tańczy jak szalona             | 132 |
| 12 | Akcent — Przez Twe Oczy Zielone                | 135 |
| 13 | Piękni i Młodzi — Niewiara                     | 138 |

---

# 🎚️ Adaptive Practice

The application supports three practice speeds:
```text
0.5×   → slow learning
1.0×   → normal speed
1.25×  → challenge mode
🤖 WebMCP Integration
The application exposes structured capabilities that agents can use directly.
Available tools
get_wedding_songs
Returns the collection of 13 wedding songs, including song identifier, BPM, and YouTube ID.
get_step_instructions
Returns the structured methodology for the four phases of the dance (timing, weight distribution, and direction).
recommend_song_by_bpm
Recommends a song based on the dancer's skill level (beginner, intermediate, advanced).
🌐 Why WebMCP Is a Natural Fit
Dance coaching is intent-based. Without WebMCP, an agent would have to rely on scraping the UI or giving generic advice. With WebMCP, the agent accesses explicitly defined application capabilities:
Contextual Assistance: "I'm a beginner — what should I practice?"
Precise Data: "What is the exact timing for the syncopation?"
Direct Control: The agent uses structured tools to recommend songs and explain methodology based on real-time app data.
🧠 Human + Agent + Application
WebMCP creates a collaboration layer:
code
Text
┌─────────────────┐
             │      Human      │
             │   “Help me      │
             │    practice”    │
             └────────┬────────┘
                      ↓
             ┌─────────────────┐
             │    AI Agent     │
             │ understands     │
             │ the request     │
             └────────┬────────┘
                      ↓
             ┌─────────────────┐
             │     WebMCP      │
             │ structured      │
             │ capabilities   │
             └────────┬────────┘
                      ↓
             ┌─────────────────┐
             │ Dwa na Jeden    │
             │ Dance Coach     │
             └─────────────────┘
🔊 Tech Stack
Framework: Next.js, React, TypeScript.
Protocol: WebMCP / Model Context Protocol.
Audio: Web Audio API (Precision rhythm guidance).
Feedback: Web Vibration API (Haptic feedback).
Integration: YouTube IFrame API.
Deployment: Netlify.
🚀 Running Locally
pnpm install
pnpm dev
Open http://localhost:3000
📜 License
This project is licensed under the MIT License. (Required for the WebMCP Challenge).
🏆 The WebMCP Challenge
Dwa na Jeden — Wedding Dance AI Coach was created for The WebMCP Challenge. It explores what happens when a normal website becomes something an AI agent can actively use to solve real-world human problems.
💃🕺 Learn the step. Pick the music. Let the agent help.
Dwa na Jeden — Wedding Dance AI Coach
