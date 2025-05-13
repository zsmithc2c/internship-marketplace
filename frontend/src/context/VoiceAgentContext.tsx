// frontend/src/context/VoiceAgentContext.tsx
"use client";

import { createContext, useContext } from "react";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";

/* ------------------------------------------------------------------
   A single global Voice-Agent instance.  The hook itself is safe on
   the server (it no-ops there thanks to isBrowser checks inside), so
   we invoke it unconditionally to satisfy the Rules-of-Hooks.
   ------------------------------------------------------------------ */

const VoiceCtx = createContext<ReturnType<typeof useVoiceAgent> | null>(null);

export function VoiceAgentProvider({ children }: { children: React.ReactNode }) {
  const va = useVoiceAgent();          // ← always called, hook order stable
  return <VoiceCtx.Provider value={va}>{children}</VoiceCtx.Provider>;
}

/** Consumer returns the Voice-Agent API (or `null` pre-login). */
export function useVoiceAgentCtx() {
  return useContext(VoiceCtx);
}
