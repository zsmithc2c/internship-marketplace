"use client";

import { useState } from "react";
import { useAgentChat } from "@/hooks/useAgentChat";

export default function AgentChat() {
  const { history, send, sending, error } = useAgentChat();
  const [draft, setDraft] = useState("");

  /* ---------- handlers ---------- */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    send(draft.trim());
    setDraft("");
  }

  /* ---------- render ---------- */
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="h-96 overflow-y-auto rounded border p-4">
        {history.map((m, i) => (
          <p
            key={i}
            className={
              m.role === "user"
                ? "text-right text-blue-800"
                : "text-left text-gray-800"
            }
          >
            <span className="font-bold mr-1">
              {m.role === "user" ? "You:" : "AI:"}
            </span>
            {m.content}
          </p>
        ))}
        {sending && <p className="italic text-gray-500">…thinking</p>}
      </div>

      {error && (
        <p className="rounded bg-red-100 p-2 text-sm text-red-700">
          {error.message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded border p-2"
          placeholder="Type your message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-40"
          disabled={sending}
        >
          Send
        </button>
      </form>
    </div>
  );
}
