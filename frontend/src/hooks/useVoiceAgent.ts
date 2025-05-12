// frontend/src/hooks/useVoiceAgent.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVoice } from "@/hooks/useVoice";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ─────────────────────────── types ─────────────────────────── */
export type Msg = { role: "user" | "assistant"; content: string };
type DonePayload = {
  delta: "";
  done: true;
  audio_base64?: string;
  profile_updated_at?: string;
};

/* ─────────────────────── stream helper ─────────────────────── */
async function streamAgent(
  message: string,
  onDelta: (tok: string) => void
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
  let sawDelta = false;

  while (true) {
    const { value, done } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });

    /* ── parse complete lines ── */
    let idx;
    parseLoop: while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;

      /* guard: only parse when we have a *complete* JSON object */
      let payload: { delta?: string; done: boolean } & Partial<DonePayload>;
      try {
        payload = JSON.parse(line);
      } catch {
        /* not yet complete → push fragment back & wait for more bytes */
        buf = line + "\n" + buf;
        break parseLoop;
      }

      if (!payload.done && typeof payload.delta === "string") {
        sawDelta = true;
        onDelta(payload.delta);
      } else if (payload.done) {
        return payload as DonePayload;
      }
    }

    if (done) break;
  }

  /* ── fallback if stream closed without explicit “done” ── */
  if (sawDelta) return { delta: "", done: true };
  throw new Error("stream ended unexpectedly");
}

/* ────────────── overlap-safe merge helper ────────────── */
function mergeOverlap(prev = "", next = ""): string {
  const max = Math.min(prev.length, next.length);
  for (let n = max; n > 0; n--) {
    if (prev.slice(-n) === next.slice(0, n)) {
      return prev + next.slice(n);
    }
  }
  return prev + next;
}

/* ───────────────── smarter TTS speaker (prefetch) ───────────────── */
function useSentenceSpeaker() {
  const queue = useRef<Promise<HTMLAudioElement>[]>([]);
  const playing = useRef(false);
  const inflight = useRef(0);
  const MAX_PARALLEL = 1;

  const maybePlayNext = () => {
    if (playing.current || !queue.current.length) return;
    playing.current = true;
    queue.current
      .shift()!
      .then(
        (au) =>
          new Promise<void>((resolve) => {
            au.addEventListener("ended", () => resolve(), { once: true });
            au.play().catch(() => resolve());
          })
      )
      .finally(() => {
        playing.current = false;
        maybePlayNext();
      });
  };

  function speakSentence(text: string) {
    if (!text.trim()) return;

    const p = (async () => {
      while (inflight.current >= MAX_PARALLEL) {
        await new Promise((r) => setTimeout(r, 200));
      }
      inflight.current += 1;
      try {
        const res = await fetchWithAuth("/api/voice/tts/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: "alloy" }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { audio_base64 } = await res.json();
        const au = new Audio(`data:audio/mp3;base64,${audio_base64}`);
        au.preload = "auto";
        return au;
      } finally {
        inflight.current -= 1;
      }
    })();

    queue.current.push(p);
    maybePlayNext();
  }

  return speakSentence;
}

/* ───────────── sentence boundary splitter ───────────── */
function splitSentences(chunk: string, final: boolean): [string, string] {
  if (!chunk) return ["", ""];
  const re = /[^.!?]+[.!?]["')\]]?(?:\s+|$)/g;
  let last = 0;
  while (re.exec(chunk)) last = re.lastIndex;
  return final ? [chunk, ""] : [chunk.slice(0, last), chunk.slice(last)];
}

/* ─────────────────────────── main hook ─────────────────────────── */
export function useVoiceAgent() {
  const qc = useQueryClient();

  /* ---------- history ---------- */
  const { data: serverHistory = [] } = useQuery({
    queryKey: ["chat", "profile-builder"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/agent/profile-builder/history");
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<Msg[]>;
    },
    staleTime: Infinity,
  });
  const [history, setHistory] = useState<Msg[]>(serverHistory);
  useEffect(() => setHistory(serverHistory), [serverHistory]);

  /* ---------- mic / STT ---------- */
  const {
    isRecording,
    start,
    stop,
    transcript,
    sttLoading,
    sttError,
  } = useVoice();

  /* ---------- speaker ---------- */
  const speakSentence = useSentenceSpeaker();

  /* ---------- UI state ---------- */
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /* ---------- buffers ---------- */
  const streamBuf = useRef("");
  const tailBuf = useRef("");

  function flush(final = false) {
    const [done, rest] = splitSentences(tailBuf.current + streamBuf.current, final);
    if (done) {
      done
        .split(/(?<=[.!?]["')\]]?)\s+/)
        .forEach((s) => speakSentence(s.trim()));
    }
    tailBuf.current = rest;
    streamBuf.current = "";
  }

  /* ---------- send ---------- */
  async function sendMessage(userMsg: string) {
    setSending(true);
    setError(null);
    streamBuf.current = "";
    tailBuf.current = "";

    setHistory((h) => [
      ...h,
      { role: "user", content: userMsg },
      { role: "assistant", content: "" },
    ]);

    const onDelta = (tok: string) => {
      const merged = mergeOverlap(tailBuf.current + streamBuf.current, tok);
      streamBuf.current += merged.slice((tailBuf.current + streamBuf.current).length);

      setHistory((h) => {
        const copy = [...h];
        copy[copy.length - 1] = {
          role: "assistant",
          content: tailBuf.current + streamBuf.current,
        };
        return copy;
      });

      flush();
    };

    try {
      const done = await streamAgent(userMsg, onDelta);
      flush(true);

      if (done.profile_updated_at) {
        qc.invalidateQueries({ queryKey: ["profile", "me"] });
      }

      qc.setQueryData(["chat", "profile-builder"], (old: Msg[] = []) => [
        ...old,
        { role: "user", content: userMsg },
        { role: "assistant", content: tailBuf.current || " " },
      ]);
    } catch (err) {
      setError(err as Error);
      setHistory((h) => h.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  /* ---------- auto-send transcript ---------- */
  const lastSent = useRef<string | null>(null);
  useEffect(() => {
    if (!transcript || sttLoading) return;
    if (transcript === lastSent.current) return;
    if (sending) return;

    lastSent.current = transcript;
    sendMessage(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, sttLoading]);

  return {
    isRecording,
    start,
    stop,
    history,
    sending: sending || sttLoading,
    error: error || sttError,
  };
}
