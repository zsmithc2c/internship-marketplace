// frontend/src/hooks/useVoiceAgent.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVoice } from "@/hooks/useVoice";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ---------- types ---------- */
export type Msg = { role: "user" | "assistant"; content: string };

type DonePayload = {
  delta: "";
  done: true;
  audio_base64?: string;
  profile_updated_at?: string;
};

/* ---------- helpers ---------- */
async function getHistory(): Promise<Msg[]> {
  const res = await fetchWithAuth("/api/agent/profile-builder/history");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ---------- helpers ---------- */
async function streamAgent(
  message: string,
  onDelta: (token: string) => void
): Promise<DonePayload> {
  const res = await fetchWithAuth("/api/agent/profile-builder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok || !res.body) throw new Error(await res.text());

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let sawDelta = false;          // 👈 new flag

  while (true) {
    const { value, done } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });

    /* --- parse complete lines --- */
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;

      const payload =
        JSON.parse(line) as { delta: string; done: boolean } & Partial<DonePayload>;

      if (!payload.done) {
        sawDelta = true;
        onDelta(payload.delta);
      } else {
        return payload as DonePayload;
      }
    }

    if (done) break;
  }

  /* --- connection closed --- */
  buf = buf.trim();
  if (buf) {
    const maybe = JSON.parse(buf) as Partial<DonePayload>;
    if (maybe.done) return maybe as DonePayload;
  }

  if (sawDelta) {
    // graceful fallback: treat EOF as done
    return { delta: "", done: true };
  }

  throw new Error("Stream ended unexpectedly");
}



/* ---------- main hook ---------- */
export function useVoiceAgent() {
  const qc = useQueryClient();

  /* -------- server-persisted history -------- */
  const { data: serverHistory = [] } = useQuery({
    queryKey: ["chat", "profile-builder"],
    queryFn: getHistory,
    staleTime: Infinity,
  });

  /* -------- reactive state -------- */
  const [history, setHistory] = useState<Msg[]>(serverHistory);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Keep local history in sync whenever the query data object changes
  useEffect(() => {
    setHistory(serverHistory);
  }, [serverHistory]); // ✅ include full object, ESLint-safe

  /* -------- voice (record / stt) -------- */
  const {
    isRecording,
    start,
    stop,
    transcript,
    sttLoading,
    sttError,
  } = useVoice();

  /* -------- streaming assistant buffer -------- */
  const assistantBuf = useRef("");

  /* -------- helper to send a message -------- */
  const sendMessage = async (userMsg: string) => {
    setSending(true);
    setError(null);
    assistantBuf.current = "";

    // optimistic UI update
    setHistory((h) => [
      ...h,
      { role: "user", content: userMsg },
      { role: "assistant", content: "" },
    ]);

    const onDelta = (tok: string) => {
      assistantBuf.current += tok;
      setHistory((h) => {
        const copy = [...h];
        copy[copy.length - 1] = {
          role: "assistant",
          content: assistantBuf.current,
        };
        return copy;
      });
    };

    try {
      const done = await streamAgent(userMsg, onDelta);

      // optional audio
      if (done.audio_base64) {
        const audio = new Audio(`data:audio/mp3;base64,${done.audio_base64}`);
        audio.play().catch(() => {});
      }

      // invalidate profile cache if updated
      if (done.profile_updated_at) {
        qc.invalidateQueries({ queryKey: ["profile", "me"] });
      }

      // persist to react-query cache
      qc.setQueryData(["chat", "profile-builder"], (old: Msg[] = []) => [
        ...old,
        { role: "user", content: userMsg },
        { role: "assistant", content: assistantBuf.current },
      ]);
    } catch (err) {
      setError(err as Error);
      // rollback placeholder assistant line
      setHistory((h) => h.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  /* -------- auto-send when transcript ready -------- */
  const lastSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!transcript || sttLoading) return;
    if (transcript === lastSentRef.current) return;
    if (sending) return;

    lastSentRef.current = transcript;
    sendMessage(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, sttLoading]);

  /* -------- exported API -------- */
  return {
    isRecording,
    start,
    stop,
    history,
    sending: sending || sttLoading,
    error: error || sttError,
  };
}
