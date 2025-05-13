// frontend/app/profile/builder/page.tsx
"use client";

import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useMemo, useRef, useEffect } from "react";
import { Mic, Loader2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                Sub-component                               */
/* -------------------------------------------------------------------------- */
function MicOnlyChat() {
  const {
    /* voice */
    isRecording,
    start,
    stop,
    /* agent */
    history,
    sending,
    error,
  } = useVoiceAgent();

  /* keep order oldest→newest so newest is at bottom */
  const orderedHistory = useMemo(() => [...history], [history]);

  /* ───────── auto-scroll while streaming ───────── */
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [orderedHistory.length, sending]);

  /* ---------------------------------------------------------------------- */
  return (
    <div className="flex flex-col items-center">
      {/* ——— MIC BUTTON ——— */}
      <button
        onPointerDown={start}
        onPointerUp={stop}
        onPointerCancel={stop}
        className={`group relative flex h-24 w-24 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${
          isRecording ? "animate-pulse" : ""
        }`}
        aria-label="Hold to speak"
      >
        {isRecording ? (
          <span className="text-3xl">●</span>
        ) : (
          <Mic className="h-10 w-10" />
        )}
      </button>

      {/* ——— COLLAPSIBLE HISTORY ——— */}
      <details className="mt-6 w-full max-w-2xl">
        <summary className="cursor-pointer select-none text-center text-sm text-muted-foreground hover:text-foreground">
          {sending ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </span>
          ) : (
            "Show conversation"
          )}
        </summary>

        <div className="mt-4 max-h-96 overflow-y-auto rounded border p-4 text-sm leading-relaxed">
          {orderedHistory.length ? (
            orderedHistory.map((m, i) => (
              <p
                key={i}
                className={
                  m.role === "user"
                    ? "text-right text-blue-800"
                    : "text-left text-gray-800"
                }
              >
                <span className="mr-1 font-bold">
                  {m.role === "user" ? "You:" : "AI:"}
                </span>
                {m.content}
              </p>
            ))
          ) : (
            <p className="text-center text-muted-foreground">
              No messages yet – press and hold the mic to start.
            </p>
          )}

          {error && (
            <p className="mt-4 rounded bg-red-100 p-2 text-red-700">
              {error.message}
            </p>
          )}

          {/* invisible anchor for scrollIntoView */}
          <div ref={bottomRef} />
        </div>
      </details>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */
export default function ProfileBuilderPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <MicOnlyChat />
    </main>
  );
}
