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

async function streamAgent(
  message: string,
  onDelta: (token: string) => void
): Promise<DonePayload> {
  const res = await fetchWithAuth("/api/agent/profile-builder/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok || !res.body) {
    throw new Error(await res.text());
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;

      const payload = JSON.parse(line) as
        | { delta: string; done: false }
        | DonePayload;

      if (payload.done) {
        return payload;
      } else {
        onDelta(payload.delta);
      }
    }
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

  /* -------- local history state -------- */
  const [history, setHistory] = useState<Msg[]>(serverHistory);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => setHistory(serverHistory), [serverHistory]);

  /* -------- voice (record / stt) -------- */
  const {
    isRecording,
    start,
    stop,
    transcript,
    sttLoading,
    sttError,
  } = useVoice();

  /* -------- send helper -------- */
  const sendMessage = async (userMsg: string) => {
    setSending(true);
    setError(null);

    // optimistic history append
    setHistory((h) => [
      ...h,
      { role: "user", content: userMsg },
      { role: "assistant", content: "" },
    ]);

    const onDelta = (tok: string) =>
      setHistory((h) => {
        const copy = [...h];
        copy[copy.length - 1].content += tok;
        return copy;
      });

    try {
      const done = await streamAgent(userMsg, onDelta);

      // play audio if provided
      if (done.audio_base64) {
        const audio = new Audio(`data:audio/mp3;base64,${done.audio_base64}`);
        audio.play().catch(() => {});
      }

      // profile updated? → invalidate
      if (done.profile_updated_at) {
        qc.invalidateQueries({ queryKey: ["profile", "me"] });
      }

      // sync react-query cache
      qc.setQueryData(["chat", "profile-builder"], (old: Msg[] = []) => [
        ...old,
        { role: "user", content: userMsg },
        { role: "assistant", content: history[history.length - 1].content },
      ]);
    } catch (err) {
      setError(err as Error);
      // rollback assistant placeholder
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
