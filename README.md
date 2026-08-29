# Dwa na Jeden — Wedding Dance AI Coach 💃🕺

**An AI-powered interactive coach for learning the Polish wedding dance step “Dwa na Jeden” (Szuraniec / Disco Fox 2-to-1).**

🌐 **Live demo:** https://dwanajeden.netlify.app/

🎥 **Demo video:** https://youtu.be/rbSif4Ess3s

Dwa na Jeden is a web application that helps people learn, practice, and improve a popular Polish wedding dance step through **rhythm-based guidance, visual footwork instructions, interactive audio cues, adjustable practice speed, and real wedding music**.

The project also exposes structured capabilities through **WebMCP (Model Context Protocol for the Web)**, allowing AI agents to interact with the application using tools instead of simply describing what the user should click.

---

## 🎥 Demo Video

The following video demonstrates the application and its core functionality:

**▶️ Dwa na Jeden — Wedding Dance AI Coach Demo**

https://youtu.be/rbSif4Ess3s

The demo showcases the interactive dance-learning experience, including the visual step guidance, rhythm-based practice, music integration, and the overall application workflow.

---

# 🎯 The Problem

Learning a wedding dance is often harder than it looks.

A beginner has to simultaneously understand:

* which foot moves,
* where the body weight goes,
* when the movement happens,
* how the syncopation works,
* which direction to move,
* and how to keep the rhythm when real music starts playing.

Traditional dance tutorials usually explain these elements separately.

**Dwa na Jeden combines them into one interactive practice environment — and makes the application's knowledge available to AI agents through WebMCP.**

---

# 🕺 The Dance: “Dwa na Jeden”

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

* bent knees,
* no jumping,
* sliding the feet across the floor,
* small controlled movements,
* conscious weight transfer,
* gradual speed progression,
* mirrored left/right movement.

### Baby Steps

The **Baby Steps** mode reduces the size of the movements, allowing beginners to focus on rhythm and weight transfer before increasing the amplitude of their steps.

---

# 🎵 13 Polish Wedding Songs

The application includes **13 real Polish wedding hits**, each represented by a song identifier, BPM value, and YouTube video ID.

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

The range from **120 to 138 BPM** makes it possible to progress naturally from slower practice songs to faster wedding-floor tempos.

> **Note:** The demo video linked above is the project's application demonstration video. It is separate from the 13-song music database.

---

# 🎚️ Adaptive Practice

The songs are grouped by difficulty:

### 🟢 Beginner

Approximately **120–126 BPM**

Designed for learning the basic timing, footwork, and weight transfer.

### 🟡 Intermediate

Approximately **128–132 BPM**

Designed for developing smoothness and maintaining the pattern at a more realistic dance-floor tempo.

### 🔴 Advanced

Approximately **135–138 BPM**

Designed for experienced dancers who want to maintain the pattern at a fast tempo.

The application also supports three practice speeds:

```text
0.5×   → slow learning
1.0×   → normal speed
1.25×  → challenge mode
```

---

# 🤖 WebMCP Integration

WebMCP is a core part of this project.

Instead of forcing an AI agent to interpret the application's UI, the application exposes **structured tools and resources** that an agent can use directly.

This creates a simple interaction model:

```text
User
  ↓
AI Agent
  ↓
WebMCP
  ↓
Dwa na Jeden tools
  ↓
Structured dance & music data
```

## Available tools

### `get_wedding_songs`

Returns the application's complete collection of **13 wedding songs**, including:

* song identifier,
* BPM,
* YouTube ID.

An agent can use this information to recommend appropriate music without guessing.

---

### `get_step_instructions`

Returns the structured methodology for the four phases of the dance:

```text
ONE   → 1 beat
TWO   → 1 beat
THREE → 0.5 beat
AND   → 0.5 beat
```

The response also contains information about movement direction, weight distribution, timing, and the Baby Steps methodology.

---

### `recommend_song_by_bpm`

Recommends a song based on the dancer's skill level:

```text
beginner
intermediate
advanced
```

For example, an agent can handle a request such as:

> “I'm a beginner. Which song should I practice with?”

and use the application's structured song data to make the recommendation.

---

# 📡 WebMCP Discovery Manifest

The application publishes a WebMCP discovery manifest at:

```text
/.well-known/mcp.json
```

Production URL:

```text
https://dwanajeden.netlify.app/.well-known/mcp.json
```

The manifest describes the available tools and exposes the dance methodology as a structured resource.

One of the available resources is:

```text
dance://methodology/szuraniec
```

This provides machine-readable information about the basic dance pattern.

---

# 🌐 Why WebMCP Is a Natural Fit

This project is not using WebMCP simply as an add-on.

Dance coaching is an example of a task where users naturally ask **contextual questions**:

> “I'm a beginner — what should I practice?”

> “Give me a slower song.”

> “What is the correct timing?”

> “Which foot takes the weight?”

> “Can I practice this at half speed?”

An AI agent can understand these requests and use the application's structured capabilities to provide answers based on the actual application data.

Without WebMCP, an agent would have to rely on:

* scraping the UI,
* interpreting page content,
* guessing available functionality,
* or giving generic dance advice.

With WebMCP, the agent can access **explicitly defined application capabilities**.

---

# 🧠 Human + Agent + Application

The goal is not to replace the dancer or the application.

Instead, WebMCP creates a collaboration layer:

```text
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
```

The human remains in control of the actual dancing, while the agent can help navigate the application's knowledge and capabilities.

---

# 🔊 Browser Technologies

The application combines several browser-native and web technologies:

* **Next.js**
* **React**
* **TypeScript**
* **WebMCP / Model Context Protocol**
* **Web Audio API**
* **Web Vibration API**
* **YouTube IFrame API**
* **Netlify**
* **PL / EN internationalization**

The result is a browser-based dance coach that combines visual, audio, and AI-agent interaction.

---

# 🎧 Music Integration

Songs are represented in the application as structured data:

```ts
export type Song = {
  id: keyof typeof pl.SONG_NAMES;
  bpm: number;
  youtubeId: string;
};
```

The current database contains **13 songs**, ranging from **120 to 138 BPM**.

Each song entry connects the application's structured music data with a corresponding YouTube video through its YouTube ID.

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

# 🧩 Step Engine

The dance pattern is represented programmatically as four phases:

```ts
ONE   → 1 beat
TWO   → 1 beat
THREE → 0.5 beat
AND   → 0.5 beat
```

Each phase contains information about:

* movement direction,
* weight-bearing foot,
* duration,
* audio cue,
* syncopation.

The engine automatically mirrors the movement direction between bars.

This allows the same underlying model to drive both the **visual footwork instructions** and the **rhythm guidance**.

---

# 🌍 Internationalization

The application supports:

```text
Polish 🇵🇱
English 🇬🇧
```

Translations are stored separately:

```text
locales/
├── pl.json
└── en.json
```

The application interface can therefore be presented to both Polish users and an international audience.

---

# 🚀 Running Locally

## Requirements

* Node.js
* pnpm
* a modern browser

## Install

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

The application will be available at the local development URL provided by Next.js, normally:

```text
http://localhost:3000
```

## Production build

```bash
pnpm build
```

---

# 🧪 Testing WebMCP

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

---

# 🏆 The WebMCP Challenge

**Dwa na Jeden — Wedding Dance AI Coach** was created as a project for **The WebMCP Challenge**.

The project explores a simple question:

> **What happens when a normal website becomes something an AI agent can actively use?**

The answer here is a dance coach where the agent can understand the application's structured knowledge about:

* dance steps,
* timing,
* movement,
* music,
* BPM,
* and difficulty levels.

The project combines a real-world human problem with an agent-friendly web interface, demonstrating how WebMCP can turn a traditional web application into something that both **people and AI agents can interact with**.

---

# 💡 Project Highlights

* 🎵 **13 Polish wedding songs**
* 🕺 Structured **Dwa na Jeden / Szuraniec** dance methodology
* 🎚️ **0.5× / 1× / 1.25×** practice speeds
* 👣 **Baby Steps** beginner mode
* 🔊 Real-time audio rhythm guidance
* 🎥 YouTube music integration
* 🎬 **Application demo video**
* 🤖 **WebMCP tools for AI agents**
* 📡 `.well-known/mcp.json` discovery manifest
* 🌍 Polish and English interfaces
* ⚡ Browser-native APIs
* ☁️ Deployed on Netlify

---

# 🌐 Live Demo

**https://dwanajeden.netlify.app/**

### 🎥 Demo Video

**https://youtu.be/rbSif4Ess3s**

### WebMCP Manifest

**https://dwanajeden.netlify.app/.well-known/mcp.json**

---

## 💃🕺 Learn the step. Pick the music. Let the agent help.

**Dwa na Jeden — Wedding Dance AI Coach**
