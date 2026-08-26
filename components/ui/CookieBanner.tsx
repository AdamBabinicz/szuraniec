"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Cookie } from "lucide-react";

interface CookieBannerProps {
  title: string;
  desc: string;
  acceptLabel: string;
  declineLabel: string;
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function CookieBanner({
  title,
  desc,
  acceptLabel,
  declineLabel,
  isOpen,
  onClose,
}: CookieBannerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Sprawdzenie, czy użytkownik wcześniej podjął decyzję
    try {
      const savedConsent = localStorage.getItem("dwa_na_jeden_cookie_consent");
      if (savedConsent === "granted" || savedConsent === "denied") {
        updateGoogleConsent(savedConsent);
      }
    } catch {
      // Bezpieczna obsługa blokad pamięci podręcznej przeglądarki
    }
  }, []);

  const updateGoogleConsent = (status: "granted" | "denied") => {
    if (typeof window === "undefined") return;

    window.dataLayer = window.dataLayer || [];

    // Oficjalna aktualizacja Google Consent Mode v2
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: status,
        ad_storage: status,
        ad_user_data: status,
        ad_personalization: status,
      });
    }

    // Push zdarzenia do kontenera GTM
    window.dataLayer.push({
      event: "cookie_consent_update",
      consent_status: status,
      analytics_storage: status,
      ad_storage: status,
      ad_user_data: status,
      ad_personalization: status,
    });
  };

  const handleConsent = (status: "granted" | "denied") => {
    try {
      localStorage.setItem("dwa_na_jeden_cookie_consent", status);
      updateGoogleConsent(status);
    } catch {
      // Bezpieczna obsługa blokad pamięci
    }
    onClose();
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-border/80 bg-card/95 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:bottom-6 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Cookie className="size-5" />
              </div>
              <div className="grid gap-1">
                <h2 className="text-sm font-black uppercase tracking-tight text-foreground">
                  {title}
                </h2>
                <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => handleConsent("denied")}
                className="rounded-xl border border-border bg-secondary/80 px-4 py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
              >
                {declineLabel}
              </button>
              <button
                type="button"
                onClick={() => handleConsent("granted")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:brightness-110 active:scale-95"
              >
                <ShieldCheck className="size-3.5" />
                <span>{acceptLabel}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
