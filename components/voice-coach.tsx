"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Sparkles, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getActiveTrainerBridge } from "@/lib/webmcp-client";
import { translations, type Lang } from "@/lib/translations";

interface VoiceCoachProps {
  lang: Lang;
}

type VoiceStatus = "idle" | "listening" | "feedback" | "error";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

/**
 * VoiceCoach — Browser-Native Web Speech API bridge z adaptacyjnym auto-restartem.
 *
 * Uwaga dla platform mobilnych (Android Chrome / iOS Safari / Chrome Mobile):
 *  • parametr `continuous` jest ignorowany — silnik kończy sesję po każdej
 *    wypowiedzi (`final`), wysyłając zdarzenie `onend`.
 *  • Rozwiązanie: po `onend` (jeśli użytkownik nadal chce słuchać) tworzona
 *    jest świeża instancja `SpeechRecognition` i wywoływane `start()` z
 *    krótkim opóźnieniem. Całość dzieje się w pętli, więc mikrofon pozostaje
 *    „włączony" dla tancerza, dopóki nie wyłączy go ręcznie.
 *  • Nie otwieramy równoległego `getUserMedia`, bo konkurowałoby z YouTube
 *    o Audio Focus na Android/iOS i powodowało ducking odtwarzacza.
 */

const RESTART_DELAY_MS = 80;

function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics (ą -> a, ę -> e, ł -> l, …)
    .replace(/[^\w\s]/g, " ") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

// Warianty bez spacji polskich dla bezpiecznego TS Record<string, string>.
const SONG_KEYWORDS: Record<string, string> = {
  szalona: "szalona",
  szalon: "szalona",
  crazy: "szalona",
  chwile: "chwile",
  chwil: "chwile",
  zycie: "chwile",
  zyc: "chwile",
  life: "chwile",
  ruda: "ruda",
  rud: "ruda",
  tancz: "ruda",
  redhead: "ruda",
  zielone: "zielone",
  zielon: "zielone",
  ocz: "zielone",
  green: "zielone",
  miod: "miod",
  miodmalina: "miod",
  miodmalin: "miod",
  malin: "miod",
  honey: "miod",
  niewiara: "niewiara",
  niewiar: "niewiara",
  wiar: "niewiara",
  wolnosc: "wolnosc",
  wolnos: "wolnosc",
  freedom: "wolnosc",
  onatanczy: "ona_tanczy",
  onatanc: "ona_tanczy",
  dances: "ona_tanczy",
  zono: "zono",
  zon: "zono",
  wife: "zono",
  mama: "mama",
  ostrzega: "mama",
  ostrzeg: "mama",
  warned: "mama",
  dziewczyno: "dziewczyno",
  dziewczyn: "dziewczyno",
  girl: "dziewczyno",
  kochana: "kochana",
  kochan: "kochana",
  beloved: "kochana",
  ukoch: "kochana",
  cudowna: "cudowna",
  cudown: "cudowna",
  prawdziw: "cudowna",
  milosc: "cudowna",
  love: "cudowna",
};

export function VoiceCoach({ lang }: VoiceCoachProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldListenRef = useRef<boolean>(false);

  const t = translations[lang] || translations.pl;

  const isMobile = useMemo<boolean>(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }
    const ua = navigator.userAgent || "";
    return /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(
      ua,
    );
  }, []);

  const safeSetStatus = useCallback((next: VoiceStatus) => {
    if (isMountedRef.current) setStatus(next);
  }, []);

  const safeSetFeedback = useCallback((text: string | null) => {
    if (isMountedRef.current) setFeedback(text);
  }, []);

  const safeSetTranscript = useCallback((text: string | null) => {
    if (isMountedRef.current) setLastTranscript(text);
  }, []);

  const showFeedback = useCallback(
    (text: string) => {
      safeSetFeedback(text);
      safeSetStatus("feedback");
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        safeSetFeedback(null);
        safeSetStatus(shouldListenRef.current ? "listening" : "idle");
      }, 2200);
    },
    [safeSetFeedback, safeSetStatus],
  );

  const showError = useCallback(
    (text: string) => {
      safeSetFeedback(text);
      safeSetStatus("error");
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        safeSetFeedback(null);
        safeSetStatus(shouldListenRef.current ? "listening" : "idle");
      }, 3500);
    },
    [safeSetFeedback, safeSetStatus],
  );

  const dispatchCommand = useCallback(
    (rawTranscript: string) => {
      const text = normalizeText(rawTranscript);
      const bridge = getActiveTrainerBridge();
      if (!bridge) {
        showError(t.VOICE_COACH_NOT_READY);
        return;
      }

      // 1. START / PLAY
      if (
        text.includes("start") ||
        text.includes("strat") ||
        text.includes("graj") ||
        text.includes("wlacz") ||
        text.includes("tancz") ||
        text.includes("zaczynaj") ||
        text.includes("zaczni") ||
        text.includes("odpal") ||
        text.includes("ruszaj") ||
        text.includes("play") ||
        text.includes("dalej") ||
        text.includes("jedzi") ||
        text.includes("hej")
      ) {
        bridge.start();
        showFeedback(t.VOICE_COACH_START);
        return;
      }

      // 2. STOP / PAUZA
      if (
        text.includes("pauza") ||
        text.includes("stop") ||
        text.includes("zatrzymaj") ||
        text.includes("zatrzym") ||
        text.includes("czekaj") ||
        text.includes("przerwij") ||
        text.includes("pauzuj") ||
        text.includes("pause") ||
        text.includes("halt") ||
        text.includes("czek")
      ) {
        bridge.pause();
        showFeedback(t.VOICE_COACH_PAUSE);
        return;
      }

      // 3. RESTART / RESET
      if (
        text.includes("od nowa") ||
        text.includes("od poczatku") ||
        text.includes("poczatek") ||
        text.includes("od pocz") ||
        text.includes("reset") ||
        text.includes("restart") ||
        text.includes("jeszcze raz") ||
        text.includes("jeszcze") ||
        text.includes("again") ||
        text.includes("ponow")
      ) {
        bridge.reset();
        showFeedback(t.VOICE_COACH_RESET);
        return;
      }

      // 4. TEMPO 0.5× (slow)
      if (
        text.includes("wolno") ||
        text.includes("zwolnij") ||
        text.includes("wolniej") ||
        text.includes("pol tempa") ||
        text.includes("polowa") ||
        text.includes("woln") ||
        text.includes("0.5") ||
        text.includes("zero piec") ||
        text.includes("slow") ||
        text.includes("pol")
      ) {
        const res = bridge.setTempo(0.5);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_SLOW} (${res?.effectiveBpm ?? 60} ${t.BPM_LABEL})`,
        );
        return;
      }

      // 5. TEMPO 1.0× (normal)
      if (
        text.includes("normalnie") ||
        text.includes("standard") ||
        text.includes("normalne tempo") ||
        text.includes("normal") ||
        text.includes("1x") ||
        text.includes("1.0") ||
        text.includes("jeden") ||
        text.includes("domysl")
      ) {
        const res = bridge.setTempo(1);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_NORMAL} (${res?.effectiveBpm ?? 128} ${t.BPM_LABEL})`,
        );
        return;
      }

      // 6. TEMPO 1.25× (fast)
      if (
        text.includes("szybko") ||
        text.includes("przyspiesz") ||
        text.includes("szybciej") ||
        text.includes("wyzwanie") ||
        text.includes("1.25") ||
        text.includes("fast") ||
        text.includes("challenge") ||
        text.includes("mocniej")
      ) {
        const res = bridge.setTempo(1.25);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_FAST} (${res?.effectiveBpm ?? 160} ${t.BPM_LABEL})`,
        );
        return;
      }

      // 7. BABY STEPS
      if (
        text.includes("baby") ||
        text.includes("male kroki") ||
        text.includes("kroczki") ||
        text.includes("poczatkujacych") ||
        text.includes("poczatk") ||
        text.includes("small") ||
        text.includes("krusz") ||
        text.includes("dzieck")
      ) {
        bridge.setPracticeMode("baby_steps");
        showFeedback(t.VOICE_COACH_BABY_ON);
        return;
      }

      // 8. FULL STEPS
      if (
        text.includes("pelne kroki") ||
        text.includes("duze kroki") ||
        text.includes("normalne kroki") ||
        text.includes("pelny krok") ||
        text.includes("full") ||
        text.includes("w pelni") ||
        text.includes("pelno") ||
        text.includes("duze")
      ) {
        bridge.setPracticeMode("full_steps");
        showFeedback(t.VOICE_COACH_FULL_STEPS);
        return;
      }

      // 9. 13 utworów z bazy WebMCP TrainerBridge.setSong(id)
      for (const [keyword, sId] of Object.entries(SONG_KEYWORDS)) {
        if (text.includes(keyword)) {
          const res = bridge.setSong(sId);
          if (res?.success && res?.song) {
            showFeedback(
              `${t.VOICE_COACH_SONG_PREFIX} ${res.song.artist} — ${res.song.title}`,
            );
            return;
          }
        }
      }

      showFeedback(
        `${t.VOICE_COACH_UNKNOWN_PREFIX} "${rawTranscript}" ${t.VOICE_COACH_UNKNOWN_HINT}`,
      );
    },
    [t, showFeedback, showError],
  );

  const releaseSpeechEngine = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      } catch {
        // ignore
      }
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  const startRecognitionInstance = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      shouldListenRef.current = false;
      safeSetStatus("idle");
      safeSetFeedback(t.VOICE_COACH_NOT_SUPPORTED);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === "pl" ? "pl-PL" : "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (!isMountedRef.current) return;
        safeSetStatus("listening");
      };

      recognition.onresult = (event: any) => {
        if (!isMountedRef.current) return;
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = (res?.[0]?.transcript || "").trim();
          if (transcript) safeSetTranscript(transcript);
          if (res?.isFinal && transcript) {
            finalTranscript += " " + transcript;
          }
        }
        finalTranscript = finalTranscript.trim();
        if (finalTranscript) dispatchCommand(finalTranscript);
      };

      recognition.onerror = (event: any) => {
        if (!isMountedRef.current) return;
        const err = event?.error || "";
        if (
          err === "no-speech" ||
          err === "aborted" ||
          err === "network" ||
          err === "audio-capture"
        ) {
          return;
        }
        if (err === "not-allowed" || err === "service-not-allowed") {
          shouldListenRef.current = false;
          showError(t.VOICE_COACH_ERROR_NOT_ALLOWED);
          releaseSpeechEngine();
        }
      };

      recognition.onend = () => {
        if (!isMountedRef.current) return;
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onstart = null;
            recognitionRef.current.onresult = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onend = null;
          } catch {
            // ignore
          }
          recognitionRef.current = null;
        }
        if (shouldListenRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (!isMountedRef.current || !shouldListenRef.current) return;
            try {
              startRecognitionInstance();
            } catch {
              restartTimerRef.current = setTimeout(() => {
                if (!isMountedRef.current || !shouldListenRef.current) return;
                try {
                  startRecognitionInstance();
                } catch {
                  shouldListenRef.current = false;
                  safeSetStatus("idle");
                }
              }, 400);
            }
          }, RESTART_DELAY_MS);
        } else {
          safeSetStatus("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      if (err?.name === "InvalidStateError") {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current || !shouldListenRef.current) return;
          try {
            startRecognitionInstance();
          } catch {
            // ignore
          }
        }, RESTART_DELAY_MS);
        return;
      }
      console.warn("[VoiceCoach] start() failed", err);
      shouldListenRef.current = false;
      safeSetStatus("idle");
    }
  }, [
    dispatchCommand,
    lang,
    releaseSpeechEngine,
    safeSetFeedback,
    safeSetStatus,
    safeSetTranscript,
    showError,
    t,
  ]);

  const handleMicToggle = useCallback(() => {
    if (shouldListenRef.current) {
      shouldListenRef.current = false;
      releaseSpeechEngine();
      safeSetStatus("idle");
      safeSetFeedback(null);
      safeSetTranscript(null);
    } else {
      shouldListenRef.current = true;
      safeSetTranscript(null);
      startRecognitionInstance();
    }
  }, [
    releaseSpeechEngine,
    safeSetFeedback,
    safeSetStatus,
    safeSetTranscript,
    startRecognitionInstance,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      shouldListenRef.current = false;
      releaseSpeechEngine();
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [releaseSpeechEngine]);

  const isListening = status === "listening";
  const hasFeedback = Boolean(feedback);

  const statusBadge = isListening
    ? "🎙️"
    : status === "error"
      ? "!"
      : t.VOICE_COACH_TITLE;

  const messageText = isListening
    ? feedback || t.VOICE_COACH_LISTEN_START
    : feedback || t.VOICE_COACH_ENABLE;

  return (
    <aside
      aria-label={t.VOICE_COACH_TITLE}
      className="pointer-events-auto fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5"
    >
      <AnimatePresence>
        {(isListening || hasFeedback || lastTranscript) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`max-w-xs rounded-2xl border p-3.5 text-xs font-bold shadow-2xl backdrop-blur-md ${
              status === "error"
                ? "border-amber-400/60 bg-amber-50/95 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/90 dark:text-amber-200"
                : "border-border bg-card/95 text-foreground dark:border-pink-500/40"
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="size-3.5" />
                <span className="font-black uppercase tracking-wider">
                  {t.VOICE_COACH_TITLE}
                </span>
                {isMobile && (
                  <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-600 dark:text-blue-300">
                    Mobile
                  </span>
                )}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                  isListening
                    ? "bg-pink-500/20 text-pink-600 dark:text-pink-300 animate-pulse"
                    : status === "error"
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {statusBadge}
              </span>
            </div>

            <p className="leading-snug text-foreground/90">{messageText}</p>

            {lastTranscript && (
              <div className="mt-2 flex items-start gap-1.5 border-t border-border/40 pt-2 text-[10px] font-medium text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span className="break-words">
                  heard: <span className="font-mono">{lastTranscript}</span>
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleMicToggle}
        title={
          shouldListenRef.current ? t.VOICE_COACH_DISABLE : t.VOICE_COACH_ENABLE
        }
        aria-label={t.VOICE_COACH_TITLE}
        className={`group relative flex size-14 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition-transform active:scale-95 ${
          isListening
            ? "border-pink-500 bg-pink-500 text-white shadow-pink-500/50 ring-4 ring-pink-500/30"
            : "border-border bg-card/90 text-foreground hover:border-primary/50 hover:bg-primary/10 shadow-black/10"
        }`}
      >
        {isListening && (
          <span className="absolute inset-0 animate-ping rounded-full bg-pink-500/40" />
        )}
        {isListening ? (
          <Mic className="size-6 animate-pulse text-white" />
        ) : (
          <Mic className="size-6 text-foreground transition-colors group-hover:text-primary" />
        )}
      </button>
    </aside>
  );
}
