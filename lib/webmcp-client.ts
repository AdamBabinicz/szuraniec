/**
 * webmcp-client.ts
 * Native WebMCP (document.modelContext.registerTool) registration for
 * "Dwa na Jeden — Wedding Dance AI Coach".
 *
 * Exposes:
 *  Knowledge Tools:
 *   - get_wedding_songs     -> getWeddingSongsPayload()
 *   - get_step_instructions -> getMethodologyPayload()
 *   - recommend_song_by_bpm -> recommendSong(level)
 *  State & Action Tools:
 *   - get_training_state    -> Returns real-time playback, beat, tempo and movement state
 *   - set_song              -> Sets active song by id
 *   - set_tempo             -> Sets playback speed (0.5x, 1x, 1.25x)
 *   - set_practice_mode     -> Toggles Baby Steps vs Full Steps mode
 *   - start_practice        -> Starts dance trainer playback
 *   - pause_practice        -> Pauses dance trainer playback
 *   - reset_practice        -> Resets dance trainer to start
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

export interface TrainerStateSnapshot {
  song: {
    id: string;
    title: string;
    artist: string;
    bpm: number;
    effectiveBpm: number;
  };
  training: {
    playing: boolean;
    speed: number;
    mode: "baby_steps" | "full_steps";
    step: number;
    beatName: string;
    cycle: number;
    source: "youtube" | "click";
    role: "leader" | "follower";
    muted: boolean;
    vibrate: boolean;
  };
  movement: {
    direction: "left" | "right";
    weightFoot: "left" | "right";
    movingFoot: "left" | "right";
    instruction: string;
  };
}

export interface TrainerBridge {
  getState: () => TrainerStateSnapshot;
  setSong: (songId: string) => {
    success: boolean;
    message: string;
    song?: SerializedSong;
  };
  setTempo: (speed: 0.5 | 1 | 1.25) => {
    success: boolean;
    speed: number;
    effectiveBpm: number;
  };
  setPracticeMode: (mode: "baby_steps" | "full_steps") => {
    success: boolean;
    mode: string;
  };
  start: () => { success: boolean; status: "playing" };
  pause: () => { success: boolean; status: "paused" };
  reset: () => { success: boolean; status: "reset" };
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
/* Mostek do aktywnego stanu komponentu DanceTrainer                   */
/* ------------------------------------------------------------------ */

let activeTrainerBridge: TrainerBridge | null = null;

export function registerTrainerBridge(bridge: TrainerBridge): void {
  activeTrainerBridge = bridge;
}

export function unregisterTrainerBridge(): void {
  activeTrainerBridge = null;
}

export function getActiveTrainerBridge(): TrainerBridge | null {
  return activeTrainerBridge;
}

/* ------------------------------------------------------------------ */
/* Payload buildery — wyjście identyczne z serwerem                    */
/* ------------------------------------------------------------------ */

export function serializeSong(song: Song): SerializedSong {
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

export function getCurrentTrainerState(): TrainerStateSnapshot {
  if (activeTrainerBridge) {
    return activeTrainerBridge.getState();
  }

  const defaultSong = SONGS[0];
  return {
    song: {
      id: defaultSong.id,
      title: defaultSong.title,
      artist: defaultSong.artist,
      bpm: defaultSong.bpm,
      effectiveBpm: defaultSong.bpm,
    },
    training: {
      playing: false,
      speed: 1,
      mode: "full_steps",
      step: 0,
      beatName: "One",
      cycle: 1,
      source: "youtube",
      role: "leader",
      muted: false,
      vibrate: false,
    },
    movement: {
      direction: "left",
      weightFoot: "right",
      movingFoot: "left",
      instruction: "Dance trainer is ready.",
    },
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
 * Rejestruje narzędzia trenera tańca w przeglądarkowym API WebMCP.
 * Idempotentne — bezpieczne przy wielokrotnym wywołaniu (React StrictMode, HMR).
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
    // 1. get_wedding_songs
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

    // 2. get_step_instructions
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

    // 3. recommend_song_by_bpm
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

    // 4. get_training_state
    await modelContext.registerTool(
      {
        name: "get_training_state",
        description:
          "Returns real-time dance trainer state: active song, tempo/BPM, playback state, current step phase (One/Two/Three/And), cycle bar, direction, moving foot, and weight foot.",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          return {
            content: [
              {
                type: "text",
                text: stringifyTextContent(getCurrentTrainerState()),
              },
            ],
          };
        },
      },
      options,
    );

    // 5. set_song
    await modelContext.registerTool(
      {
        name: "set_song",
        description:
          "Changes the active wedding song in the dance trainer by song ID.",
        inputSchema: {
          type: "object",
          properties: {
            songId: {
              type: "string",
              description:
                "The ID of the song to select (e.g., 'szalona', 'zycie', 'niewiara', 'miod_malina').",
            },
          },
          required: ["songId"],
        },
        async execute(input) {
          const { songId } = (input ?? {}) as { songId?: string };
          if (!songId) {
            return {
              content: [
                {
                  type: "text",
                  text: stringifyTextContent({
                    success: false,
                    error: "Missing required 'songId' parameter.",
                  }),
                },
              ],
            };
          }

          if (activeTrainerBridge) {
            const result = activeTrainerBridge.setSong(songId);
            return {
              content: [
                {
                  type: "text",
                  text: stringifyTextContent(result),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: stringifyTextContent({
                  success: false,
                  error: "Dance trainer is not actively mounted.",
                }),
              },
            ],
          };
        },
      },
      options,
    );

    // 6. set_tempo
    await modelContext.registerTool(
      {
        name: "set_tempo",
        description:
          "Sets the practice speed multiplier for the trainer (0.5 for half speed, 1 for normal speed, 1.25 for fast speed).",
        inputSchema: {
          type: "object",
          properties: {
            speed: {
              type: "number",
              enum: [0.5, 1, 1.25],
              description: "Playback speed multiplier: 0.5, 1, or 1.25.",
            },
          },
          required: ["speed"],
        },
        async execute(input) {
          const { speed } = (input ?? {}) as { speed?: 0.5 | 1 | 1.25 };
          if (speed === undefined || ![0.5, 1, 1.25].includes(speed)) {
            return {
              content: [
                {
                  type: "text",
                  text: stringifyTextContent({
                    success: false,
                    error: "Invalid speed. Allowed values: 0.5, 1, 1.25.",
                  }),
                },
              ],
            };
          }

          if (activeTrainerBridge) {
            const result = activeTrainerBridge.setTempo(speed);
            return {
              content: [
                {
                  type: "text",
                  text: stringifyTextContent(result),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: stringifyTextContent({
                  success: false,
                  error: "Dance trainer is not actively mounted.",
                }),
              },
            ],
          };
        },
      },
      options,
    );

    // 7. set_practice_mode
    await modelContext.registerTool(
      {
        name: "set_practice_mode",
        description:
          "Configures the footwork practice mode: 'baby_steps' (smaller movements for beginners) or 'full_steps' (standard dance steps).",
        inputSchema: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["baby_steps", "full_steps"],
              description: "Practice mode: 'baby_steps' or 'full_steps'.",
            },
          },
          required: ["mode"],
        },
        async execute(input) {
          const { mode } = (input ?? {}) as {
            mode?: "baby_steps" | "full_steps";
          };
          if (!mode || !["baby_steps", "full_steps"].includes(mode)) {
            return {
              content: [
                {
                  type: "text",
                  text: stringifyTextContent({
                    success: false,
                    error:
                      "Invalid mode. Allowed: 'baby_steps' or 'full_steps'.",
                  }),
                },
              ],
            };
          }

          if (activeTrainerBridge) {
            const result = activeTrainerBridge.setPracticeMode(mode);
            return {
              content: [
                {
                  type: "text",
                  text: stringifyTextContent(result),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: stringifyTextContent({
                  success: false,
                  error: "Dance trainer is not actively mounted.",
                }),
              },
            ],
          };
        },
      },
      options,
    );

    // 8. start_practice
    await modelContext.registerTool(
      {
        name: "start_practice",
        description:
          "Starts or resumes the dance practice session, metronome, and video playback.",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          if (activeTrainerBridge) {
            const result = activeTrainerBridge.start();
            return {
              content: [
                {
                  type: "text",
                  text: stringifyTextContent(result),
                },
              ],
            };
          }
          return {
            content: [
              {
                type: "text",
                text: stringifyTextContent({
                  success: false,
                  error: "Dance trainer is not actively mounted.",
                }),
              },
            ],
          };
        },
      },
      options,
    );

    // 9. pause_practice
    await modelContext.registerTool(
      {
        name: "pause_practice",
        description:
          "Pauses the current dance practice session, stopping audio and step progression.",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          if (activeTrainerBridge) {
            const result = activeTrainerBridge.pause();
            return {
              content: [
                {
                  type: "text",
                  text: stringifyTextContent(result),
                },
              ],
            };
          }
          return {
            content: [
              {
                type: "text",
                text: stringifyTextContent({
                  success: false,
                  error: "Dance trainer is not actively mounted.",
                }),
              },
            ],
          };
        },
      },
      options,
    );

    // 10. reset_practice
    await modelContext.registerTool(
      {
        name: "reset_practice",
        description:
          "Resets the dance practice session to the beginning (phase 1, bar 1, video seek to 0).",
        inputSchema: { type: "object", properties: {} },
        async execute() {
          if (activeTrainerBridge) {
            const result = activeTrainerBridge.reset();
            return {
              content: [
                {
                  type: "text",
                  text: stringifyTextContent(result),
                },
              ],
            };
          }
          return {
            content: [
              {
                type: "text",
                text: stringifyTextContent({
                  success: false,
                  error: "Dance trainer is not actively mounted.",
                }),
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
