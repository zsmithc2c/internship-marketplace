// frontend/app/profile/builder/page.tsx
"use client";

import VoiceAgentChat from "@app/components/VoiceAgentChat";
import AgentChat from "@app/components/AgentChat";

export default function ProfileBuilderPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 space-y-8">
      <h1 className="text-2xl font-semibold">Profile Builder</h1>

      {/* Voice-first chat */}
      <section className="w-full max-w-2xl">
        <h2 className="mb-2 font-medium">🎙️ Voice (hold to speak)</h2>
        <VoiceAgentChat />
      </section>

      {/* Legacy text chat for testing */}
      <section className="w-full max-w-2xl">
        <h2 className="mb-2 font-medium">⌨️ Text</h2>
        <AgentChat />
      </section>
    </main>
  );
}
