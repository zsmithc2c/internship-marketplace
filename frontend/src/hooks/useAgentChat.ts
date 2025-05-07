// frontend/src/hooks/useAgentChat.ts
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ---------- types ---------- */
export type Msg = { role: "user" | "assistant"; content: string };

/* ---------- helpers ---------- */
async function getHistory(): Promise<Msg[]> {
  const res = await fetchWithAuth("/api/agent/profile-builder/history/");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sendMessage(body: {
  message: string;
  history: Msg[];
}): Promise<{ reply: string; profile_updated_at?: string }> {
  const res = await fetchWithAuth("/api/agent/profile-builder/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ---------- hook ---------- */
export function useAgentChat() {
  const qc = useQueryClient();

  /* hydrate history once */
  const historyQ = useQuery({
    queryKey: ["chat", "profile-builder"],
    queryFn: getHistory,
    staleTime: Infinity,
  });

  const [localHistory, setLocal] = useState<Msg[]>([]);

  /* when server history loads, sync local state */
  useEffect(() => {
    if (historyQ.data) setLocal(historyQ.data);
  }, [historyQ.data]);

  /* mutation */
  const chat = useMutation({
    mutationFn: (userMsg: string) =>
      sendMessage({ message: userMsg, history: localHistory }),
    onSuccess: ({ reply, profile_updated_at }, userMsg) => {
      setLocal((h) => [
        ...h,
        { role: "user", content: userMsg },
        { role: "assistant", content: reply },
      ]);
      qc.setQueryData(["chat", "profile-builder"], (old: Msg[] = []) => [
        ...old,
        { role: "user", content: userMsg },
        { role: "assistant", content: reply },
      ]);
      if (profile_updated_at) {
        qc.invalidateQueries({ queryKey: ["profile", "me"] });
      }
    },
  });

  /* optimistic append while waiting */
  function send(msg: string) {
    setLocal((h) => [...h, { role: "user", content: msg }]);
    chat.mutate(msg);
  }

  return {
    history: localHistory,
    send,
    sending: chat.isPending,
    error: historyQ.error || (chat.error as Error | null),
  };
}
