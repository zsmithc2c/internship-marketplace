// frontend/src/hooks/useVoice.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ──────────────── helpers: STT + TTS via backend ──────────────── */

async function sttRequest(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "speech.webm");

  const r = await fetchWithAuth("/api/voice/stt/", { method: "POST", body: form });
  if (!r.ok) throw new Error(await r.text());
  const { text } = await r.json();
  return text;
}

async function ttsRequest(text: string, voice = "alloy"): Promise<string> {
  const r = await fetchWithAuth("/api/voice/tts/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!r.ok) throw new Error(await r.text());
  const { audio_base64 } = await r.json();
  return `data:audio/mp3;base64,${audio_base64}`;
}

/* ───────────────────── shared sentence queue ───────────────────── */

function useSentenceQueue() {
  const queue = useRef<HTMLAudioElement[]>([]);
  const playing = useRef(false);

  const playNext = () => {
    if (playing.current || !queue.current.length) return;
    playing.current = true;
    const next = queue.current.shift()!;
    next
      .play()
      .catch(() => {/* autoplay blocked – ignore */})
      .finally(() => {
        playing.current = false;
        playNext();
      });
  };

  return async (text: string) => {
    if (!text.trim()) return;
    const src = await ttsRequest(text);
    await new Promise<void>((res, rej) => {
      const a = new Audio(src);
      a.addEventListener("ended", () => res(), { once: true });
      a.addEventListener("error", () => rej(new Error("audio error")), {
        once: true,
      });
      queue.current.push(a);
      playNext();
    });
  };
}

/* ─────────────────────────── main hook ─────────────────────────── */

export function useVoice() {
  /* local state */
  const [isRecording, setIsRecording] = useState(false);

  /* refs */
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks         = useRef<BlobPart[]>([]);
  const stopRequested  = useRef(false);
  const permissionPrimed = useRef(false);      // ← new

  /* STT mutation */
  const { mutate: sttMutate, data, isPending, error } = useMutation({
    mutationFn: sttRequest,
  });

  /* ── begin capture ── */
  const start = useCallback(async () => {
    if (mediaRecorder.current?.state === "recording") return;
    stopRequested.current = false;

    /* first-ever press: just ask permission and exit */
    if (!permissionPrimed.current) {
      permissionPrimed.current = true;
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
        tmp.getTracks().forEach((t) => t.stop());   // immediately release
      } catch (err) {
        throw err;  // user clicked “Block” → bubble error to UI
      }
      return;       // user will press again to really record
    }

    /* normal flow */
    chunks.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    if (stopRequested.current) {
      stream.getTracks().forEach((t) => t.stop());
      stopRequested.current = false;
      return;
    }

    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => chunks.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      sttMutate(blob);
      stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    };

    rec.start();
    mediaRecorder.current = rec;
    setIsRecording(true);
  }, [sttMutate]);

  /* ── stop capture ── */
  const stop = useCallback(() => {
    if (mediaRecorder.current?.state !== "recording") {
      // recording hasn’t started yet → flag to cancel once permission resolves
      stopRequested.current = true;
      return;
    }
    mediaRecorder.current.stop();
  }, []);

  /* cleanup on unmount */
  useEffect(
    () => () => {
      if (mediaRecorder.current?.state === "recording") {
        mediaRecorder.current.stop();
      }
    },
    []
  );

  /* TTS queue */
  const speakSentence = useSentenceQueue();

  /* API */
  return {
    isRecording,
    start,
    stop,
    transcript: data ?? "",
    sttLoading: isPending,
    sttError: error as Error | null,
    speakSentence,
  };
}
