// frontend/src/hooks/useEmployerAgent.ts
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ---------- types ---------- */
export type Msg = { role: "user" | "assistant"; content: string };

/* ---------- API calls ---------- */
async function getEmployerHistory(): Promise<Msg[]> {
  const res = await fetchWithAuth("/api/agent/employer-assistant/history/");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sendEmployerMessage(body: {
  message: string;
  history: Msg[];
}): Promise<{ reply: string; employer?: Record<string, unknown> }> {
  const res = await fetchWithAuth("/api/agent/employer-assistant/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ---------- hook ---------- */
export function useEmployerAgent() {
  const qc = useQueryClient();

  // Load existing chat history (once)
  const historyQ = useQuery({
    queryKey: ["chat", "employer-assistant"],
    queryFn: getEmployerHistory,
    staleTime: Infinity,
  });

  const [localHistory, setLocal] = useState<Msg[]>([]);

  // Sync local history state when server history is fetched
  useEffect(() => {
    if (historyQ.data) {
      setLocal(historyQ.data);
    }
  }, [historyQ.data]);

  // Mutation to send a new message
  const chat = useMutation({
    mutationFn: (userMsg: string) =>
      sendEmployerMessage({ message: userMsg, history: localHistory }),
    onSuccess: ({ reply, employer }, userMsg) => {
      // Update local and cached history with the new user and assistant messages
      setLocal((h) => [
        ...h,
        { role: "user", content: userMsg },
        { role: "assistant", content: reply },
      ]);
      qc.setQueryData<Msg[]>(["chat", "employer-assistant"], (old = []) => [
        ...old,
        { role: "user", content: userMsg },
        { role: "assistant", content: reply },
      ]);
      // If the employer profile was updated (profile data returned), refresh the employer profile query
      if (employer) {
        qc.invalidateQueries({ queryKey: ["employer", "me"] });
      }
    },
  });

  // Function to send a user message (with optimistic UI update)
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
