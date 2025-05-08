// frontend/src/hooks/useVoiceAgent.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVoice } from "@/hooks/useVoice";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ---------- types ---------- */
export type Msg = { role: "user" | "assistant"; content: string };

/* ---------- helpers ---------- */
async function getHistory(): Promise<Msg[]> {
  const res = await fetchWithAuth("/api/agent/profile-builder/history");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type AgentResponse = {
  reply: string;
  audio_base64?: string;
  profile_updated_at?: string;
};

async function sendToAgent(body: { message: string }): Promise<AgentResponse> {
  const res = await fetchWithAuth("/api/agent/profile-builder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
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

  // keep local copy in sync — run only when the length changes
  useEffect(() => {
    setHistory(serverHistory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverHistory.length]);

  /* -------- voice (record / stt / tts) -------- */
  const {
    isRecording,
    start,
    stop,
    transcript,
    sttLoading,
    sttError,
  } = useVoice();

  /* -------- agent mutation -------- */
  const mutation = useMutation({
    mutationFn: (msg: string) => sendToAgent({ message: msg }),
    onSuccess: ({ reply, audio_base64, profile_updated_at }, userMsg) => {
      // update history (local + react-query cache)
      setHistory((h) => [
        ...h,
        { role: "user", content: userMsg },
        { role: "assistant", content: reply },
      ]);
      qc.setQueryData(["chat", "profile-builder"], (old: Msg[] = []) => [
        ...old,
        { role: "user", content: userMsg },
        { role: "assistant", content: reply },
      ]);

      // optional TTS playback
      if (audio_base64) {
        const audio = new Audio(`data:audio/mp3;base64,${audio_base64}`);
        audio.play().catch(() => {/* autoplay might be blocked */});
      }

      // profile cache invalidation
      if (profile_updated_at) {
        qc.invalidateQueries({ queryKey: ["profile", "me"] });
      }
    },
  });

  /* -------- de-dup + single-flight guard -------- */
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!transcript || sttLoading) return;
    if (transcript === lastSentRef.current) return;   // ignore duplicate
    if (mutation.isPending) return;                  // wait for current send

    lastSentRef.current = transcript;
    mutation.mutate(transcript);
  }, [transcript, sttLoading, mutation]);

  /* -------- exported API -------- */
  return {
    /* voice controls */
    isRecording,
    start,
    stop,
    /* chat state */
    history,
    sending: mutation.isPending || sttLoading,
    error: sttError || (mutation.error as Error | null),
  };
}
