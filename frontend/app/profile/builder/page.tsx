"use client";

import AgentChat from "@app/components/AgentChat";

export default function ProfileBuilderPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4">
      <h1 className="mb-6 text-2xl font-semibold">Profile Builder</h1>
      <AgentChat />
    </main>
  );
}
