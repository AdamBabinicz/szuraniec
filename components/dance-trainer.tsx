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
import { reportIssue } from "@/lib/logger";
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
        elementId: string | HTMLElement,
        config: {
          host?: string;
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

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function loadYtApiPromise(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  type WindowWithYt = Window & { __ytApiReady?: Promise<void> };
  const w = window as WindowWithYt;

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (!w.__ytApiReady) {
    w.__ytApiReady = new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById("yt-iframe-api");
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.async = true;
        tag.src = "https://www.youtube.com/iframe_api";
        tag.onerror = (err) => {
          reportIssue("yt_player", err);
          reject(err);
        };
        document.body.appendChild(tag);
      }
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        resolve();
      };

      // Zabezpieczenie przed brakiem odpowiedzi ze strony YouTube
      setTimeout(() => {
        if (window.YT?.Player) {
          resolve();
        }
      }, 5000);
    });
  }

  return w.__ytApiReady;
}

export function DanceTrainer() {
  const [lang, setLang] = useState<Lang>("pl");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [songId, setSongId] = useState<Song["id"]>("szalona");
  const [speed, setSpeed] = useState<Speed>(1);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [source, setSource] = useState<AudioSource>("youtube");
  const [baby, setBaby] = useState(false);
  const [role, setRole] = useState<"leader" | "follower">("leader");
  const [vibrate, setVibrate] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [cookieBannerOpen, setCookieBannerOpen] = useState(false);

  const [ytReady, setYtReady] = useState(false);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytErrorCode, setYtErrorCode] = useState<number | null>(null);

  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const isPlayerReadyRef = useRef(false);
  const pendingYtIntentRef = useRef<"play" | "pause" | null>(null);

  const playingRef = useRef(playing);
  playingRef.current = playing;

  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("dwa_na_jeden_theme") as
        | "light"
        | "dark"
        | null;
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
        document.documentElement.classList.toggle(
          "dark",
          savedTheme === "dark",
        );
        document.documentElement.style.colorScheme = savedTheme;
      }

      const savedLang = localStorage.getItem(
        "dwa_na_jeden_lang",
      ) as Lang | null;
      if (savedLang === "pl" || savedLang === "en") {
        setLang(savedLang);
        document.documentElement.lang = savedLang;
      }

      const savedRole = localStorage.getItem("dwa_na_jeden_role") as
        | "leader"
        | "follower"
        | null;
      if (savedRole === "leader" || savedRole === "follower") {
        setRole(savedRole);
      }

      const savedConsent = localStorage.getItem("dwa_na_jeden_cookie_consent");
      if (!savedConsent) {
        setCookieBannerOpen(true);
      }
    } catch (err) {
      reportIssue("local_storage", err);
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

    let cancelled = false;

    const startLoading = () => {
      loadYtApiPromise()
        .then(() => {
          if (!cancelled) setYtReady(true);
        })
        .catch((err) => {
          reportIssue("yt_player", err);
        });
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(startLoading, {
        timeout: 1500,
      });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    } else {
      const timer = setTimeout(startLoading, 800);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
  }, []);

  const t = translations[lang];
  const currentYear = new Date().getFullYear();

  const socialLinks = useMemo(
    () => [
      {
        href: "https://github.com/AdamBabinicz",
        label:
          lang === "pl"
            ? "Odwiedź profil Adama Babinicza na GitHubie"
            : "Visit Adam Babinicz's GitHub profile",
        icon: GitHubIcon,
      },
      {
        href: "https://x.com/AdamBabinicz",
        label:
          lang === "pl"
            ? "Odwiedź profil Adama Babinicza w serwisie X"
            : "Visit Adam Babinicz's profile on X",
        icon: XIcon,
      },
      {
        href: "https://www.facebook.com/profile.php?id=100063294544557",
        label:
          lang === "pl"
            ? "Odwiedź profil Adama Babinicza na Facebooku"
            : "Visit Adam Babinicz's Facebook profile",
        icon: FacebookIcon,
      },
    ],
    [lang],
  );

  const song = useMemo(
    () => SONGS.find((item) => item.id === songId) ?? SONGS[0],
    [songId],
  );

  const phaseRef = useRef({
    durations: PHASES.map((p) => p.beats),
    voices: PHASES.map((p) => p.voice),
  });

  const { beat, cycle, progress, beatMs, reset } = useRhythm({
    bpm: song.bpm,
    speed,
    playing,
    phaseDurations: phaseRef.current.durations,
    phaseVoices: phaseRef.current.voices,
    clicks: !muted && source === "click",
    vibrate,
  });

  const teardownPlayer = useCallback(() => {
    try {
      ytPlayerRef.current?.pauseVideo?.();
    } catch (err) {
      reportIssue("yt_player", err);
    }
    ytPlayerRef.current = null;
    isPlayerReadyRef.current = false;
  }, []);

  const safeYtCall = useCallback(
    (action: (player: YTPlayerInstance) => void): boolean => {
      if (!isPlayerReadyRef.current || !ytPlayerRef.current) return false;
      const player = ytPlayerRef.current;
      try {
        const iframe = player.getIframe?.();
        if (!iframe || !iframe.isConnected) {
          teardownPlayer();
          return false;
        }
        action(player);
        return true;
      } catch (err) {
        reportIssue("yt_player", err);
        ytPlayerRef.current = null;
        isPlayerReadyRef.current = false;
        return false;
      }
    },
    [teardownPlayer],
  );

  const ytIframeOrigin = "https://www.youtube-nocookie.com";

  const sendYtIframeCommand = useCallback(
    (
      func: "playVideo" | "pauseVideo" | "seekTo" | "setPlaybackRate",
      args: unknown[] = [],
    ) => {
      if (typeof window === "undefined") return false;

      const iframe = document.getElementById(
        "yt-player-iframe",
      ) as HTMLIFrameElement | null;

      if (!iframe?.contentWindow || !iframe.isConnected) return false;

      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func,
            args,
          }),
          ytIframeOrigin,
        );
        return true;
      } catch (err) {
        reportIssue("yt_player", err);
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    setYtErrorCode(null);
    pendingYtIntentRef.current = null;
  }, [songId, source]);

  useEffect(() => {
    if (!ytReady || typeof window === "undefined") return;
    if (source !== "youtube") {
      teardownPlayer();
      return;
    }

    let isSubscribed = true;
    let player: YTPlayerInstance | null = null;

    const timer = setTimeout(() => {
      if (!isSubscribed) return;

      const el = document.getElementById("yt-player-iframe");
      if (!el || !window.YT?.Player) return;

      teardownPlayer();
      setYtLoading(true);

      player = new window.YT.Player("yt-player-iframe", {
        host: ytIframeOrigin,
        events: {
          onReady: (event) => {
            if (!isSubscribed) return;
            isPlayerReadyRef.current = true;
            ytPlayerRef.current = event.target;
            setYtLoading(false);
            setYtErrorCode(null);

            try {
              if (mutedRef.current) event.target.mute();
              else event.target.unMute();
              event.target.setPlaybackRate(speedRef.current);
              sendYtIframeCommand("setPlaybackRate", [speedRef.current]);

              const intendedAction = pendingYtIntentRef.current;
              if (intendedAction === "play" || playingRef.current) {
                event.target.playVideo();
                sendYtIframeCommand("playVideo");
              } else {
                event.target.pauseVideo();
                sendYtIframeCommand("pauseVideo");
              }
            } catch (err) {
              reportIssue("yt_player", err);
            }
          },
          onStateChange: (event) => {
            if (!isSubscribed) return;
            if (event.data === 1) {
              pendingYtIntentRef.current = null;
              unlockAudio();
              setPlaying(true);
              setYtLoading(false);
            } else if (event.data === 2 || event.data === 0) {
              pendingYtIntentRef.current = null;
              setPlaying(false);
              setYtLoading(false);
            } else if (event.data === 3) {
              setYtLoading(true);
            }
          },
          onError: (event) => {
            if (!isSubscribed) return;
            isPlayerReadyRef.current = false;
            ytPlayerRef.current = null;
            setPlaying(false);
            setYtLoading(false);
            setYtErrorCode(event.data);
            reportIssue("yt_player", `YouTube Error Code: ${event.data}`);
          },
        },
      });
    }, 150);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      teardownPlayer();
      player = null;
    };
  }, [ytReady, song.youtubeId, source, sendYtIframeCommand, teardownPlayer]);

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
      try {
        player.setPlaybackRate(speed);
      } catch (err) {
        reportIssue("yt_player", err);
      }
    });
    sendYtIframeCommand("setPlaybackRate", [speed]);
  }, [speed, source, safeYtCall, sendYtIframeCommand]);

  const effectiveBar = role === "follower" ? cycle + 1 : cycle;
  const phase = PHASES[beat];

  const direction = directionFor(effectiveBar);
  const { moving, weight } = rolesFor(phase, effectiveBar);

  const footName = (side: "left" | "right") =>
    side === "left" ? t.LEFT_FOOT : t.RIGHT_FOOT;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const handleThemeToggle = useCallback(() => {
    setTheme((prev) => {
      const nextTheme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      document.documentElement.style.colorScheme = nextTheme;
      try {
        localStorage.setItem("dwa_na_jeden_theme", nextTheme);
      } catch (err) {
        reportIssue("local_storage", err);
      }
      return nextTheme;
    });
  }, []);

  const handleLangChange = useCallback((nextLang: Lang) => {
    setLang(nextLang);
    document.documentElement.lang = nextLang;
    try {
      localStorage.setItem("dwa_na_jeden_lang", nextLang);
    } catch (err) {
      reportIssue("local_storage", err);
    }
  }, []);

  const handleRoleToggle = useCallback(() => {
    setRole((prev) => {
      const nextRole = prev === "leader" ? "follower" : "leader";
      try {
        localStorage.setItem("dwa_na_jeden_role", nextRole);
      } catch (err) {
        reportIssue("local_storage", err);
      }
      return nextRole;
    });
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        reportIssue("local_storage", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        reportIssue("local_storage", err);
      });
    }
  }, []);

  const handleToggleMuted = useCallback(() => {
    setMuted((value) => !value);
  }, []);

  const handleToggleBaby = useCallback(() => {
    setBaby((value) => !value);
  }, []);

  const handleToggleVibrate = useCallback(() => {
    setVibrate((value) => !value);
  }, []);

  const handleOpenCookieSettings = useCallback(() => {
    setCookieBannerOpen(true);
  }, []);

  const togglePlay = useCallback(() => {
    unlockAudio();

    if (source === "youtube") {
      if (!ytReady) {
        loadYtApiPromise()
          .then(() => setYtReady(true))
          .catch((err) => reportIssue("yt_player", err));
      }

      const nextPlaying = !playingRef.current;
      pendingYtIntentRef.current = nextPlaying ? "play" : "pause";
      setPlaying(nextPlaying);

      const playerHandled = safeYtCall((player) => {
        if (nextPlaying) player.playVideo();
        else player.pauseVideo();
      });

      const iframeHandled = sendYtIframeCommand(
        nextPlaying ? "playVideo" : "pauseVideo",
      );

      if (!playerHandled && !iframeHandled) {
        setYtLoading(true);
      }
      return;
    }

    setPlaying((value) => !value);
  }, [source, ytReady, safeYtCall, sendYtIframeCommand]);

  const restart = useCallback(() => {
    pendingYtIntentRef.current = "pause";
    setPlaying(false);
    reset();
    if (source === "youtube") {
      safeYtCall((player) => {
        player.pauseVideo();
        player.seekTo(0, true);
      });
      sendYtIframeCommand("pauseVideo");
      sendYtIframeCommand("seekTo", [0, true]);
    }
  }, [reset, source, safeYtCall, sendYtIframeCommand]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "r" || e.key === "R") {
        restart();
      } else if (e.key === "b" || e.key === "B") {
        handleToggleBaby();
      } else if (e.key === "ArrowLeft") {
        setSpeed((prev) => (prev === 1.25 ? 1 : 0.5));
      } else if (e.key === "ArrowRight") {
        setSpeed((prev) => (prev === 0.5 ? 1 : 1.25));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, restart, handleToggleBaby]);

  const danceFloorProps = useMemo(
    () => ({
      phase,
      phaseIndex: beat,
      bar: cycle,
      beatMs,
      playing,
      lang,
      baby,
      role,
    }),
    [phase, beat, cycle, beatMs, playing, lang, baby, role],
  );

  const danceControlsProps = useMemo(
    () => ({
      lang,
      song,
      speed,
      playing,
      muted,
      source,
      ytLoading,
      ytReady,
      ytErrorCode,
    }),
    [
      lang,
      song,
      speed,
      playing,
      muted,
      source,
      ytLoading,
      ytReady,
      ytErrorCode,
    ],
  );

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
              loading="eager"
              sizes="(min-width: 768px) 736px, calc(100vw - 2rem)"
              quality={75}
              className="object-cover object-[center_18%] brightness-100 contrast-100 transition-transform duration-700 group-hover:scale-105 dark:brightness-[0.92] dark:contrast-[1.04]"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent dark:from-black/90 dark:via-black/40 dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80 dark:from-black/60 dark:via-transparent dark:to-black/60" />

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-background/90 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-foreground backdrop-blur-md shadow-sm dark:border-pink-500/50 dark:bg-black/80 dark:text-pink-400">
                <Sparkles className="size-3 text-foreground dark:text-pink-400" />
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
            <Users className="size-3.5 text-foreground transition-transform duration-200 group-hover:scale-110" />
            <span>{t.ROLE_LABEL}:</span>
            <span className="text-foreground font-black underline underline-offset-2">
              {role === "leader" ? t.ROLE_LEADER : t.ROLE_FOLLOWER}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleVibrate}
              title={t.VIBRATION_LABEL}
              aria-label={t.VIBRATION_LABEL}
              aria-pressed={vibrate}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                vibrate
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-secondary text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-foreground"
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
              aria-pressed={fullscreen}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary p-2 text-foreground transition-all hover:bg-primary/10 hover:border-primary/40 hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {fullscreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>
          </div>
        </div>

        <DanceFloor {...danceFloorProps} />

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-lg shadow-black/5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4">
            <div className="grid gap-0.5 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-tight text-foreground">
                {t.BABY_STEPS_LABEL}
              </h2>
              <p className="text-xs text-foreground/80 font-semibold leading-relaxed">
                {t.BABY_STEPS_HINT}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleBaby}
              aria-pressed={baby}
              className={`flex h-10 sm:h-9 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl sm:rounded-full px-4 text-xs font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border ${
                baby
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-secondary text-secondary-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-foreground"
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
              aria-hidden="true"
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
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${phase.id}-${cycle}-${role}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="relative font-mono text-2xl sm:text-3xl font-black text-foreground drop-shadow-[0_0_12px_rgba(236,72,153,0.4)]"
              >
                {t[phase.counterKey] as string}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="grid gap-1 sm:gap-2 min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground truncate">
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs font-bold uppercase tracking-wider text-foreground/80">
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
          {...danceControlsProps}
          onSongChange={setSongId}
          onSpeedChange={setSpeed}
          onTogglePlay={togglePlay}
          onRestart={restart}
          onToggleMuted={handleToggleMuted}
          onSourceChange={setSource}
        />

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5 transition-all">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-foreground">
            <Footprints className="size-4 text-foreground" />
            {t.BREAKDOWN_TITLE}
          </h2>
          <ol className="grid gap-3 sm:grid-cols-2">
            {t.BREAKDOWN.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className={`rounded-xl border p-4 transition-all duration-300 ${
                  index === beat
                    ? "border-primary bg-primary/10 shadow-lg ring-1 ring-primary"
                    : "border-border bg-muted/40 hover:border-border"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-widest text-foreground mb-1">
                  {item.title}
                </p>
                <p className="text-xs font-semibold leading-relaxed text-foreground/80">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5 transition-all">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-foreground">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <span>{t.MISTAKES_TITLE}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {t.MISTAKES.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4 transition-all hover:border-border"
              >
                <span className="self-start rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-amber-950 dark:bg-amber-950/80 dark:border-amber-700/60 dark:text-amber-200">
                  {item.badge}
                </span>
                <h3 className="text-xs font-black uppercase tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="text-xs font-semibold leading-relaxed text-foreground/80">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="hidden sm:flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80">
          <Keyboard className="size-3.5" />
          <span>{t.KEYBOARD_HINT}</span>
        </div>

        <footer className="mt-8 pt-8 border-t border-border flex flex-col items-center gap-6">
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            <Link
              href={`/${t.PRIVACY_SLUG}`}
              className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80 hover:text-foreground transition-colors"
            >
              {t.FOOTER_PRIVACY as string}
            </Link>
            <Link
              href={`/${t.TERMS_SLUG}`}
              className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80 hover:text-foreground transition-colors"
            >
              {t.FOOTER_TERMS as string}
            </Link>
            <button
              type="button"
              onClick={handleOpenCookieSettings}
              className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80 hover:text-foreground transition-colors"
            >
              {t.COOKIE_SETTINGS_BTN as string}
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {socialLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  title={item.label}
                  className="flex size-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground/80 transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="size-4" />
                </a>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground/80">
              {t.FOOTER_TEXT}
            </p>
            <p className="text-xs font-semibold tracking-wider text-foreground/80">
              © {currentYear} {t.APP_LEGAL_NAME}. {t.COPYRIGHT_RESERVED}
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
