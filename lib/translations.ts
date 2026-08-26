import pl from "./locales/pl.json";
import en from "./locales/en.json";

export type Lang = "pl" | "en";
export type PhaseId = "one" | "two" | "three" | "and";
export type Direction = "left" | "right";
export type ClickVoice = "accent" | "beat" | "tick";

export type Phase = {
  id: PhaseId;
  counterKey: keyof typeof pl;
  beats: number;
  moving: "left" | "right";
  weight: "left" | "right";
  voice: ClickVoice;
  tap?: boolean;
};

export const PHASES: Phase[] = [
  {
    id: "one",
    counterKey: "COUNTER_1",
    beats: 1,
    moving: "left",
    weight: "right",
    voice: "accent",
  },
  {
    id: "two",
    counterKey: "COUNTER_2",
    beats: 1,
    moving: "right",
    weight: "left",
    voice: "beat",
  },
  {
    id: "three",
    counterKey: "COUNTER_3",
    beats: 0.5,
    moving: "left",
    weight: "right",
    voice: "beat",
  },
  {
    id: "and",
    counterKey: "COUNTER_AND",
    beats: 0.5,
    moving: "right",
    weight: "left",
    voice: "tick",
    tap: true,
  },
];

export const BEATS_PER_BAR = PHASES.reduce((sum, p) => sum + p.beats, 0);

export type FootState = { x: number; y: number; rotate: number };
export type Stance = { left: FootState; right: FootState };

const ROTATE_LEFT = -7;
const ROTATE_RIGHT = 7;

function stance(leftX: number, rightX: number): Stance {
  return {
    left: { x: leftX, y: 0, rotate: ROTATE_LEFT },
    right: { x: rightX, y: 0, rotate: ROTATE_RIGHT },
  };
}

const LEFTWARD: Stance[] = [
  stance(-11, 33),
  stance(-11, 11),
  stance(-33, 11),
  stance(-33, -11),
];
const LEFTWARD_START = stance(11, 33);
const RIGHTWARD: Stance[] = [
  stance(-33, 11),
  stance(-11, 11),
  stance(-11, 33),
  stance(11, 33),
];
const RIGHTWARD_START = stance(-33, -11);

export const BABY_SCALE = 0.4;

function scaleStance(value: Stance, baby: boolean): Stance {
  if (!baby) return value;
  return {
    left: {
      ...value.left,
      x: value.left.x * BABY_SCALE,
      y: value.left.y * BABY_SCALE,
    },
    right: {
      ...value.right,
      x: value.right.x * BABY_SCALE,
      y: value.right.y * BABY_SCALE,
    },
  };
}

export function directionFor(bar: number): Direction {
  return bar % 2 === 1 ? "left" : "right";
}

export function stanceFor(beat: number, bar: number, baby = false): Stance {
  const table = directionFor(bar) === "left" ? LEFTWARD : RIGHTWARD;
  return scaleStance(table[beat] ?? table[table.length - 1], baby);
}

export function rolesFor(
  phase: Phase,
  bar: number,
): { moving: "left" | "right"; weight: "left" | "right" } {
  const mirror = directionFor(bar) === "right";
  const flip = (side: "left" | "right") => (side === "left" ? "right" : "left");
  return {
    moving: mirror ? flip(phase.moving) : phase.moving,
    weight: mirror ? flip(phase.weight) : phase.weight,
  };
}

// Baza 13 kulturalnych, weselnych hitów ze zweryfikowanymi ID YouTube
export type Song = {
  id: keyof typeof pl.SONG_NAMES;
  bpm: number;
  youtubeId: string;
};

export const SONGS: Song[] = [
  { id: "chwile", bpm: 120, youtubeId: "VkvRbfYeXLo" }, // Akcent — Życie To Są Chwile
  { id: "dziewczyno", bpm: 124, youtubeId: "qOYuvB_pxIM" }, // Boys — Najpiękniejsza Dziewczyno
  { id: "cudowna", bpm: 124, youtubeId: "k96jS1vurg4" }, // Akcent — Prawdziwa Miłość to Ty (Cudowna jest)
  { id: "zono", bpm: 125, youtubeId: "J8t9d4TIVHQ" }, // Masters — Żono moja
  { id: "miod", bpm: 126, youtubeId: "vwCWwZetRaI" }, // MIG — Miód Malina
  { id: "szalona", bpm: 128, youtubeId: "c2i4h7Q-8sA" }, // Boys — Jesteś Szalona
  { id: "kochana", bpm: 128, youtubeId: "YIPQ6pPBX7w" }, // Boys — Moja kochana
  { id: "mama", bpm: 128, youtubeId: "D0o6GsYoMak" }, // Daj to głośniej — Mama ostrzegała
  { id: "wolnosc", bpm: 130, youtubeId: "jO3DvsPzMww" }, // Boys — Wolność
  { id: "ona_tanczy", bpm: 130, youtubeId: "JvxG3zl_WhU" }, // Weekend — Ona Tańczy Dla Mnie
  { id: "ruda", bpm: 132, youtubeId: "tgw1yEcWpTU" }, // Czadoman — Ruda tańczy jak szalona
  { id: "zielone", bpm: 135, youtubeId: "cxtnot8lY4U" }, // Akcent — Przez Twe Oczy Zielone
  { id: "niewiara", bpm: 138, youtubeId: "FnqHOeqK7jQ" }, // Piękni i Młodzi — Niewiara
];

export type AudioSource = "click" | "youtube";
export const SPEEDS = [0.5, 1, 1.25] as const;
export type Speed = (typeof SPEEDS)[number];

export const translations = { pl, en };
