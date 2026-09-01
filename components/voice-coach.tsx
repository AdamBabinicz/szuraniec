"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
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
  const [isActiveListening, setIsActiveListening] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);
  const isMountedRef = useRef(true);

  const t = translations[lang] || translations.pl;

  const clearTimers = useCallback(() => {
    if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
  }, []);

  const showFeedback = useCallback((text: string) => {
    if (!isMountedRef.current) return;
    setFeedback(text);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setFeedback(null);
    }, 3500);
  }, []);

  // ── Dispatcher komend głosowych do WebMCP Bridge ───────────────────
  const dispatchCommand = useCallback(
    (rawTranscript: string) => {
      const text = rawTranscript.toLowerCase().trim();
      const bridge = getActiveTrainerBridge();
      if (!bridge) return;

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
            ? `⏱️ Ustawiono wolne tempo: 0.5× (${res.effectiveBpm} BPM)`
            : `⏱️ Set slow tempo: 0.5× (${res.effectiveBpm} BPM)`,
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
            ? `⏱️ Ustawiono normalne tempo: 1.0× (${res.effectiveBpm} BPM)`
            : `⏱️ Set normal tempo: 1.0× (${res.effectiveBpm} BPM)`,
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
            ? `🚀 Ustawiono szybkie tempo: 1.25× (${res.effectiveBpm} BPM)`
            : `🚀 Set fast tempo: 1.25× (${res.effectiveBpm} BPM)`,
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
        prawdziw: "cudowna",
        miłość: "cudowna",
      };

      for (const [keyword, sId] of Object.entries(songMatches)) {
        if (text.includes(keyword)) {
          const res = bridge.setSong(sId);
          if (res.success && res.song) {
            showFeedback(
              lang === "pl"
                ? `🎵 Wybrano: ${res.song.artist} — ${res.song.title}`
                : `🎵 Selected: ${res.song.artist} — ${res.song.title}`,
            );
            return;
          }
        }
      }

      showFeedback(
        lang === "pl"
          ? `❓ Rozpoznano: "${rawTranscript}"`
          : `❓ Recognized: "${rawTranscript}"`,
      );
    },
    [lang, showFeedback],
  );

  // ── Przesłanie nagrania do Whisper AI i kontynuacja pętli ─────────
  const processAudioChunk = useCallback(
    async (audioBlob: Blob) => {
      setStatus("processing");
      try {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        const res = await fetch("/api/voice", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = (await res.json()) as { transcript?: string };
          const transcript = data.transcript?.trim() || "";
          if (transcript) {
            dispatchCommand(transcript);
          }
        }
      } catch (err) {
        console.warn("[VoiceCoach] Chunk error:", err);
      } finally {
        // Jeśli tryb ciągły jest nadal włączony, natychmiast nagrywamy kolejny fragment
        if (isMountedRef.current && isActiveRef.current) {
          loopTimeoutRef.current = setTimeout(() => {
            if (isActiveRef.current) recordNextSlice();
          }, 300);
        } else {
          setStatus("idle");
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatchCommand],
  );

  // ── Nagranie 3-sekundowego fragmentu mowy w pętli ─────────────────
  const recordNextSlice = useCallback(() => {
    if (!isActiveRef.current || !streamRef.current) return;

    audioChunksRef.current = [];
    setStatus("recording");

    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const recorder = new MediaRecorder(
        streamRef.current,
        mimeType ? { mimeType } : undefined,
      );

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        if (audioBlob.size > 600) {
          void processAudioChunk(audioBlob);
        } else if (isActiveRef.current) {
          recordNextSlice();
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      // Zakończenie fragmentu po 3.5 sekundy i wysyłka do analizy
      recordTimeoutRef.current = setTimeout(() => {
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // ignore
          }
        }
      }, 2200);
    } catch (err) {
      console.warn("[VoiceCoach] Recorder slice error:", err);
      stopContinuousListening();
    }
  }, [processAudioChunk]);

  // ── Start ciągłego nasłuchiwania ───────────────────────────────────
  const startContinuousListening = useCallback(async () => {
    clearTimers();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      isActiveRef.current = true;
      setIsActiveListening(true);
      showFeedback(
        lang === "pl"
          ? "🎙️ Asystent aktywny! Mów komendy w dowolnym momencie..."
          : "🎙️ Voice Coach active! Speak commands anytime...",
      );
      recordNextSlice();
    } catch (err) {
      console.warn("[VoiceCoach] Mic permission error:", err);
      showFeedback(
        lang === "pl"
          ? "⚠️ Brak dostępu do mikrofonu."
          : "⚠️ Microphone access denied.",
      );
    }
  }, [clearTimers, lang, recordNextSlice, showFeedback]);

  // ── Zatrzymanie ciągłego nasłuchiwania ──────────────────────────────
  const stopContinuousListening = useCallback(() => {
    isActiveRef.current = false;
    setIsActiveListening(false);
    clearTimers();

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setStatus("idle");
    showFeedback(
      lang === "pl" ? "Mikrofon wyłączony" : "Microphone turned off",
    );
  }, [clearTimers, lang, showFeedback]);

  const toggleContinuousListening = useCallback(() => {
    if (isActiveListening) {
      stopContinuousListening();
    } else {
      void startContinuousListening();
    }
  }, [isActiveListening, startContinuousListening, stopContinuousListening]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isActiveRef.current = false;
      clearTimers();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [clearTimers]);

  const isRecording = status === "recording";
  const isProcessing = status === "processing";

  return (
    <aside
      aria-label="Voice AI Coach"
      className="pointer-events-auto fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5"
    >
      <AnimatePresence>
        {(isActiveListening || feedback) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="max-w-xs rounded-2xl border border-border bg-card/95 p-3.5 text-xs font-bold text-foreground shadow-2xl backdrop-blur-md dark:border-pink-500/40"
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
                  isActiveListening
                    ? "bg-pink-500/20 text-pink-600 dark:text-pink-300 animate-pulse"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isActiveListening
                  ? lang === "pl"
                    ? "Aktywny (Mów...)"
                    : "Live Listening"
                  : "Info"}
              </span>
            </div>
            <p className="leading-snug text-foreground/90">
              {feedback ||
                (lang === "pl"
                  ? "🎙️ Słucham w tle: start, zwolnij, włącz Szaloną, pauza..."
                  : "🎙️ Listening continuously: start, slow down, play Szalona, pause...")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={toggleContinuousListening}
        title={
          isActiveListening
            ? "Wyłącz ciągłe nasłuchiwanie"
            : "Włącz ciągłe sterowanie głosem"
        }
        aria-label="Voice AI Control"
        className={`group relative flex size-14 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition-transform active:scale-95 ${
          isActiveListening
            ? "border-pink-500 bg-pink-500 text-white shadow-pink-500/50 ring-4 ring-pink-500/30"
            : "border-border bg-card/90 text-foreground hover:border-primary/50 hover:bg-primary/10 shadow-black/10"
        }`}
      >
        {isActiveListening && (
          <span className="absolute inset-0 animate-ping rounded-full bg-pink-500/40" />
        )}
        {isProcessing ? (
          <Sparkles className="size-6 animate-spin text-white" />
        ) : isActiveListening ? (
          <Mic className="size-6 animate-pulse text-white" />
        ) : (
          <Mic className="size-6 text-foreground transition-colors group-hover:text-primary" />
        )}
      </button>
    </aside>
  );
}
