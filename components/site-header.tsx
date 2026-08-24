"use client";

import { Disc3, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type Lang, translations } from "@/lib/translations";

type Props = {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  spinning: boolean;
};

const LANGS: Lang[] = ["pl", "en"];

export function SiteHeader({
  lang,
  onLangChange,
  theme,
  onThemeToggle,
  spinning,
}: Props) {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <motion.span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            animate={{ rotate: spinning ? 360 : 0 }}
            transition={
              spinning
                ? {
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                    duration: 3,
                  }
                : { duration: 0.4 }
            }
          >
            <Disc3 className="size-5" />
          </motion.span>
          <div className="min-w-0">
            <p className="truncate font-black tracking-tight leading-tight">
              {t.APP_NAME}
            </p>
            <p className="truncate text-xs text-muted-foreground font-medium">
              {t.APP_TAGLINE}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Przełącznik języków PL / EN */}
          <div
            role="group"
            aria-label={lang.toUpperCase()}
            className="flex items-center rounded-full border border-border bg-secondary p-0.5"
          >
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onLangChange(code)}
                aria-pressed={lang === code}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-bold uppercase transition-all",
                  lang === code
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {code}
              </button>
            ))}
          </div>

          {/* Przełącznik motywu Light / Dark */}
          <button
            type="button"
            onClick={onThemeToggle}
            aria-label={theme === "dark" ? "Tryb jasny" : "Tryb ciemny"}
            className="flex size-9 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {theme === "dark" ? (
              <Sun className="size-4 text-amber-400" />
            ) : (
              <Moon className="size-4 text-primary" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
