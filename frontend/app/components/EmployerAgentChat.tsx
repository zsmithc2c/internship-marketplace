"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

/* ------------------------------------------------------------------ */
/*  Minimal speech-recognition typings                                */
/* ------------------------------------------------------------------ */
interface RecognitionResultItem {
  transcript: string;
}
interface RecognitionResult {
  0: RecognitionResultItem;
}
interface RecognitionResultList {
  0: RecognitionResult;
}
interface RecognitionEvent extends Event {
  results: RecognitionResultList;
}
interface RecognitionInstance {
  start(): void;
  stop(): void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type RecognitionCtor = new () => RecognitionInstance;

const getRecognitionCtor = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

/* ------------------------------------------------------------------ */
/*  Chat & stream types                                               */
/* ------------------------------------------------------------------ */
type ChatRole = "user" | "assistant";
interface ChatMessage {
  role: ChatRole;
  content: string;
}
interface StreamChunk {
  delta?: string;
  navigate?: string;
  employer?: unknown;
  listings_updated_at?: string;
  listing_deleted?: boolean;
  done?: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
const speakText = (text: string) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
};

/* ------------------------------------------------------------------ */
const EmployerAgentChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your Employer Assistant. Ask me anything about setting up your profile, posting internship listings, or navigating the dashboard.",
    },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);

  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const router = useRouter();
  const qc = useQueryClient();

  /* ------------------------------------------------------------------ */
  /*  sendMessage (stream)                                              */
  /* ------------------------------------------------------------------ */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      setMessages((prev) => [
        ...prev,
        { role: "user", content },
        { role: "assistant", content: "" },
      ]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/agent/employer-assistant/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content }),
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let assistantReply = "";
        let finalChunk: StreamChunk | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });

          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            const raw = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!raw) continue;

            const chunk: StreamChunk = JSON.parse(raw);

            if (chunk.error) throw new Error(chunk.error);

            if (chunk.navigate) {
              router.push(chunk.navigate);
              return;
            }

            if (!chunk.done && chunk.delta) assistantReply += chunk.delta;

            if (chunk.done) {
              finalChunk = chunk;
              break;
            }
          }
        }

        /* update assistant reply */
        setMessages((prev) => {
          const arr = [...prev];
          arr[arr.length - 1] = { role: "assistant", content: assistantReply };
          return arr;
        });
        speakText(assistantReply);

        /* cache invalidation + toasts */
        if (finalChunk?.employer) {
          qc.invalidateQueries({ queryKey: ["employer", "me"] });
          window.dispatchEvent(new Event("profile-saved"));
        }
        if (finalChunk?.listings_updated_at) {
          qc.invalidateQueries({ queryKey: ["internships", "mine"] });
          window.dispatchEvent(
            new Event(finalChunk.listing_deleted ? "listing-deleted" : "listing-saved")
          );
        }
      } catch (err) {
        console.error(err);
        setMessages((prev) => {
          const arr = [...prev];
          arr[arr.length - 1] = {
            role: "assistant",
            content: "Sorry, something went wrong.",
          };
          return arr;
        });
      } finally {
        setLoading(false);
      }
    },
    [loading, qc, router]
  );

  /* ------------------------------------------------------------------ */
  /*  Initialise speech recognition                                     */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const ctor = getRecognitionCtor();
    if (!ctor) return;
    const rec = new ctor();
    recognitionRef.current = rec;

    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (e: RecognitionEvent) => {
      const transcript = e.results[0][0].transcript.trim();
      setListening(false);
      if (transcript) sendMessage(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
  }, [sendMessage]);

  /* ------------------------------------------------------------------ */
  /*  UI handlers                                                       */
  /* ------------------------------------------------------------------ */
  const toggleMic = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      if (listening) {
        rec.stop();
        setListening(false);
      } else {
        rec.start();
        setListening(true);
      }
    } catch {
      /* silent */
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) sendMessage(input.trim());
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <div className="flex w-full max-w-lg flex-col rounded-md border p-4 shadow-md">
      {/* messages */}
      <div className="mb-3 flex-1 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`my-1 flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs whitespace-pre-wrap rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <p className="text-sm text-gray-500">🤖 Thinking…</p>}
      </div>

      {/* controls */}
      <div className="flex items-center space-x-2 border-t pt-2">
        <button
          onClick={toggleMic}
          disabled={loading}
          title="Toggle voice input"
          className={`rounded px-3 py-2 ${
            listening
              ? "bg-red-500 text-white"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          {listening ? "⏹" : "🎤"}
        </button>

        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading}
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default EmployerAgentChat;
