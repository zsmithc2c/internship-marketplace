// frontend/app/components/VoiceAgentChat.tsx
"use client";

import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useEffect, useMemo, useRef } from "react";

export default function VoiceAgentChat() {
  const { isRecording, start, stop, history, sending, error } = useVoiceAgent();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* auto-scroll to newest line */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length, sending]);

  /* preserve order (history already oldest→newest) */
  const ordered = useMemo(() => [...history], [history]);

  /* ---------- render ---------- */
  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* CHAT HISTORY */}
      <div className="h-96 overflow-y-auto rounded border p-4 text-sm leading-relaxed">
        {ordered.length ? (
          ordered.map((m, i) => {
            const isLastAssistant =
              i === ordered.length - 1 && m.role === "assistant";
            return (
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
                {isLastAssistant && sending && (
                  <span className="animate-pulse"> █</span>
                )}
              </p>
            );
          })
        ) : (
          <p className="text-center text-muted-foreground">
            No messages yet – press &amp; hold the mic to start.
          </p>
        )}
        {sending && !ordered.length && (
          <p className="italic text-gray-500">…thinking</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ERROR */}
      {error && (
        <p className="rounded bg-red-100 p-2 text-sm text-red-700">
          {error.message}
        </p>
      )}

      {/* MIC BUTTON */}
      <div className="flex justify-center">
        <button
          onPointerDown={start}
          onPointerUp={stop}
          onPointerCancel={stop}
          className={`h-16 w-16 rounded-full bg-red-600 text-white transition-all hover:scale-105 active:scale-95 ${
            isRecording ? "animate-pulse" : ""
          }`}
          aria-label="Hold to speak"
        >
          {isRecording ? (
            <span className="text-xl">●</span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-8 w-8"
            >
              <path d="M12 1a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V4a3 3 0 0 0-3-3Zm7 9a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-3.08A7 7 0 0 0 19 10Z" />
            </svg>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-gray-500">
        Press &amp; hold the mic – release to send.
      </p>
    </div>
  );
}
