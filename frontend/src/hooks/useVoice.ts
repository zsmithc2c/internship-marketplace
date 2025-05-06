"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------ */
/*                          helpers                             */
/* ------------------------------------------------------------ */

async function sttRequest(audioBlob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", audioBlob, "speech.webm");
  const res = await fetch("/api/voice/stt/", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  const { text } = await res.json();
  return text;
}

async function ttsRequest(text: string, voice = "alloy"): Promise<string> {
  const res = await fetch("/api/voice/tts/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error(await res.text());
  const { audio_base64 } = await res.json();
  return `data:audio/mp3;base64,${audio_base64}`;
}

/* ------------------------------------------------------------ */
/*                         main hook                            */
/* ------------------------------------------------------------ */

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  /* ---------- STT mutation ---------- */
  const stt = useMutation({
    mutationFn: sttRequest,
  });

  /* ---------- TTS mutation ---------- */
  const tts = useMutation({
    mutationFn: ttsRequest,
    onSuccess: (src) => {
      const audio = new Audio(src);
      audio.play().catch(() => {
        /* autoplay blocked */
      });
    },
  });

  /* ---------- start recording ---------- */
  const start = useCallback(async () => {
    if (isRecording) return;
    chunks.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => chunks.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      stt.mutate(blob); // trigger transcription
      stream.getTracks().forEach((t) => t.stop());
    };
    rec.start();
    mediaRecorder.current = rec;
    setIsRecording(true);
  }, [isRecording, stt]);

  /* ---------- stop recording ---------- */
  const stop = useCallback(() => {
    if (!isRecording || !mediaRecorder.current) return;
    mediaRecorder.current.stop();
    setIsRecording(false);
  }, [isRecording]);

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  /* ---------- return API ---------- */
  return {
    isRecording,
    start,
    stop,
    /* transcription result */
    transcript: stt.data ?? "",
    sttLoading: stt.isPending,
    sttError: stt.error as Error | null,
    /* tts */
    speak: tts.mutate, // call speak(text)
    ttsLoading: tts.isPending,
    ttsError: tts.error as Error | null,
  };
}
