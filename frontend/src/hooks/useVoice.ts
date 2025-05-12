// frontend/src/hooks/useVoice.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ─────────────────────────── REST helpers ─────────────────────────── */

async function sttRequest(audioBlob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", audioBlob, "speech.webm");

  const res = await fetchWithAuth("/api/voice/stt/", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  const { text } = await res.json();
  return text;
}

async function ttsRequest(text: string, voice = "alloy"): Promise<string> {
  const res = await fetchWithAuth("/api/voice/tts/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error(await res.text());
  const { audio_base64 } = await res.json();
  return `data:audio/mp3;base64,${audio_base64}`;
}

/* ─────────────────── sentence-speaker shared queue ─────────────────── */

function useSentenceQueue() {
  const queue = useRef<HTMLAudioElement[]>([]);
  const playing = useRef(false);

  const playNext = () => {
    if (playing.current || !queue.current.length) return;
    playing.current = true;
    const next = queue.current.shift()!;
    next
      .play()
      .catch(() => {
        /* autoplay blocked – ignore */
      })
      .finally(() => {
        playing.current = false;
        playNext();
      });
  };

  /**
   * Fetch TTS for a sentence, enqueue it, and start playback.
   * Resolves when this particular sentence finishes.
   */
  async function speakSentence(text: string): Promise<void> {
    if (!text.trim()) return;

    const src = await ttsRequest(text);
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(src);
      audio.addEventListener("ended", () => resolve(), { once: true });
      audio.addEventListener("error", () => reject(new Error("audio error")), {
        once: true,
      });
      queue.current.push(audio);
      playNext();
    });
  }

  return speakSentence;
}

/* ───────────────────────────── main hook ───────────────────────────── */

export function useVoice() {
  /* ---------- recording ---------- */
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  /* ---------- STT ---------- */
  const { mutate: sttMutate, data, isPending, error } = useMutation({
    mutationFn: sttRequest,
  });

  /* ---------- start recording ---------- */
  const start = useCallback(
    async () => {
      if (mediaRecorder.current?.state === "recording") return;

      chunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);

      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        sttMutate(blob);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false); // ensure UI resets even if stop() wasn’t called
      };

      rec.start();
      mediaRecorder.current = rec;
      setIsRecording(true);
    },
    [sttMutate], // eslint-react/exhaustive-deps satisfied
  );

  /* ---------- stop recording ---------- */
  const stop = useCallback(() => {
    if (mediaRecorder.current?.state !== "recording") return;
    mediaRecorder.current.stop();
    // isRecording flips in rec.onstop to avoid double-toggle
  }, []);

  /* --- cleanup on unmount --- */
  useEffect(() => {
    return () => {
      if (mediaRecorder.current?.state === "recording") {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  /* ---------- sentence-level TTS ---------- */
  const speakSentence = useSentenceQueue();

  /* ---------- exported API ---------- */
  return {
    /* mic */
    isRecording,
    start,
    stop,
    /* STT */
    transcript: data ?? "",
    sttLoading: isPending,
    sttError: error as Error | null,
    /* TTS */
    speakSentence,
  };
}
