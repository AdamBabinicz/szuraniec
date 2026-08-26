"use client";

import {
  AudioLines,
  ExternalLink,
  Music4,
  Pause,
  Play,
  RotateCcw,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  SONGS,
  SPEEDS,
  type AudioSource,
  type Lang,
  type Song,
  type Speed,
  translations,
} from "@/lib/translations";

type Props = {
  lang: Lang;
  song: Song;
  onSongChange: (id: Song["id"]) => void;
  speed: Speed;
  onSpeedChange: (speed: Speed) => void;
  playing: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  muted: boolean;
  onToggleMuted: () => void;
  source: AudioSource;
  onSourceChange: (source: AudioSource) => void;
  ytLoading?: boolean;
  ytErrorCode?: number | null;
};

export function DanceControls({
  lang,
  song,
  onSongChange,
  speed,
  onSpeedChange,
  playing,
  onTogglePlay,
  onRestart,
  muted,
  onToggleMuted,
  source,
  onSourceChange,
  ytLoading = false,
  ytErrorCode = null,
}: Props) {
  const t = translations[lang];
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [originParam, setOriginParam] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOriginParam(encodeURIComponent(window.location.origin));
  }, []);

  // W 100% poprawny adres URL renderowany natywnie przez przeglądarkę
  const ytEmbedUrl = useMemo(() => {
    if (!song.youtubeId) return null;
    return `https://www.youtube-nocookie.com/embed/${song.youtubeId}?enablejsapi=1&autoplay=0&controls=1&rel=0&playsinline=1${
      originParam ? `&origin=${originParam}` : ""
    }`;
  }, [song.youtubeId, originParam]);

  const ytWatchUrl = song.youtubeId
    ? `https://www.youtube.com/watch?v=${song.youtubeId}`
    : null;

  const sendYtCommand = useCallback((func: string, args: unknown[] = []) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func,
          args,
        }),
        "*",
      );
    } catch {
      // Bezpieczne wyciszenie
    }
  }, []);

  // Rejestracja nasłuchu zdarzeń po załadowaniu ramki
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "listening" }),
        "*",
      );
    } catch {}
  };

  // Synchronizacja przycisku START / STOP
  useEffect(() => {
    if (source !== "youtube") return;
    if (playing) {
      sendYtCommand("playVideo");
    } else {
      sendYtCommand("pauseVideo");
    }
  }, [playing, source, sendYtCommand]);

  // Synchronizacja tempa
  useEffect(() => {
    if (source !== "youtube") return;
    sendYtCommand("setPlaybackRate", [speed]);
  }, [speed, source, sendYtCommand]);

  // Synchronizacja wyciszenia
  useEffect(() => {
    if (source !== "youtube") return;
    sendYtCommand(muted ? "mute" : "unMute");
  }, [muted, source, sendYtCommand]);

  const handleRestart = () => {
    if (source === "youtube") {
      sendYtCommand("seekTo", [0, true]);
      sendYtCommand("pauseVideo");
    }
    onRestart();
  };

  const ytErrorMessage = useMemo(() => {
    if (ytErrorCode === 2)
      return { title: t.YT_ERR_2_TITLE, desc: t.YT_ERR_2_DESC };
    if (ytErrorCode === 5)
      return { title: t.YT_ERR_5_TITLE, desc: t.YT_ERR_5_DESC };
    if (ytErrorCode === 100)
      return { title: t.YT_ERR_100_TITLE, desc: t.YT_ERR_100_DESC };
    if (ytErrorCode === 101 || ytErrorCode === 150)
      return { title: t.YT_ERR_EMBED_TITLE, desc: t.YT_ERR_EMBED_DESC };
    if (!song.youtubeId)
      return { title: t.YT_ERR_NO_ID_TITLE, desc: t.YT_ERR_NO_ID_DESC };
    return null;
  }, [ytErrorCode, song.youtubeId, t]);

  return (
    <div className="grid gap-5 sm:gap-6 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-lg shadow-black/5 text-card-foreground">
      {/* Wybór piosenki */}
      <div className="grid gap-2">
        <label
          htmlFor="song"
          className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-foreground"
        >
          {t.SONG_LABEL}
        </label>
        <div className="relative group">
          <Music4 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary transition-transform group-focus-within:scale-110" />
          <select
            id="song"
            value={song.id}
            onChange={(event) => onSongChange(event.target.value as Song["id"])}
            className="w-full appearance-none rounded-xl border border-border bg-muted/60 py-3 pl-10 pr-16 text-xs sm:text-sm font-semibold text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 truncate"
          >
            {SONGS.map((item) => (
              <option
                key={item.id}
                value={item.id}
                className="bg-card text-foreground py-2 text-xs sm:text-sm font-medium"
              >
                {t.SONG_NAMES[item.id as keyof typeof t.SONG_NAMES]}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 font-mono text-[11px] sm:text-xs font-bold text-muted-foreground">
            <span>{song.bpm}</span>
            <span>{t.BPM_LABEL}</span>
          </div>
        </div>
      </div>

      {/* Wybór tempa */}
      <div className="grid gap-2.5 sm:gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-foreground">
            {t.TEMPO_LABEL}
          </span>
          <span className="font-mono text-[11px] sm:text-xs font-black text-primary uppercase">
            {Math.round(song.bpm * speed)} {t.BPM_LABEL} · {t.EFFECTIVE_BPM}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onSpeedChange(value)}
              aria-pressed={speed === value}
              aria-label={`${value}x ${t.TEMPO_LABEL}`}
              className={cn(
                "rounded-xl border py-2.5 sm:py-3 font-mono text-xs sm:text-sm font-black transition-all",
                speed === value
                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>

      {/* Główny przycisk sterowania */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? (t.PAUSE as string) : (t.PLAY as string)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2.5 sm:gap-3 rounded-xl py-3.5 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98]",
            playing
              ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
              : "bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:opacity-90",
          )}
        >
          {playing ? (
            <Pause className="size-4 sm:size-5 fill-current" />
          ) : (
            <Play className="size-4 sm:size-5 fill-current" />
          )}
          <span>{playing ? t.PAUSE : t.PLAY}</span>
        </button>

        <button
          type="button"
          onClick={handleRestart}
          title={t.RESTART as string}
          aria-label={t.RESTART as string}
          className="flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-all hover:border-primary hover:text-primary active:rotate-[-45deg]"
        >
          <RotateCcw className="size-4 sm:size-5" />
          <span className="sr-only">{t.RESTART as string}</span>
        </button>

        <button
          type="button"
          onClick={onToggleMuted}
          aria-label={muted ? (t.UNMUTED as string) : (t.MUTED as string)}
          className={cn(
            "flex h-12 sm:h-14 shrink-0 items-center gap-2 rounded-xl border px-3.5 sm:px-4 text-xs font-black uppercase tracking-tighter transition-all",
            muted
              ? "border-border bg-muted/60 text-muted-foreground"
              : "border-primary bg-primary/10 text-primary",
          )}
        >
          {muted ? (
            <VolumeX className="size-4 sm:size-5" />
          ) : (
            <Volume2 className="size-4 sm:size-5" />
          )}
          <span className="hidden md:inline">
            {muted ? t.MUTED : t.UNMUTED}
          </span>
          <span className="sr-only md:hidden">
            {muted ? t.MUTED : t.UNMUTED}
          </span>
        </button>
      </div>

      {/* Wybór źródła dźwięku */}
      <div className="grid gap-2.5 sm:gap-3 border-t border-border pt-4 sm:pt-5">
        <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-foreground">
          {t.AUDIO_LABEL}
        </span>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onSourceChange("click")}
            aria-label={t.SOURCE_CLICK as string}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border py-2.5 sm:py-3 text-xs font-black uppercase tracking-widest transition-all",
              source === "click"
                ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            <AudioLines className="size-4" />
            <span>{t.SOURCE_CLICK}</span>
          </button>
          <button
            type="button"
            onClick={() => onSourceChange("youtube")}
            aria-label={t.SOURCE_YOUTUBE as string}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border py-2.5 sm:py-3 text-xs font-black uppercase tracking-widest transition-all",
              source === "youtube"
                ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            <Video className="size-4" />
            <span>{t.SOURCE_YOUTUBE}</span>
          </button>
        </div>

        {/* Natywnie renderowany odtwarzacz YouTube - brak czarnego ekranu */}
        <div
          className={cn(
            "grid gap-2 pt-2 transition-all duration-300",
            source !== "youtube" && "hidden",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              {t.YOUTUBE_PLAYER_LABEL}
            </span>
            {!ytErrorMessage && ytLoading && (
              <span className="font-mono text-[10px] font-bold text-primary animate-pulse">
                {t.YOUTUBE_LOADING}
              </span>
            )}
          </div>

          <div className="relative w-full aspect-video max-h-48 sm:max-h-60 rounded-xl overflow-hidden border border-border bg-black shadow-inner">
            {ytErrorMessage ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-white">
                <p className="text-[11px] font-black uppercase tracking-widest text-rose-300">
                  {ytErrorMessage.title}
                </p>
                <p className="text-xs font-semibold leading-snug text-white/80 max-w-xs">
                  {ytErrorMessage.desc}
                </p>
                {ytWatchUrl && (
                  <a
                    href={ytWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white transition-colors"
                  >
                    <ExternalLink className="size-3.5" />
                    {t.YT_OPEN_EXTERNAL}
                  </a>
                )}
              </div>
            ) : ytEmbedUrl ? (
              <iframe
                ref={iframeRef}
                id="yt-player-iframe"
                src={ytEmbedUrl}
                onLoad={handleIframeLoad}
                title={t.YOUTUBE_PLAYER_LABEL as string}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="size-full border-0"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
