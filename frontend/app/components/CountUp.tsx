"use client";

import { useRef, useEffect } from "react";
import { useInView, useMotionValue, animate } from "framer-motion";

interface CountUpProps {
  /** Target value to count up to. */
  end: number;
  /** Optional suffix (e.g. "%" or unit) to append after the number. */
  suffix?: string;
}

export default function CountUp({ end, suffix = "" }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      // Start animation toward the target value when in view
      animate(motionValue, end, { duration: 1, ease: "easeOut" });
    }
  }, [isInView, end, motionValue]);

  useEffect(() => {
    // Update text content on every value change
    const unsubscribe = motionValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${Math.round(latest)}${suffix}`;
      }
    });
    return () => unsubscribe();
  }, [motionValue, suffix]);

  // Initial render shows "0" (or current value) with suffix to avoid blank state
  return <span ref={ref}>{Math.round(motionValue.get())}{suffix}</span>;
}
