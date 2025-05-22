"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Internship } from "@/hooks/useInternships";

/**
 * Recent-activity ticker shown on the intern dashboard.
 * It fades / slides between items every 5 seconds.
 */
interface ActivityFeedProps {
  items: Internship[];
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  /* ---------------- ensure hooks are ALWAYS executed ---------------- */
  const [index, setIndex] = useState(0);

  /* cycle through items every 5 s */
  useEffect(() => {
    if (items.length === 0) return;

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5_000);

    return () => clearInterval(id);
  }, [items]);

  /* ------------------------------------------------------------------ */
  if (items.length === 0) return null;

  const current = items[index];

  return (
    <Card className="p-4">
      <div className="flex items-center text-sm text-muted-foreground">
        <Clock className="mr-2 h-4 w-4 text-[--accent-primary]" />
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={current.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="block"
            >
              {current.employer_name} posted a new internship:&nbsp;
              <span className="font-medium">{current.title}</span>
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}
