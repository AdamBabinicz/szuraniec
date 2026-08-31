/**
 * webmcp-client.ts
 * Native WebMCP (document.modelContext.registerTool) registration for
 * "Dwa na Jeden — Wedding Dance AI Coach".
 *
 * Mirrors 1:1 the payloads and logic of the standalone JSON-RPC server
 * (mcp-server.js, serverInfo "dwa-na-jeden-trainer" v2.0.0):
 *   - get_wedding_songs     -> getWeddingSongsPayload()
 *   - get_step_instructions -> getMethodologyPayload()
 *   - recommend_song_by_bpm -> recommendSong(level)
 *
 * Spec (origin trial): https://webmachinelearning.github.io/webmcp/
 * Test in Chrome:      chrome://flags/#enable-webmcp-testing
 */

import { reportIssue } from "@/lib/logger";
import { SONGS_DATA } from "@/lib/songs-data";

export const APP_URL = "https://dwanajeden.netlify.app";

export type Level = "beginner" | "intermediate" | "advanced";

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  youtubeId: string;
}

export interface SerializedSong extends Song {
  youtubeUrl: string;
  trainingUrl: string;
}

export interface WeddingSongsPayload {
  count: number;
  description: string;
  songs: SerializedSong[];
}

export interface InstructionPhase {
  step: number;
  name: string;
  duration: string;
  action: string;
}

export interface MethodologyPayload {
  stepName: string;
  alternativeName: string;
  methodology: string;
  phases: InstructionPhase[];
  timing: string;
  babySteps: string;
  appUrl: string;
}

export interface RecommendationPayload {
  level: Level;
  recommendedSong: SerializedSong;
  bpmRange: { min: number; max: number };
  reason: string;
}

/* ------------------------------------------------------------------ */
/* Data — zasilane z kanonicznego songs-data.ts                       */
/* ------------------------------------------------------------------ */

const SONGS: Song[] = SONGS_DATA.map((s) => ({
  id: s.id,
  title: s.title.pl,
  artist: s.artist,
  bpm: s.bpm,
  youtubeId: s.youtubeId,
}));

const INSTRUCTIONS = {
  stepName: "Szuraniec",
  alternativeName: "Disco Fox 2-on-1",
  methodology:
    "PrimaDance-inspired wedding dance method: bent knees, no jumping, smooth sole-to-floor movement, controlled weight transfer, and optional Baby Steps for beginners.",
  phases: [
    {
      step: 1,
      name: "One",
      duration: "1 beat",
      action:
        "The left foot slides to the left while body weight remains on the right foot.",
    },
    {
      step: 2,
      name: "Two",
      duration: "1 beat",
      action:
        "The right foot closes toward the left foot and the body weight transfers to the moving foot.",
    },
    {
      step: 3,
      name: "Three",
      duration: "0.5 beat",
      action: "A quick half-beat sliding movement with the leading foot.",
    },
    {
      step: 4,
      name: "And",
      duration: "0.5 beat",
      action:
        "The other foot closes on the syncopation without creating a heavy step. The next bar mirrors the direction.",
    },
  ],
  timing:
    "The complete pattern lasts 3 beats: 1 + 1 + 0.5 + 0.5. The direction alternates every bar.",
  babySteps:
    "Baby Steps mode reduces movement size so beginners can focus on rhythm and weight transfer before increasing amplitude.",
};

const LEVEL_RANGES: Record<
  Level,
  { min: number; max: number; explanation: string }
> = {
  beginner: {
    min: 120,
    max: 124,
    explanation:
      "A slower tempo is recommended for learning the basic movement and weight transfer.",
  },
  intermediate: {
    min: 125,
    max: 130,
    explanation:
      "A medium tempo is suitable for dancers who already know the basic pattern.",
  },
  advanced: {
    min: 132,
    max: 138,
    explanation:
      "A faster tempo provides a more energetic wedding-dance challenge.",
  },
};

/* ------------------------------------------------------------------ */
/* Payload buildery — wyjście identyczne z serwerem                    */
/* ------------------------------------------------------------------ */

function serializeSong(song: Song): SerializedSong {
  return {
    ...song,
    youtubeUrl: `https://www.youtube.com/watch?v=${song.youtubeId}`,
    trainingUrl: `${APP_URL}/?song=${encodeURIComponent(song.id)}`,
  };
}

export function getWeddingSongsPayload(): WeddingSongsPayload {
  return {
    count: SONGS.length,
    description:
      "13 Polish wedding songs selected for practicing the Szuraniec / Disco Fox 2-on-1 step.",
    songs: SONGS.map(serializeSong),
  };
}

export function getMethodologyPayload(): MethodologyPayload {
  return { ...INSTRUCTIONS, appUrl: APP_URL };
}

export function recommendSong(levelParam?: string): RecommendationPayload {
  const normalizedLevel: Level =
    levelParam && levelParam in LEVEL_RANGES
      ? (levelParam as Level)
      : "beginner";
  const selectedRange = LEVEL_RANGES[normalizedLevel];

  const candidates = SONGS.filter(
    (song) => song.bpm >= selectedRange.min && song.bpm <= selectedRange.max,
  );

  const song =
    normalizedLevel === "beginner"
      ? candidates[0]
      : normalizedLevel === "intermediate"
        ? candidates[Math.floor(candidates.length / 2)]
        : candidates[candidates.length - 1];

  return {
    level: normalizedLevel,
    recommendedSong: serializeSong(song),
    bpmRange: { min: selectedRange.min, max: selectedRange.max },
    reason: selectedRange.explanation,
  };
}

/* ------------------------------------------------------------------ */
/* Rejestracja WebMCP (document.modelContext.registerTool)             */
/* ------------------------------------------------------------------ */

interface WebMCPToolDescriptor {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute(
    input: unknown,
  ): Promise<{ content: Array<{ type: "text"; text: string }> }>;
}

interface ModelContext {
  registerTool(
    descriptor: WebMCPToolDescriptor,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
}

interface DocumentWithWebMCP extends Document {
  modelContext?: ModelContext;
}

const stringifyTextContent = (payload: unknown): string =>
  JSON.stringify(payload, null, 2);

function getModelContext(): ModelContext | undefined {
  if (typeof document === "undefined") return undefined;
  return (document as DocumentWithWebMCP).modelContext;
}

let registered = false;
let controller: AbortController | null = null;

/**
 * Rejestruje trzy narzędzia trenera tańca w przeglądarkowym API WebMCP.
 * Idempotentne — bezpieczne przy wielokrotnym wywołaniu
 * (React StrictMode, HMR). Zwraca true, gdy narzędzia są aktywne,
 * false, gdy WebMCP jest niedostępne w przeglądarce.
 */
export async function registerWebMCPTools(): Promise<boolean> {
  const modelContext = getModelContext();
  if (!modelContext?.registerTool) {
    console.info(
      "[webmcp-client] WebMCP not supported in this browser; tools not registered.",
    );
    return false;
  }
  if (registered) return true;

  controller = new AbortController();
  const options = { signal: controller.signal };

  try {
    await modelContext.registerTool(
      {
        name: "get_wedding_songs",
        description:
          "Returns the complete library of 13 verified Polish wedding songs, including artist, BPM, YouTube ID, YouTube URL, and a direct training URL.",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          return {
            content: [
              {
                type: "text",
                text: stringifyTextContent(getWeddingSongsPayload()),
              },
            ],
          };
        },
      },
      options,
    );

    await modelContext.registerTool(
      {
        name: "get_step_instructions",
        description:
          "Returns the complete English instructions and timing for the four phases of the Szuraniec / Disco Fox 2-on-1 wedding dance step.",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          return {
            content: [
              {
                type: "text",
                text: stringifyTextContent(getMethodologyPayload()),
              },
            ],
          };
        },
      },
      options,
    );

    await modelContext.registerTool(
      {
        name: "recommend_song_by_bpm",
        description:
          "Recommends a wedding song from the 13-song training library based on the dancer's level: beginner, intermediate, or advanced.",
        inputSchema: {
          type: "object",
          properties: {
            level: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced"],
              description: "The dancer's experience level.",
            },
          },
          required: ["level"],
        },
        async execute(input) {
          const { level } = (input ?? {}) as { level?: string };
          return {
            content: [
              {
                type: "text",
                text: stringifyTextContent(recommendSong(level)),
              },
            ],
          };
        },
      },
      options,
    );

    registered = true;
    return true;
  } catch (error: any) {
    registered = false;
    controller = null;

    // Jeśli błąd to AbortError (spowodowany odmontowaniem komponentu w React StrictMode), nie logujemy go jako awarii
    if (error?.name === "AbortError" || error?.message?.includes("aborted")) {
      return false;
    }

    console.warn("[webmcp-client] Failed to register WebMCP tools:", error);
    try {
      reportIssue("webmcp", error);
    } catch {
      // Fallback
    }
    return false;
  }
}

/** Wyrejestrowuje wszystkie narzędzia (przerywa sygnał rejestracji). */
export function unregisterWebMCPTools(): void {
  controller?.abort();
  controller = null;
  registered = false;
}
