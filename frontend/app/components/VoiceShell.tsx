// frontend/app/components/VoiceShell.tsx
"use client";

import { usePathname } from "next/navigation";
import NavBar from "./NavBar";
import FloatingVoiceAgent from "./FloatingVoiceAgent";
import { VoiceAgentProvider } from "@/context/VoiceAgentContext";

/**
 * Wraps the whole signed-in UI with:
 *   • NavBar
 *   • VoiceAgentProvider (query + recording state)
 *   • FloatingVoiceAgent mic bubble
 *
 * It stays **hidden** on public / auth pages
 * (`/landing`, `/login`, `/signup`) to avoid JWT-less API calls.
 */
export default function VoiceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublic =
    pathname === "/landing" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  // ── Marketing / auth pages ─────────────────────────────────
  if (isPublic) return <>{children}</>;

  // ── App pages (authenticated) ──────────────────────────────
  return (
    <VoiceAgentProvider>
      <NavBar />
      {children}
      <FloatingVoiceAgent />
    </VoiceAgentProvider>
  );
}
