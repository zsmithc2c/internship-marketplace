// frontend/app/components/Toast.tsx
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

/**
 * Simple one‑off toast that shows “Profile saved ✓” whenever the
 * `window` dispatches a **profile-saved** event.  No external state
 * management or libraries required.
 *
 * Usage: `window.dispatchEvent(new Event("profile-saved"))`
 */
export default function ProfileSavedToast() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      // hide after 3s
      setTimeout(() => setOpen(false), 3000);
    };
    window.addEventListener("profile-saved", show);
    return () => window.removeEventListener("profile-saved", show);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-md bg-neutral-900/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur"
        >
          <CheckCircle className="h-4 w-4 text-green-400" />
          Profile saved ✓
        </motion.div>
      )}
    </AnimatePresence>
  );
}
