// frontend/app/components/VoiceShell.tsx
"use client";

import { usePathname } from "next/navigation";
import NavBar from "./NavBar";
import FloatingVoiceAgent from "./FloatingVoiceAgent";
import { VoiceAgentProvider } from "@/context/VoiceAgentContext";

/**
 * Wraps the signed-in application with:
 *   • <NavBar />
 *   • <VoiceAgentProvider /> (query + recording state)
 *   • <FloatingVoiceAgent /> microphone bubble
 *
 * Remains **hidden** on public / auth routes to avoid JWT-less API calls.
 */
export default function VoiceShell({ children }: { children: React.ReactNode }) {
  /* `usePathname()` returns `string | null` on the first SSR pass → null-guard */
  const pathname = usePathname() ?? "";

  /* Public (unauthenticated / marketing) pages */
  const isPublic =
    pathname === "/landing" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  if (isPublic) return <>{children}</>;

  /* Authenticated app pages */
  return (
    <VoiceAgentProvider>
      <NavBar />
      {children}
      <FloatingVoiceAgent />
    </VoiceAgentProvider>
  );
}
