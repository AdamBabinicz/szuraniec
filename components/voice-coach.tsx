"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getActiveTrainerBridge } from "@/lib/webmcp-client";
import { translations, type Lang } from "@/lib/translations";

interface VoiceCoachProps {
  lang: Lang;
}

type VoiceStatus = "idle" | "recording" | "processing" | "feedback" | "error";

export function VoiceCoach({ lang }: VoiceCoachProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const isActiveHandsFreeRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Pobieramy teksty ze słownika na podstawie aktywnego języka
  const t = translations[lang] || translations.pl;

  const clearTimers = useCallback(() => {
    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
      recordTimeoutRef.current = null;
    }
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
  }, []);

  // ── Przejście do kolejnego cyklu nasłuchu (Continuous Loop) ────────
  const triggerNextCycle = useCallback(() => {
    if (!isMountedRef.current || !isActiveHandsFreeRef.current) return;
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    loopTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && isActiveHandsFreeRef.current) {
        void startRecordingCycle();
      }
    }, 400);
  }, []);

  const showFeedback = useCallback(
    (text: string) => {
      if (!isMountedRef.current) return;
      setFeedback(text);
      setStatus("feedback");

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setFeedback(null);
        if (isActiveHandsFreeRef.current) {
          triggerNextCycle();
        } else {
          setStatus("idle");
        }
      }, 2500);
    },
    [triggerNextCycle],
  );

  const showError = useCallback(
    (text: string) => {
      if (!isMountedRef.current) return;
      setFeedback(text);
      setStatus("error");

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setFeedback(null);
        if (isActiveHandsFreeRef.current) {
          triggerNextCycle();
        } else {
          setStatus("idle");
        }
      }, 3000);
    },
    [triggerNextCycle],
  );

  // ── Dispatcher komend głosowych do WebMCP Bridge ───────────────────
  const dispatchCommand = useCallback(
    (rawTranscript: string) => {
      const text = rawTranscript.toLowerCase().trim();

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
        text.includes("włącz") ||
        text.includes("wlacz") ||
        text.includes("tańcz") ||
        text.includes("tancz") ||
        text.includes("zacznij") ||
        text.includes("odpal") ||
        text.includes("play")
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
        text.includes("czekaj") ||
        text.includes("przerwij") ||
        text.includes("pause")
      ) {
        bridge.pause();
        showFeedback(t.VOICE_COACH_PAUSE);
        return;
      }

      // 3. RESTART / RESET
      if (
        text.includes("od nowa") ||
        text.includes("od początku") ||
        text.includes("początek") ||
        text.includes("reset") ||
        text.includes("restart") ||
        text.includes("jeszcze raz") ||
        text.includes("again")
      ) {
        bridge.reset();
        showFeedback(t.VOICE_COACH_RESET);
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
          `${t.VOICE_COACH_TEMPO_SLOW} (${res?.effectiveBpm ?? 60} ${t.BPM_LABEL})`,
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
        text.includes("fast")
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
        text.includes("małe kroki") ||
        text.includes("kroczki") ||
        text.includes("dla początkujących") ||
        text.includes("small")
      ) {
        bridge.setPracticeMode("baby_steps");
        showFeedback(t.VOICE_COACH_BABY_ON);
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
        showFeedback(t.VOICE_COACH_FULL_STEPS);
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
              `${t.VOICE_COACH_SONG_PREFIX} ${res.song.artist} — ${res.song.title}`,
            );
            return;
          }
        }
      }

      // Jeśli nie dopasowano do konkretnego wzorca komendy
      triggerNextCycle();
    },
    [t, showFeedback, showError, triggerNextCycle],
  );

  // ── Przetworzenie fragmentu audio ──────────────────────────────────
  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      setStatus("processing");
      try {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        const res = await fetch("/api/voice", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const transcript = data.transcript?.trim() || "";

        if (transcript) {
          dispatchCommand(transcript);
        } else {
          // Jeśli była cisza, natychmiast słuchaj dalej
          triggerNextCycle();
        }
      } catch (err) {
        console.warn("[VoiceCoach] Audio processing error", err);
        triggerNextCycle();
      }
    },
    [dispatchCommand, triggerNextCycle],
  );

  // ── Start pojedynczego cyklu nasłuchu w pętli ──────────────────────
  const startRecordingCycle = async () => {
    if (!isActiveHandsFreeRef.current) return;
    clearTimers();
    audioChunksRef.current = [];

    try {
      if (!streamRef.current || !streamRef.current.active) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(streamRef.current, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });

        if (audioBlob.size > 400 && isActiveHandsFreeRef.current) {
          void processAudio(audioBlob);
        } else if (isActiveHandsFreeRef.current) {
          triggerNextCycle();
        } else {
          setStatus("idle");
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setStatus("recording");

      // Okienko nasłuchu trwa 2.8 sekundy
      recordTimeoutRef.current = setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          try {
            mediaRecorderRef.current.stop();
          } catch {}
        }
      }, 2800);
    } catch (err) {
      console.warn("[VoiceCoach] Mic loop error", err);
      isActiveHandsFreeRef.current = false;
      showError(t.VOICE_COACH_ERROR_NOT_ALLOWED);
    }
  };

  // ── Włącz / Wyłącz ciągły nasłuch (Hands-Free) ───────────────────
  const handleMicClick = useCallback(() => {
    if (isActiveHandsFreeRef.current) {
      // Wyłączenie ciągłego nasłuchu
      isActiveHandsFreeRef.current = false;
      clearTimers();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((trk) => trk.stop());
        streamRef.current = null;
      }
      setStatus("idle");
      setFeedback(null);
    } else {
      // Włączenie ciągłego nasłuchu
      isActiveHandsFreeRef.current = true;
      void startRecordingCycle();
    }
  }, [clearTimers]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isActiveHandsFreeRef.current = false;
      clearTimers();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((trk) => trk.stop());
      }
    };
  }, [clearTimers]);

  const isHandsFreeActive = isActiveHandsFreeRef.current;
  const isRecording = status === "recording";
  const isProcessing = status === "processing";
  const hasFeedback = Boolean(feedback);

  const statusBadge = isHandsFreeActive
    ? isRecording
      ? t.VOICE_COACH_LISTEN_START.split(" ")[0] || "🎙️"
      : isProcessing
        ? "..."
        : t.VOICE_COACH_TITLE
    : status === "error"
      ? "!"
      : t.VOICE_COACH_TITLE;

  const messageText = isHandsFreeActive
    ? feedback || t.VOICE_COACH_LISTEN_START
    : feedback || t.VOICE_COACH_ENABLE;

  return (
    <aside
      aria-label={t.VOICE_COACH_TITLE}
      className="pointer-events-auto fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5"
    >
      <AnimatePresence>
        {(isHandsFreeActive || hasFeedback) && (
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
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                  isRecording
                    ? "bg-pink-500/20 text-pink-600 dark:text-pink-300 animate-pulse"
                    : isProcessing
                      ? "bg-primary/20 text-primary animate-pulse"
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
        onClick={handleMicClick}
        title={isHandsFreeActive ? t.VOICE_COACH_DISABLE : t.VOICE_COACH_ENABLE}
        aria-label={t.VOICE_COACH_TITLE}
        className={`group relative flex size-14 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition-transform active:scale-95 ${
          isHandsFreeActive
            ? "border-pink-500 bg-pink-500 text-white shadow-pink-500/50 ring-4 ring-pink-500/30"
            : "border-border bg-card/90 text-foreground hover:border-primary/50 hover:bg-primary/10 shadow-black/10"
        }`}
      >
        {isHandsFreeActive && (
          <span className="absolute inset-0 animate-ping rounded-full bg-pink-500/40" />
        )}
        {isProcessing ? (
          <Sparkles className="size-6 animate-spin text-primary-foreground" />
        ) : isHandsFreeActive ? (
          <Mic className="size-6 animate-pulse text-white" />
        ) : (
          <Mic className="size-6 text-foreground transition-colors group-hover:text-primary" />
        )}
      </button>
    </aside>
  );
}
