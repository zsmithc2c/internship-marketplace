// frontend/app/components/FloatingVoiceAgent.tsx
"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Mic, ChevronUp, Bot } from "lucide-react";
import VoiceAgentChat from "./VoiceAgentChat";
import ProfileSavedToast from "./Toast";
import { useVoiceAgentCtx } from "@/context/VoiceAgentContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function FloatingVoiceAgent() {
  /* hooks must run unconditionally */
  const { user } = useAuth();
  const va = useVoiceAgentCtx(); // null while logged-out
  const [open, setOpen] = useState(false);

  /* if no auth or ctx yet, render nothing */
  if (!user || !va) return null;

  const { isRecording, start, stop, sending } = va;

  /* helpers */
  const toggleSheet = () => setOpen((o) => !o);

  /* bubble style */
  const bubbleCls = cn(
    "fixed bottom-6 right-6 z-50 grid size-16 place-items-center rounded-full text-white shadow-lg transition-all",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50",
    isRecording
      ? "bg-red-600 animate-pulse" // mic held
      : sending
      ? "bg-primary/90 after:absolute after:inset-0 after:rounded-full after:bg-primary/70 after:animate-ping"
      : "bg-primary hover:-translate-y-1 hover:shadow-xl" // idle
  );

  return (
    <>
      {/* toast overlays everything */}
      <ProfileSavedToast />

      {/* chevron to open/close transcript */}
      <button
        onClick={toggleSheet}
        className="fixed bottom-[5.75rem] right-8 z-50 rounded-full bg-background/70 p-1 shadow-md backdrop-blur hover:shadow-lg"
        aria-label={open ? "Hide transcript" : "Show transcript"}
      >
        <ChevronUp
          className={cn("h-5 w-5 transition-transform", open && "rotate-180")}
        />
      </button>

      {/* mic bubble */}
      <button
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          start();
        }}
        onPointerUp={(e) => {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          stop();
        }}
        onPointerCancel={stop}
        className={bubbleCls}
        aria-label="Hold to talk"
      >
        {sending && !isRecording ? (
          <Bot className="h-7 w-7" />
        ) : (
          <Mic className="h-7 w-7" />
        )}
      </button>

      {/* transcript slide-over */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-lg p-0">
          <SheetHeader className="border-b p-4">
            <h2 className="text-lg font-semibold">Voice Assistant</h2>
          </SheetHeader>
          <div className="p-4">
            <VoiceAgentChat />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
