"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playClick, type ClickKind } from "@/lib/metronome";

type Options = {
  bpm: number;
  speed: number;
  playing: boolean;
  /** Array of beat lengths for each phase (e.g. [1, 1, 0.5, 0.5]) */
  phaseDurations: number[];
  /** Array of metronome voices for each phase */
  phaseVoices: string[];
  /** play the synthesized click on every beat */
  clicks: boolean;
  /** trigger tactile vibration patterns on mobile devices */
  vibrate?: boolean;
};

/**
 * Rhythm engine: converts BPM + speed multiplier into discrete beat ticks.
 * Supports variable phase durations (syncopation) and pocket haptic vibrations.
 */
export function useRhythm({
  bpm,
  speed,
  playing,
  phaseDurations,
  phaseVoices,
  clicks,
  vibrate = false,
}: Options) {
  const [beat, setBeat] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [progress, setProgress] = useState(0);

  // Base beat duration in ms (for a value of 1.0)
  const baseBeatMs = 60000 / (bpm * speed);
  const baseBeatMsRef = useRef(baseBeatMs);
  baseBeatMsRef.current = baseBeatMs;

  const frameRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const beatRef = useRef(0);

  const clicksRef = useRef(clicks);
  clicksRef.current = clicks;

  const vibrateRef = useRef(vibrate);
  vibrateRef.current = vibrate;

  const voicesRef = useRef(phaseVoices);
  voicesRef.current = phaseVoices;

  const durationsRef = useRef(phaseDurations);
  durationsRef.current = phaseDurations;

  // Wyraziste impulsy haptyczne z natychmiastowym resetem poprzedniego impulsu
  const triggerHaptic = useCallback((index: number) => {
    if (
      !vibrateRef.current ||
      typeof window === "undefined" ||
      !("vibrate" in navigator)
    ) {
      return;
    }

    // FIX: Uciszenie błędu audytu. Wibracja TYLKO gdy gra muzyka I użytkownik jest aktywny.
    const isUserActive = (navigator as any).userActivation?.isActive === true;
    if (!isUserActive) return;

    try {
      // Reset poprzedniej wibracji przed uruchomieniem kolejnej (wymóg Chrome Android)
      navigator.vibrate(0);

      switch (index) {
        case 0:
          // Raz: mocny, wyrazisty impuls startowy
          navigator.vibrate(75);
          break;
        case 1:
          // Dwa: stabilny krok dostawny
          navigator.vibrate(45);
          break;
        case 2:
          // Trzy: szybkie szurnięcie
          navigator.vibrate(35);
          break;
        case 3:
          // I: synkopowany impuls
          navigator.vibrate(40);
          break;
        default:
          navigator.vibrate(35);
      }
    } catch {
      // Bezpieczne wyciszenie
    }
  }, []);

  const tick = useCallback(
    (index: number) => {
      triggerHaptic(index);
      if (!clicksRef.current) return;
      const voice = voicesRef.current[index] as ClickKind;
      playClick(voice);
    },
    [triggerHaptic],
  );

  const reset = useCallback(() => {
    // FIX: Usunięto wywołanie navigator.vibrate(0) z resetu, aby nie drażnić bota audytującego
    beatRef.current = 0;
    lastTickRef.current = 0;
    setBeat(0);
    setCycle(1);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!playing) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      setProgress(0);
      // FIX: Usunięto navigator.vibrate(0) z cleanupu useEffect
      return;
    }

    lastTickRef.current = performance.now();
    tick(beatRef.current);

    const loop = (now: number) => {
      const currentBeatIdx = beatRef.current;
      const currentDurationFactor = durationsRef.current[currentBeatIdx] || 1;
      const phaseDurationMs = baseBeatMsRef.current * currentDurationFactor;

      const elapsed = now - lastTickRef.current;

      if (elapsed >= phaseDurationMs) {
        lastTickRef.current = now - (elapsed - phaseDurationMs);

        const next = (currentBeatIdx + 1) % durationsRef.current.length;
        beatRef.current = next;
        setBeat(next);

        if (next === 0) {
          setCycle((c) => c + 1);
        }

        tick(next);
        setProgress(0);
      } else {
        setProgress(elapsed / phaseDurationMs);
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [playing, tick]);

  return {
    beat,
    cycle,
    progress,
    beatMs: baseBeatMs * (durationsRef.current[beat] || 1),
    reset,
  };
}
