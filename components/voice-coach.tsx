"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getActiveTrainerBridge } from "@/lib/webmcp-client";
import { translations, type Lang } from "@/lib/translations";

interface VoiceCoachProps {
  lang: Lang;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
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
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

export function VoiceCoach({ lang }: VoiceCoachProps) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const t = translations[lang] as typeof translations.pl & {
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
  };

  const showFeedback = useCallback((text: string) => {
    setFeedback(text);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 4000);
  }, []);

  const handleVoiceCommand = useCallback(
    (rawText: string) => {
      const text = rawText.toLowerCase().trim();
      if (!text) return;

      setLiveTranscript(text);

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
        text.includes("tańcz") ||
        text.includes("zacznij") ||
        text.includes("odpal") ||
        text.includes("play")
      ) {
        bridge.start();
        showFeedback(t.VOICE_COACH_START || "▶️ Practice started!");
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
        showFeedback(t.VOICE_COACH_PAUSE || "⏸️ Practice paused");
        return;
      }

      // 3. RESTART / RESET
      if (
        text.includes("od nowa") ||
        text.includes("od początku") ||
        text.includes("początek") ||
        text.includes("reset") ||
        text.includes("restart")
      ) {
        bridge.reset();
        showFeedback(t.VOICE_COACH_RESET || "🔄 Reset to start");
        return;
      }

      // 4. TEMPO 0.5x
      if (
        text.includes("wolno") ||
        text.includes("zwolnij") ||
        text.includes("pół tempa") ||
        text.includes("połowa") ||
        text.includes("0.5") ||
        text.includes("slow")
      ) {
        const res = bridge.setTempo(0.5);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_SLOW || "⏱️ Set slow tempo: 0.5×"} (${res.effectiveBpm} BPM)`,
        );
        return;
      }

      // 4. TEMPO 1.0x
      if (
        text.includes("normalnie") ||
        text.includes("standard") ||
        text.includes("normalne tempo") ||
        text.includes("1x") ||
        text.includes("normal")
      ) {
        const res = bridge.setTempo(1);
        showFeedback(
          `${t.VOICE_COACH_TEMPO_NORMAL || "⏱️ Set normal tempo: 1.0×"} (${res.effectiveBpm} BPM)`,
        );
        return;
      }

      // 4. TEMPO 1.25x
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
          `${t.VOICE_COACH_TEMPO_FAST || "🚀 Set fast tempo: 1.25×"} (${res.effectiveBpm} BPM)`,
        );
        return;
      }

      // 5. BABY STEPS
      if (
        text.includes("baby") ||
        text.includes("małe kroki") ||
        text.includes("kroczki") ||
        text.includes("dla początkujących")
      ) {
        bridge.setPracticeMode("baby_steps");
        showFeedback(t.VOICE_COACH_BABY_ON || "👣 Baby Steps mode activated");
        return;
      }

      // 5. FULL STEPS
      if (
        text.includes("pełne kroki") ||
        text.includes("duże kroki") ||
        text.includes("normalne kroki") ||
        text.includes("pełny krok") ||
        text.includes("full")
      ) {
        bridge.setPracticeMode("full_steps");
        showFeedback(
          t.VOICE_COACH_FULL_STEPS || "🕺 Full steps mode activated",
        );
        return;
      }

      // 6. PIOSENKI
      const songMatches: Record<string, string> = {
        szalon: "szalona",
        chwil: "chwile",
        życie: "chwile",
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
          if (res.success && res.song) {
            showFeedback(
              `${t.VOICE_COACH_SONG_PREFIX || "🎵 Selected song:"} ${res.song.artist} — ${res.song.title}`,
            );
            return;
          }
        }
      }
    },
    [t, showFeedback],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang === "pl" ? "pl-PL" : "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      handleVoiceCommand(transcriptText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") return;

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        isListeningRef.current = false;
        setIsListening(false);
        showFeedback(
          lang === "pl"
            ? "⚠️ Dostęp do mikrofonu zablokowany."
            : "⚠️ Microphone access blocked.",
        );
        return;
      }

      console.warn("[VoiceCoach] Speech error:", event.error);
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          isListeningRef.current = false;
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      try {
        recognition.stop();
      } catch {
        // Ignoruj
      }
    };
  }, [lang, handleVoiceCommand, showFeedback]);

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      isListeningRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      setLiveTranscript("");
      showFeedback(t.VOICE_COACH_OFF || "Microphone off");
    } else {
      try {
        // 1. Jawne wybudzenie mikrofonu przez Web Audio Media Stream (odblokowuje Chrome)
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          stream.getTracks().forEach((track) => track.stop());
        }

        // 2. Start rozpoznawania mowy
        setLiveTranscript("");
        recognitionRef.current.lang = lang === "pl" ? "pl-PL" : "en-US";
        recognitionRef.current.start();
        isListeningRef.current = true;
        setIsListening(true);
        showFeedback(t.VOICE_COACH_LISTEN_START || "🎙️ Listening...");
      } catch (err: any) {
        console.warn("[VoiceCoach] Start error:", err);
        isListeningRef.current = false;
        setIsListening(false);
        showFeedback(
          lang === "pl"
            ? "⚠️ Nie udało się uruchomić mikrofonu. Sprawdź uprawnienia w przeglądarce."
            : "⚠️ Could not access microphone. Check permissions.",
        );
      }
    }
  }, [isListening, lang, t, showFeedback]);

  if (!supported) return null;

  return (
    <aside
      aria-label={t.VOICE_COACH_TITLE || "Voice AI Coach"}
      className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5 pointer-events-auto"
    >
      <AnimatePresence>
        {(feedback || (isListening && liveTranscript)) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="max-w-xs rounded-2xl border border-border bg-card/95 p-3.5 text-xs font-bold text-foreground shadow-2xl backdrop-blur-md dark:border-pink-500/40"
          >
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-wider mb-1">
              <Sparkles className="size-3.5 text-primary" />
              <span>{t.VOICE_COACH_TITLE || "Voice AI Coach"}</span>
            </div>
            <p className="leading-snug text-foreground/90">
              {feedback || `🎙️ Słyszę: "${liveTranscript}"`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={toggleListening}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={
          isListening
            ? t.VOICE_COACH_DISABLE || "Disable voice control"
            : t.VOICE_COACH_ENABLE || "Enable AI voice control"
        }
        aria-label={
          isListening
            ? t.VOICE_COACH_DISABLE || "Disable voice control"
            : t.VOICE_COACH_ENABLE || "Enable AI voice control"
        }
        aria-pressed={isListening}
        className={`group relative flex size-14 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition-all ${
          isListening
            ? "border-pink-500 bg-pink-500 text-white shadow-pink-500/50 ring-4 ring-pink-500/20"
            : "border-border bg-card/90 text-foreground hover:border-primary/50 hover:bg-primary/10 shadow-black/10"
        }`}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-pink-500/30 animate-ping" />
        )}
        {isListening ? (
          <Mic className="size-6 animate-pulse text-white" />
        ) : (
          <Mic className="size-6 text-foreground group-hover:text-primary transition-colors" />
        )}
      </motion.button>
    </aside>
  );
}
