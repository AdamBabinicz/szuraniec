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
        elementId: string | HTMLElement,
        config: {
          // Tryb prywatności YouTube (youtube-nocookie.com) — brak cookie śledzących
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

export function DanceTrainer() {
  const [lang, setLang] = useState<Lang>("pl");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
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

  // Ref-mirror `playing` do użycia wewnątrz callbacków rejestrowanych
  // jednorazowo (onReady, listeners YT, keyboard handler) — w przeciwnym
  // razie każda zmiana `playing` wymuszała by re-subskrypcję eventów,
  // co generuje dodatkowe rendery, restarty YT.Player i wyścigi.
  const playingRef = useRef(playing);
  playingRef.current = playing;

  // Ref-mirror `muted` do użycia w onReady (gdzie wyciszenie musi być
  // zastosowane dokładnie raz, po pierwszym zamontowaniu playera).
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Ref-mirror `speed` — setPlaybackRate jest wywoływany w onReady i
  // potem w dedykowanym useEffect synchronizującym tempo. Ref pozwala
  // settle'ować początkową wartość bez tworzenia dodatkowego cyklu
  // efekt-mount → state-update → effect-rerun.
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Przywracanie preferencji z localStorage — jeden useEffect zamiast
  // pięciu (theme, lang, role, cookie, year), każdy z własnym addListener.
  // Wykonuje się raz, na mount, więc nie ma potrzeby czynić go reaktywnym.
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

      const savedLang = localStorage.getItem("dwa_na_jeden_lang") as
        | Lang
        | null;
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
    } catch {
      // localStorage może rzucić wyjątek (Safari Private Mode, wyłączone
      // cookies, iframe z sandboxed storage) — w takim wypadku działamy
      // z domyślnymi wartościami i ukrywamy baner konsentowy.
    }
  }, []);

  // Listener fullscreen — synchronizuje reaktywny stan z API przeglądarki.
  // Pojedyncza subskrypcja, jednorazowa na mount; w React 19 efekt remontuje
  // się dwukrotnie w dev (Strict Mode), cleanup zapobiega duplikatom.
  useEffect(() => {
    const handleFullscreenChange = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
  }, []);

  // Ładowanie biblioteki YouTube IFrame API.
  // Tryb prywatności jest aktywny — adres skryptu IFrame API musi być
  // z tej samej domeny co `src` <iframe> w dance-controls.tsx i origin
  // w postMessage w `sendYtIframeCommand`. Wszystkie trzy ustawione są
  // na youtube-nocookie.com; mieszanie domen powoduje brak onStateChange.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // PROMISE zapamiętany na obiekcie window, żeby współdzielić wynik
    // między wieloma instancjami DanceTrainer (np. HMR, React Strict Mode).
    type WindowWithYt = Window & { __ytApiReady?: Promise<void> };
    const w = window as WindowWithYt;

    if (window.YT?.Player) {
      setYtReady(true);
      return;
    }

    if (!w.__ytApiReady) {
      w.__ytApiReady = new Promise<void>((resolve) => {
        const existingScript = document.getElementById("yt-iframe-api");
        if (!existingScript) {
          const tag = document.createElement("script");
          tag.id = "yt-iframe-api";
          tag.async = true;
          tag.src = "https://www.youtube-nocookie.com/iframe_api";
          tag.onerror = () => {
            // Fallback do klasycznej domeny, jeśli private mode blokuje
            // nocookie. Nadal kompatybilny z <iframe src> ustawionym na
            // youtube-nocookie.com — patrz uwaga „Uwaga o domenach" w ytEmbedUrl.
            const fallback = document.createElement("script");
            fallback.id = "yt-iframe-api";
            fallback.async = true;
            fallback.src = "https://www.youtube.com/iframe_api";
            document.body.appendChild(fallback);
          };
          document.body.appendChild(tag);
        }
        // YT IFrame API zawsze woła onYouTubeIframeAPIReady po załadowaniu,
        // nawet jeśli skrypt dołączono wcześniej — nadpisujemy poprzednie
        // handlery, ale i tak pamiętamy resolve w Promise.
        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          previousReady?.();
          resolve();
        };
      });
    }

    let cancelled = false;
    w.__ytApiReady.then(() => {
      if (!cancelled) setYtReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const t = translations[lang];

  // Rok w stopce raz na mount — unikamy Date.now() w renderze (które
  // spowodowałoby hydration mismatch) i niepotrzebnego setInterval.
  const currentYear = 2026;
  const [copyrightYear, setCopyrightYear] = useState<string>(String(currentYear));

  const song = useMemo(
    () => SONGS.find((item) => item.id === songId) ?? SONGS[0],
    [songId],
  );

  // PHASES nie zmienia się w runtime — wyciągamy dwa używane pola z
  // useRef tak, żeby nie były re-tworzone co render. phaseVoices i
  // phaseDurations to jedyne z PHASES, których potrzebuje useRhythm.
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

  // Bezpiecznie niszczy instancję YT.Player i czyści nasze referencje.
  // Wywoływany przy każdej zmianie piosenki / źródła / zamknięciu komponentu,
  // aby uniknąć ostrzeżenia "The YouTube player is not attached to the DOM".
  // Wynika ono z faktu, że <iframe id="yt-player-iframe"> w dance-controls.tsx
  // jest remountowany po `key={song.youtubeId}` — stara instancja YT.Player
  // traci swój kontener DOM i każda kolejna metoda API/postMessage emituje
  // ten sam warning.
  const teardownPlayer = useCallback(() => {
    try {
      ytPlayerRef.current?.destroy();
    } catch {
      // Instancja mogła już być zwolniona wewnętrznie przez YT API — ignorujemy.
    }
    ytPlayerRef.current = null;
    isPlayerReadyRef.current = false;
  }, []);

  // Bezpieczny wrapper na metody YT.Player. Sprawdza czy instancja żyje,
  // czy iframe nadal jest w drzewie DOM (bo React mógł go już remountować),
  // oraz czy onReady już się odpalił. W każdym z tych przypadków zwraca
  // `false` i nie wywołuje metody — to eliminuje ostrzeżenie "player is
  // not attached to the DOM".
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
      } catch {
        // Player mógł zostać zniszczony zewnętrznie — porzucamy uchwyt.
        ytPlayerRef.current = null;
        isPlayerReadyRef.current = false;
        return false;
      }
    },
    [teardownPlayer],
  );

  // Wysyła komendy do iframe YT przez postMessage. Używane jako fallback,
  // gdy YT.Player jeszcze się nie zainicjalizował, ale iframe już istnieje
  // (np. po gorącym przeładowaniu piosenki). Origin MUSI odpowiadać domenie
  // iframe (`src` w dance-controls.tsx) — tu: youtube-nocookie.com.
  const ytIframeOrigin = "https://www.youtube-nocookie.com";

  const sendYtIframeCommand = useCallback(
    (func: "playVideo" | "pauseVideo" | "seekTo", args: unknown[] = []) => {
      if (typeof window === "undefined") return false;

      const iframe = document.getElementById(
        "yt-player-iframe",
      ) as HTMLIFrameElement | null;

      // Iframe musi istnieć ORAZ być w drzewie DOM; bez tego postMessage
      // wpada w próżnię.
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
      } catch {
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    setYtErrorCode(null);
    pendingYtIntentRef.current = null;
  }, [songId, source]);

  // Podpięcie YouTube API pod istniejącą ramkę iframe.
  // Cleanup niszczy poprzednią instancję i czyści ref-y — bez tego
  // YT.Player trzyma oderwany iframe po zmianie piosenki i ostrzega
  // o braku połączenia z DOM przy każdym kolejnym wywołaniu.
  useEffect(() => {
    if (!ytReady || typeof window === "undefined") return;
    if (source !== "youtube") return;

    let isSubscribed = true;
    let player: YTPlayerInstance | null = null;

    const timer = setTimeout(() => {
      if (!isSubscribed) return;

      const el = document.getElementById("yt-player-iframe");
      if (!el || !window.YT?.Player) return;

      // Bezpiecznie zwolnij ewentualną poprzednią instancję (zgorjony timer
      // lub wyścig mount/unmount wywołany zmianą `speed` / `muted` przed
      // pierwszym `onReady`).
      teardownPlayer();
      setYtLoading(true);

      // Tryb prywatności YouTube: `host` MUSI odpowiadać domenie `iframe src`
      // i origin w `sendYtIframeCommand` — w przeciwnym razie YT API nie
      // dostarcza onStateChange i psuje synchronizację START ↔ PLAY.
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

              const intendedAction = pendingYtIntentRef.current;
              if (intendedAction === "play" || playingRef.current) {
                event.target.playVideo();
                sendYtIframeCommand("playVideo");
              } else {
                event.target.pauseVideo();
                sendYtIframeCommand("pauseVideo");
              }
            } catch {
              // onReady handler nie powinien rzucać, ale YT API potrafi
              // wywołać błędy w starszych przeglądarkach — ignorujemy.
            }
          },
          onStateChange: (event) => {
            if (!isSubscribed) return;
            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
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
          },
        },
      });
    }, 150);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      teardownPlayer();
      // Jawne czyszczenie lokalnego ref `player` — nie jest potrzebny,
      // ale pomaga GC zwolnić uchwyt natychmiast po unmount.
      player = null;
    };
  }, [ytReady, song.youtubeId, source, sendYtIframeCommand, teardownPlayer]);

  // Synchronizacja wyciszenia — reaguje wyłącznie na zmianę `muted`,
  // dzięki czemu nie nadpisujemy stanu playera przy każdym renderze.
  useEffect(() => {
    if (source !== "youtube") return;
    safeYtCall((player) => {
      if (muted) player.mute();
      else player.unMute();
    });
  }, [muted, source, safeYtCall]);

  // Synchronizacja tempa — reaguje wyłącznie na zmianę `speed`.
  useEffect(() => {
    if (source !== "youtube") return;
    safeYtCall((player) => {
      player.setPlaybackRate(speed);
    });
  }, [speed, source, safeYtCall]);

  const effectiveBar = role === "follower" ? cycle + 1 : cycle;
  const phase = PHASES[beat];

  // Memoizacja wyliczeń `direction`/`moving`/`weight` jest zbędna — to
  // prymitywy/numery, renderowane inline. Nie ma child component
  // zależącego od stabilności referencji.
  const direction = directionFor(effectiveBar);
  const { moving, weight } = rolesFor(phase, effectiveBar);

  const footName = (side: "left" | "right") =>
    side === "left" ? t.LEFT_FOOT : t.RIGHT_FOOT;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  // Handlery przekazywane do child components muszą mieć stabilne
  // referencje, inaczej SiteHeader / DanceControls rerenderują się
  // niepotrzebnie przy każdym renderze rodzica. Wszystkie owijamy
  // w useCallback z dokładnymi zależnościami.
  const handleThemeToggle = useCallback(() => {
    setTheme((prev) => {
      const nextTheme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      document.documentElement.style.colorScheme = nextTheme;
      try {
        localStorage.setItem("dwa_na_jeden_theme", nextTheme);
      } catch {}
      return nextTheme;
    });
  }, []);

  const handleLangChange = useCallback((nextLang: Lang) => {
    setLang(nextLang);
    document.documentElement.lang = nextLang;
    try {
      localStorage.setItem("dwa_na_jeden_lang", nextLang);
    } catch {}
  }, []);

  const handleRoleToggle = useCallback(() => {
    setRole((prev) => {
      const nextRole = prev === "leader" ? "follower" : "leader";
      try {
        localStorage.setItem("dwa_na_jeden_role", nextRole);
      } catch {}
      return nextRole;
    });
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
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

  // Pełna synchronizacja przycisku START ze stopami i z wideo.
  // useCallback — handler współdzielony z useEffect słuchającym klawiatury,
  // aby ten sam handler miał stabilną referencję.
  const togglePlay = useCallback(() => {
    unlockAudio();

    if (source === "youtube") {
      const nextPlaying = !playingRef.current;
      pendingYtIntentRef.current = nextPlaying ? "play" : "pause";
      setPlaying(nextPlaying);

      const playerHandled = safeYtCall((player) => {
        if (nextPlaying) player.playVideo();
        else player.pauseVideo();
      });

      // Fallback przez postMessage — YT.Player może nie być jeszcze gotowy
      // (pierwszy mount iframe'a, restart po zmianie piosenki).
      const iframeHandled = sendYtIframeCommand(
        nextPlaying ? "playVideo" : "pauseVideo",
      );

      if (!playerHandled && !iframeHandled) {
        // Pokaż użytkownikowi, że coś się ładuje — bez fałszywego „playing".
        setYtLoading(true);
      }
      return;
    }

    setPlaying((value) => !value);
  }, [source, safeYtCall, sendYtIframeCommand]);

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

  // Skróty klawiaturowe — jeden globalny listener keydown, keydown jest
  // domyślnie passive:false w starszych przeglądarkach (potrzebujemy
  // e.preventDefault dla spacji). Rejestrujemy listener tylko raz,
  // z pasywnym immediate-handlerem na togglePlay/restart.
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

  // Memoizacja props dla DanceControls i DanceFloor — eliminuje
  // zbędne rerendery tych child componentów, które z kolei mogłyby
  // przebudowywać swoje drzewo SVG / iframe.
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
    [lang, song, speed, playing, muted, source, ytLoading, ytReady, ytErrorCode],
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
              sizes="(min-width: 768px) 736px, calc(100vw - 2rem)"
              quality={75}
              className="object-cover object-[center_18%] brightness-100 contrast-100 transition-transform duration-700 group-hover:scale-105 dark:brightness-[0.92] dark:contrast-[1.04]"
              // Decoding async pozwala przeglądarce nie blokować renderowania
              // pierwszego layoutu na dekodowaniu obrazka tła.
              decoding="async"
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
              onClick={handleToggleVibrate}
              title={t.VIBRATION_LABEL}
              aria-label={t.VIBRATION_LABEL}
              aria-pressed={vibrate}
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
              aria-pressed={fullscreen}
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

        <DanceFloor {...danceFloorProps} />

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
              onClick={handleToggleBaby}
              aria-pressed={baby}
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
              onClick={handleOpenCookieSettings}
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
