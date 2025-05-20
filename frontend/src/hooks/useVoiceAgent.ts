"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVoice } from "@/hooks/useVoice";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { getAccess } from "@/lib/auth";
import { jwtDecode } from "jwt-decode";

/* ─────────────────────────── types ─────────────────────────── */
export type Msg = { role: "user" | "assistant"; content: string };
type DonePayload = {
  delta: "";
  done: true;
  audio_base64?: string;
  profile?: Record<string, unknown>;
  profile_updated_at?: string;
  employer?: Record<string, unknown>;
};

/* ─────────────────────── role helper ─────────────────────── */
function getRole(): "EMPLOYER" | "INTERN" {
  try {
    const token = getAccess();
    const decoded = jwtDecode<{ role: string }>(token || "");
    return decoded.role === "EMPLOYER" ? "EMPLOYER" : "INTERN";
  } catch {
    return "INTERN";
  }
}

/* ─────────────────────── debounce helper ────────────────────── */
function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args): void => {
    if (timer) return;
    fn(...args);
    timer = setTimeout(() => {
      timer = null;
    }, ms);
  };
}

/* ─────────────────────── stream helper ─────────────────────── */
async function streamAgent(
  message: string,
  onDelta: (tok: string) => void,
): Promise<DonePayload> {
  const role = getRole();
  const endpoint =
    role === "EMPLOYER"
      ? "/api/agent/employer-assistant/"
      : "/api/agent/profile-builder/";

  const res = await fetchWithAuth(endpoint, {
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

    let idx: number;
    parseLoop: while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;

      let payload: { delta?: string; done: boolean } & Partial<DonePayload>;
      try {
        payload = JSON.parse(line);
      } catch {
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

  if (sawDelta) return { delta: "", done: true };
  throw new Error("stream ended unexpectedly");
}

/* ────────────── overlap-safe merge helper ────────────── */
function mergeOverlap(prev = "", next = ""): string {
  const max = Math.min(prev.length, next.length);
  for (let n = max; n > 0; n--) {
    if (prev.slice(-n) === next.slice(0, n)) return prev + next.slice(n);
  }
  return prev + next;
}

/* ───────────────── smarter TTS speaker (prefetch) ───────────────── */
function useSentenceSpeaker() {
  const queue = useRef<Promise<HTMLAudioElement>[]>([]);
  const playing = useRef(false);
  const inflight = useRef(0);
  const MAX_PARALLEL = 3;

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
          }),
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
  const router = useRouter();
  const role = getRole();
  const key = role === "EMPLOYER" ? "employer-assistant" : "profile-builder";

  const navigate = debounce((path: string) => router.push(path), 1000);

  const { data: serverHistory = [] } = useQuery({
    queryKey: ["chat", key],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/agent/${key}/history`);
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<Msg[]>;
    },
    staleTime: Infinity,
    enabled: !!getAccess(),
  });

  const [history, setHistory] = useState<Msg[]>(serverHistory);
  useEffect(() => {
    if (history.length === 0 && serverHistory.length > 0) {
      setHistory(serverHistory);
    }
  }, [serverHistory, history.length]);

  const { isRecording, start, stop, transcript, sttLoading, sttError } =
    useVoice();
  const speakSentence = useSentenceSpeaker();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const streamBuf = useRef("");
  const tailBuf = useRef("");
  const fullRef = useRef("");

  const sendMessage = useCallback(async (userMsg: string) => {
    const flush = (final = false) => {
      const chunk = tailBuf.current + streamBuf.current;
      const [done, rest] = splitSentences(chunk, final);
      if (done) {
        done.split(/(?<=[.!?]["')\]]?)\s+/).forEach((s) => speakSentence(s.trim()));
        fullRef.current += done;
      }
      tailBuf.current = rest;
      streamBuf.current = "";
    };

    setSending(true);
    setError(null);
    streamBuf.current = "";
    tailBuf.current = "";
    fullRef.current = "";

    setHistory((h) => [
      ...h,
      { role: "user", content: userMsg },
      { role: "assistant", content: "" },
    ]);

    const onDelta = (tok: string) => {
      const trim = tok.trim();
      if (trim.startsWith("{") && trim.endsWith("}")) {
        try {
          const obj = JSON.parse(trim);
          if (obj && typeof obj.navigate === "string") {
            navigate(obj.navigate);
            return;
          }
        } catch {}
      }

      const merged = mergeOverlap(tailBuf.current + streamBuf.current, tok);
      streamBuf.current += merged.slice(
        (tailBuf.current + streamBuf.current).length,
      );

      setHistory((h) => {
        const copy = [...h];
        copy[copy.length - 1] = {
          role: "assistant",
          content: fullRef.current + tailBuf.current + streamBuf.current,
        };
        return copy;
      });

      flush();
    };

    try {
      const done = await streamAgent(userMsg, onDelta);
      flush(true);
      const finalText = fullRef.current + tailBuf.current;

      setHistory((h) => {
        const copy = [...h];
        copy[copy.length - 1] = {
          role: "assistant",
          content: finalText || " ",
        };
        return copy;
      });

      qc.setQueryData(["chat", key], (old: Msg[] = []) => [
        ...old,
        { role: "user", content: userMsg },
        { role: "assistant", content: finalText || " " },
      ]);

      if (role === "EMPLOYER" && done.employer) {
        qc.invalidateQueries({ queryKey: ["employer", "me"] });
      }

      if (role === "INTERN") {
        if (done.profile) {
          qc.setQueryData<Record<string, unknown> | undefined>(
            ["profile", "me"],
            (draft) => ({
              ...(draft ?? {}),
              ...done.profile!,
            }),
          );
          window.dispatchEvent(new Event("profile-saved"));
        } else if (done.profile_updated_at) {
          await qc.refetchQueries({ queryKey: ["profile", "me"], exact: true });
          window.dispatchEvent(new Event("profile-saved"));
        }
      }
    } catch (err) {
      setError(err as Error);
      setHistory((h) => h.slice(0, -1));
    } finally {
      setSending(false);
    }
  }, [qc, navigate, key, role, speakSentence]);

  const lastSent = useRef<string | null>(null);
  useEffect(() => {
    if (!transcript || sttLoading) return;
    if (transcript === lastSent.current) return;
    if (sending) return;
    lastSent.current = transcript;
    sendMessage(transcript);
  }, [transcript, sttLoading, sending, sendMessage]);

  return {
    isRecording,
    start,
    stop,
    history,
    sending: sending || sttLoading,
    error: error || sttError,
  };
}
