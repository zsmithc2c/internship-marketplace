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
  const res = await fetchWithAuth("/api/agent/profile-builder/history/");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type AgentResponse = {
  reply: string;
  audio_base64?: string;
  profile_updated_at?: string;
};

async function sendToAgent(body: { message: string }): Promise<AgentResponse> {
  const res = await fetchWithAuth("/api/agent/profile-builder/", {
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
  useEffect(() => setHistory(serverHistory), [serverHistory]);

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
        audio.play().catch(() => {
          /* autoplay might be blocked */
        });
      }

      // profile cache invalidation
      if (profile_updated_at) {
        qc.invalidateQueries({ queryKey: ["profile", "me"] });
      }
    },
  });

  /* pull out stable refs so the effect deps stay clean */
  const { mutate: send, isPending } = mutation;

  /* -------- de-dup + single-flight guard -------- */
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!transcript || sttLoading) return;

    // 1. ignore identical transcript twice
    if (transcript === lastSentRef.current) return;

    // 2. wait until the current request finishes
    if (isPending) return;

    lastSentRef.current = transcript;
    send(transcript);
  }, [transcript, sttLoading, isPending, send]);

  /* -------- exported API -------- */
  return {
    /* voice controls */
    isRecording,
    start,
    stop,
    /* chat state */
    history,
    sending: isPending || sttLoading,
    error: sttError || (mutation.error as Error | null),
  };
}
