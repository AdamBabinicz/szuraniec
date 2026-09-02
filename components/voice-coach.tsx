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

      // 1. Grupa: Start / Play
      if (
        [
          "start",
          "strat",
          "graj",
          "wlacz",
          "tancz",
          "play",
          "ruszaj",
          "zaczynaj",
        ].some((k) => text.includes(k))
      ) {
        bridge.start();
        showFeedback(t.VOICE_COACH_START);
        return;
      }

      // 2. Grupa: Stop / Pauza
      if (
        [
          "stop",
          "pauza",
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

      // 3. Grupa: Reset / Od nowa
      if (
        [
          "reset",
          "restart",
          "od nowa",
          "od poczatku",
          "jeszcze raz",
          "again",
        ].some((k) => text.includes(k))
      ) {
        bridge.reset();
        showFeedback(t.VOICE_COACH_RESET);
        return;
      }

      // 4. Grupa: Tempo 0.5x
      if (
        [
          "wolno",
          "zwolnij",
          "wolniej",
          "pol tempa",
          "slow",
          "polowa",
          "zero piec",
        ].some((k) => text.includes(k))
      ) {
        const res = bridge.setTempo(0.5);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_SLOW} (${res?.effectiveBpm ?? 60} ${t.BPM_LABEL})`,
        );
        return;
      }

      // 5. Grupa: Tempo 1.0x
      if (
        [
          "normalnie",
          "standard",
          "normalne tempo",
          "normal",
          "domyslne",
          "jeden zero",
        ].some((k) => text.includes(k))
      ) {
        const res = bridge.setTempo(1);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_NORMAL} (${res?.effectiveBpm ?? 128} ${t.BPM_LABEL})`,
        );
        return;
      }

      // 6. Grupa: Tempo 1.25x
      if (
        [
          "szybko",
          "przyspiesz",
          "szybciej",
          "wyzwanie",
          "fast",
          "challenge",
          "mocniej",
          "jeden dwadziescia",
        ].some((k) => text.includes(k))
      ) {
        const res = bridge.setTempo(1.25);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_FAST} (${res?.effectiveBpm ?? 160} ${t.BPM_LABEL})`,
        );
        return;
      }

      // 7. Grupa: Tryb Baby Steps
      if (
        [
          "baby",
          "male kroki",
          "kroczki",
          "poczatkujacych",
          "small",
          "krusz",
        ].some((k) => text.includes(k))
      ) {
        bridge.setPracticeMode("baby_steps");
        showFeedback(t.VOICE_COACH_BABY_ON);
        return;
      }

      // 8. Grupa: Tryb Full Steps
      if (
        ["pelne", "duze", "pelny krok", "full", "normalne kroki"].some((k) =>
          text.includes(k),
        )
      ) {
        bridge.setPracticeMode("full_steps");
        showFeedback(t.VOICE_COACH_FULL_STEPS);
        return;
      }

      // 9. Grupa: 13 Utworów Weselnych
      const songsMap: Record<string, string> = {
        chwile: "akcent_zycie_to_sa_chwile",
        zycie: "akcent_zycie_to_sa_chwile",
        dziewczyno: "boys_najpiekniejsza_dziewczyno",
        najpiekniejsza: "boys_najpiekniejsza_dziewczyno",
        cudowna: "akcent_prawdziwa_milosc_to_ty",
        milosc: "akcent_prawdziwa_milosc_to_ty",
        zono: "masters_zono_moja",
        miod: "mig_miod_malina",
        malina: "mig_miod_malina",
        szalona: "boys_jestes_szalona",
        kochana: "boys_moja_kochana",
        mama: "daj_to_glosniej_mama_ostrzegala",
        wolnosc: "boys_wolnosc",
        "tanczy dla mnie": "weekend_ona_tanczy_dla_mnie",
        ruda: "czadoman_ruda_tanczy_jak_szalona",
        zielone: "akcent_przez_twe_oczy_zielone",
        oczy: "akcent_przez_twe_oczy_zielone",
        niewiara: "piekni_i_mlodzi_niewiara",
      };

      for (const [key, sId] of Object.entries(songsMap)) {
        if (text.includes(key)) {
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
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    isEngagedRef.current = false;
  }, []);

  const startRecognitionInstance = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isEngagedRef.current) return;

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

      // KLUCZ ROZWIĄZANIA: Na mobile wyłączamy tryb ciągły, by zwolnić Audio Focus natychmiast.
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
        interim = interim.trim();

        if (interim) setThrottledTranscript(interim);

        if (finalTranscript) {
          if (isMountedRef.current) {
            setLastTranscript(finalTranscript);
          }

          // Na mobile przerywamy nasłuch natychmiast po wykryciu komendy końcowej
          if (isMobile) {
            shouldListenRef.current = false;
            recognition.stop();
          }

          dispatchCommand(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        const err = event?.error || "";
        if (err === "no-speech" || err === "aborted") return;
        if (err === "not-allowed") {
          shouldListenRef.current = false;
          showError(t.VOICE_COACH_ERROR_NOT_ALLOWED);
          releaseSpeechEngine();
        }
      };

      recognition.onend = () => {
        isEngagedRef.current = false;
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }

        if (!isMountedRef.current) return;

        // Auto-restart TYLKO na Desktopie. Na Mobile onend oznacza czysty koniec sesji audio.
        if (shouldListenRef.current && !isMobile) {
          restartTimerRef.current = setTimeout(() => {
            if (
              isMountedRef.current &&
              shouldListenRef.current &&
              !isEngagedRef.current
            ) {
              try {
                startRecognitionInstance();
              } catch (e) {
                shouldListenRef.current = false;
                safeSetStatus("idle");
              }
            }
          }, RESTART_DELAY_MS);
        } else {
          safeSetStatus("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      if (err?.name !== "InvalidStateError") {
        shouldListenRef.current = false;
        isEngagedRef.current = false;
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
    <aside className="pointer-events-auto fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5">
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
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                  isListening
                    ? "bg-pink-500/20 text-pink-600 dark:text-pink-300"
                    : "bg-muted text-muted-foreground"
                }`}
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
              <div className="mt-2 flex items-start gap-1.5 border-t border-border/40 pt-2 text-[10px] font-medium text-muted-foreground">
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
          <span className="absolute inset-0 rounded-full bg-pink-500/40 animate-[voicecoach-ping_1.6s_infinite]" />
        )}
        <Mic
          className={`size-6 ${isListening ? "text-white" : "text-foreground"}`}
        />
      </button>

      <style jsx global>{`
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
