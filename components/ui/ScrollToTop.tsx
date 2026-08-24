"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import pl from "@/lib/locales/pl.json";

interface ScrollToTopProps {
  label?: string;
  threshold?: number;
}

export const ScrollToTop = ({ label, threshold = 350 }: ScrollToTopProps) => {
  const [isVisible, setIsVisible] = useState(false);

  // Bezpieczny odczyt ze słownika (zgodny z konwencją UPPER_SNAKE_CASE projektu)
  const dict = pl as Record<string, any>;
  const buttonLabel =
    label || dict.SCROLL_TO_TOP || dict.SCROLL_TOP || "Do góry";

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          aria-label={buttonLabel}
          title={buttonLabel}
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-pink-500/40 bg-slate-950/80 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.3)] backdrop-blur-md transition-colors hover:border-pink-400 hover:bg-pink-500/20 hover:text-pink-300 hover:shadow-[0_0_25px_rgba(236,72,153,0.6)] focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 transition-transform group-hover:-translate-y-0.5"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
};
