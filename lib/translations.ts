import pl from "./locales/pl.json";
import en from "./locales/en.json";

export type Lang = "pl" | "en";
export type PhaseId = "one" | "two" | "three" | "and";
export type Direction = "left" | "right";
export type ClickVoice = "accent" | "beat" | "tick";

export type Phase = {
  id: PhaseId;
  counterKey: keyof typeof pl; // Klucze typu COUNTER_1 itp.
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

export const BEATS_PER_BAR = PHASES.reduce(
  (sum, phase) => sum + phase.beats,
  0,
);

// Logika geometryczna (Stance)
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

// Dane piosenek (ID muszą odpowiadać kluczom w SONG_NAMES w JSON)
export type Song = {
  id: keyof typeof pl.SONG_NAMES;
  bpm: number;
  audioUrl?: string;
};

export const SONGS: Song[] = [
  { id: "chwile", bpm: 120, audioUrl: "/songs/chwile.mp3" },
  { id: "dziewczyno", bpm: 124, audioUrl: "/songs/dziewczyno.mp3" },
  { id: "cudowna", bpm: 124, audioUrl: "/songs/cudowna.mp3" },
  { id: "zakopane", bpm: 124, audioUrl: "/songs/zakopane.mp3" },
  { id: "zono", bpm: 125, audioUrl: "/songs/zono.mp3" },
  { id: "miod", bpm: 126, audioUrl: "/songs/miod.mp3" },
  { id: "lobuz", bpm: 127, audioUrl: "/songs/lobuz.mp3" },
  { id: "szalona", bpm: 128, audioUrl: "/songs/szalona.mp3" },
  { id: "kochana", bpm: 128, audioUrl: "/songs/kochana.mp3" },
  { id: "mama", bpm: 128, audioUrl: "/songs/mama.mp3" },
  { id: "wolnosc", bpm: 130, audioUrl: "/songs/wolnosc.mp3" },
  { id: "ona_tanczy", bpm: 130, audioUrl: "/songs/ona_tanczy.mp3" },
  { id: "ruda", bpm: 132, audioUrl: "/songs/ruda.mp3" },
  { id: "zielone", bpm: 135, audioUrl: "/songs/zielone.mp3" },
  { id: "chciala", bpm: 138, audioUrl: "/songs/chciala.mp3" },
];

export type AudioSource = "click" | "track";
export const SPEEDS = [0.5, 1, 1.25] as const;
export type Speed = (typeof SPEEDS)[number];

// Mapa tłumaczeń
export const translations = { pl, en };
