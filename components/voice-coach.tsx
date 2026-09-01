"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getActiveTrainerBridge } from "@/lib/webmcp-client";
import { translations, type Lang } from "@/lib/translations";

// ── TypeScript declarations for Web Speech API ─────────────────────────

interface VoiceCoachProps {
  lang: Lang;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onresult:
    | ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null;
  onerror:
    | ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
    | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: ISpeechRecognition, ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

type VoiceStatus = "idle" | "listening" | "processing" | "error";

/**
 * Detects iOS Safari / iPadOS.
 * On iOS, `webkitSpeechRecognition` does not support `continuous = true`
 * reliably — the recognition stops after each utterance and must be
 * restarted manually from the `onend` handler.
 */
function detectIOS(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  return (
    /iPad|iPhone|iPod/.test(platform) ||
    (/iPad|iPhone|iPod/.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// ── Component ──────────────────────────────────────────────────────────

export function VoiceCoach({ lang }: VoiceCoachProps) {
  // ── State ──────────────────────────────────────────────────────────

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [supported, setSupported] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [errorHint, setErrorHint] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const wantListeningRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);

  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceRef = useRef(false);
  const isMountedRef = useRef(true);
  const startRef = useRef<(() => void) | null>(null);

  // ── Translations ───────────────────────────────────────────────────

  const t = translations[lang] as (typeof translations)["pl"] & {
    VOICE_COACH_TITLE?: string;
    VOICE_COACH_LISTEN_START?: string;
    VOICE_COACH_OFF?: string;
    VOICE_COACH_NOT_READY?: string;
    VOICE_COACH_START?: string;
    VOICE_COACH_PAUSE?: string;
    VOICE_COACH_RESET?: string;
    VOICE_COACH_TEMPO_SLOW?: string;
    VOICE_COACH_TEMPO_NORMAL?: string;
    VOICE_COACH_TEMPO_FAST?: string;
    VOICE_COACH_BABY_ON?: string;
    VOICE_COACH_FULL_STEPS?: string;
    VOICE_COACH_SONG_PREFIX?: string;
    VOICE_COACH_UNKNOWN_PREFIX?: string;
    VOICE_COACH_UNKNOWN_HINT?: string;
    VOICE_COACH_ENABLE?: string;
    VOICE_COACH_DISABLE?: string;
    VOICE_COACH_ERROR_NOT_ALLOWED?: string;
    VOICE_COACH_ERROR_SERVICE?: string;
    VOICE_COACH_ERROR_GENERIC?: string;
    VOICE_COACH_ERROR_AUDIO?: string;
    VOICE_COACH_HEARD_PREFIX?: string;
  };

  // ── Feedback helpers ───────────────────────────────────────────────

  const showFeedback = useCallback((text: string) => {
    if (!isMountedRef.current) return;
    setFeedback(text);
    setErrorHint(null);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setFeedback(null);
    }, 4000);
  }, []);

  const showError = useCallback((text: string) => {
    if (!isMountedRef.current) return;
    setErrorHint(text);
    setFeedback(null);
    setStatus("error");
    wantListeningRef.current = false;
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setErrorHint(null);
      setStatus("idle");
    }, 6000);
  }, []);

  // ── Destroy the current recognition instance ───────────────────────

  const destroyRecognition = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.onspeechstart = null;
        rec.onspeechend = null;
        rec.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  // ── Check browser support on mount ─────────────────────────────────

  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
    }
    return () => {
      isMountedRef.current = false;
      wantListeningRef.current = false;
      destroyRecognition();
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [destroyRecognition]);

  // ── Voice command dispatcher ───────────────────────────────────────

  const handleVoiceCommand = useCallback(
    (rawText: string) => {
      const text = rawText.toLowerCase().trim();
      if (!text) return;

      setLiveTranscript(text);
      setStatus("processing");

      const bridge = getActiveTrainerBridge();
      if (!bridge) {
        showFeedback(t.VOICE_COACH_NOT_READY || "Trainer is not ready.");
        return;
      }

      // 1. START / PLAY
      if (
        text.includes("start") ||
        text.includes("strat") ||
        text.includes("graj") ||
        text.includes("włącz") ||
        text.includes("wlacz") ||
        text.includes("tańcz") ||
        text.includes("tancz") ||
        text.includes("zacznij") ||
        text.includes("odpal") ||
        text.includes("play")
      ) {
        bridge.start();
        showFeedback(t.VOICE_COACH_START || "▶️ Practice started!");
        return;
      }

      // 2. PAUSE / STOP
      if (
        text.includes("pauza") ||
        text.includes("stop") ||
        text.includes("zatrzymaj") ||
        text.includes("czekaj") ||
        text.includes("przerwij") ||
        text.includes("wstrzymaj") ||
        text.includes("pause")
      ) {
        bridge.pause();
        showFeedback(t.VOICE_COACH_PAUSE || "⏸️ Practice paused");
        return;
      }

      // 3. RESET / RESTART
      if (
        text.includes("od nowa") ||
        text.includes("od początku") ||
        text.includes("od poczatku") ||
        text.includes("początek") ||
        text.includes("poczatek") ||
        text.includes("reset") ||
        text.includes("restart") ||
        text.includes("jeszcze raz")
      ) {
        bridge.reset();
        showFeedback(t.VOICE_COACH_RESET || "🔄 Reset to start");
        return;
      }

      // 4. TEMPO 0.5× (slow)
      if (
        text.includes("wolno") ||
        text.includes("zwolnij") ||
        text.includes("wolniej") ||
        text.includes("pół tempa") ||
        text.includes("pol tempa") ||
        text.includes("połowa") ||
        text.includes("polowa") ||
        text.includes("0.5") ||
        text.includes("0,5") ||
        text.includes("slow") ||
        text.includes("slow down")
      ) {
        const res = bridge.setTempo(0.5);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_SLOW || "⏱️ Set slow tempo: 0.5×"} (${res.effectiveBpm} BPM)`,
        );
        return;
      }

      // 5. TEMPO 1.0× (normal)
      if (
        text.includes("normalnie") ||
        text.includes("standard") ||
        text.includes("normalne tempo") ||
        text.includes("1x") ||
        text.includes("1 x") ||
        text.includes("normal") ||
        text.includes("normal speed")
      ) {
        const res = bridge.setTempo(1);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_NORMAL || "⏱️ Set normal tempo: 1.0×"} (${res.effectiveBpm} BPM)`,
        );
        return;
      }

      // 6. TEMPO 1.25× (fast)
      if (
        text.includes("szybko") ||
        text.includes("szybciej") ||
        text.includes("przyspiesz") ||
        text.includes("wyzwanie") ||
        text.includes("1.25") ||
        text.includes("1,25") ||
        text.includes("fast") ||
        text.includes("faster") ||
        text.includes("speed up")
      ) {
        const res = bridge.setTempo(1.25);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_FAST || "🚀 Set fast tempo: 1.25×"} (${res.effectiveBpm} BPM)`,
        );
        return;
      }

      // 7. BABY STEPS mode
      if (
        text.includes("baby") ||
        text.includes("małe kroki") ||
        text.includes("male kroki") ||
        text.includes("kroczki") ||
        text.includes("dla początkujących") ||
        text.includes("dla poczatkujacych") ||
        text.includes("small steps")
      ) {
        bridge.setPracticeMode("baby_steps");
        showFeedback(t.VOICE_COACH_BABY_ON || "👣 Baby Steps mode activated");
        return;
      }

      // 8. FULL STEPS mode
      if (
        text.includes("pełne kroki") ||
        text.includes("pelne kroki") ||
        text.includes("duże kroki") ||
        text.includes("duze kroki") ||
        text.includes("normalne kroki") ||
        text.includes("pełny krok") ||
        text.includes("pelny krok") ||
        text.includes("full") ||
        text.includes("full steps")
      ) {
        bridge.setPracticeMode("full_steps");
        showFeedback(
          t.VOICE_COACH_FULL_STEPS || "🕺 Full steps mode activated",
        );
        return;
      }

      // 9. SONG MATCHING
      const songMatches: Record<string, string> = {
        szalon: "szalona",
        szaloń: "szalona",
        crazy: "szalona",
        chwil: "chwile",
        życie: "chwile",
        zycie: "chwile",
        life: "chwile",
        moments: "chwile",
        rud: "ruda",
        redhead: "ruda",
        zielon: "zielone",
        ocz: "zielone",
        green: "zielone",
        malin: "miod",
        miód: "miod",
        miod: "miod",
        honey: "miod",
        raspberry: "miod",
        niewiar: "niewiara",
        niewier: "niewiara",
        disbelief: "niewiara",
        wolnoś: "wolnosc",
        wolnosc: "wolnosc",
        freedom: "wolnosc",
        tańczy: "ona_tanczy",
        tanczy: "ona_tanczy",
        dances: "ona_tanczy",
        żon: "zono",
        zon: "zono",
        wife: "zono",
        mam: "mama",
        ostrzega: "mama",
        warned: "mama",
        mother: "mama",
        dziewczyn: "dziewczyno",
        girl: "dziewczyno",
        beautiful: "dziewczyno",
        kochan: "kochana",
        beloved: "kochana",
        prawdziw: "cudowna",
        miłość: "cudowna",
        milosc: "cudowna",
        love: "cudowna",
        cudown: "cudowna",
        wonderful: "cudowna",
      };

      for (const [keyword, sId] of Object.entries(songMatches)) {
        if (text.includes(keyword)) {
          const res = bridge.setSong(sId);
          if (res.success && res.song) {
            showFeedback(
              `${t.VOICE_COACH_SONG_PREFIX || "🎵 Selected song:"} ${res.song.artist} — ${res.song.title}`,
            );
            return;
          }
        }
      }

      showFeedback(
        `${t.VOICE_COACH_UNKNOWN_PREFIX || "❓ Heard:"} "${text}" ${t.VOICE_COACH_UNKNOWN_HINT || ""}`,
      );
    },
    [t, showFeedback],
  );

  // ── Create & start a FRESH recognition instance ────────────────────

  const startRecognition = useCallback(() => {
    if (typeof window === "undefined") return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }

    destroyRecognition();
    lastErrorRef.current = null;

    try {
      const recognition = new SR();
      const ios = detectIOS();

      recognition.continuous = !ios;
      recognition.interimResults = true;
      recognition.lang = lang === "pl" ? "pl-PL" : "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (!isMountedRef.current) return;
        setStatus("listening");
        setLiveTranscript("");
        setErrorHint(null);
        showFeedback(t.VOICE_COACH_LISTEN_START || "🎙️ Listening...");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (!isMountedRef.current) return;
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (interimTranscript) {
          setLiveTranscript(interimTranscript);
        }

        if (finalTranscript) {
          handleVoiceCommand(finalTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (!isMountedRef.current) return;
        const err = event.error;

        if (err === "no-speech" || err === "aborted") {
          return;
        }

        console.warn("[VoiceCoach] Speech error:", err, event.message);
        lastErrorRef.current = err;

        if (err === "not-allowed" || err === "service-not-allowed") {
          showError(
            t.VOICE_COACH_ERROR_NOT_ALLOWED ||
              "⚠️ Microphone access blocked. Please allow microphone in browser address bar.",
          );
          return;
        }

        if (err === "audio-capture") {
          showError(
            t.VOICE_COACH_ERROR_AUDIO ||
              "⚠️ No microphone found or audio capture failed.",
          );
          return;
        }

        if (err === "network") {
          showError(
            t.VOICE_COACH_ERROR_SERVICE ||
              "⚠️ Speech service network error. Please try again.",
          );
          return;
        }

        setStatus("error");
      };

      recognition.onend = () => {
        if (!isMountedRef.current) return;
        recognitionRef.current = null;

        const shouldRestart =
          wantListeningRef.current &&
          lastErrorRef.current !== "not-allowed" &&
          lastErrorRef.current !== "service-not-allowed" &&
          lastErrorRef.current !== "audio-capture";

        if (shouldRestart) {
          restartTimeoutRef.current = setTimeout(() => {
            if (
              isMountedRef.current &&
              wantListeningRef.current &&
              startRef.current
            ) {
              startRef.current();
            }
          }, 300);
        } else {
          setStatus("idle");
          setLiveTranscript("");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("[VoiceCoach] Failed to start recognition:", err);
      destroyRecognition();
      showError(
        t.VOICE_COACH_ERROR_GENERIC || "⚠️ Voice recognition failed to start.",
      );
    }
  }, [
    lang,
    t,
    destroyRecognition,
    handleVoiceCommand,
    showFeedback,
    showError,
  ]);

  useEffect(() => {
    startRef.current = startRecognition;
  }, [startRecognition]);

  useEffect(() => {
    if (wantListeningRef.current) {
      destroyRecognition();
      const timer = setTimeout(() => {
        if (isMountedRef.current && wantListeningRef.current) {
          startRecognition();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [lang, destroyRecognition, startRecognition]);

  const toggleListening = useCallback(() => {
    if (bounceRef.current) return;
    bounceRef.current = true;
    setTimeout(() => {
      bounceRef.current = false;
    }, 400);

    if (wantListeningRef.current) {
      wantListeningRef.current = false;
      destroyRecognition();
      setStatus("idle");
      setLiveTranscript("");
      setErrorHint(null);
      showFeedback(t.VOICE_COACH_OFF || "Microphone off");
    } else {
      wantListeningRef.current = true;
      setFeedback(null);
      setErrorHint(null);
      startRecognition();
    }
  }, [destroyRecognition, startRecognition, t, showFeedback]);

  if (!supported) return null;

  const isActive = status === "listening" || status === "processing";
  const hasError = status === "error" && !!errorHint;
  const isListening = status === "listening";

  return (
    <aside
      aria-label={t.VOICE_COACH_TITLE || "Voice AI Coach"}
      className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5 pointer-events-auto"
    >
      <AnimatePresence>
        {(feedback || (isActive && liveTranscript) || hasError) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`max-w-xs rounded-2xl border p-3.5 text-xs font-bold shadow-2xl backdrop-blur-md ${
              hasError
                ? "border-amber-400/60 bg-amber-50/95 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/90 dark:text-amber-200"
                : "border-border bg-card/95 text-foreground dark:border-pink-500/40"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 text-primary font-black uppercase tracking-wider">
              <Sparkles className="size-3.5 text-primary" />
              <span>{t.VOICE_COACH_TITLE || "Voice AI Coach"}</span>
            </div>
            <p className="leading-snug">
              {hasError
                ? errorHint
                : feedback
                  ? feedback
                  : `${t.VOICE_COACH_HEARD_PREFIX || "🎙️ Heard:"} "${liveTranscript}"`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={toggleListening}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        title={
          isActive
            ? t.VOICE_COACH_DISABLE || "Disable voice control"
            : t.VOICE_COACH_ENABLE || "Enable AI voice control"
        }
        aria-label={
          isActive
            ? t.VOICE_COACH_DISABLE || "Disable voice control"
            : t.VOICE_COACH_ENABLE || "Enable AI voice control"
        }
        aria-pressed={isActive}
        className={`group relative flex size-14 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition-all duration-200 ${
          hasError
            ? "border-amber-500 bg-amber-500 text-white shadow-amber-500/50"
            : isActive
              ? "border-pink-500 bg-pink-500 text-white shadow-pink-500/50 ring-4 ring-pink-500/20"
              : "border-border bg-card/90 text-foreground hover:border-primary/50 hover:bg-primary/10 shadow-black/10"
        }`}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-pink-500/30 animate-ping" />
        )}

        {hasError && (
          <span className="absolute inset-0 rounded-full bg-amber-500/30 animate-pulse" />
        )}

        {hasError ? (
          <MicOff className="size-6 text-white" />
        ) : isListening ? (
          <Mic className="size-6 animate-pulse text-white" />
        ) : status === "processing" ? (
          <Sparkles className="size-6 animate-spin text-white" />
        ) : (
          <Mic className="size-6 text-foreground transition-colors group-hover:text-primary" />
        )}
      </motion.button>
    </aside>
  );
}
