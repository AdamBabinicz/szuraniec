# Dwa na Jeden — Wedding Dance AI Coach 💃🕺

**An AI-powered interactive coach for learning the Polish wedding dance step "Dwa na Jeden" (Szuraniec / Disco Fox 2-on-1) — now with full autonomous agent control and a real-time Voice AI Coach powered by Groq Whisper Large v3 Turbo.**

🌐 **Live demo:** https://dwanajeden.netlify.app/

🎥 **Demo video:** https://www.youtube.com/watch?v=6MDFggcT04g

Dwa na Jeden is a web application that helps people learn, practice, and improve a popular Polish wedding dance step through **rhythm-based guidance, visual footwork instructions, interactive audio cues, adjustable practice speed, real wedding music, and a hands-free Voice AI Coach**.

The project exposes structured capabilities through **WebMCP (Model Context Protocol for the Web)**, allowing AI agents to interact with the application using tools instead of simply describing what the user should click.

> **P1 Milestone — Action & State Inspection Layer:** The application has been upgraded from a **static knowledge layer** (agents could query song and step data) to a full **autonomous dance coach** (agents can now directly pilot and control the dance trainer in real-time — selecting songs, adjusting tempo, switching practice modes, and starting/pausing/resetting playback — all without human intervention in the UI).

---

## 🎥 Demo Video

The following video demonstrates the application and its core functionality:

**▶️ [Dwa na Jeden — Wedding Dance AI Coach Demo](https://www.youtube.com/watch?v=6MDFggcT04g)**

The demo showcases the interactive dance-learning experience, including the visual step guidance, rhythm-based practice, music integration, and the overall application workflow.

---

## 🎙️ Voice AI Coach Integration (Groq Whisper Turbo)

The application now includes a **real-time, hands-free Voice AI Coach** powered by **Groq Cloud Whisper Large v3 Turbo**, allowing dancers to control practice sessions with natural spoken commands in **Polish and English**.

This addition does not replace the existing WebMCP tool architecture — it extends it with a voice-driven control layer that maps speech directly into the same structured `TrainerBridge` actions already used by autonomous agents. In practice, this means the browser can now be controlled in three complementary ways:

- **by the human through the visual UI**,
- **by an autonomous AI agent through WebMCP tools**,
- **and by the dancer's voice through the Voice AI Coach bridge**.

### Hands-Free Voice Control Architecture

#### 1. HTML5 MediaRecorder Pipeline

The voice layer uses the **HTML5 MediaRecorder API** as a cross-browser audio capture standard. This avoids the reliability, permission, and sandbox limitations often associated with legacy browser speech APIs and keeps the input layer aligned with modern web platform primitives.

The result is a recording pipeline that works across:

- Chrome
- Safari
- Edge
- Firefox
- iOS browsers
- Android browsers

This makes the Voice AI Coach suitable for realistic dance-floor practice, where the dancer may be using a phone, tablet, or laptop and cannot rely on desktop-only browser speech features.

#### 2. Groq Cloud Whisper Large v3 Turbo (`/api/voice`)

Recorded audio is streamed to the application's **`/api/voice`** endpoint, which uses **Groq Cloud Whisper Large v3 Turbo** for ultra-fast multilingual speech-to-text inference. The system is designed for **sub-200ms turnaround** so that spoken commands can feel immediate during active practice.

Because Whisper Large v3 Turbo is multilingual, the application can recognize both **Polish** and **English** coaching commands without requiring the user to switch input modes or reconfigure the session.

#### 3. WebMCP Bridge Dispatcher

Once a spoken phrase is transcribed, the Voice AI Coach passes the interpreted command through a **WebMCP bridge dispatcher** that maps natural language onto the application's structured `TrainerBridge` actions.

Examples include:

- **"Start"** → `start_practice`
- **"Pauza" / "Pause"** → `pause_practice`
- **"Od nowa" / "Reset" / "Again"** → `reset_practice`
- **"Zwolnij" / "Slow down"** → `set_tempo`
- **"Baby steps"** → `set_practice_mode("baby_steps")`
- **"Włącz Szaloną"** → `set_song` for *Boys — Jesteś Szalona*

This architecture preserves the core design principle of the project: the application should expose **structured, deterministic capabilities** instead of relying on fragile UI interpretation. Voice becomes another natural-language entry point into the same action system already used by AI agents.

#### 4. Continuous Hands-Free Coaching Loop

The complete interaction loop is optimized for actual movement practice:

1. The dancer taps the microphone once.
2. The browser begins the continuous voice-listening workflow.
3. Speech is recorded via MediaRecorder.
4. Audio is transcribed by Groq Whisper Turbo through `/api/voice`.
5. The dispatcher resolves the command into a `TrainerBridge` action.
6. The dance trainer updates song, tempo, mode, or playback in real-time.

This enables a true **continuous hands-free coaching loop**: dancers can step away from the device, practice on the dance floor, and issue commands such as **"Start"**, **"Zwolnij"**, **"Baby steps"**, **"Pauza"**, or **"Od nowa"** at any time without touching the screen.

### Why This Matters

A wedding dance trainer is especially well suited to voice interaction because practice often happens **while moving**, with limited ability to tap controls accurately. The Voice AI Coach reduces friction between instruction and action, making the system feel closer to a real dance coach standing nearby and responding instantly to spoken requests.

---

## 🎯 The Problem

Learning a wedding dance is often harder than it looks.

A beginner has to simultaneously understand:

- which foot moves,
- where the body weight goes,
- when the movement happens,
- how the syncopation works,
- which direction to move,
- and how to keep the rhythm when real music starts playing.

Traditional dance tutorials usually explain these elements separately.

**Dwa na Jeden combines them into one interactive practice environment — and makes the application's knowledge and real-time controls available to AI agents through WebMCP.**

---

## 🕺 The Dance: "Dwa na Jeden"

The basic movement consists of four phases:

| Phase         |   Timing | Movement                                                        |
| ------------- | -------: | --------------------------------------------------------------- |
| **1 — One**   |   1 beat | Left foot moves sideways while weight remains on the right foot |
| **2 — Two**   |   1 beat | Right foot closes in and takes the weight                       |
| **3 — Three** | 0.5 beat | Quick movement of the leading foot                              |
| **and**       | 0.5 beat | Syncopated closing movement                                     |

The complete pattern lasts:

**1 + 1 + 0.5 + 0.5 = 3 beats**

The direction alternates between bars, creating a continuous mirrored movement.

### Practice methodology

The application follows a beginner-friendly approach based on:

- bent knees,
- no jumping,
- sliding the feet across the floor,
- small controlled movements,
- conscious weight transfer,
- gradual speed progression,
- mirrored left/right movement.

### Baby Steps

The **Baby Steps** mode reduces the size of the movements, allowing beginners to focus on rhythm and weight transfer before increasing the amplitude of their steps.

---

## 🎵 13 Polish Wedding Songs

The application includes **13 real Polish wedding hits**, each represented by a song identifier, BPM value, YouTube ID, YouTube URL, and a direct training URL.

|   # | Artist — Song                                  | BPM |
| --: | ---------------------------------------------- | --: |
|   1 | Akcent — Życie To Są Chwile                    | 120 |
|   2 | Boys — Najpiękniejsza Dziewczyno               | 124 |
|   3 | Akcent — Prawdziwa Miłość to Ty (Cudowna jest) | 124 |
|   4 | Masters — Żono moja                            | 125 |
|   5 | MIG — Miód Malina                              | 126 |
|   6 | Boys — Jesteś Szalona                          | 128 |
|   7 | Boys — Moja kochana                            | 128 |
|   8 | Daj to głośniej — Mama ostrzegała              | 128 |
|   9 | Boys — Wolność                                 | 130 |
|  10 | Weekend — Ona Tańczy Dla Mnie                  | 130 |
|  11 | Czadoman — Ruda tańczy jak szalona             | 132 |
|  12 | Akcent — Przez Twe Oczy Zielone                | 135 |
|  13 | Piękni i Młodzi — Niewiara                     | 138 |

The range from **120 to 138 BPM** makes it possible to progress naturally from slower practice songs to faster wedding-floor tempos.

The complete 13-song database is managed through one canonical data source (`lib/songs.json` / `lib/songs-data.ts`) shared by React, WebMCP, and the Node.js server.

> **Note:** The demo video linked above is the project's application demonstration video. It is separate from the 13-song music database.

---

## 🎚️ Adaptive Practice

The songs are grouped by difficulty. The same BPM ranges drive the `recommend_song_by_bpm` tool:

### 🟢 Beginner — 120–124 BPM

A slower tempo, designed for learning the basic timing, footwork, and weight transfer.

### 🟡 Intermediate — 125–130 BPM

A medium tempo, designed for developing smoothness and maintaining the pattern at a more realistic dance-floor tempo.

### 🔴 Advanced — 132–138 BPM

A faster tempo, designed for experienced dancers who want to maintain the pattern at a fast, energetic wedding-floor pace.

The application also supports three practice speeds:

```text
0.5×   → slow learning
1.0×   → normal speed
1.25×  → challenge mode
```

---

## 🤖 WebMCP Integration — From Knowledge Layer to Autonomous Dance Coach

WebMCP is a core part of this project.

Instead of forcing an AI agent to interpret the application's UI, the application exposes structured tools and resources that an agent can use directly.

### What Changed in the P1 Milestone

The initial version of the application (P0 — Knowledge Layer) exposed three **read-only knowledge tools**: agents could *query* the song library, look up step instructions, and get BPM-based song recommendations. The agent was a knowledgeable observer — it could answer questions about the dance, but it could not *do* anything inside the application.

The P1 upgrade introduces **Action & State Inspection**: seven new tools that allow an agent to **directly pilot and control the dance trainer in real-time**. The agent can now:

- **Inspect live state** — read the current song, BPM, playback status, active step phase, direction, weight-bearing foot, and moving foot at any moment.
- **Take action** — select a song, change the tempo, switch between Baby Steps and Full Steps, and start, pause, or reset the practice session.
- **Orchestrate autonomously** — chain multiple tools together to set up and run a complete practice session from a single user prompt, with no human interaction in the UI.

This transforms the application from a *knowledgeable reference* into a **fully agent-driven dance coach**: the human asks, the agent decides and acts, and the web browser autonomously begins playback and footwork animation.

The interaction model is now:

```text
User
  ↓
AI Agent  ──── calls Action & Control tools ────┐
  ↓                                              ↓
WebMCP                                     Browser UI
  ↓                                     (autonomously updates)
Dwa na Jeden tools                              ↓
  ↓                                        Visual footwork
Structured dance & music data            Audio playback
                                         Step animation
```

---

## 🧰 Complete 10-Tool WebMCP Suite

The application exposes **10 tools** through WebMCP, organized into three categories:

| #   | Category          | Tool                    | Type     | Description                                      |
| --- | ----------------- | ----------------------- | -------- | ------------------------------------------------ |
| 1   | Knowledge         | `get_wedding_songs`     | Read     | Retrieve all 13 wedding songs with metadata      |
| 2   | Knowledge         | `get_step_instructions` | Read     | Retrieve structured four-phase dance methodology |
| 3   | Knowledge         | `recommend_song_by_bpm` | Read     | Recommend a song based on skill level / BPM      |
| 4   | State Inspection  | `get_training_state`    | Read     | Inspect real-time training session state         |
| 5   | Action & Control  | `set_song`              | Action   | Select the active practice song                  |
| 6   | Action & Control  | `set_tempo`             | Action   | Set playback speed (0.5 / 1 / 1.25)              |
| 7   | Action & Control  | `set_practice_mode`     | Action   | Switch Baby Steps / Full Steps                   |
| 8   | Action & Control  | `start_practice`        | Action   | Begin playback and footwork animation            |
| 9   | Action & Control  | `pause_practice`        | Action   | Pause playback                                   |
| 10  | Action & Control  | `reset_practice`        | Action   | Reset the session to initial state               |

---

### 📚 Knowledge Tools (3)

These tools provide read-only access to the application's structured dance and music knowledge. They were part of the original P0 Knowledge Layer and remain fully available.

#### `get_wedding_songs`

Returns the application's complete collection of 13 wedding songs, including:

- song identifier,
- artist and title,
- BPM,
- YouTube ID,
- YouTube URL,
- direct training URL (`https://dwanajeden.netlify.app/?song=<id>`).

An agent can use this information to recommend appropriate music without guessing.

#### `get_step_instructions`

Returns the structured methodology for the four phases of the dance:

```text
ONE   → 1 beat
TWO   → 1 beat
THREE → 0.5 beat
AND   → 0.5 beat
```

The response also contains the step name ("Szuraniec"), the alternative name ("Disco Fox 2-on-1"), the overall timing, and the Baby Steps methodology.

#### `recommend_song_by_bpm`

Recommends a song based on the dancer's skill level:

```text
beginner      → 120–124 BPM
intermediate  → 125–130 BPM
advanced      → 132–138 BPM
```

For example, an agent can handle a request such as:

> "I'm a beginner. Which song should I practice with?"

and use the application's structured song data to make the recommendation.

---

### 🔍 Real-Time State Inspection Tool (1)

#### `get_training_state`

Returns a complete snapshot of the current training session state in real-time. This allows an agent to observe what is happening in the browser at any moment and make informed decisions about what action to take next.

The response includes:

| Field                  | Type      | Description                                                        |
| ---------------------- | --------- | ------------------------------------------------------------------ |
| `activeSong`           | string    | The currently selected song (identifier, artist, title)            |
| `effectiveBpm`         | number    | The effective BPM after applying the current tempo multiplier      |
| `playbackStatus`       | string    | Current playback status: `"playing"`, `"paused"`, or `"stopped"`   |
| `activeStepPhase`      | string    | The current step phase: `"One"`, `"Two"`, `"Three"`, or `"And"`    |
| `cycleBar`             | number    | The current bar number within the repeating dance cycle            |
| `direction`            | string    | Current movement direction: `"left"` or `"right"`                  |
| `weightBearingFoot`    | string    | Which foot is currently bearing the dancer's weight: `"left"` or `"right"` |
| `movingFoot`           | string    | Which foot is currently in motion: `"left"` or `"right"`           |

Example response:

```json
{
  "activeSong": {
    "id": "akcent_zycie_to_sa_chwile",
    "artist": "Akcent",
    "title": "Życie To Są Chwile"
  },
  "effectiveBpm": 60,
  "playbackStatus": "playing",
  "activeStepPhase": "Two",
  "cycleBar": 3,
  "direction": "right",
  "weightBearingFoot": "right",
  "movingFoot": "left"
}
```

This tool is the foundation of the agent's awareness: by calling `get_training_state`, the agent can determine whether the dancer is mid-step, which phase they are in, whether playback is running, and whether the current tempo is appropriate — then decide whether to pause, change the song, adjust the speed, or let the session continue.

---

### 🎮 Action & Control Tools (6)

These tools allow an agent to **directly control the dance trainer** in the browser. Each tool maps to a concrete UI action and triggers the corresponding visual, audio, and animation updates in real-time.

#### `set_song(songId)`

Selects the active practice song.

| Parameter | Type   | Description                                      |
| --------- | ------ | ------------------------------------------------ |
| `songId`  | string | The song identifier from the 13-song database    |

When called, the application loads the corresponding song's BPM, YouTube metadata, and training URL. The browser UI updates to reflect the new song selection. This is the first step in most agent-orchestrated practice sessions.

#### `set_tempo(speed)`

Sets the playback speed multiplier.

| Parameter | Type                              | Description                                    |
| --------- | --------------------------------- | ---------------------------------------------- |
| `speed`   | `0.5 \| 1 \| 1.25`               | Half speed, normal speed, or challenge mode    |

The effective BPM is calculated as `song.bpm × speed`. For example, a 120 BPM song at `0.5×` speed results in an effective 60 BPM — ideal for beginners learning the basic pattern.

#### `set_practice_mode(mode)`

Switches between Baby Steps and Full Steps practice modes.

| Parameter | Type                              | Description                                              |
| --------- | --------------------------------- | -------------------------------------------------------- |
| `mode`    | `"baby_steps" \| "full_steps"`   | Reduced movement amplitude for beginners, or full range  |

In `baby_steps` mode, the visual footwork instructions show smaller, more controlled movements — allowing beginners to focus on rhythm and weight transfer. In `full_steps` mode, the full movement amplitude is displayed.

#### `start_practice()`

Begins playback and the footwork animation. No parameters.

When called, the application:

1. Starts the YouTube audio playback for the selected song (at the current tempo).
2. Begins the step engine, cycling through the four phases (One → Two → Three → And).
3. Activates visual footwork instructions, audio rhythm cues, and vibration patterns.
4. Sets `playbackStatus` to `"playing"`.

This is the final step in an agent-orchestrated setup chain. After calling `start_practice`, the browser autonomously runs the full dance practice session.

#### `pause_practice()`

Pauses playback and the footwork animation. No parameters.

When called, the application:

1. Pauses YouTube audio playback.
2. Freezes the step engine at the current phase.
3. Stops visual, audio, and vibration cues.
4. Sets `playbackStatus` to `"paused"`.

The session state (current song, tempo, mode, step phase, bar) is preserved and can be resumed with `start_practice`.

#### `reset_practice()`

Resets the training session to its initial state. No parameters.

When called, the application:

1. Stops and resets YouTube audio playback to the beginning.
2. Resets the step engine to the first phase (One) and bar 1.
3. Resets direction to the default starting side.
4. Sets `playbackStatus` to `"stopped"`.

This is useful when an agent wants to restart a practice session from the beginning, or clear the state before configuring a new setup.

---

## 🔗 Agentic Orchestration Example

The true power of the P1 upgrade is that an agent can chain multiple tools together to autonomously set up and run a complete practice session from a single natural-language user prompt — with no human interaction in the UI.

### Scenario

> **User:** "I'm a beginner, set me up and start practice."

### Agent Execution Chain

The agent receives the prompt, understands the intent, and executes the following sequence of tool calls:

```text
Step 1: recommend_song_by_bpm(skill_level="beginner")
         → Returns: { songId: "akcent_zycie_to_sa_chwile", bpm: 120, ... }

Step 2: set_song(songId="akcent_zycie_to_sa_chwile")
         → Browser loads song: Akcent — Życie To Są Chwile (120 BPM)

Step 3: set_practice_mode(mode="baby_steps")
         → Browser switches to Baby Steps mode (small, controlled movements)

Step 4: set_tempo(speed=0.5)
         → Browser sets tempo to 0.5× (effective BPM: 60 — slow learning pace)

Step 5: start_practice()
         → Browser begins:
           ✓ YouTube audio playback (Akcent — Życie To Są Chwile at half speed)
           ✓ Step engine cycling: One → Two → Three → And
           ✓ Visual footwork animation (Baby Steps amplitude)
           ✓ Audio rhythm cues
           ✓ Vibration patterns
           ✓ playbackStatus = "playing"
```

### Result

The web browser **autonomously** begins a complete beginner practice session:

- 🎵 **Song:** Akcent — Życie To Są Chwile
- 🎚️ **Tempo:** 0.5× (60 effective BPM)
- 👣 **Mode:** Baby Steps
- ▶️ **Status:** Playing
- 💃 **Animation:** Footwork instructions cycling through all four phases

The user simply said "I'm a beginner, set me up and start practice" — and the agent did the rest, calling five tools in sequence to configure and launch the session entirely on its own.

### Monitoring the Session

Once the session is running, the agent can use `get_training_state` to monitor progress:

```text
Agent: get_training_state()
  → {
      activeSong: "Akcent — Życie To Są Chwile",
      effectiveBpm: 60,
      playbackStatus: "playing",
      activeStepPhase: "Three",
      cycleBar: 5,
      direction: "left",
      weightBearingFoot: "left",
      movingFoot: "right"
    }
```

Based on the state, the agent can decide to:

- **Increase tempo** — if the user says "I'm getting the hang of it, speed it up": `set_tempo(1)` then (playback continues at full speed).
- **Switch to Full Steps** — if the user says "I'm ready for bigger movements": `set_practice_mode("full_steps")`.
- **Change the song** — if the user says "give me something faster": `recommend_song_by_bpm("intermediate")` → `set_song(...)` → `start_practice()`.
- **Pause** — if the user says "let me take a break": `pause_practice()`.
- **Reset and restart** — if the user says "let me try again from the top": `reset_practice()` → `start_practice()`.

This is the core of the **autonomous dance coach**: the agent observes state, receives instructions, and acts — closing the loop between the human, the AI, and the running application.

---

## 📡 WebMCP Discovery Manifest

The application publishes a WebMCP discovery manifest at:

```text
/.well-known/mcp.json
```

Production URL:

```text
https://dwanajeden.netlify.app/.well-known/mcp.json
```

The manifest describes the available **10 tools** (3 knowledge, 1 state inspection, 6 action & control) and exposes the dance methodology and the song library as structured resources.

The available resources are:

```text
dance://methodology/szuraniec
dance://songs/wedding-hits
```

The first provides machine-readable information about the basic dance pattern; the second exposes the full 13-song training library (artist, BPM, YouTube URL, training URL).

---

## 🏗️ Architecture — WebMCP Client & Server

The WebMCP integration is implemented across multiple layers:

### Native In-Browser WebMCP Client

- **`lib/webmcp-client.ts`** — Registers all 10 tools with the browser's native WebMCP API using `document.modelContext.registerTool`. Each tool handler directly interacts with the React state and the Web Audio / YouTube IFrame engines.
- **`components/dance-trainer.tsx`** — The React bridge that connects tool handlers to the live application state, ensuring that every action tool call triggers the corresponding UI, audio, and animation updates in real-time.
- **`components/webmcp-provider.tsx`** — Provides the WebMCP context and initializes the client on application load.

### Standalone JSON-RPC MCP Server Mirror

- **`mcp-server.js`** — A standalone Node.js server that mirrors the full 10-tool suite via JSON-RPC 2.0, allowing external MCP clients (Claude Desktop, etc.) to connect and interact with the same tool definitions outside the browser.

### Discovery

- **`public/.well-known/mcp.json`** — The v2.0.0 discovery manifest listing all tools and resources, published at the standard WebMCP discovery endpoint.

### Testing

- **`__tests__/webmcp.test.ts`** — Comprehensive Vitest test suite covering all 10 tools (knowledge, state inspection, and action & control). **8/8 tests passing, 0 TypeScript errors.**

---

## 🌐 Why WebMCP Is a Natural Fit

This project is not using WebMCP simply as an add-on.

Dance coaching is an example of a task where users naturally ask contextual questions:

- "I'm a beginner — what should I practice?"
- "Give me a slower song."
- "What is the correct timing?"
- "Which foot takes the weight?"
- "Can I practice this at half speed?"
- "Set me up and start practice."
- "I'm getting the hang of it — speed it up!"
- "Pause it for a second."

An AI agent can understand these requests and use the application's structured capabilities to **not only answer questions based on actual application data, but also take direct action** — selecting songs, adjusting tempo, switching modes, and controlling playback.

Without WebMCP, an agent would have to rely on:

- scraping the UI,
- interpreting page content,
- guessing available functionality,
- or giving generic dance advice.

With WebMCP, the agent can access explicitly defined application capabilities — both **reading** the application's knowledge and **controlling** the application's behavior in real-time.

---

## 🧠 Human + Agent + Application

The goal is not to replace the dancer or the application.

Instead, WebMCP creates a collaboration layer where the agent can both **understand** and **act**:

```text
┌──────────────────────────┐
│         Human            │
│  "I'm a beginner,        │
│   set me up and          │
│   start practice"        │
└───────────┬──────────────┘
            ↓
┌──────────────────────────┐
│       AI Agent           │
│  understands the request │
│  plans tool chain:       │
│  recommend → set_song →  │
│  set_mode → set_tempo →  │
│  start_practice          │
└───────────┬──────────────┘
            ↓
┌──────────────────────────┐
│        WebMCP            │
│  10 structured tools     │
│  (3 knowledge            │
│   1 state inspection     │
│   6 action & control)    │
└───────────┬──────────────┘
            ↓
┌──────────────────────────┐
│  Dwa na Jeden            │
│  Dance Coach (browser)   │
│  ✓ Song loaded           │
│  ✓ Baby Steps active     │
│  ✓ Tempo 0.5×            │
│  ✓ Playback started      │
│  ✓ Footwork animating    │
└──────────────────────────┘
```

The human remains in control of the actual dancing, while the agent can help navigate the application's knowledge **and directly control the practice session** — closing the loop between intent and action.

---

## 🔊 Browser Technologies

The application combines several browser-native and web technologies:

- Next.js
- React
- TypeScript
- WebMCP / Model Context Protocol
- HTML5 MediaRecorder API
- Groq Cloud (Whisper Large v3 Turbo)
- Web Audio API
- Web Vibration API
- YouTube IFrame API
- Netlify
- PL / EN internationalization
- Vitest (Automated Unit Testing)
- GitHub Actions (CI/CD Pipeline)
- Next.js (App Router & Turbopack)

The result is a browser-based dance coach that combines visual, audio, and AI-agent interaction — with full real-time control.

---

## 🎧 Music Integration

Songs are represented in the application as structured data:

```ts
export type Song = {
  id: keyof typeof pl.SONG_NAMES;
  bpm: number;
  youtubeId: string;
};
```

At runtime each song is enriched with a **YouTube URL** and a **direct training URL** pointing at the practice view for that song.

The current database contains 13 songs, ranging from 120 to 138 BPM.

Each song entry connects the application's structured music data with a corresponding YouTube video through its YouTube ID.

The complete 13-song database is managed through one canonical data source (`lib/songs.json` / `lib/songs-data.ts`) shared by React, WebMCP, and the Node.js server.

This allows the application to combine:

```text
Song
 ↓
BPM
 ↓
Practice difficulty
 ↓
YouTube music
 ↓
Dance practice
```

---

## 🧩 Step Engine

The dance pattern is represented programmatically as four phases:

```text
ONE   → 1 beat
TWO   → 1 beat
THREE → 0.5 beat
AND   → 0.5 beat
```

Each phase contains information about:

- the step number and name,
- duration,
- movement direction,
- weight-bearing foot,
- syncopation.

The engine automatically mirrors the movement direction between bars.

This allows the same underlying model to drive both the visual footwork instructions and the rhythm guidance — and, through the `get_training_state` tool, expose its real-time state to AI agents.

---

## 🌍 Internationalization

The application supports:

- Polish 🇵🇱
- English 🇬🇧

Translations are stored separately:

```text
locales/
├── pl.json
└── en.json
```

The application interface can therefore be presented to both Polish users and an international audience.

---

## 🚀 Running Locally

### Requirements

- Node.js
- pnpm
- a modern browser

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

The application will be available at the local development URL provided by Next.js, normally:

```text
http://localhost:3000
```

### Production build

```bash
pnpm build
```

### Tests and type checking

```bash
# Run automated tests (8/8 passing)
pnpm test

# Run TypeScript typecheck (0 errors)
pnpm typecheck
```

---

## ⏱️ Built During The WebMCP Challenge (Aug 25 – Sep 3, 2026)

In accordance with the hackathon guidelines, the following core WebMCP systems and AI agent integrations were designed, implemented, and deployed during the official submission window:

- **Native In-Browser WebMCP Integration**: Client-side registration using `document.modelContext.registerTool` (`lib/webmcp-client.ts`, `components/webmcp-provider.tsx`, `components/dance-trainer.tsx`).
- **Full 10-Tool Suite**: 3 knowledge tools + 1 real-time state inspection tool + 6 action & control tools — all registered, tested, and verified.
- **Autonomous MCP Server & Discovery Manifest**: Standalone JSON-RPC server (`mcp-server.js`) and `.well-known/mcp.json` v2.0.0 endpoint listing all 10 tools.
- **Pedagogical AI Tool Schemas**: Structured methodology engines (`get_step_instructions`, `get_wedding_songs`, `recommend_song_by_bpm`).
- **Real-Time State Inspection**: `get_training_state` exposing live step phase, direction, weight-bearing foot, moving foot, playback status, and effective BPM.
- **Agent-Driven Action & Control**: `set_song`, `set_tempo`, `set_practice_mode`, `start_practice`, `pause_practice`, `reset_practice` — enabling fully autonomous agent orchestration.
- **Real-Time Agent Orchestration**: Connecting Web Audio/Vibration sync engine to agent-driven parameters — agents can chain tools to set up and launch complete practice sessions from a single user prompt.
- **Voice AI Coach Integration**: A real-time hands-free coaching layer built with HTML5 MediaRecorder, Groq Cloud Whisper Large v3 Turbo, `/api/voice`, and the WebMCP bridge dispatcher — enabling spoken PL/EN commands to trigger live trainer actions.
- **Automated Quality & Canonical Data Architecture**: Vitest unit tests (8/8 passing, 0 TypeScript errors) run through GitHub Actions CI, while the complete 13-song library is maintained in one canonical data source shared by React, WebMCP, and the Node.js server.

---

## 📜 License

This project is licensed under the MIT License. (Required by The WebMCP Challenge).

---

## 🧪 Testing WebMCP

The production application is available at:

```text
https://dwanajeden.netlify.app/
```

The WebMCP discovery manifest is available at:

```text
https://dwanajeden.netlify.app/.well-known/mcp.json
```

The application should be tested in a WebMCP-capable browser/environment.

For Chrome-based testing, use a version supporting WebMCP and enable the appropriate experimental WebMCP functionality if required by the current browser release.

All 10 tools (3 knowledge, 1 state inspection, 6 action & control) are fully implemented and verified — 8/8 tests passing in Vitest with 0 TypeScript errors.

---

## 🏆 The WebMCP Challenge

Dwa na Jeden — Wedding Dance AI Coach was created as a project for The WebMCP Challenge.

The project explores a simple question:

_What happens when a normal website becomes something an AI agent can actively use — and actively control?_

The answer here is a dance coach where the agent can:

- **query** the application's structured knowledge about dance steps, timing, movement, music, BPM, and difficulty levels,
- **inspect** the real-time training state — which step phase is active, which direction, which foot bears weight, which foot is moving, whether playback is running,
- **control** the application directly — selecting songs, adjusting tempo, switching practice modes, and starting, pausing, and resetting the session.

The project combines a real-world human problem with an agent-friendly web interface, demonstrating how WebMCP can turn a traditional web application into something that both people and AI agents can interact with — and that AI agents can pilot autonomously.

---

## 💡 Project Highlights

- 🎵 13 Polish wedding songs
- 🕺 Structured Dwa na Jeden / Szuraniec dance methodology
- 🎚️ 0.5× / 1× / 1.25× practice speeds
- 👣 Baby Steps beginner mode
- 🔊 Real-time audio rhythm guidance
- 🎥 YouTube music integration
- 🎬 Application demo video
- 🎙️ **Real-time Voice AI Coach** powered by Groq Whisper Large v3 Turbo
- 🎤 **HTML5 MediaRecorder voice pipeline** for cross-browser hands-free control
- 🤖 **10 WebMCP tools for AI agents** (3 knowledge + 1 state inspection + 6 action & control)
- 🔍 **Real-time state inspection** (`get_training_state`) — step phase, direction, feet, playback status
- 🎮 **Agent-driven control** — set song, tempo, mode, start/pause/reset
- 🔗 **Autonomous orchestration** — agent chains tools to run complete practice sessions
- 📡 `.well-known/mcp.json` discovery manifest (10 tools + structured resources)
- 🌍 Polish and English interfaces
- ⚡ Browser-native APIs
- ☁️ Deployed on Netlify
- 🧪 Automated unit tests with Vitest (8/8 passing) and GitHub Actions CI
- 🗂️ Canonical song data architecture shared by React, WebMCP, and the Node.js server

---

## 🌐 Links

🌐 **Live Demo:** https://dwanajeden.netlify.app/

🎥 **Demo Video:** https://www.youtube.com/watch?v=6MDFggcT04g

📡 **WebMCP Manifest:** https://dwanajeden.netlify.app/.well-known/mcp.json

---

💃🕺 **Learn the step. Pick the music. Let the agent set it up and start.**

**Dwa na Jeden — Wedding Dance AI Coach**
