/* app/(marketing)/landing/page.tsx */
"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useAnimation, useInView } from "framer-motion";
import {
  GraduationCap,
  Briefcase,
  UserCheck,
  Send,
  Sparkles,
  ArrowDown,
} from "lucide-react";

import Footer from "@/components/ui/Footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ───────── helpers & variants ───────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.8, ease: "easeOut" },
  }),
};

/* demo testimonials */
const TESTIMONIALS = [
  {
    quote:
      "Pipeline helped me land my dream computer-vision internship in just two weeks!",
    name: "Aisha · CS student",
  },
  {
    quote:
      "We posted a role on Monday and had three stellar applicants by Tuesday.",
    name: "Leo · CTO @Robotics-X",
  },
  {
    quote:
      "The AI mentor polished my profile far better than any career center ever did.",
    name: "Mateo · Data-science major",
  },
];

export default function LandingPage() {
  /* auto-scroll testimonials */
  const carouselRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const node = carouselRef.current;
    if (!node) return;
    let idx = 0;
    const cycle = () => {
      idx = (idx + 1) % TESTIMONIALS.length;
      node.style.transform = `translateX(-${idx * 100}%)`;
    };
    const intervalId = setInterval(cycle, 6000);
    return () => clearInterval(intervalId);
  }, []);

  /* scroll-cue bounce */
  const arrowControls = useAnimation();
  useEffect(() => {
    arrowControls.start({
      y: [0, 10, 0],
      transition: { repeat: Infinity, duration: 2 },
    });
  }, [arrowControls]);

  /* timeline in-view animation */
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(timelineRef, { once: true, amount: 0.2 });
  const timelineControls = useAnimation();
  useEffect(() => {
    if (isInView) timelineControls.start("visible");
  }, [isInView, timelineControls]);

  return (
    <>
      {/* ───────── HERO ───────── */}
      <header className="relative isolate flex min-h-[90vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-teal-600 via-sky-600 to-indigo-600 px-6 text-center text-white">
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

        {/* subtle grid illustration */}
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

        <motion.div
          animate={arrowControls}
          className="relative z-10 mt-24 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/50"
        >
          <ArrowDown className="h-4 w-4" />
        </motion.div>
      </header>

      {/* ───────── STUDENTS ───────── */}
      <section className="mx-auto max-w-6xl space-y-12 px-6 py-28">
        <motion.h2
          className="text-center text-3xl font-bold text-[--accent-primary]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
        >
          For Students
        </motion.h2>

        <motion.ul
          className="grid gap-6 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {[
            {
              icon: GraduationCap,
              text: "Create one polished profile and reuse it everywhere.",
            },
            {
              icon: Briefcase,
              text: "Browse curated internship listings from vetted employers.",
            },
            {
              icon: Sparkles,
              text: "Get AI-matched to roles that fit your skills & availability.",
            },
          ].map(({ icon: Icon, text }, idx) => (
            <motion.li
              key={text}
              custom={idx}
              variants={fadeUp}
              className="rounded-2xl bg-gray-50 p-8 shadow-sm"
            >
              <Icon className="mb-4 h-8 w-8 text-[--accent-primary]" />
              <p className="text-sm leading-relaxed">{text}</p>
            </motion.li>
          ))}
        </motion.ul>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "bg-white text-[--accent-primary] hover:bg-white/90 active:bg-white/80"
            )}
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "border border-[--accent-primary] text-[--accent-primary] hover:bg-teal-50"
            )}
          >
            Log in
          </Link>
        </div>
      </section>

      {/* ───────── EMPLOYERS ───────── */}
      <section className="bg-gray-50/60 py-28">
        <div className="mx-auto max-w-6xl space-y-12 px-6">
          <motion.h2
            className="text-center text-3xl font-bold text-[--accent-primary]"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
          >
            For Employers
          </motion.h2>

          <motion.ul
            className="grid gap-6 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {[
              {
                icon: Briefcase,
                text: "Post internships in minutes — completely free.",
              },
              {
                icon: UserCheck,
                text: "See AI-ranked student matches the moment you publish.",
              },
              {
                icon: Send,
                text: "Schedule interviews & send offers without leaving Pipeline.",
              },
            ].map(({ icon: Icon, text }, idx) => (
              <motion.li
                key={text}
                custom={idx}
                variants={fadeUp}
                className="rounded-2xl bg-white p-8 shadow-sm"
              >
                <Icon className="mb-4 h-8 w-8 text-[--accent-primary]" />
                <p className="text-sm leading-relaxed">{text}</p>
              </motion.li>
            ))}
          </motion.ul>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "bg-white text-[--accent-primary] hover:bg-white/90 active:bg-white/80"
              )}
            >
              Create account
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "border border-[--accent-primary] text-[--accent-primary] hover:bg-teal-50"
              )}
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section
        ref={timelineRef}
        className="mx-auto max-w-5xl px-6 py-28 text-center"
      >
        <motion.h2
          className="text-3xl font-bold text-[--accent-primary]"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          How Pipeline Works
        </motion.h2>

        <motion.ol
          className="mt-16 space-y-12 md:space-y-0 md:divide-x md:divide-gray-200 md:flex md:justify-between"
          initial="hidden"
          animate={timelineControls}
          variants={{
            visible: {
              transition: { staggerChildren: 0.15, delayChildren: 0.2 },
            },
          }}
        >
          {[
            {
              step: "1",
              title: "Create your profile",
              desc: "Or post an internship if you’re an employer.",
            },
            {
              step: "2",
              title: "Get matched instantly",
              desc: "AI surfaces the best fits for both sides.",
            },
            {
              step: "3",
              title: "Interview & hire",
              desc: "Chat, schedule, and send offers right inside Pipeline.",
            },
          ].map(({ step, title, desc }, idx) => (
            <motion.li
              key={step}
              custom={idx}
              variants={fadeUp}
              className="flex-1 px-6"
            >
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[--accent-primary] text-white shadow">
                {step}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-gray-600">{desc}</p>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      {/* ───────── TESTIMONIALS ───────── */}
      <section className="bg-white py-28">
        <h2 className="text-center text-3xl font-bold text-[--accent-primary]">
          Success Stories
        </h2>

        <div className="mt-12 overflow-hidden">
          <ul
            ref={carouselRef}
            className="flex transition-transform duration-700"
            style={{ width: `${TESTIMONIALS.length * 100}%` }}
          >
            {TESTIMONIALS.map(({ quote, name }) => (
              <li
                key={name}
                className="w-full flex-none px-6 md:px-24"
                style={{ width: "100%" }}
              >
                <figure className="mx-auto max-w-3xl text-center">
                  <blockquote className="rounded-xl bg-gray-50 p-8 text-lg italic shadow">
                    “{quote}”
                  </blockquote>
                  <figcaption className="mt-4 text-sm font-medium text-gray-700">
                    {name}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <section className="bg-gradient-to-br from-teal-600 via-sky-600 to-indigo-600 py-24 text-center text-white">
        <h2 className="text-3xl font-bold">Ready to get started?</h2>
        <p className="mx-auto mt-4 max-w-lg opacity-90">
          Join Pipeline today and take the first step toward hiring talent or
          landing your ideal internship.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "bg-white text-[--accent-primary] hover:bg-white/90 active:bg-white/80"
            )}
          >
            Sign up free
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "border-white text-white hover:bg-white/10"
            )}
          >
            Log in
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
