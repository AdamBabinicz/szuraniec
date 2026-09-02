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

const RESTART_DELAY_MS = 400;
const UI_TRANSCRIPT_THROTTLE_MS = 300;

function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ORYGINALNA MAPA PIOSENEK (Zgodna z Twoją wersją bazową)
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
  const transcriptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldListenRef = useRef<boolean>(false);
  const isEngagedRef = useRef<boolean>(false);
  const interimTranscriptRef = useRef<string>("");

  const t = translations[lang] || translations.pl;

  const isMobile = useMemo<boolean>(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined")
      return false;
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

  const setThrottledTranscript = useCallback((raw: string) => {
    interimTranscriptRef.current = raw;
    if (transcriptTimerRef.current) return;
    transcriptTimerRef.current = setTimeout(() => {
      transcriptTimerRef.current = null;
      if (isMountedRef.current)
        setLastTranscript(interimTranscriptRef.current || null);
    }, UI_TRANSCRIPT_THROTTLE_MS);
  }, []);

  const flushTranscript = useCallback(() => {
    interimTranscriptRef.current = "";
    if (transcriptTimerRef.current) {
      clearTimeout(transcriptTimerRef.current);
      transcriptTimerRef.current = null;
    }
    if (isMountedRef.current) setLastTranscript(null);
  }, []);

  const showFeedback = useCallback(
    (text: string, isError = false) => {
      safeSetFeedback(text);
      safeSetStatus(isError ? "error" : "feedback");
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
      showFeedback(text, true);
    },
    [showFeedback],
  );

  const dispatchCommand = useCallback(
    (rawTranscript: string) => {
      const text = normalizeText(rawTranscript);
      const bridge = getActiveTrainerBridge();
      if (!bridge) {
        showError(t.VOICE_COACH_NOT_READY);
        return;
      }

      // Komendy Startu
      if (
        [
          "start",
          "graj",
          "wlacz",
          "tancz",
          "zaczynaj",
          "zacznij",
          "odpal",
          "ruszaj",
          "play",
          "dalej",
          "jedziemy",
          "hej",
        ].some((k) => text.includes(k))
      ) {
        bridge.start();
        showFeedback(t.VOICE_COACH_START);
        return;
      }

      // Komendy Pauzy
      if (
        [
          "pauza",
          "stop",
          "zatrzymaj",
          "czekaj",
          "przerwij",
          "pause",
          "halt",
        ].some((k) => text.includes(k))
      ) {
        bridge.pause();
        showFeedback(t.VOICE_COACH_PAUSE);
        return;
      }

      // Komendy Resetu
      if (
        [
          "od nowa",
          "od poczatku",
          "poczatek",
          "reset",
          "restart",
          "jeszcze raz",
          "again",
        ].some((k) => text.includes(k))
      ) {
        bridge.reset();
        showFeedback(t.VOICE_COACH_RESET);
        return;
      }

      // Tempo
      if (
        [
          "wolno",
          "zwolnij",
          "wolniej",
          "pol tempa",
          "polowa",
          "slow",
          "pol",
        ].some((k) => text.includes(k))
      ) {
        const res = bridge.setTempo(0.5);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_SLOW} (${res?.effectiveBpm ?? 60} ${t.BPM_LABEL})`,
        );
        return;
      }
      if (
        ["normalnie", "standard", "normalne tempo", "normal", "domysl"].some(
          (k) => text.includes(k),
        )
      ) {
        const res = bridge.setTempo(1);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_NORMAL} (${res?.effectiveBpm ?? 128} ${t.BPM_LABEL})`,
        );
        return;
      }
      if (
        [
          "szybko",
          "przyspiesz",
          "szybciej",
          "wyzwanie",
          "fast",
          "challenge",
          "mocniej",
        ].some((k) => text.includes(k))
      ) {
        const res = bridge.setTempo(1.25);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_FAST} (${res?.effectiveBpm ?? 160} ${t.BPM_LABEL})`,
        );
        return;
      }

      // Tryby
      if (
        [
          "baby",
          "male kroki",
          "kroczki",
          "poczatkujacych",
          "small",
          "krusz",
          "dzieck",
        ].some((k) => text.includes(k))
      ) {
        bridge.setPracticeMode("baby_steps");
        showFeedback(t.VOICE_COACH_BABY_ON);
        return;
      }
      if (
        [
          "pelne kroki",
          "duze kroki",
          "normalne kroki",
          "pelny krok",
          "full",
          "w pelni",
          "duze",
        ].some((k) => text.includes(k))
      ) {
        bridge.setPracticeMode("full_steps");
        showFeedback(t.VOICE_COACH_FULL_STEPS);
        return;
      }

      // Wybór utworu
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
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    isEngagedRef.current = false;
  }, []);

  const startRecognitionInstance = useCallback(() => {
    if (typeof window === "undefined" || isEngagedRef.current) return;

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

      // KLUCZ DLA MOBILE: continuous = false zwalnia Audio Focus i naprawia YouTube.
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isEngagedRef.current = true;
        if (isMountedRef.current) safeSetStatus("listening");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = (res?.[0]?.transcript || "").trim();
          if (res?.isFinal && transcript) {
            finalTranscript += " " + transcript;
          } else if (transcript) {
            interim += " " + transcript;
          }
        }
        finalTranscript = finalTranscript.trim();
        if (interim) setThrottledTranscript(interim);

        if (finalTranscript) {
          if (isMountedRef.current) {
            setLastTranscript(finalTranscript);
          }

          // Wykonujemy komendę natychmiast
          dispatchCommand(finalTranscript);

          // Na Mobile: stopujemy rozpoznawanie, aby YouTube odzyskał płynność.
          if (isMobile) {
            recognition.stop();
          }
        }
      };

      recognition.onerror = (event: any) => {
        const err = event?.error || "";
        if (err === "not-allowed" || err === "service-not-allowed") {
          shouldListenRef.current = false;
          showError(t.VOICE_COACH_ERROR_NOT_ALLOWED);
          releaseSpeechEngine();
        }
      };

      recognition.onend = () => {
        isEngagedRef.current = false;
        if (recognitionRef.current === recognition)
          recognitionRef.current = null;
        if (!isMountedRef.current) return;

        // Auto-restart TYLKO na Desktopie. Na Smartfonie czekamy na ponowne tapnięcie.
        if (shouldListenRef.current && !isMobile) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (
              isMountedRef.current &&
              shouldListenRef.current &&
              !isEngagedRef.current
            ) {
              startRecognitionInstance();
            }
          }, RESTART_DELAY_MS);
        } else {
          safeSetStatus("idle");
          shouldListenRef.current = false; // Reset stanu, aby kolejne tapnięcie zadziałało
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      isEngagedRef.current = false;
      if (err?.name !== "InvalidStateError") {
        shouldListenRef.current = false;
        safeSetStatus("idle");
      }
    }
  }, [
    dispatchCommand,
    lang,
    isMobile,
    releaseSpeechEngine,
    safeSetFeedback,
    safeSetStatus,
    setThrottledTranscript,
    showError,
    t,
  ]);

  const handleMicToggle = useCallback(() => {
    if (shouldListenRef.current) {
      shouldListenRef.current = false;
      releaseSpeechEngine();
      safeSetStatus("idle");
      safeSetFeedback(null);
      flushTranscript();
    } else {
      shouldListenRef.current = true;
      flushTranscript();
      startRecognitionInstance();
    }
  }, [
    flushTranscript,
    releaseSpeechEngine,
    safeSetFeedback,
    safeSetStatus,
    startRecognitionInstance,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      releaseSpeechEngine();
    };
  }, [releaseSpeechEngine]);

  const isListening = status === "listening";

  return (
    <aside
      aria-label={t.VOICE_COACH_TITLE}
      className="pointer-events-auto fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5"
    >
      <AnimatePresence>
        {(isListening || feedback || lastTranscript) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{
              willChange: "transform, opacity",
              transform: "translateZ(0)",
            }}
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
                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${isListening ? "bg-pink-500/20 text-pink-600 dark:text-pink-300" : "bg-muted text-muted-foreground"}`}
              >
                {isListening ? "🎙️" : "OK"}
              </span>
            </div>
            <p className="leading-snug text-foreground/90">
              {feedback ||
                (isListening
                  ? t.VOICE_COACH_LISTEN_START
                  : t.VOICE_COACH_ENABLE)}
            </p>
            {lastTranscript && (
              <div className="mt-2 flex items-start gap-1.5 border-t border-border/40 pt-2 text-[10px] font-medium text-muted-foreground italic">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span className="break-words font-mono italic">
                  {lastTranscript}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleMicToggle}
        className={`group relative flex size-14 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition-transform active:scale-95 ${
          isListening
            ? "border-pink-500 bg-pink-500 text-white ring-4 ring-pink-500/30"
            : "border-border bg-card/90 text-foreground hover:border-primary/50"
        }`}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-pink-500/40 animate-[ping_1.6s_infinite]" />
        )}
        <Mic
          className={`size-6 ${isListening ? "text-white" : "text-foreground group-hover:text-primary"}`}
        />
      </button>

      <style jsx>{`
        @keyframes ping {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          75%,
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
    </aside>
  );
}
