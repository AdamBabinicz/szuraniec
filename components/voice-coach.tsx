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
const MOBILE_ACTION_DELAY = 300;

function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Mapa piosenek
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
  oczy: "zielone", // ZMIENIONO: z "ocz" na "oczy", aby nie kolidowało z "kroczkami"
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
  "ona tanczy": "ona_tanczy",
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
        setLastTranscript(null);
        safeSetStatus(shouldListenRef.current ? "listening" : "idle");
      }, 3000);
    },
    [safeSetFeedback, safeSetStatus],
  );

  const dispatchCommand = useCallback(
    (rawTranscript: string) => {
      const text = normalizeText(rawTranscript);
      const bridge = getActiveTrainerBridge();
      if (!bridge) {
        showFeedback(t.VOICE_COACH_NOT_READY, true);
        return;
      }

      // --- PRIORYTET 1: TRYBY ĆWICZEŃ (Baby / Full steps) ---
      // Przeniesione na górę, aby słowo "kroczki" nie kolidowało z "oczy" w piosenkach

      if (
        [
          "male kroczki",
          "male kroki",
          "kroczki",
          "kroczek",
          "baby steps",
          "baby",
          "poczatkujacych",
          "small steps",
          "small",
          "dzieck",
        ].some((k) => text.includes(k))
      ) {
        bridge.setPracticeMode("baby_steps");

        // Obsługa "Włącz małe kroczki"
        if (["start", "graj", "wlacz", "play"].some((k) => text.includes(k))) {
          setTimeout(() => bridge.start(), 150);
        }

        showFeedback(t.VOICE_COACH_BABY_ON);
        return;
      }

      if (
        [
          "pelne kroki",
          "duze kroki",
          "normalne kroki",
          "pelny krok",
          "duzy krok",
          "full steps",
          "full",
          "duze",
        ].some((k) => text.includes(k))
      ) {
        bridge.setPracticeMode("full_steps");

        // Obsługa "Włącz duże kroki"
        if (["start", "graj", "wlacz", "play"].some((k) => text.includes(k))) {
          setTimeout(() => bridge.start(), 150);
        }

        showFeedback(t.VOICE_COACH_FULL_STEPS);
        return;
      }

      // --- PRIORYTET 2: ZMIANA UTWORU ---
      for (const [keyword, sId] of Object.entries(SONG_KEYWORDS)) {
        if (text.includes(keyword)) {
          const res = bridge.setSong(sId);
          if (res?.success && res?.song) {
            const alsoStart = [
              "start",
              "graj",
              "wlacz",
              "play",
              "odpal",
              "zaczynaj",
              "tancz",
            ].some((k) => text.includes(k));

            if (alsoStart) {
              setTimeout(() => {
                getActiveTrainerBridge()?.start();
              }, 150);
            }

            showFeedback(
              `${t.VOICE_COACH_SONG_PREFIX} ${res.song.artist} — ${res.song.title}`,
            );
            return;
          }
        }
      }

      // --- PRIORYTET 3: STEROWANIE ODTWARZANIEM ---

      // Start / Wznowienie
      if (
        [
          "start",
          "graj",
          "wlacz",
          "tancz",
          "play",
          "odpal",
          "ruszaj",
          "zaczynaj",
          "dalej",
          "jedziemy",
          "hej",
          "resume",
          "continue",
          "go",
        ].some((k) => text.includes(k))
      ) {
        bridge.start();
        showFeedback(t.VOICE_COACH_START);
        return;
      }

      // Pauza / Stop
      if (
        [
          "pauza",
          "stop",
          "zatrzymaj",
          "czekaj",
          "przerwij",
          "pause",
          "halt",
          "freeze",
        ].some((k) => text.includes(k))
      ) {
        bridge.pause();
        showFeedback(t.VOICE_COACH_PAUSE);
        return;
      }

      // Reset
      if (
        [
          "reset",
          "restart",
          "od nowa",
          "od poczatku",
          "poczatek",
          "jeszcze raz",
          "again",
        ].some((k) => text.includes(k))
      ) {
        bridge.reset();
        showFeedback(t.VOICE_COACH_RESET);
        return;
      }

      // Tempo Wolne (0.5x)
      if (
        [
          "wolno",
          "zwolnij",
          "wolniej",
          "pol tempa",
          "polowa",
          "slow",
          "slow down",
          "half",
          "half speed",
          "pol",
        ].some((k) => text.includes(k))
      ) {
        const res = bridge.setTempo(0.5);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_SLOW} (${res?.effectiveBpm ?? 60} ${t.BPM_LABEL})`,
        );
        return;
      }

      // Tempo Normalne (1.0x)
      if (
        [
          "normalnie",
          "standard",
          "normalne tempo",
          "normal",
          "normal speed",
          "full speed",
          "domysl",
        ].some((k) => text.includes(k))
      ) {
        const res = bridge.setTempo(1);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_NORMAL} (${res?.effectiveBpm ?? 128} ${t.BPM_LABEL})`,
        );
        return;
      }

      // Tempo Szybkie (1.25x)
      if (
        [
          "szybko",
          "przyspiesz",
          "szybciej",
          "wyzwanie",
          "fast",
          "faster",
          "speed up",
          "speed",
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

      showFeedback(
        `${t.VOICE_COACH_UNKNOWN_PREFIX} "${rawTranscript}" ${t.VOICE_COACH_UNKNOWN_HINT}`,
        false,
      );
    },
    [t, showFeedback],
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
    shouldListenRef.current = false;
  }, []);

  const startRecognitionInstance = useCallback(() => {
    if (typeof window === "undefined" || isEngagedRef.current) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      shouldListenRef.current = false;
      safeSetStatus("idle");
      safeSetFeedback(t.VOICE_COACH_NOT_SUPPORTED);
      return;
    }

    try {
      const recognition = new SR();
      recognition.lang = lang === "pl" ? "pl-PL" : "en-US";
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isEngagedRef.current = true;
        if (isMountedRef.current) safeSetStatus("listening");
      };

      recognition.onresult = (event: any) => {
        let final = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal)
            final += " " + event.results[i][0].transcript;
          else interim += " " + event.results[i][0].transcript;
        }
        final = final.trim();
        if (interim) setThrottledTranscript(interim);

        if (final) {
          if (isMountedRef.current) setLastTranscript(final);

          if (isMobile) {
            recognition.stop();
            setTimeout(() => {
              if (isMountedRef.current) dispatchCommand(final);
            }, MOBILE_ACTION_DELAY);
          } else {
            dispatchCommand(final);
          }
        }
      };

      recognition.onerror = (event: any) => {
        const err = event?.error || "";
        if (err === "not-allowed" || err === "service-not-allowed") {
          shouldListenRef.current = false;
          showFeedback(t.VOICE_COACH_ERROR_NOT_ALLOWED, true);
          releaseSpeechEngine();
        }
      };

      recognition.onend = () => {
        isEngagedRef.current = false;
        if (recognitionRef.current === recognition)
          recognitionRef.current = null;

        if (!isMountedRef.current) return;

        if (shouldListenRef.current && !isMobile) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (
              isMountedRef.current &&
              shouldListenRef.current &&
              !isEngagedRef.current
            )
              startRecognitionInstance();
          }, RESTART_DELAY_MS);
        } else {
          safeSetStatus("idle");
          shouldListenRef.current = false;
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
    showFeedback,
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
      isEngagedRef.current = false;
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

  return (
    <aside
      aria-label={t.VOICE_COACH_TITLE}
      className="pointer-events-auto fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5"
    >
      <AnimatePresence>
        {(status !== "idle" || lastTranscript) && (
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
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${status === "listening" ? "bg-pink-500/20 text-pink-600 dark:text-pink-300" : "bg-muted text-muted-foreground"}`}
              >
                {status === "listening" ? "🎙️" : "OK"}
              </span>
            </div>
            <p className="leading-snug text-foreground/90">
              {feedback ||
                (status === "listening"
                  ? t.VOICE_COACH_LISTEN_START
                  : t.VOICE_COACH_ENABLE)}
            </p>
            {lastTranscript && (
              <div className="mt-2 flex items-start gap-1.5 border-t border-border/40 pt-2 text-[10px] font-medium text-muted-foreground italic break-words">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span>{lastTranscript}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={handleMicToggle}
        className={`group relative flex size-14 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition-transform active:scale-95 ${status === "listening" ? "border-pink-500 bg-pink-500 text-white ring-4 ring-pink-500/30 shadow-pink-500/50" : "border-border bg-card/90 text-foreground hover:border-primary/50"}`}
      >
        {status === "listening" && (
          <span className="absolute inset-0 rounded-full bg-pink-500/40 animate-[ping_1.6s_infinite]" />
        )}
        <Mic
          className={`size-6 relative z-10 ${status === "listening" ? "text-white" : "text-foreground group-hover:text-primary"}`}
        />
      </button>
      <style jsx global>{`
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
