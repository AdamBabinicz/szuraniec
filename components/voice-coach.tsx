"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getActiveTrainerBridge } from "@/lib/webmcp-client";
import { translations, type Lang } from "@/lib/translations";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface VoiceCoachProps {
  lang: Lang;
}

// ─────────────────────────────────────────────────────────────────────────────
// Web Speech API declarations
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Types / helpers
// ─────────────────────────────────────────────────────────────────────────────

type VoiceStatus = "idle" | "listening" | "processing" | "error";

type VoiceCoachTranslations = (typeof translations)["pl"] & {
  VOICE_COACH_TITLE?: string;
  VOICE_COACH_STATUS_READY?: string;
  VOICE_COACH_STATUS_LISTENING?: string;
  VOICE_COACH_STATUS_PROCESSING?: string;
  VOICE_COACH_STATUS_ERROR?: string;
  VOICE_COACH_STATUS_FEEDBACK?: string;
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
  VOICE_COACH_ERROR_NETWORK?: string;
  VOICE_COACH_ERROR_GENERIC?: string;
  VOICE_COACH_ERROR_AUDIO?: string;
  VOICE_COACH_HEARD_PREFIX?: string;
  VOICE_COACH_COMMAND_ERROR?: string;
};

function detectIOS(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  return (
    /iPad|iPhone|iPod/.test(platform) ||
    (/iPad|iPhone|iPod/.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function detectMobile(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent || "";

  return detectIOS() || /Android/i.test(ua) || /Mobile|Tablet/i.test(ua);
}

function normalizeSpeech(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N},.\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTranslation(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function VoiceCoach({ lang }: VoiceCoachProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [supported, setSupported] = useState(true);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [errorHint, setErrorHint] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const wantListeningRef = useRef(false);
  const recognitionGenerationRef = useRef(0);
  const lastErrorRef = useRef<string | null>(null);
  const restartAttemptsRef = useRef(0);

  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const t = (translations[lang] || translations.pl) as VoiceCoachTranslations;
  const isMobile = useMemo(() => detectMobile(), []);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, []);

  const showFeedback = useCallback(
    (text: string) => {
      if (!isMountedRef.current) return;

      clearFeedbackTimer();
      setFeedback(text);
      setErrorHint(null);

      feedbackTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setFeedback(null);
        feedbackTimeoutRef.current = null;
      }, 4000);
    },
    [clearFeedbackTimer],
  );

  const showError = useCallback(
    (text: string) => {
      if (!isMountedRef.current) return;

      clearFeedbackTimer();
      setErrorHint(text);
      setFeedback(null);
      setStatus("error");

      wantListeningRef.current = false;

      feedbackTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setErrorHint(null);
        setStatus("idle");
        feedbackTimeoutRef.current = null;
      }, 7000);
    },
    [clearFeedbackTimer],
  );

  const destroyRecognition = useCallback(() => {
    recognitionGenerationRef.current += 1;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    if (!recognition) return;

    try {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onspeechstart = null;
      recognition.onspeechend = null;
      recognition.abort();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (typeof window === "undefined") {
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(Boolean(SR));

    return () => {
      isMountedRef.current = false;
      wantListeningRef.current = false;

      destroyRecognition();
      clearFeedbackTimer();

      if (bounceTimeoutRef.current) {
        clearTimeout(bounceTimeoutRef.current);
        bounceTimeoutRef.current = null;
      }
    };
  }, [clearFeedbackTimer, destroyRecognition]);

  const handleVoiceCommand = useCallback(
    (rawText: string) => {
      const text = rawText.trim();
      if (!text) return;

      const normalized = normalizeSpeech(text);
      setLiveTranscript(text);
      setStatus("processing");

      const bridge = getActiveTrainerBridge();
      if (!bridge) {
        showFeedback(t.VOICE_COACH_NOT_READY || "Trainer is not ready.");
        setStatus("idle");
        return;
      }

      try {
        // RESET
        if (
          normalized.includes("od nowa") ||
          normalized.includes("od poczatku") ||
          normalized.includes("poczatek") ||
          normalized.includes("reset") ||
          normalized.includes("restart") ||
          normalized.includes("jeszcze raz")
        ) {
          bridge.reset();
          showFeedback(t.VOICE_COACH_RESET || "🔄 Reset to start");
          return;
        }

        // TEMPO SLOW
        if (
          normalized.includes("zwolnij") ||
          normalized.includes("wolniej") ||
          normalized.includes("wolno") ||
          normalized.includes("pol tempa") ||
          normalized.includes("polowa") ||
          normalized.includes("0.5") ||
          normalized.includes("0,5") ||
          normalized.includes("slow down") ||
          normalized === "slow"
        ) {
          const result = bridge.setTempo(0.5);
          showFeedback(
            formatTranslation(
              t.VOICE_COACH_TEMPO_SLOW ||
                "⏱️ Ustawiono wolne tempo: 0.5× ({bpm} BPM)",
              { bpm: result.effectiveBpm },
            ),
          );
          return;
        }

        // TEMPO NORMAL
        if (
          normalized.includes("normalnie") ||
          normalized.includes("normalne tempo") ||
          normalized.includes("standard") ||
          normalized.includes("1x") ||
          normalized.includes("1 x") ||
          normalized === "normal" ||
          normalized.includes("normal speed")
        ) {
          const result = bridge.setTempo(1);
          showFeedback(
            formatTranslation(
              t.VOICE_COACH_TEMPO_NORMAL ||
                "⏱️ Ustawiono normalne tempo: 1.0× ({bpm} BPM)",
              { bpm: result.effectiveBpm },
            ),
          );
          return;
        }

        // TEMPO FAST
        if (
          normalized.includes("szybciej") ||
          normalized.includes("przyspiesz") ||
          normalized.includes("szybko") ||
          normalized.includes("wyzwanie") ||
          normalized.includes("1.25") ||
          normalized.includes("1,25") ||
          normalized === "fast" ||
          normalized.includes("faster") ||
          normalized.includes("speed up")
        ) {
          const result = bridge.setTempo(1.25);
          showFeedback(
            formatTranslation(
              t.VOICE_COACH_TEMPO_FAST ||
                "🚀 Ustawiono szybkie tempo: 1.25× ({bpm} BPM)",
              { bpm: result.effectiveBpm },
            ),
          );
          return;
        }

        // BABY STEPS
        if (
          normalized.includes("baby steps") ||
          normalized.includes("baby") ||
          normalized.includes("male kroki") ||
          normalized.includes("male kroczki") ||
          normalized.includes("kroczki") ||
          normalized.includes("dla poczatkujacych") ||
          normalized.includes("small steps")
        ) {
          bridge.setPracticeMode("baby_steps");
          showFeedback(
            t.VOICE_COACH_BABY_ON ||
              "👣 Włączono tryb małych kroków (Baby Steps)",
          );
          return;
        }

        // FULL STEPS
        if (
          normalized.includes("pelne kroki") ||
          normalized.includes("duze kroki") ||
          normalized.includes("normalne kroki") ||
          normalized.includes("pelny krok") ||
          normalized === "full" ||
          normalized.includes("full steps")
        ) {
          bridge.setPracticeMode("full_steps");
          showFeedback(
            t.VOICE_COACH_FULL_STEPS || "🕺 Włączono pełny krok weselny",
          );
          return;
        }

        // PAUSE / STOP
        if (
          normalized.includes("pauza") ||
          normalized === "stop" ||
          normalized.includes("zatrzymaj") ||
          normalized.includes("przerwij") ||
          normalized.includes("wstrzymaj") ||
          normalized === "pause"
        ) {
          bridge.pause();
          showFeedback(t.VOICE_COACH_PAUSE || "⏸️ Trening wstrzymany");
          return;
        }

        // START / PLAY
        if (
          normalized === "start" ||
          normalized.includes("start") ||
          normalized.includes("graj") ||
          normalized.includes("wlacz") ||
          normalized.includes("tancz") ||
          normalized.includes("zacznij") ||
          normalized.includes("odpal") ||
          normalized === "play"
        ) {
          bridge.start();
          showFeedback(t.VOICE_COACH_START || "▶️ Wystartowano trening!");
          return;
        }

        // SONG MATCHING
        const songMatches: Record<string, string> = {
          szalon: "szalona",
          crazy: "szalona",
          chwil: "chwile",
          zycie: "chwile",
          life: "chwile",
          moments: "chwile",
          rud: "ruda",
          redhead: "ruda",
          zielon: "zielone",
          ocz: "zielone",
          green: "zielone",
          malin: "miod",
          miod: "miod",
          honey: "miod",
          raspberry: "miod",
          niewiar: "niewiara",
          niewier: "niewiara",
          disbelief: "niewiara",
          wolnosc: "wolnosc",
          freedom: "wolnosc",
          tanczy: "ona_tanczy",
          dances: "ona_tanczy",
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
          milosc: "cudowna",
          love: "cudowna",
          cudown: "cudowna",
          wonderful: "cudowna",
        };

        for (const [keyword, songId] of Object.entries(songMatches)) {
          if (!normalized.includes(keyword)) continue;

          const result = bridge.setSong(songId);
          if (result.success && result.song) {
            showFeedback(
              `${t.VOICE_COACH_SONG_PREFIX || "🎵 Wybrano utwór:"} ${result.song.artist} — ${result.song.title}`,
            );
            return;
          }
        }

        // UNKNOWN
        showFeedback(
          `${t.VOICE_COACH_UNKNOWN_PREFIX || "❓ Usłyszałem:"} "${text}" ${t.VOICE_COACH_UNKNOWN_HINT || ""}`,
        );
      } catch (error) {
        console.warn("[VoiceCoach] Command dispatch failed:", error);
        showError(
          t.VOICE_COACH_COMMAND_ERROR || "⚠️ Błąd wykonania komendy głosowej.",
        );
      }
    },
    [showError, showFeedback, t],
  );

  const startRecognition = useCallback(() => {
    if (
      typeof window === "undefined" ||
      !isMountedRef.current ||
      !wantListeningRef.current
    ) {
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      wantListeningRef.current = false;
      return;
    }

    if (recognitionRef.current) return;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    lastErrorRef.current = null;
    const generation = recognitionGenerationRef.current + 1;
    recognitionGenerationRef.current = generation;

    let recognition: ISpeechRecognition;
    try {
      recognition = new SR();
    } catch {
      showError(t.VOICE_COACH_ERROR_GENERIC || "⚠️ Voice recognition error.");
      return;
    }

    const mobile = isMobile;
    recognition.continuous = !mobile;
    recognition.interimResults = true;
    recognition.lang = lang === "pl" ? "pl-PL" : "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (
        !isMountedRef.current ||
        recognitionRef.current !== recognition ||
        recognitionGenerationRef.current !== generation
      ) {
        return;
      }

      restartAttemptsRef.current = 0;
      lastErrorRef.current = null;
      setStatus("listening");
      setLiveTranscript("");
      setErrorHint(null);
      setFeedback(t.VOICE_COACH_LISTEN_START || "🎙️ Słucham...");
    };

    recognition.onspeechstart = () => {
      if (
        !isMountedRef.current ||
        recognitionRef.current !== recognition ||
        recognitionGenerationRef.current !== generation
      ) {
        return;
      }
      setStatus("listening");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (
        !isMountedRef.current ||
        recognitionRef.current !== recognition ||
        recognitionGenerationRef.current !== generation
      ) {
        return;
      }

      let finalTranscript = "";
      let interimTranscript = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const transcriptText = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      if (interimTranscript) {
        setLiveTranscript(interimTranscript);
        setStatus("listening");
      }

      if (finalTranscript.trim()) {
        setLiveTranscript(finalTranscript.trim());
        setStatus("processing");
        handleVoiceCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (
        !isMountedRef.current ||
        recognitionRef.current !== recognition ||
        recognitionGenerationRef.current !== generation
      ) {
        return;
      }

      const error = event.error;
      lastErrorRef.current = error;

      if (error === "not-allowed" || error === "service-not-allowed") {
        console.warn("[VoiceCoach] Speech permission/service error:", error);
        wantListeningRef.current = false;
        showError(
          error === "not-allowed"
            ? t.VOICE_COACH_ERROR_NOT_ALLOWED ||
                "⚠️ Dostęp do mikrofonu zablokowany. Zezwól na mikrofon w przeglądarce."
            : t.VOICE_COACH_ERROR_SERVICE ||
                "📡 Usługa rozpoznawania mowy niedostępna.",
        );
        return;
      }

      if (error === "audio-capture") {
        console.warn("[VoiceCoach] Speech audio capture error:", event.message);
        wantListeningRef.current = false;
        showError(
          t.VOICE_COACH_ERROR_AUDIO ||
            "🎤 Nie wykryto mikrofonu. Podłącz mikrofon i spróbuj ponownie.",
        );
        return;
      }

      if (error === "network") {
        console.warn("[VoiceCoach] Speech network error:", event.message);
        wantListeningRef.current = false;
        showError(
          t.VOICE_COACH_ERROR_NETWORK ||
            "📡 Błąd sieci podczas rozpoznawania mowy.",
        );
        return;
      }

      if (error === "no-speech" || error === "aborted") {
        return;
      }

      console.warn("[VoiceCoach] Speech error:", error, event.message);
      wantListeningRef.current = false;
      showError(
        t.VOICE_COACH_ERROR_GENERIC ||
          "⚠️ Rozpoznawanie głosu nie powiodło się.",
      );
    };

    recognition.onend = () => {
      if (!isMountedRef.current) return;
      if (
        recognitionRef.current !== recognition ||
        recognitionGenerationRef.current !== generation
      ) {
        return;
      }

      recognitionRef.current = null;
      const lastError = lastErrorRef.current;

      if (mobile) {
        if (wantListeningRef.current) {
          setStatus("idle");
          setLiveTranscript("");
        }
        return;
      }

      const recoverableEnd =
        wantListeningRef.current &&
        lastError !== "not-allowed" &&
        lastError !== "service-not-allowed" &&
        lastError !== "audio-capture" &&
        lastError !== "network";

      if (recoverableEnd && restartAttemptsRef.current < 2) {
        restartAttemptsRef.current += 1;
        restartTimeoutRef.current = setTimeout(() => {
          restartTimeoutRef.current = null;
          if (
            !isMountedRef.current ||
            !wantListeningRef.current ||
            recognitionRef.current
          ) {
            return;
          }
          startRecognition();
        }, 500);
        return;
      }

      setStatus("idle");
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.warn("[VoiceCoach] recognition.start() failed:", error);
      recognitionRef.current = null;
      wantListeningRef.current = false;
      showError(
        t.VOICE_COACH_ERROR_GENERIC ||
          "⚠️ Rozpoznawanie głosu nie powiodło się.",
      );
    }
  }, [handleVoiceCommand, isMobile, lang, showError, t]);

  useEffect(() => {
    if (!wantListeningRef.current) return;
    wantListeningRef.current = false;
    destroyRecognition();
    setStatus("idle");
    setLiveTranscript("");
  }, [lang, destroyRecognition]);

  const toggleListening = useCallback(() => {
    if (!isMountedRef.current) return;
    if (bounceTimeoutRef.current) return;

    bounceTimeoutRef.current = setTimeout(() => {
      bounceTimeoutRef.current = null;
    }, 350);

    if (wantListeningRef.current) {
      wantListeningRef.current = false;
      destroyRecognition();
      setStatus("idle");
      setLiveTranscript("");
      setErrorHint(null);
      showFeedback(t.VOICE_COACH_OFF || "Mikrofon wyłączony");
      return;
    }

    wantListeningRef.current = true;
    restartAttemptsRef.current = 0;
    lastErrorRef.current = null;
    setFeedback(null);
    setErrorHint(null);
    setLiveTranscript("");

    startRecognition();
  }, [destroyRecognition, startRecognition, showFeedback, t]);

  if (!supported) return null;

  const isListening = status === "listening";
  const isProcessing = status === "processing";
  const hasError = status === "error" && Boolean(errorHint);

  const statusLabel =
    status === "listening"
      ? t.VOICE_COACH_STATUS_LISTENING || "Słucham..."
      : status === "processing"
        ? t.VOICE_COACH_STATUS_PROCESSING || "Przetwarzam..."
        : hasError
          ? t.VOICE_COACH_STATUS_ERROR || "Błąd"
          : feedback
            ? t.VOICE_COACH_STATUS_FEEDBACK || "Info"
            : t.VOICE_COACH_STATUS_READY || "Gotowy";

  const buttonLabel =
    isListening || isProcessing
      ? t.VOICE_COACH_DISABLE || "Wyłącz sterowanie głosowe"
      : t.VOICE_COACH_ENABLE || "Włącz sterowanie głosowe AI";

  const message = hasError
    ? errorHint
    : feedback
      ? feedback
      : liveTranscript
        ? `${t.VOICE_COACH_HEARD_PREFIX || "🎙️ Słyszę:"} "${liveTranscript}"`
        : statusLabel;

  return (
    <aside
      aria-label={t.VOICE_COACH_TITLE || "Voice AI Coach"}
      className="pointer-events-auto fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5"
    >
      <AnimatePresence initial={false}>
        {(message || isListening || isProcessing) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
            className={[
              "max-w-xs rounded-2xl border p-3.5 text-xs font-bold shadow-2xl backdrop-blur-md",
              hasError
                ? "border-amber-400/60 bg-amber-50/95 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/90 dark:text-amber-200"
                : "border-border bg-card/95 text-foreground dark:border-pink-500/40",
            ].join(" ")}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-primary">
                <Sparkles className="size-3.5 shrink-0" />
                <span className="truncate font-black uppercase tracking-wider">
                  {t.VOICE_COACH_TITLE || "Voice AI Coach"}
                </span>
              </div>

              <span
                className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
                  hasError
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : isListening
                      ? "bg-pink-500/15 text-pink-600 dark:text-pink-300"
                      : isProcessing
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {statusLabel}
              </span>
            </div>

            <p className="leading-snug">{message}</p>

            {isListening && (
              <div className="mt-3 flex items-center gap-1.5">
                <span className="size-1.5 animate-pulse rounded-full bg-pink-500" />
                <span className="size-1.5 animate-pulse rounded-full bg-pink-500 [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-pink-500 [animation-delay:300ms]" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={toggleListening}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        title={buttonLabel}
        aria-label={buttonLabel}
        aria-pressed={isListening || isProcessing}
        className={[
          "group relative flex size-14 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
          hasError
            ? "border-amber-500 bg-amber-500 text-white shadow-amber-500/50"
            : isListening
              ? "border-pink-500 bg-pink-500 text-white shadow-pink-500/50 ring-4 ring-pink-500/20"
              : isProcessing
                ? "border-primary bg-primary text-primary-foreground shadow-primary/40"
                : "border-border bg-card/90 text-foreground shadow-black/10 hover:border-primary/50 hover:bg-primary/10",
        ].join(" ")}
      >
        {isListening && (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full bg-pink-500/30"
          />
        )}

        {hasError && (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-pulse rounded-full bg-amber-500/30"
          />
        )}

        <span className="relative">
          {hasError ? (
            <MicOff className="size-6 text-white" />
          ) : isListening ? (
            <Mic className="size-6 animate-pulse text-white" />
          ) : isProcessing ? (
            <Sparkles className="size-6 animate-spin text-primary-foreground" />
          ) : (
            <Mic className="size-6 text-foreground transition-colors group-hover:text-primary" />
          )}
        </span>
      </motion.button>
    </aside>
  );
}
