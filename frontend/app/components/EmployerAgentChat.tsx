"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/*  Speech-recognition APIs lack upstream types — we fallback to `any`. */

import React, { useState, useRef, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
type Message = {
  role: "user" | "assistant";
  content: string;
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
const EmployerAgentChat: React.FC = () => {
  /* ---------- state ---------- */
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your Employer Assistant. Ask me anything about setting up your profile, posting internship listings, or navigating the dashboard.",
    },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ---------- voice (STT) ---------- */
  const recognitionRef = useRef<any | null>(null);

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utter);
  };

  /*  Main send → /api/employer-agent  --------------------------------- */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      const userMsg: Message = { role: "user", content };
      const convo = [...messages, userMsg];

      /* optimistic UI */
      setMessages([...convo, { role: "assistant", content: "" }]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/employer-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: convo }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { reply } = (await res.json()) as { reply: string };

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: reply };
          return updated;
        });

        speakText(reply);
      } catch (error) {
        console.error(error);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Sorry, something went wrong.",
          };
          return updated;
        });
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  /* ---------- speech-recognition setup ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec: any = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (evt: any) => {
      const transcript: string = evt.results[0][0].transcript.trim();
      setListening(false);
      if (transcript) sendMessage(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recognitionRef.current = rec;
  }, [sendMessage]); // ✅ include sendMessage to satisfy exhaustive-deps

  const handleMicToggle = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      if (listening) {
        rec.stop();
      } else {
        rec.start();
        setListening(true);
      }
    } catch {
      /* ignore race "start when already started" */
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
            key={i} /* i is number ⇒ satisfies React.Key */
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
          onClick={handleMicToggle}
          disabled={loading}
          className={`rounded px-3 py-2 ${
            listening
              ? "bg-red-500 text-white"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
          title="Toggle voice input"
        >
          {listening ? "⏹" : "🎤"}
        </button>

        <input
          type="text"
          className="flex-1 rounded border px-3 py-2"
          placeholder="Type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
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
