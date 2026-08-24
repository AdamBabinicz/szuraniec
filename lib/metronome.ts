/**
 * Web Audio metronome.
 *
 * The AudioContext is NEVER created on import — browsers block/suspend contexts
 * that are constructed outside of a user gesture. `unlockAudio()` must be called
 * synchronously from a click handler (the Play button) before any tick is heard.
 */

// Typ musi być zgodny z ClickVoice w lib/translations.ts
export type ClickKind = "accent" | "beat" | "tick";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Create (or resume) the AudioContext. Call this from a user gesture. */
export function unlockAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.6; // Slightly lower master volume for cleaner sound
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function suspendAudio() {
  if (ctx && ctx.state === "running") void ctx.suspend();
}

export function isAudioUnlocked() {
  return ctx?.state === "running";
}

/**
 * Voice definitions for the synthesizer.
 * Adjusted for the "Szuraniec" shuffle rhythm.
 */
const VOICES: Record<
  ClickKind,
  {
    freq: number;
    drop: number;
    gain: number;
    decay: number;
    type: OscillatorType;
  }
> = {
  // downbeat "1": bright, higher click
  accent: { freq: 1200, drop: 400, gain: 0.4, decay: 0.08, type: "triangle" },
  // regular beats "2" and "3"
  beat: { freq: 800, drop: 300, gain: 0.25, decay: 0.05, type: "triangle" },
  // the syncopated "&": very short, thin tick for the shuffle
  tick: { freq: 1600, drop: 1200, gain: 0.15, decay: 0.03, type: "square" },
};

/** Fire a single synthesized click. Silent until `unlockAudio()` has run. */
export function playClick(kind: ClickKind, volume = 1) {
  if (!ctx || !master || ctx.state !== "running") return;

  // Pobieramy parametry głosu
  const voice = VOICES[kind];

  // FIX: Zabezpieczenie przed undefined, jeśli kind nie pasuje do kluczy VOICES
  if (!voice) {
    console.warn(`Metronome: Unknown click kind "${kind}" requested.`);
    return;
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = voice.type;
  osc.frequency.setValueAtTime(voice.freq, now);
  osc.frequency.exponentialRampToValueAtTime(voice.drop, now + voice.decay);

  // Envelope to prevent popping
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, voice.gain * volume),
    now + 0.002,
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, now + voice.decay);

  osc.connect(gain);
  gain.connect(master);

  osc.start(now);
  osc.stop(now + voice.decay + 0.01);
}
