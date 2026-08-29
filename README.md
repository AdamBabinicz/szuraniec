# Dwa na Jeden — Wedding Dance AI Coach 💃🕺

**An AI-powered interactive coach for learning the Polish wedding dance step “Dwa na Jeden” (Szuraniec / Disco Fox 2-to-1).**

🌐 **Live demo:** https://dwanajeden.netlify.app/

🎥 **Demo video:** https://www.youtube.com/watch?v=6MDFggcT04g

Dwa na Jeden is a web application that helps people learn, practice, and improve a popular Polish wedding dance step through **rhythm-based guidance, visual footwork instructions, interactive audio cues, adjustable practice speed, and real wedding music**.

The project also exposes structured capabilities through **WebMCP (Model Context Protocol for the Web)**, allowing AI agents to interact with the application using tools instead of simply describing what the user should click.

---

## 🎥 Demo Video

The following video demonstrates the application and its core functionality:

**▶️ [Dwa na Jeden — Wedding Dance AI Coach Demo](https://www.youtube.com/watch?v=6MDFggcT04g)**

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
