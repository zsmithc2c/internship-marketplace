// app/(marketing)/landing/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

/* -------------------------------- helpers -------------------------------- */
const itemFade = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.05, duration: 0.5 },
  }),
};

export default function Landing() {
  const [role, setRole] = useState<"student" | "employer">("student");

  /* ---------- copy decks ---------- */
  const decks: Record<"student" | "employer", string[]> = {
    student: [
      "Create one polished profile and reuse it everywhere.",
      "Browse curated internship listings from vetted employers.",
      "Auto-match with roles that fit your skills & availability.",
    ],
    employer: [
      "Post internships in minutes — completely free.",
      "See AI-ranked student matches the moment you publish.",
      "Schedule interviews & send offers without leaving Pipeline.",
    ],
  };

  return (
    <main className="relative min-h-screen bg-neutral-50">
      {/* ----------------------------- HERO -------------------------------- */}
      <section className="relative isolate flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-teal-600 via-sky-600 to-indigo-600 px-6 pt-24 text-center text-white">
        {/* floating blobs */}
        <motion.div
          className="pointer-events-none absolute -left-40 -top-40 size-[32rem] rounded-full bg-teal-300/20 blur-3xl"
          animate={{ y: [0, 30, -10, 0], x: [0, -10, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity }}
        />
        <motion.div
          className="pointer-events-none absolute bottom-0 right-0 size-[40rem] rounded-full bg-indigo-400/20 blur-3xl"
          animate={{ y: [0, -20, 10, 0], x: [0, 10, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
        />

        {/* subtle illustration */}
        <Image
          src="/hero-graph.svg"
          alt=""
          width={900}
          height={600}
          priority
          className="pointer-events-none absolute inset-0 mx-auto opacity-10"
        />

        <motion.h1
          className="relative z-10 max-w-4xl text-4xl font-extrabold leading-tight md:text-5xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}
        >
          Your Career&nbsp;Starts&nbsp;Here
        </motion.h1>

        <motion.p
          className="relative z-10 mt-4 max-w-2xl text-lg opacity-90"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.6 } }}
        >
          Pipeline connects ambitious students with forward-thinking employers,
          making internships friction-free for everyone.
        </motion.p>

        {/* toggle pill */}
        <motion.div
          className="relative z-10 mt-10 inline-flex rounded-xl bg-white/10 p-1 backdrop-blur"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.6 } }}
        >
          {(["student", "employer"] as const).map((label) => (
            <button
              key={label}
              onClick={() => setRole(label)}
              className={cn(
                "relative z-10 min-w-[7rem] rounded-lg px-4 py-2 text-sm font-medium transition",
                role === label ? "text-neutral-900" : "text-white/80"
              )}
            >
              {label === "student" ? "Students" : "Employers"}
            </button>
          ))}
          <motion.span
            layout
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className={cn(
              "absolute inset-y-0 z-0 w-1/2 rounded-lg bg-white shadow-md",
              role === "student" ? "left-0" : "left-1/2"
            )}
          />
        </motion.div>
      </section>

      {/* ----------------------- ROLE-SPECIFIC PANEL ----------------------- */}
      <section className="relative z-20 mx-auto -mt-24 max-w-6xl px-6 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
            exit={{ opacity: 0, y: -32, transition: { duration: 0.4 } }}
            className="rounded-3xl border bg-white/80 p-10 shadow-xl backdrop-blur-md"
          >
            <h2 className="mb-8 text-center text-2xl font-semibold text-[--accent-primary]">
              {role === "student" ? "For Students" : "For Employers"}
            </h2>

            {/* feature grid */}
            <ul className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 md:grid-cols-3">
              {decks[role].map((item, i) => (
                <motion.li
                  key={item}
                  custom={i}
                  variants={itemFade}
                  initial="hidden"
                  animate="show"
                  className="rounded-2xl bg-gray-50 p-6 text-sm leading-relaxed shadow hover:-translate-y-1 hover:shadow-md"
                >
                  {item}
                </motion.li>
              ))}
            </ul>

            {/* calls-to-action */}
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              {/* SIGN-UP / CREATE ACCOUNT */}
              <Link
                href={`/register?role=${role}`}
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  // Always visible on white
                  "bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-700 gap-1.5"
                )}
              >
                {role === "student" ? "Sign up" : "Create account"}
                <ArrowRight className="h-4 w-4" />
              </Link>

              {/* LOG-IN */}
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "border border-teal-600 text-teal-700 hover:bg-teal-50 focus-visible:ring-teal-600"
                )}
              >
                Log in
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}
