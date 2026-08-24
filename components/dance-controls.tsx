"use client";

import {
  AudioLines,
  FileMusic,
  Music4,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
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
  hasTrack: boolean;
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
  hasTrack,
}: Props) {
  const t = translations[lang];

  return (
    <div className="grid gap-5 sm:gap-6 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-lg shadow-black/5 text-card-foreground">
      {/* Wybór piosenki - Zoptymalizowany dla mobilnych list rozwijanych */}
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

      {/* Główne sterowanie */}
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
          onClick={onRestart}
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
            onClick={() => onSourceChange("track")}
            disabled={!hasTrack}
            aria-label={t.SOURCE_TRACK as string}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border py-2.5 sm:py-3 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed",
              source === "track"
                ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            <FileMusic className="size-4" />
            <span>{t.SOURCE_TRACK}</span>
          </button>
        </div>
        {!hasTrack && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
            <p className="text-xs font-semibold leading-relaxed text-primary italic tracking-tight">
              {t.TRACK_MISSING}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
