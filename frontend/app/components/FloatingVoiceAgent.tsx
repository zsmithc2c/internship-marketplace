// frontend/app/components/FloatingVoiceAgent.tsx
"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Mic } from "lucide-react";
import VoiceAgentChat from "./VoiceAgentChat";

export default function FloatingVoiceAgent() {
  const [open, setOpen] = useState(false);

  /* --- helpers --- */
  const toggle = () => setOpen((o) => !o);
  const openAndStart = () => setOpen(true);   // could trigger recording later

  return (
    <>
      {/* Mic bubble */}
      <button
        onClick={toggle}
        onPointerDown={openAndStart}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50"
        aria-label="Open voice assistant"
      >
        <Mic className="h-8 w-8" />
      </button>

      {/* Slide-over chat */}
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
