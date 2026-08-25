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

  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // FIX: Ref podchwytujący aktualny stan playing dla stabilnych callbacków
  // (eliminuje nieaktualne domknięcia / stale closure w listenrze klawiatury).
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

  // FIX: Stan fullscreen synchronizowany ze zdarzeniem przeglądarki.
  // Wcześniej stan rozjeżdżał się z rzeczywistością po wyjściu z pełnego
  // ekranu klawiszem Esc / przyciskiem przeglądarki.
  useEffect(() => {
    const handleFullscreenChange = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const t = translations[lang];

  const currentYear = new Date().getFullYear();
  const copyrightYear = currentYear > 2026 ? `2026 - ${currentYear}` : "2026";

  const song = useMemo(
    () => SONGS.find((item) => item.id === songId) ?? SONGS[0],
    [songId],
  );

  const hasTrack = Boolean(song.audioUrl);
  const usingTrack = source === "track" && hasTrack;

  const phaseDurations = useMemo(() => PHASES.map((p) => p.beats), []);
  const phaseVoices = useMemo(() => PHASES.map((p) => p.voice), []);

  const { beat, cycle, progress, beatMs, reset } = useRhythm({
    bpm: song.bpm,
    speed,
    playing,
    phaseDurations,
    phaseVoices,
    clicks: !muted && !usingTrack,
    vibrate,
  });

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

  // FIX: Bez ręcznego ustawiania stanu — zdarzenie fullscreenchange robi to samo.
  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  };

  // FIX: Stabilne callbacki (useCallback) — bez nieaktualnych domknięć.
  const togglePlay = useCallback(() => {
    if (!playingRef.current) unlockAudio();
    setPlaying((value) => !value);
  }, []);

  const restart = useCallback(() => {
    setPlaying(false);
    reset();
    const el = audioElRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, [reset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "r" || e.key === "R") {
        restart();
      } else if (e.key === "b" || e.key === "B") {
        setBaby((prev) => !prev);
      } else if (e.key === "ArrowLeft") {
        // FIX: Uproszczona logika — lewa strzałka tylko obniża tempo
        setSpeed((prev) => (prev === 1.25 ? 1 : 0.5));
      } else if (e.key === "ArrowRight") {
        // FIX: Prawa strzałka tylko podnosi tempo
        setSpeed((prev) => (prev === 0.5 ? 1 : 1.25));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, restart]);

  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    el.muted = muted;
    el.playbackRate = speed;
    if (playing && usingTrack) void el.play().catch(() => undefined);
    else el.pause();
  }, [playing, usingTrack, muted, speed, song.audioUrl]);

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
        {/* BANER HERO - LCP: priority wystarcza (preload + eager + fetchpriority=high) */}
        <section className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl transition-all">
          <div className="relative w-full aspect-[4/3] sm:aspect-[2/1] overflow-hidden">
            <Image
              src="/images/4.avif"
              alt={t.STEP_NAME}
              fill
              priority
              sizes="(min-width: 768px) 736px, calc(100vw - 2rem)"
              quality={85}
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

        {/* BELKA TRYBÓW I NARZĘDZI */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={handleRoleToggle}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-bold text-foreground transition-all hover:bg-accent hover:text-accent-foreground"
          >
            <Users className="size-3.5 text-primary" />
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
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                vibrate
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-secondary text-foreground hover:bg-accent"
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
              className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary p-2 text-foreground transition-all hover:bg-accent"
            >
              {fullscreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* CYFROWY PARKIET */}
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

        {/* TRYB MAŁE KROCZKI */}
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5 transition-all">
          <div className="flex items-center justify-between">
            <div className="grid gap-0.5">
              <h2 className="text-sm font-bold uppercase tracking-tight text-foreground">
                {t.BABY_STEPS_LABEL}
              </h2>
              <p className="text-xs text-muted-foreground font-semibold">
                {t.BABY_STEPS_HINT}
              </p>
            </div>
            <button
              onClick={() => setBaby(!baby)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                baby
                  ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/50"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
              }`}
            >
              <MousePointerClick className="size-3.5" />
              {baby ? t.BABY_STEPS_ON : t.BABY_STEPS_OFF}
            </button>
          </div>
        </section>

        {/* LICZNIK I BIEŻĄCA INSTRUKCJA */}
        <section className="grid grid-cols-[auto_1fr] items-center gap-4 sm:gap-6 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-lg shadow-black/5 transition-all min-h-[144px] sm:min-h-[136px]">
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
        </section>

        {/* KONTROLKI ODTWARZACZA I PIOSENEK */}
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
          hasTrack={hasTrack}
        />

        <audio
          ref={audioElRef}
          src={song.audioUrl || undefined}
          loop
          playsInline
          className="hidden"
        />

        {/* ROZBIÓR KROKU */}
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

        {/* 3 GRZECHY GŁÓWNE SZURAŃCA */}
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

        {/* WSKAZÓWKA SKRÓTÓW KLAWIATUROWYCH */}
        <div className="hidden sm:flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Keyboard className="size-3.5" />
          <span>{t.KEYBOARD_HINT}</span>
        </div>

        {/* STOPKA */}
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
