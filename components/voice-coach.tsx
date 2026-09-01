"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Sparkles } from "lucide-react";
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

export function VoiceCoach({ lang }: VoiceCoachProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const isActiveRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const t = translations[lang] || translations.pl;

  const showFeedback = useCallback((text: string) => {
    if (!isMountedRef.current) return;
    setFeedback(text);
    setStatus("feedback");

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setFeedback(null);
      // Po pokazaniu dymka wracamy prosto do ciągłego nasłuchu
      if (isActiveRef.current) {
        setStatus("listening");
      } else {
        setStatus("idle");
      }
    }, 3000);
  }, []);

  const showError = useCallback((text: string) => {
    if (!isMountedRef.current) return;
    setFeedback(text);
    setStatus("error");

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setFeedback(null);
      if (isActiveRef.current) {
        setStatus("listening");
      } else {
        setStatus("idle");
      }
    }, 4000);
  }, []);

  // ── Dispatcher komend głosowych do WebMCP Bridge ───────────────────
  const dispatchCommand = useCallback(
    (rawTranscript: string) => {
      const text = rawTranscript.toLowerCase().trim();

      const bridge = getActiveTrainerBridge();
      if (!bridge) {
        showError(
          lang === "pl"
            ? "Trenażer nie jest jeszcze gotowy."
            : "Dance trainer is not ready.",
        );
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
        showFeedback(
          lang === "pl" ? "▶️ Wystartowano trening!" : "▶️ Practice started!",
        );
        return;
      }

      // 2. STOP / PAUZA
      if (
        text.includes("pauza") ||
        text.includes("stop") ||
        text.includes("zatrzymaj") ||
        text.includes("czekaj") ||
        text.includes("przerwij") ||
        text.includes("pause")
      ) {
        bridge.pause();
        showFeedback(
          lang === "pl" ? "⏸️ Trening wstrzymany" : "⏸️ Practice paused",
        );
        return;
      }

      // 3. RESTART / RESET
      if (
        text.includes("od nowa") ||
        text.includes("od początku") ||
        text.includes("początek") ||
        text.includes("reset") ||
        text.includes("restart") ||
        text.includes("jeszcze raz")
      ) {
        bridge.reset();
        showFeedback(
          lang === "pl" ? "🔄 Zresetowano do początku" : "🔄 Reset to start",
        );
        return;
      }

      // 4. TEMPO 0.5× (slow)
      if (
        text.includes("wolno") ||
        text.includes("zwolnij") ||
        text.includes("pół tempa") ||
        text.includes("połowa") ||
        text.includes("0.5") ||
        text.includes("zero pięć") ||
        text.includes("slow")
      ) {
        const res = bridge.setTempo(0.5);
        showFeedback(
          lang === "pl"
            ? `⏱️ Ustawiono wolne tempo: 0.5× (${res?.effectiveBpm ?? 60} BPM)`
            : `⏱️ Set slow tempo: 0.5× (${res?.effectiveBpm ?? 60} BPM)`,
        );
        return;
      }

      // 5. TEMPO 1.0× (normal)
      if (
        text.includes("normalnie") ||
        text.includes("standard") ||
        text.includes("normalne tempo") ||
        text.includes("1x") ||
        text.includes("jeden") ||
        text.includes("normal")
      ) {
        const res = bridge.setTempo(1);
        showFeedback(
          lang === "pl"
            ? `⏱️ Ustawiono normalne tempo: 1.0× (${res?.effectiveBpm ?? 128} BPM)`
            : `⏱️ Set normal tempo: 1.0× (${res?.effectiveBpm ?? 128} BPM)`,
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
        text.includes("fast")
      ) {
        const res = bridge.setTempo(1.25);
        showFeedback(
          lang === "pl"
            ? `🚀 Ustawiono szybkie tempo: 1.25× (${res?.effectiveBpm ?? 160} BPM)`
            : `🚀 Set fast tempo: 1.25× (${res?.effectiveBpm ?? 160} BPM)`,
        );
        return;
      }

      // 7. BABY STEPS
      if (
        text.includes("baby") ||
        text.includes("małe kroki") ||
        text.includes("kroczki") ||
        text.includes("dla początkujących") ||
        text.includes("small")
      ) {
        bridge.setPracticeMode("baby_steps");
        showFeedback(
          lang === "pl"
            ? "👣 Włączono tryb małych kroków (Baby Steps)"
            : "👣 Baby Steps mode activated",
        );
        return;
      }

      // 8. FULL STEPS
      if (
        text.includes("pełne kroki") ||
        text.includes("duże kroki") ||
        text.includes("normalne kroki") ||
        text.includes("pełny krok") ||
        text.includes("full")
      ) {
        bridge.setPracticeMode("full_steps");
        showFeedback(
          lang === "pl"
            ? "🕺 Włączono pełny krok weselny"
            : "🕺 Full steps mode activated",
        );
        return;
      }

      // 9. PIOSENKI
      const songMatches: Record<string, string> = {
        szalon: "szalona",
        crazy: "szalona",
        chwil: "chwile",
        życie: "chwile",
        zycie: "chwile",
        life: "chwile",
        rud: "ruda",
        redhead: "ruda",
        zielon: "zielone",
        ocz: "zielone",
        green: "zielone",
        malin: "miod",
        miód: "miod",
        honey: "miod",
        niewiar: "niewiara",
        wolnoś: "wolnosc",
        wolnosc: "wolnosc",
        freedom: "wolnosc",
        tańczy: "ona_tanczy",
        dances: "ona_tanczy",
        żon: "zono",
        wife: "zono",
        mam: "mama",
        ostrzega: "mama",
        warned: "mama",
        dziewczyn: "dziewczyno",
        girl: "dziewczyno",
        kochan: "kochana",
        beloved: "kochana",
        prawdziw: "cudowna",
        miłość: "cudowna",
        love: "cudowna",
      };

      for (const [keyword, sId] of Object.entries(songMatches)) {
        if (text.includes(keyword)) {
          const res = bridge.setSong(sId);
          if (res?.success && res?.song) {
            showFeedback(
              lang === "pl"
                ? `🎵 Wybrano utwór: ${res.song.artist} — ${res.song.title}`
                : `🎵 Selected song: ${res.song.artist} — ${res.song.title}`,
            );
            return;
          }
        }
      }

      showFeedback(
        lang === "pl"
          ? `❓ Rozpoznano: "${rawTranscript}" (spróbuj: start, pauza, zwolnij, Szalona)`
          : `❓ Recognized: "${rawTranscript}" (try: start, pause, slow down, Szalona)`,
      );
    },
    [lang, showFeedback, showError],
  );

  // ── Ciągłe uruchamianie silnika mowy ───────────────────────────────
  const initSpeechEngine = useCallback(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      showError(
        lang === "pl"
          ? "Przeglądarka nie wspiera wbudowanego rozpoznawania głosu."
          : "Browser does not support speech recognition.",
      );
      isActiveRef.current = false;
      setStatus("idle");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = lang === "pl" ? "pl-PL" : "en-US";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (!isMountedRef.current) return;
        setStatus("listening");
      };

      recognition.onresult = (event: any) => {
        if (!isMountedRef.current) return;
        const lastIndex = event.results.length - 1;
        const transcript =
          event.results[lastIndex]?.[0]?.transcript?.trim() || "";
        if (transcript) {
          dispatchCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        if (!isMountedRef.current) return;
        // Błąd braku mowy w czasie ciszy jest ignorowany, aby nasłuch trwał dalej
        if (event.error === "no-speech") return;

        if (event.error === "not-allowed") {
          isActiveRef.current = false;
          showError(
            lang === "pl"
              ? "⚠️ Zezwól na dostęp do mikrofonu w przeglądarce."
              : "⚠️ Please allow microphone access.",
          );
        }
      };

      recognition.onend = () => {
        if (!isMountedRef.current) return;

        // Jeśli użytkownik nie wyłączył mikrofonu, natychmiast płynnie wznawiamy
        if (isActiveRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isMountedRef.current && isActiveRef.current) {
              try {
                recognition.start();
              } catch {
                // Jeśli silnik potrzebuje ułamka sekundy na reset
                setTimeout(() => {
                  if (isMountedRef.current && isActiveRef.current) {
                    try {
                      recognition.start();
                    } catch {}
                  }
                }, 200);
              }
            }
          }, 50);
        } else {
          setStatus("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("[VoiceCoach] SpeechRecognition start error", err);
      isActiveRef.current = false;
      setStatus("idle");
    }
  }, [dispatchCommand, lang, showError]);

  // ── Przełącznik mikrofonu (Włącz ciągły nasłuch / Wyłącz) ─────────
  const handleMicToggle = useCallback(() => {
    if (isActiveRef.current) {
      // Wyłączenie ciągłego nasłuchu
      isActiveRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
      setStatus("idle");
    } else {
      // Włączenie ciągłego nasłuchu
      isActiveRef.current = true;
      initSpeechEngine();
    }
  }, [initSpeechEngine]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isActiveRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const isListening =
    status === "listening" || (isActiveRef.current && status !== "error");
  const hasFeedback = Boolean(feedback);

  const statusBadge = isListening
    ? lang === "pl"
      ? "Ciągły nasłuch aktywny"
      : "Continuous listening"
    : status === "error"
      ? "Błąd"
      : "Voice AI Coach";

  const messageText = isListening
    ? feedback ||
      (lang === "pl"
        ? "🎙️ Mikrofon jest aktywny. Mów w dowolnym momencie: start, pauza, zwolnij, włącz Szaloną..."
        : "🎙️ Microphone is active. Speak anytime: start, pause, slow down, play Szalona...")
    : feedback ||
      (lang === "pl"
        ? "Kliknij mikrofon raz, aby włączyć ciągłe sterowanie głosem (Hands-Free)"
        : "Tap microphone once to enable continuous hands-free coaching");

  return (
    <aside
      aria-label="Voice AI Coach"
      className="pointer-events-auto fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5"
    >
      <AnimatePresence>
        {(isListening || hasFeedback) && (
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
                  Voice AI Coach
                </span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                  isListening
                    ? "bg-pink-500/20 text-pink-600 dark:text-pink-300 animate-pulse"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {statusBadge}
              </span>
            </div>
            <p className="leading-snug text-foreground/90">{messageText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleMicToggle}
        title={
          isListening
            ? lang === "pl"
              ? "Wyłącz ciągłe sterowanie głosem"
              : "Disable continuous voice control"
            : lang === "pl"
              ? "Włącz ciągłe sterowanie głosem (Hands-Free)"
              : "Enable continuous voice control"
        }
        aria-label="Voice AI Control"
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
