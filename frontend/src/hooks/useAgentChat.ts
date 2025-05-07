"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ---------- types ---------- */
export type Msg = { role: "user" | "assistant"; content: string };

/* ---------- helper ---------- */
async function sendMessage(body: { message: string }) {
  const res = await fetchWithAuth("/api/agent/profile-builder/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await res.text());
  const { reply } = await res.json(); // { reply: "..." }
  return reply as string;
}

/* ---------- hook ---------- */
export function useAgentChat() {
  const [history, setHistory] = useState<Msg[]>([]);

  const chat = useMutation({
    mutationFn: (msg: string) => sendMessage({ message: msg }),
    onSuccess: (assistantReply, userMsg) => {
      setHistory((h) => [
        ...h,
        { role: "user", content: userMsg },
        { role: "assistant", content: assistantReply },
      ]);
    },
  });

  /* optimistic append of the user message while waiting */
  function send(msg: string) {
    setHistory((h) => [...h, { role: "user", content: msg }]);
    chat.mutate(msg);
  }

  return {
    history,          // Msg[]
    send,             // fn(string)
    sending: chat.isPending,
    error: chat.error as Error | null,
  };
}
