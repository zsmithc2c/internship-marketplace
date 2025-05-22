"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function TipCarousel() {
  const tips: string[] = [
    "Complete your profile to increase your visibility to employers.",
    "Use your Pipeline AI Agent to get resume or interview tips.",
    "Check new internship listings regularly to find fresh opportunities.",
    "Tailor each application to the internship description for better results.",
  ];
  return (
    <div className="flex overflow-x-auto space-x-4 px-1 py-2 scroll-smooth snap-x snap-mandatory">
      {tips.map((tip, idx) => (
        <Card
          key={idx}
          className="min-w-[240px] flex-none snap-start rounded-xl p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 text-[--accent-primary]" />
            <p className="text-sm text-muted-foreground">{tip}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
