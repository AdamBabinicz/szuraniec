"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * VoiceCoach — Browser-Native Web Speech API bridge.
 *
 * Architektura adaptacyjna dla Audio Focus na platformach mobilnych:
 *  • DESKTOP (Windows 11 / macOS / Linux): tryb ciągły (continuous = true)
 *    z automatycznym restartem w onend — tancerz mówi w dowolnym momencie
 *    bez dotykania myszki.
 *  • MOBILE (Android / iOS / Safari Mobile / Chrome Mobile): tryb bezpieczny
 *    Tap-to-Speak (continuous = false). Po zakończeniu wypowiedzi mikrofon
 *    jest całkowicie zamykany, sesja recognition jest przerywana przez
 *    stop()+abort(), a strumień MediaStream jest zwalniany (track.stop()),
 *    aby YouTube odzyskał Audio Focus i odtwarzał płynnie, bez duckingu
 *    i szarpania.
 */

export function VoiceCoach({ lang }: VoiceCoachProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Refy sterujące cyklem życia silnika mowy (nie powodują renderów).
  const isMountedRef = useRef<boolean>(true);
  const recognitionRef = useRef<any>(null);
  const recognitionStreamRef = useRef<MediaStream | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Niezależne flagi:
  //  isListeningDesired = intencja użytkownika (kliknął włącz),
  //  shouldRestart      = zgoda na auto-restart WYŁĄCZNIE na desktopie.
  const isListeningDesiredRef = useRef<boolean>(false);
  const shouldRestartRef = useRef<boolean>(false);

  const t = translations[lang] || translations.pl;

  // Wykrywanie środowiska mobilnego — UA + maxTouchPoints + coarse pointer.
  // Computed raz (useMemo) i utrwalone w refie dla handlerów asynchronicznych.
  const isMobile = useMemo<boolean>(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }
    const ua = navigator.userAgent || "";
    const uaMobile =
      /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(
        ua,
      );
    const touchCapable =
      (navigator.maxTouchPoints ?? 0) > 0 ||
      "ontouchstart" in
        (typeof window !== "undefined" ? window : ({} as Window));
    const coarsePointer =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    return uaMobile || (touchCapable && coarsePointer);
  }, []);

  const isMobileRef = useRef<boolean>(isMobile);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  // Bezpieczne ustawianie stanu tylko gdy komponent jest zamontowany.
  const safeSetStatus = useCallback((next: VoiceStatus) => {
    if (isMountedRef.current) setStatus(next);
  }, []);

  const safeSetFeedback = useCallback((text: string | null) => {
    if (isMountedRef.current) setFeedback(text);
  }, []);

  // ── Wyświetlanie feedbacku z automatycznym powrotem do nasłuchu ─────
  const showFeedback = useCallback(
    (text: string) => {
      safeSetFeedback(text);
      safeSetStatus("feedback");

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        safeSetFeedback(null);
        // Desktop: po 2.5 s wracamy do nasłuchu (jeśli użytkownik nadal chce słuchać).
        // Mobile: zwalniamy Audio Focus dla YouTube i przechodzimy w idle.
        if (isListeningDesiredRef.current && shouldRestartRef.current) {
          safeSetStatus("listening");
        } else {
          safeSetStatus("idle");
          isListeningDesiredRef.current = false;
          shouldRestartRef.current = false;
        }
      }, 2500);
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
        if (isListeningDesiredRef.current && shouldRestartRef.current) {
          safeSetStatus("listening");
        } else {
          safeSetStatus("idle");
          isListeningDesiredRef.current = false;
          shouldRestartRef.current = false;
        }
      }, 3500);
    },
    [safeSetFeedback, safeSetStatus],
  );

  // ── Dyspozytor komend głosowych → WebMCP TrainerBridge ──────────────
  // Obsługuje 9 grup komend: Start, Pauza, Reset, Tempo (0.5×/1×/1.25×),
  // Baby Steps, Full Steps + 13 utworów z bazy `bridge.setSong(...)`.
  const dispatchCommand = useCallback(
    (rawTranscript: string) => {
      const text = (rawTranscript || "").toLowerCase().trim();
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

      // 9. 13 utworów z bazy WebMCP TrainerBridge.setSong(id)
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

      showFeedback(
        `${t.VOICE_COACH_UNKNOWN_PREFIX} "${rawTranscript}" ${t.VOICE_COACH_UNKNOWN_HINT}`,
      );
    },
    [t, showFeedback, showError],
  );

  // ── Całkowite zwolnienie zasobów silnika mowy ──────────────────────
  // Wywoływane z onend (mobile), z onerror (mobile), z handleMicToggle
  // (wyłączenie przez użytkownika) i przy unmount komponentu.
  // Zamyka recognition, zwalnia wszystkie tracki MediaStream, zeruje refy
  // — oddaje Audio Focus odtwarzaczowi YouTube.
  const releaseSpeechEngine = useCallback(() => {
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
    if (recognitionStreamRef.current) {
      try {
        recognitionStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      } catch {
        // ignore
      }
      recognitionStreamRef.current = null;
    }
  }, []);

  // ── Start silnika mowy (z rozróżnieniem desktop / mobile) ───────────
  const startSpeechEngine = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showError(t.VOICE_COACH_NOT_SUPPORTED);
      isListeningDesiredRef.current = false;
      shouldRestartRef.current = false;
      safeSetStatus("idle");
      return;
    }

    // Sprzątamy ewentualną poprzednią sesję zanim wystartujemy nową.
    releaseSpeechEngine();

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === "pl" ? "pl-PL" : "en-US";

      // ── Najważniejsza różnica architektoniczna ─────────────────────
      // DESKTOP: continuous = true (Hands-Free Loop, auto-restart w onend)
      // MOBILE:  continuous = false (Tap-to-Speak, brak pętli restartów)
      recognition.continuous = !isMobileRef.current;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // Na mobile łapiemy strumień audio, by móc zwolnić go po zakończeniu
      // sesji i oddać Audio Focus odtwarzaczowi YouTube.
      if (isMobileRef.current && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            recognitionStreamRef.current = stream;
          })
          .catch(() => {
            recognitionStreamRef.current = null;
          });
      }

      // shouldRestart dotyczy WYŁĄCZNIE desktopu (ciągły nasłuch).
      shouldRestartRef.current = !isMobileRef.current;

      recognition.onstart = () => {
        if (!isMountedRef.current) return;
        safeSetStatus("listening");
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

        // Błędy "no-speech" i "aborted" na mobile to naturalne zamknięcie
        // sesji Tap-to-Speak — nie restartujemy, nie pokazujemy błędu.
        if (event.error === "no-speech" || event.error === "aborted") {
          if (isMobileRef.current) {
            isListeningDesiredRef.current = false;
            shouldRestartRef.current = false;
            safeSetStatus("idle");
            releaseSpeechEngine();
          }
          return;
        }

        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          isListeningDesiredRef.current = false;
          shouldRestartRef.current = false;
          showError(t.VOICE_COACH_ERROR_NOT_ALLOWED);
          releaseSpeechEngine();
          return;
        }

        // Każdy inny błąd: na mobile zamykamy natychmiast,
        // na desktopie pozwalamy na restart w onend (jeśli intencja trwa).
        if (isMobileRef.current) {
          isListeningDesiredRef.current = false;
          shouldRestartRef.current = false;
          safeSetStatus("idle");
          releaseSpeechEngine();
        }
      };

      recognition.onend = () => {
        if (!isMountedRef.current) return;

        // ── KLUCZOWE: auto-restart wyłącznie na desktopie ────────────
        if (
          isListeningDesiredRef.current &&
          shouldRestartRef.current &&
          !isMobileRef.current
        ) {
          // Sprzątamy starą instancję i tworzymy świeżą, by uniknąć wyścigu
          // z wewnętrznym stanem recognition (Chrome na Windows blokuje
          // ponowne start() na tej samej instancji po onend).
          releaseSpeechEngine();
          try {
            const fresh = new SpeechRecognition();
            fresh.lang = lang === "pl" ? "pl-PL" : "en-US";
            fresh.continuous = !isMobileRef.current;
            fresh.interimResults = false;
            fresh.maxAlternatives = 1;
            fresh.onstart = () => {
              if (isMountedRef.current) safeSetStatus("listening");
            };
            fresh.onresult = (e: any) => {
              if (!isMountedRef.current) return;
              const li = e.results.length - 1;
              const tr = e.results[li]?.[0]?.transcript?.trim() || "";
              if (tr) dispatchCommand(tr);
            };
            fresh.onerror = (e: any) => {
              if (!isMountedRef.current) return;
              if (
                e.error === "not-allowed" ||
                e.error === "service-not-allowed"
              ) {
                isListeningDesiredRef.current = false;
                shouldRestartRef.current = false;
                showError(t.VOICE_COACH_ERROR_NOT_ALLOWED);
                releaseSpeechEngine();
              }
            };
            fresh.onend = recognition.onend;
            recognitionRef.current = fresh;
            fresh.start();
          } catch {
            setTimeout(() => {
              if (
                isMountedRef.current &&
                isListeningDesiredRef.current &&
                shouldRestartRef.current &&
                !isMobileRef.current
              ) {
                try {
                  startSpeechEngine();
                } catch {
                  isListeningDesiredRef.current = false;
                  shouldRestartRef.current = false;
                  safeSetStatus("idle");
                }
              }
            }, 250);
          }
        } else {
          // MOBILE lub użytkownik wyłączył mikrofon: czyste zakończenie,
          // brak pętli restartów, pełne zwolnienie Audio Focus.
          isListeningDesiredRef.current = false;
          shouldRestartRef.current = false;
          safeSetStatus("idle");
          releaseSpeechEngine();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("[VoiceCoach] Error starting SpeechRecognition", err);
      isListeningDesiredRef.current = false;
      shouldRestartRef.current = false;
      safeSetStatus("idle");
      releaseSpeechEngine();
    }
  }, [dispatchCommand, lang, releaseSpeechEngine, showError, safeSetStatus, t]);

  // ── Kliknięcie przycisku mikrofonu (Toggle) ─────────────────────────
  const handleMicToggle = useCallback(() => {
    if (status === "listening" || isListeningDesiredRef.current) {
      // Wyłączanie mikrofonu przez użytkownika — pełne zwolnienie zasobów.
      isListeningDesiredRef.current = false;
      shouldRestartRef.current = false;
      releaseSpeechEngine();
      safeSetStatus("idle");
      safeSetFeedback(null);
    } else {
      isListeningDesiredRef.current = true;
      startSpeechEngine();
    }
  }, [
    releaseSpeechEngine,
    safeSetFeedback,
    safeSetStatus,
    startSpeechEngine,
    status,
  ]);

  // Cleanup przy unmount.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isListeningDesiredRef.current = false;
      shouldRestartRef.current = false;
      releaseSpeechEngine();
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
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
                  {t.VOICE_COACH_TITLE}
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
        title={isListening ? t.VOICE_COACH_DISABLE : t.VOICE_COACH_ENABLE}
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
