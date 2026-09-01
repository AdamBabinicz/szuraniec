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
 * WERSJA PERF (mobile-friendly):
 *  • Rozpoznawanie mowy żyje CAŁKOWICIE w refach: żaden setState() nie jest
 *    wywoływany z ciała onresult/onerror/onend ani z interim results.
 *  • Interim transcript pojawia się w UI rzadziej niż przy każdym dźwięku —
 *    throttlowany do 300 ms (komponent nadrzędny powinien korzystać z
 *    `useMemo`, a animacje kroków powinny być CSS-only).
 *  • Auto-restart w onend jest ŁAGODNY: 400 ms debounce zamiast „busy loopu",
 *    + guard chroniący przed nakładającymi się start()/abort().
 *  • Brak równoległego getUserMedia — silnik mowy sam zarządza mikrofonem
 *    i oddaje Audio Focus odtwarzaczowi YouTube (bez duckingu).
 */

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

// Warianty bez spacji polskich do mapy piosenek.
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

  // Refy sterujące cyklem życia silnika mowy — NIE powodują renderów.
  const isMountedRef = useRef<boolean>(true);
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldListenRef = useRef<boolean>(false);
  // Łapie „busy loop" w onend — żadne wywołanie start() nie zmieni statusu
  // na listening dopóki 400 ms nie upłynie.
  const isEngagedRef = useRef<boolean>(false);
  // Interim transcript trzymany WYŁĄCZNIE w refie, wyrzucany do UI z throttlem.
  const interimTranscriptRef = useRef<string>("");

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

  // Throtlowana aktualizacja UI dla ostatniego transkryptu.
  const setThrottledTranscript = useCallback((raw: string) => {
    interimTranscriptRef.current = raw;
    if (transcriptTimerRef.current) return;
    transcriptTimerRef.current = setTimeout(() => {
      transcriptTimerRef.current = null;
      if (!isMountedRef.current) return;
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

      if (
        text.includes("pauza") ||
        text.includes("stop") ||
        text.includes("zatrzymaj") ||
        text.includes("czekaj") ||
        text.includes("przerwij") ||
        text.includes("pause") ||
        text.includes("halt")
      ) {
        bridge.pause();
        showFeedback(t.VOICE_COACH_PAUSE);
        return;
      }

      if (
        text.includes("od nowa") ||
        text.includes("od poczatku") ||
        text.includes("poczatek") ||
        text.includes("reset") ||
        text.includes("restart") ||
        text.includes("jeszcze raz") ||
        text.includes("again")
      ) {
        bridge.reset();
        showFeedback(t.VOICE_COACH_RESET);
        return;
      }

      if (
        text.includes("wolno") ||
        text.includes("zwolnij") ||
        text.includes("wolniej") ||
        text.includes("pol tempa") ||
        text.includes("polowa") ||
        text.includes("slow") ||
        text.includes("pol")
      ) {
        const res = bridge.setTempo(0.5);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_SLOW} (${res?.effectiveBpm ?? 60} ${t.BPM_LABEL})`,
        );
        return;
      }

      if (
        text.includes("normalnie") ||
        text.includes("standard") ||
        text.includes("normalne tempo") ||
        text.includes("normal") ||
        text.includes("domysl")
      ) {
        const res = bridge.setTempo(1);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_NORMAL} (${res?.effectiveBpm ?? 128} ${t.BPM_LABEL})`,
        );
        return;
      }

      if (
        text.includes("szybko") ||
        text.includes("przyspiesz") ||
        text.includes("szybciej") ||
        text.includes("wyzwanie") ||
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

      if (
        text.includes("baby") ||
        text.includes("male kroki") ||
        text.includes("kroczki") ||
        text.includes("poczatkujacych") ||
        text.includes("small") ||
        text.includes("krusz") ||
        text.includes("dzieck")
      ) {
        bridge.setPracticeMode("baby_steps");
        showFeedback(t.VOICE_COACH_BABY_ON);
        return;
      }

      if (
        text.includes("pelne kroki") ||
        text.includes("duze kroki") ||
        text.includes("normalne kroki") ||
        text.includes("pelny krok") ||
        text.includes("full") ||
        text.includes("w pelni") ||
        text.includes("duze")
      ) {
        bridge.setPracticeMode("full_steps");
        showFeedback(t.VOICE_COACH_FULL_STEPS);
        return;
      }

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

  // Pełne zwolnienie silnika mowy (wywoływane przy wyłączaniu / unmount).
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
    isEngagedRef.current = false;
  }, []);

  // Tworzenie świeżej instancji — jest jedyną drogą do start(). Weryfikujemy
  // isEngagedRef, by nie wpaść w „busy loop" przy InvalidStateError.
  const startRecognitionInstance = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isEngagedRef.current) return; // guard

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      shouldListenRef.current = false;
      isEngagedRef.current = false;
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
        isEngagedRef.current = true;
        if (isMountedRef.current) safeSetStatus("listening");
      };

      // BEZ setState w interim — tylko do refa.
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
        interim = interim.trim();
        if (interim) setThrottledTranscript(interim);
        if (finalTranscript) {
          // Final → do UI w jednej aktualizacji + komenda.
          if (isMountedRef.current) {
            setLastTranscript(finalTranscript);
            if (transcriptTimerRef.current) {
              clearTimeout(transcriptTimerRef.current);
              transcriptTimerRef.current = null;
            }
            // po 1.6 s czyść
            transcriptTimerRef.current = setTimeout(() => {
              if (isMountedRef.current) setLastTranscript(null);
            }, 1600);
          }
          dispatchCommand(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        const err = event?.error || "";
        if (
          err === "no-speech" ||
          err === "aborted" ||
          err === "network" ||
          err === "audio-capture"
        ) {
          // miękkie — nie pokazujemy, onend obsłuży.
          return;
        }
        if (err === "not-allowed" || err === "service-not-allowed") {
          shouldListenRef.current = false;
          isEngagedRef.current = false;
          showError(t.VOICE_COACH_ERROR_NOT_ALLOWED);
          releaseSpeechEngine();
          return;
        }
      };

      recognition.onend = () => {
        isEngagedRef.current = false;
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
        if (!isMountedRef.current) return;

        // Auto-restart dopóki użytkownik chce słuchać. ŁAGODNY debounce
        // (400 ms), by nie męczyć main threada.
        if (shouldListenRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;
            if (!shouldListenRef.current) return;
            if (isEngagedRef.current) return;
            try {
              startRecognitionInstance();
            } catch {
              // ponowimy po dłuższym czasie
              restartTimerRef.current = setTimeout(() => {
                if (!isMountedRef.current || !shouldListenRef.current) return;
                if (isEngagedRef.current) return;
                try {
                  startRecognitionInstance();
                } catch {
                  shouldListenRef.current = false;
                  safeSetStatus("idle");
                }
              }, RESTART_DELAY_MS * 2);
            }
          }, RESTART_DELAY_MS);
        } else {
          safeSetStatus("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      // InvalidStateError = „już działa". Nic nie rób, onend odświeży cykl.
      if (err?.name === "InvalidStateError") {
        return;
      }
      console.warn("[VoiceCoach] start() failed", err);
      shouldListenRef.current = false;
      isEngagedRef.current = false;
      safeSetStatus("idle");
    }
  }, [
    dispatchCommand,
    lang,
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
      isEngagedRef.current = false;
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
      shouldListenRef.current = false;
      isEngagedRef.current = false;
      releaseSpeechEngine();
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (transcriptTimerRef.current) clearTimeout(transcriptTimerRef.current);
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
            // WAGLLE: tylko opacity+transform (GPU), zero layout/paint.
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
                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                  isListening
                    ? "bg-pink-500/20 text-pink-600 dark:text-pink-300"
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
        style={{ transform: "translateZ(0)", willChange: "transform" }}
      >
        {/* Efekt „ping" zamieniony z animate-ping na statyczną warstwę
            z napędzaniem CSS w warstwie composite (GPU). Dzięki temu
            nie męczy głównego wątku podczas odtwarzania audio. */}
        {isListening && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-pink-500/40"
            style={{
              animation: "voicecoach-ping 1.6s cubic-bezier(0,0,.2,1) infinite",
            }}
          />
        )}
        {isListening ? (
          <Mic className="size-6 text-white" />
        ) : (
          <Mic className="size-6 text-foreground transition-colors group-hover:text-primary" />
        )}
      </button>

      {/* Lokalny, statyczny keyframes dla efektu ping — animuje TYLKO
          opacity i scale (composite layer), zero layoutu. */}
      <style jsx>{`
        @keyframes voicecoach-ping {
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
