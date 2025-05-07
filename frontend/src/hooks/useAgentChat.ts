"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ---------- types ---------- */
export type Msg = { role: "user" | "assistant"; content: string };
type AgentResp = { reply: string; profile_updated_at?: string };

/* ---------- helper ---------- */
async function sendMessage(body: { message: string }): Promise<AgentResp> {
  const res = await fetchWithAuth("/api/agent/profile-builder/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<AgentResp>;
}

/* ---------- hook ---------- */
export function useAgentChat() {
  const [history, setHistory] = useState<Msg[]>([]);
  const qc = useQueryClient();

  const chat = useMutation({
    mutationFn: (msg: string) => sendMessage({ message: msg }),
    onSuccess: (data, userMsg) => {
      /* update chat log */
      setHistory((h) => [
        ...h,
        { role: "user", content: userMsg },
        { role: "assistant", content: data.reply },
      ]);

      /* invalidate profile cache if it was updated */
      if (data.profile_updated_at) {
        qc.invalidateQueries({ queryKey: ["profile", "me"] });
      }
    },
  });

  /* optimistic append of the user message while waiting */
  function send(msg: string) {
    setHistory((h) => [...h, { role: "user", content: msg }]);
    chat.mutate(msg);
  }

  return {
    history,
    send,
    sending: chat.isPending,
    error: chat.error as Error | null,
  };
}
