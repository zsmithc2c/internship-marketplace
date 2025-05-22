// frontend/src/hooks/useVoice.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ────────────── Whisper-safe MIME negotiation ────────────── */
const preferredMimeTypes = [
  "audio/webm",  // Chrome / Edge / Firefox (Opus in WebM)
  "audio/mp4",   // Safari / iOS  (AAC in MP4)
  "audio/mpeg",  // MP3 fallback
] as const;

/* Map MIME → filename extension */
const mimeExt: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
};

/* ───────── helpers: STT + TTS requests ───────── */

async function sttRequest(file: File): Promise<string> {
  if (!file.size) throw new Error("Empty recording");
  if (file.size > 4_000_000) throw new Error("Recording too large (>4 MB)");

  const form = new FormData();
  form.append("audio", file, file.name);

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

/* ───────────── sentence queue (TTS) ───────────── */

function useSentenceQueue() {
  const queue = useRef<HTMLAudioElement[]>([]);
  const playing = useRef(false);

  const playNext = () => {
    if (playing.current || !queue.current.length) return;
    playing.current = true;
    const next = queue.current.shift()!;
    next
      .play()
      .catch(() => {/* autoplay blocked */})
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
      a.addEventListener("ended", () => res(), { once: true });   //  ✅ wrap resolve in arrow
      a.addEventListener("error", () => rej(new Error("audio error")), { once: true });
      queue.current.push(a);
      playNext();
    });
  };
}

/* ─────────────────── main hook ─────────────────── */

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);          // ← Blob[], so `.type` is valid
  const stopRequested = useRef(false);
  const permissionPrimed = useRef(false);

  const {
    mutate: sttMutate,
    data: transcript,
    isPending: sttLoading,
    error: sttError,
  } = useMutation({ mutationFn: sttRequest });

  /* ── start capture ── */
  const start = useCallback(async () => {
    if (mediaRecorder.current?.state === "recording") return;
    stopRequested.current = false;

    // first tap just primes permission
    if (!permissionPrimed.current) {
      permissionPrimed.current = true;
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
        tmp.getTracks().forEach((t) => t.stop());
      } catch (err) {
        throw err;
      }
      return;
    }

    chunks.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    if (stopRequested.current) {
      stream.getTracks().forEach((t) => t.stop());
      stopRequested.current = false;
      return;
    }

    const mimeType =
      preferredMimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    rec.ondataavailable = (e) => chunks.current.push(e.data as Blob);
    rec.onstop = () => {
      const type = chunks.current[0]?.type || rec.mimeType || "audio/webm";
      const ext = mimeExt[type] ?? "webm";

      const file = new File(chunks.current, `speech.${ext}`, { type });
      sttMutate(file);

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
      stopRequested.current = true;
    } else {
      mediaRecorder.current.stop();
    }
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

  const speakSentence = useSentenceQueue();

  return {
    isRecording,
    start,
    stop,
    transcript: transcript ?? "",
    sttLoading,
    sttError: sttError as Error | null,
    speakSentence,
  };
}
