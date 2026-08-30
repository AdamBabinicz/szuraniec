"use client";

import { useEffect } from "react";
import {
  registerWebMCPTools,
  unregisterWebMCPTools,
} from "@/lib/webmcp-client";

/**
 * Montowany raz w root layout (wewnątrz <body>).
 * Tylko klient: API WebMCP żyje na document.modelContext, więc rejestracja
 * odbywa się w useEffect. Bezpieczny dla StrictMode i HMR — registerTool jest
 * idempotentny, a cleanup przerywa poprzedni sygnał rejestracji.
 */
export function WebMCPTools() {
  useEffect(() => {
    void registerWebMCPTools();
    return () => unregisterWebMCPTools();
  }, []);

  return null;
}
