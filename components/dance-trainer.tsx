"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Footprints,
  Keyboard,
  Maximize2,
  Minimize2,
  MousePointerClick,
  Sparkles,
  Users,
  Vibrate,
} from "lucide-react";
import Link from "next/link";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { DanceControls } from "@/components/dance-controls";
import { DanceFloor } from "@/components/dance-floor";
import { SiteHeader } from "@/components/site-header";
import { useRhythm } from "@/hooks/use-rhythm";
import { unlockAudio } from "@/lib/metronome";
import {
  PHASES,
  SONGS,
  directionFor,
  rolesFor,
  type AudioSource,
  type Lang,
  type Song,
  type Speed,
  translations,
} from "@/lib/translations";

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: string | HTMLElement,
        config: {
          videoId?: string;
          playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            rel?: 0 | 1;
            playsinline?: 0 | 1;
            modestbranding?: 0 | 1;
            enablejsapi?: 0 | 1;
            origin?: string;
          };
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: {
              data: number;
              target: YTPlayerInstance;
            }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setPlaybackRate: (rate: number) => void;
  loadVideoById: (options: { videoId: string }) => void;
  cueVideoById: (options: { videoId: string }) => void;
  getPlayerState: () => number;
  getIframe: () => HTMLElement | null;
  destroy: () => void;
}

export function DanceTrainer() {
  const [lang, setLang] = useState<Lang>("pl");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [songId, setSongId] = useState<Song["id"]>("szalona");
  const [speed, setSpeed] = useState<Speed>(1);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [source, setSource] = useState<AudioSource>("click");
  const [baby, setBaby] = useState(false);
  const [role, setRole] = useState<"leader" | "follower">("leader");
  const [vibrate, setVibrate] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [cookieBannerOpen, setCookieBannerOpen] = useState(false);

  const [ytReady, setYtReady] = useState(false);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytErrorCode, setYtErrorCode] = useState<number | null>(null);

  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const ytPlayerMountRef = useRef<HTMLDivElement | null>(null);
  const isPlayerReadyRef = useRef(false);
  const ytAutoplayRef = useRef(false);

  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const savedTheme = localStorage.getItem("dwa_na_jeden_theme") as
      | "light"
      | "dark"
      | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
      document.documentElement.style.colorScheme = savedTheme;
    }

    const savedLang = localStorage.getItem("dwa_na_jeden_lang") as Lang | null;
    if (savedLang === "pl" || savedLang === "en") {
      setLang(savedLang);
      document.documentElement.lang = savedLang;
    }

    const savedRole = localStorage.getItem("dwa_na_jeden_role") as
      | "leader"
      | "follower"
      | null;
    if (savedRole) setRole(savedRole);

    const savedConsent = localStorage.getItem("dwa_na_jeden_cookie_consent");
    if (!savedConsent) {
      setCookieBannerOpen(true);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.YT?.Player) {
      setYtReady(true);
      return;
    }

    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      setYtReady(true);
    };

    const existingScript = document.getElementById("yt-iframe-api");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }

    return () => {
      if (window.onYouTubeIframeAPIReady === previousReady) return;
    };
  }, []);

  const t = translations[lang];

  const [copyrightYear, setCopyrightYear] = useState<string>("2026");
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    setCopyrightYear(currentYear > 2026 ? `2026 - ${currentYear}` : "2026");
  }, []);

  const song = useMemo(
    () => SONGS.find((item) => item.id === songId) ?? SONGS[0],
    [songId],
  );

  const phaseDurations = useMemo(() => PHASES.map((p) => p.beats), []);
  const phaseVoices = useMemo(() => PHASES.map((p) => p.voice), []);

  const { beat, cycle, progress, beatMs, reset } = useRhythm({
    bpm: song.bpm,
    speed,
    playing,
    phaseDurations,
    phaseVoices,
    clicks: !muted && source === "click",
    vibrate,
  });

  const safeYtCall = useCallback(
    (action: (player: YTPlayerInstance) => void) => {
      if (!isPlayerReadyRef.current || !ytPlayerRef.current) return;
      try {
        const iframe = ytPlayerRef.current.getIframe?.();
        if (iframe && iframe.isConnected) {
          action(ytPlayerRef.current);
        }
      } catch {
        // noop
      }
    },
    [],
  );

  useEffect(() => {
    setYtErrorCode(null);
  }, [songId, source]);

  useEffect(() => {
    return () => {
      try {
        ytPlayerRef.current?.destroy();
      } catch {
        // noop
      } finally {
        ytPlayerRef.current = null;
        isPlayerReadyRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!ytReady || source !== "youtube") return;
    if (!song.youtubeId) {
      setYtErrorCode(2);
      return;
    }
    if (!ytPlayerMountRef.current) return;
    if (!window.YT?.Player) return;

    if (!ytPlayerRef.current) {
      setYtLoading(true);
      isPlayerReadyRef.current = false;

      // FIX: usunięty `host: "https://www.youtube-nocookie.com"` —
      // domyślny host YT (youtube.com) jest zgodny ze skryptem
      // iframe_api ładowanym z tego samego originu i nie wymaga
      // dodatkowej zgodności origin/CSP w produkcji.
      // FIX: `origin` ustawiamy tylko dla HTTPS (na HTTP i tak nie
      // zadziała komunikacja postMessage z iframe YT).
      ytPlayerRef.current = new window.YT.Player(ytPlayerMountRef.current, {
        videoId: song.youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          enablejsapi: 1,
          origin:
            typeof window !== "undefined" &&
            window.location.protocol === "https:"
              ? window.location.origin
              : undefined,
        },
        events: {
          onReady: (event) => {
            isPlayerReadyRef.current = true;
            setYtLoading(false);
            setYtErrorCode(null);

            try {
              if (muted) event.target.mute();
              else event.target.unMute();

              event.target.setPlaybackRate(speed);

              if (song.youtubeId) {
                if (ytAutoplayRef.current || playingRef.current) {
                  event.target.loadVideoById({ videoId: song.youtubeId });
                  event.target.playVideo();
                } else {
                  event.target.cueVideoById({ videoId: song.youtubeId });
                }
              }
            } catch {
              // noop
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT?.PlayerState.PLAYING) {
              unlockAudio();
              setPlaying(true);
              setYtLoading(false);
            } else if (event.data === window.YT?.PlayerState.PAUSED) {
              setPlaying(false);
              setYtLoading(false);
            } else if (event.data === window.YT?.PlayerState.ENDED) {
              ytAutoplayRef.current = false;
              setPlaying(false);
              setYtLoading(false);
              reset();
            } else if (event.data === window.YT?.PlayerState.BUFFERING) {
              setYtLoading(true);
            } else if (event.data === window.YT?.PlayerState.CUED) {
              setYtLoading(false);
            }
          },
          onError: (event) => {
            // FIX: po błędzie zerujemy referencję playera, żeby
            // następna zmiana `songId` / `source` mogła poprawnie utworzyć
            // nowego YT.Player zamiast ponownie karmić martwą instancję.
            isPlayerReadyRef.current = false;
            ytAutoplayRef.current = false;
            setPlaying(false);
            setYtLoading(false);
            setYtErrorCode(event.data);
            try {
              ytPlayerRef.current?.destroy();
            } catch {
              // noop
            } finally {
              ytPlayerRef.current = null;
            }
          },
        },
      });

      return;
    }

    setYtLoading(true);
    safeYtCall((player) => {
      if (muted) player.mute();
      else player.unMute();

      player.setPlaybackRate(speed);

      if (playingRef.current || ytAutoplayRef.current) {
        player.loadVideoById({ videoId: song.youtubeId });
        player.playVideo();
      } else {
        player.cueVideoById({ videoId: song.youtubeId });
        setYtLoading(false);
      }
    });
  }, [ytReady, source, song.youtubeId, muted, speed, safeYtCall, reset]);

  useEffect(() => {
    if (source === "youtube") return;
    ytAutoplayRef.current = false;
    setYtLoading(false);
    safeYtCall((player) => {
      player.pauseVideo();
    });
  }, [source, safeYtCall]);

  useEffect(() => {
    if (source !== "youtube") return;
    safeYtCall((player) => {
      if (muted) player.mute();
      else player.unMute();
    });
  }, [muted, source, safeYtCall]);

  useEffect(() => {
    if (source !== "youtube") return;
    safeYtCall((player) => {
      player.setPlaybackRate(speed);
    });
  }, [speed, source, safeYtCall]);

  const effectiveBar = role === "follower" ? cycle + 1 : cycle;
  const phase = PHASES[beat];
  const direction = directionFor(effectiveBar);
  const { moving, weight } = rolesFor(phase, effectiveBar);

  const footName = (side: "left" | "right") =>
    side === "left" ? t.LEFT_FOOT : t.RIGHT_FOOT;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("dwa_na_jeden_theme", nextTheme);
  };

  const handleLangChange = (nextLang: Lang) => {
    setLang(nextLang);
    document.documentElement.lang = nextLang;
    localStorage.setItem("dwa_na_jeden_lang", nextLang);
  };

  const handleRoleToggle = () => {
    const nextRole = role === "leader" ? "follower" : "leader";
    setRole(nextRole);
    localStorage.setItem("dwa_na_jeden_role", nextRole);
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  };

  const togglePlay = useCallback(() => {
    unlockAudio();

    if (source === "youtube") {
      if (!song.youtubeId) {
        setYtErrorCode(2);
        return;
      }

      if (!isPlayerReadyRef.current || !ytPlayerRef.current) {
        ytAutoplayRef.current = true;
        setYtLoading(true);
        return;
      }

      safeYtCall((player) => {
        const state = player.getPlayerState();

        if (state === 1) {
          ytAutoplayRef.current = false;
          player.pauseVideo();
          setPlaying(false);
        } else {
          ytAutoplayRef.current = true;
          setYtLoading(true);
          player.playVideo();
        }
      });

      return;
    }

    setPlaying((value) => !value);
  }, [song.youtubeId, source, safeYtCall]);

  const restart = useCallback(() => {
    ytAutoplayRef.current = false;
    setPlaying(false);
    reset();

    if (source === "youtube") {
      safeYtCall((player) => {
        player.pauseVideo();
        player.seekTo(0, true);
      });
    }
  }, [reset, source, safeYtCall]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "r" || e.key === "R") {
        restart();
      } else if (e.key === "b" || e.key === "B") {
        setBaby((prev) => !prev);
      } else if (e.key === "ArrowLeft") {
        setSpeed((prev) => (prev === 1.25 ? 1 : 0.5));
      } else if (e.key === "ArrowRight") {
        setSpeed((prev) => (prev === 0.5 ? 1 : 1.25));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, restart]);

  return (
    <div className="min-h-dvh bg-background text-foreground transition-colors duration-300">
      <SiteHeader
        lang={lang}
        onLangChange={handleLangChange}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        spinning={playing}
      />

      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8 pb-20">
        <section className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl transition-all">
          <div className="relative w-full aspect-[4/3] sm:aspect-[2/1] overflow-hidden">
            <Image
              src="/images/4.avif"
              alt={t.STEP_NAME}
              fill
              priority
              sizes="(min-width: 768px) 736px, calc(100vw - 2rem)"
              quality={75}
              className="object-cover object-[center_18%] brightness-100 contrast-100 transition-transform duration-700 group-hover:scale-105 dark:brightness-[0.92] dark:contrast-[1.04]"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent dark:from-black/90 dark:via-black/40 dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80 dark:from-black/60 dark:via-transparent dark:to-black/60" />

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-background/90 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-primary backdrop-blur-md shadow-sm dark:border-pink-500/50 dark:bg-black/80 dark:text-pink-400">
                <Sparkles className="size-3 text-primary dark:text-pink-400" />
                <span>{t.STYLE_SUBTITLE}</span>
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-foreground sm:text-5xl dark:text-white dark:drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
                {t.STEP_NAME}
              </h1>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={handleRoleToggle}
            className="group inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-bold text-foreground transition-all hover:bg-primary/10 hover:border-primary/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Users className="size-3.5 text-primary transition-transform duration-200 group-hover:scale-110" />
            <span>{t.ROLE_LABEL}:</span>
            <span className="text-primary font-black underline underline-offset-2">
              {role === "leader" ? t.ROLE_LEADER : t.ROLE_FOLLOWER}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVibrate(!vibrate)}
              title={t.VIBRATION_LABEL}
              aria-label={t.VIBRATION_LABEL}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                vibrate
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-secondary text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
              }`}
            >
              <Vibrate className="size-3.5" />
              <span>{vibrate ? t.VIBRATION_ON : t.VIBRATION_OFF}</span>
            </button>

            <button
              type="button"
              onClick={handleFullscreenToggle}
              title={fullscreen ? t.FULLSCREEN_EXIT : t.FULLSCREEN_ENTER}
              aria-label={fullscreen ? t.FULLSCREEN_EXIT : t.FULLSCREEN_ENTER}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary p-2 text-foreground transition-all hover:bg-primary/10 hover:border-primary/40 hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {fullscreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>
          </div>
        </div>

        <DanceFloor
          phase={phase}
          phaseIndex={beat}
          bar={cycle}
          beatMs={beatMs}
          playing={playing}
          lang={lang}
          baby={baby}
          role={role}
        />

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-lg shadow-black/5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4">
            <div className="grid gap-0.5 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-tight text-foreground">
                {t.BABY_STEPS_LABEL}
              </h2>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                {t.BABY_STEPS_HINT}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBaby(!baby)}
              className={`flex h-10 sm:h-9 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl sm:rounded-full px-4 text-xs font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border ${
                baby
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-secondary text-secondary-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
              }`}
            >
              <MousePointerClick className="size-3.5 shrink-0" />
              <span className="truncate">
                {baby ? t.BABY_STEPS_ON : t.BABY_STEPS_OFF}
              </span>
            </button>
          </div>
        </section>

        <div className="grid grid-cols-[auto_1fr] items-center gap-4 sm:gap-6 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-lg shadow-black/5 transition-all min-h-[144px] sm:min-h-[136px]">
          <div className="relative flex size-20 sm:size-24 shrink-0 items-center justify-center rounded-2xl bg-muted border border-border shadow-inner">
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 size-full -rotate-90"
            >
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                className="stroke-border"
                strokeWidth="8"
              />
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                className="stroke-primary"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{
                  strokeDashoffset:
                    circumference * (1 - (playing ? progress : 0)),
                }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </svg>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={`${phase.id}-${cycle}-${role}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="relative font-mono text-2xl sm:text-3xl font-black text-primary drop-shadow-[0_0_12px_rgba(236,72,153,0.4)]"
              >
                {t[phase.counterKey] as string}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="grid gap-1 sm:gap-2 min-w-0">
            <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary truncate">
              {t.INSTRUCTION_LABEL} · {t.CYCLE_LABEL} {cycle}
            </p>
            <div className="min-h-[5rem] sm:min-h-[3.25rem] flex items-center">
              <p className="text-sm sm:text-base font-bold leading-snug sm:leading-tight text-foreground">
                {
                  t.INSTRUCTIONS[direction.toUpperCase() as "LEFT" | "RIGHT"][
                    phase.id
                  ]
                }
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>
                {t.WEIGHT_LABEL}:{" "}
                <span className="text-foreground font-black underline underline-offset-2">
                  {footName(weight)}
                </span>
              </span>
              <span>
                {t.MOVING_LABEL}:{" "}
                <span className="text-foreground font-black underline underline-offset-2">
                  {footName(moving)}
                </span>
              </span>
            </div>
          </div>
        </div>

        <DanceControls
          lang={lang}
          song={song}
          onSongChange={setSongId}
          speed={speed}
          onSpeedChange={setSpeed}
          playing={playing}
          onTogglePlay={togglePlay}
          onRestart={restart}
          muted={muted}
          onToggleMuted={() => setMuted((value) => !value)}
          source={source}
          onSourceChange={setSource}
          ytLoading={ytLoading}
          ytReady={ytReady}
          ytErrorCode={ytErrorCode}
          ytPlayerMountRef={ytPlayerMountRef}
        />

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5 transition-all">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-foreground">
            <Footprints className="size-4 text-primary" />
            {t.BREAKDOWN_TITLE}
          </h2>
          <ol className="grid gap-3 sm:grid-cols-2">
            {t.BREAKDOWN.map((item, index) => (
              <li
                key={item.title}
                className={`rounded-xl border p-4 transition-all duration-300 ${
                  index === beat
                    ? "border-primary bg-primary/10 shadow-lg ring-1 ring-primary"
                    : "border-border bg-muted/40 hover:border-border"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">
                  {item.title}
                </p>
                <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5 transition-all">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-foreground">
            <AlertTriangle className="size-4 text-amber-500" />
            <span>{t.MISTAKES_TITLE}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {t.MISTAKES.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4 transition-all hover:border-border"
              >
                <span className="self-start rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-950 dark:bg-amber-950/80 dark:border-amber-700/60 dark:text-amber-200">
                  {item.badge}
                </span>
                <h3 className="text-xs font-black uppercase tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="hidden sm:flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Keyboard className="size-3.5" />
          <span>{t.KEYBOARD_HINT}</span>
        </div>

        <footer className="mt-8 pt-8 border-t border-border flex flex-col items-center gap-6">
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            <Link
              href={`/${t.PRIVACY_SLUG}`}
              className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
            >
              {t.FOOTER_PRIVACY as string}
            </Link>
            <Link
              href={`/${t.TERMS_SLUG}`}
              className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
            >
              {t.FOOTER_TERMS as string}
            </Link>
            <button
              type="button"
              onClick={() => setCookieBannerOpen(true)}
              className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
            >
              {t.COOKIE_SETTINGS_BTN as string}
            </button>
          </nav>

          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t.FOOTER_TEXT}
            </p>
            <p className="text-xs font-semibold tracking-wider text-muted-foreground">
              © {copyrightYear} {t.APP_LEGAL_NAME}. {t.COPYRIGHT_RESERVED}
            </p>
          </div>
        </footer>
      </main>

      <CookieBanner
        title={t.COOKIE_BANNER_TITLE}
        desc={t.COOKIE_BANNER_DESC}
        acceptLabel={t.COOKIE_ACCEPT}
        declineLabel={t.COOKIE_DECLINE}
        isOpen={cookieBannerOpen}
        onClose={() => setCookieBannerOpen(false)}
      />
    </div>
  );
}
