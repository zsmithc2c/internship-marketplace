/* app/dashboard/page.tsx */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEmployerProfile } from "@/hooks/useEmployerProfile";
import { useVoiceAgentCtx } from "@/context/VoiceAgentContext";
import { useOpenInternships } from "@/hooks/useOpenInternships";

import MetricCard from "./MetricCard";
import TipCarousel from "./TipCarousel";
import ActivityFeed from "./ActivityFeed";

import {
  User,
  Briefcase,
  GraduationCap,
  LogOut,
  Mic,
  Building,
  UserCheck,
  Send,
  Lightbulb,
} from "lucide-react";

/* ───────────────── Typewriter (tiny, no extra deps) ───────────── */
function Typewriter({ text, speed = 50 }: { text: string; speed?: number }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (idx === text.length) return;
    const t = setTimeout(() => setIdx((i) => i + 1), speed);
    return () => clearTimeout(t);
  }, [idx, text, speed]);
  return <span>{text.slice(0, idx)}</span>;
}

/* ───────────────── Types / constants ──────────────────────────── */
interface InternshipSummary {
  id: number;
  posted_at: string;
  applications_count?: number; // ← typed so TS is happy
}
const ROLE_LABEL: Record<string, string> = { INTERN: "Intern", EMPLOYER: "Employer" };
const metricWrapper =
  "rounded-xl bg-white/80 backdrop-blur ring-1 ring-gray-200 shadow-sm";

/* ───────────────── Footer (display-only links) ────────────────── */
function Footer() {
  return (
    <footer className="mt-auto bg-gray-900 text-white">
      <div className="mx-auto max-w-6xl grid gap-8 px-6 py-10 sm:grid-cols-3">
        <div>
          <h3 className="text-lg font-semibold">Pipeline</h3>
          <p className="mt-2 max-w-xs text-sm text-gray-300">
            Connecting ambitious talent with innovative companies.
          </p>
        </div>
        <nav className="space-y-2 text-sm text-gray-400">
          <span className="block">About</span>
          <span className="block">Privacy</span>
          <span className="block">Terms</span>
          <span className="block">Contact</span>
        </nav>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Pipeline. All rights reserved.
      </div>
    </footer>
  );
}

/* ───────────────────────── Dashboard page ─────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const va = useVoiceAgentCtx();

  /* role helpers */
  const role = user?.role;
  const isEmployer = role === "EMPLOYER";
  const isIntern = role === "INTERN";

  /* queries */
  const { data: profile } = useProfile();
  const { data: employerProfile } = useEmployerProfile({ enabled: isEmployer });
  const { data: myInternships = [] } = useQuery<InternshipSummary[]>({
    queryKey: ["internships", "mine"],
    queryFn: () => fetchWithAuth("/api/internships?mine=true").then((r) => r.json()),
    enabled: !!user && isEmployer,
    staleTime: 60_000,
  });
  const { data: openInternships = [] } = useOpenInternships({
    enabled: !!user && isIntern,
    staleTime: 60_000,
  });

  /* tooltip (first visit) */
  const [showTooltip, setShowTooltip] = useState(false);
  useEffect(() => {
    if (isIntern && typeof window !== "undefined" && !localStorage.getItem("agentTooltipSeen")) {
      setShowTooltip(true);
      localStorage.setItem("agentTooltipSeen", "true");
      setTimeout(() => setShowTooltip(false), 5_000);
    }
  }, [isIntern]);

  /* confetti after first successful voice session */
  useEffect(() => {
    if (
      isIntern &&
      typeof window !== "undefined" &&
      va?.history?.length &&
      !localStorage.getItem("confettiDone")
    ) {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        import("canvas-confetti").then(({ default: confetti }) =>
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }),
        );
      }
      localStorage.setItem("confettiDone", "true");
    }
  }, [isIntern, va?.history?.length]);

  /* auth guard */
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading)
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="size-10 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-transparent" />
      </main>
    );
  if (!user) return null;

  /* helpers */
  const profileCompletion =
    profile &&
    Math.round(
      (
        [
          profile.headline,
          profile.bio,
          (profile.skills ?? []).length,
          (profile.educations ?? []).length,
          profile.city || profile.country,
        ].filter(Boolean).length / 5
      ) * 100,
    );

  const greetingAddon =
    isEmployer && employerProfile?.company_name
      ? `, ${employerProfile.company_name}`
      : `, ${ROLE_LABEL[role ?? ""] ?? "User"}`;

  const tiles = [
    {
      icon: <User className="h-6 w-6" />,
      title: "My Account",
      desc: "Manage credentials & notifications",
      href: "/account",
    },
    ...(isIntern
      ? [
          {
            icon: <GraduationCap className="h-6 w-6" />,
            title: "My Profile",
            desc: "View or edit your profile",
            href: "/profile",
          },
          {
            icon: <Briefcase className="h-6 w-6" />,
            title: "Browse Internships",
            desc: "Find and apply to internships",
            href: "/internships",
          },
        ]
      : isEmployer
      ? [
          {
            icon: <Building className="h-6 w-6" />,
            title: "Company Profile",
            desc: "View and edit company info",
            href: "/employer/profile",
          },
          {
            icon: <Briefcase className="h-6 w-6" />,
            title: "Manage Internships",
            desc: "Post and manage listings",
            href: "/employer/internships",
          },
        ]
      : []),
  ];

  /* voice-agent controls */
  const startAgent = () =>
    va?.start ? va.start() : router.push(isIntern ? "/profile/builder" : "/employer/profile#agent");
  const stopAgent = () => va?.stop?.();
  const toggleAgent = () => (va?.isRecording ? stopAgent() : startAgent());

  /* ─────────────────────────────── UI ─────────────────────────── */
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-[#f1f5ff] via-[#eef7ff] to-[#e6f4ff] text-black">
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-20">
          <div className="absolute -top-1/3 left-0 h-[150%] w-full bg-gradient-to-tr from-[--accent-primary]/30 via-purple-300/20 to-transparent blur-3xl" />
        </div>

        {isEmployer && (
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/dashboard-hero.jpg"
              alt="Dashboard banner"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
          </div>
        )}

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-24 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 drop-shadow-sm">
            <Typewriter text={`Welcome back${greetingAddon}`} />
          </h1>
          <p className="max-w-lg text-neutral-700">
            {isEmployer
              ? "Pipeline connects you with top talent — and your AI assistant is ready to help."
              : "Pipeline matches ambitious students with curated internships — your AI mentor is ready to help."}
          </p>

          {/* voice agent CTA – matches original styling */}
          <div className="relative inline-block">
            <Card
              role="button"
              tabIndex={0}
              onClick={toggleAgent}
              onPointerDown={(e) => (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
              onPointerUp={(e) => (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)}
              onKeyDown={(e) =>
                ["Space", "Enter"].includes(e.code) && (e.preventDefault(), toggleAgent())
              }
              className="relative flex max-w-md cursor-pointer items-center gap-4 rounded-3xl bg-white/90 p-6 shadow-lg transition hover:shadow-xl active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-[--accent-primary]/50"
            >
              <span className="relative grid size-14 place-items-center rounded-full bg-primary/10 text-primary shadow-md">
                {va?.isRecording ? (
                  <>
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-25" />
                    <Mic className="relative h-7 w-7" />
                  </>
                ) : (
                  <Mic className="h-7 w-7" />
                )}
              </span>
              <div className="flex-1 text-left">
                <h2 className="text-lg font-semibold text-primary">Talk to your Pipeline&nbsp;Agent</h2>
                <p className="text-xs text-muted-foreground">
                  {va?.isRecording ? "Release or click to stop." : "Click or hold (space/enter) to talk."}
                </p>
              </div>
            </Card>

            {showTooltip && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 -translate-y-full rounded-md bg-black px-3 py-2 text-xs text-white shadow-md">
                Hold to talk
                <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full h-3 w-3 rotate-45 bg-black" />
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className="mt-8 inline-flex items-center gap-1 rounded-md bg-black/10 px-4 py-2 text-sm font-medium text-black ring-1 ring-black/10 backdrop-blur transition hover:bg-black/20"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </section>

      {/* Main content */}
      <section className="relative bg-gradient-to-b from-transparent via-[#f8fbff] to-[#eef4ff] pt-16 pb-24">
        <div className="mx-auto max-w-6xl px-6">
          {isEmployer && myInternships.length === 0 ? (
            <div className="mx-auto max-w-md">
              <Card className="rounded-xl border-2 border-dashed border-gray-300 bg-white/80 p-6 text-center shadow-sm backdrop-blur">
                <CardContent className="space-y-4">
                  <Briefcase className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-sm text-neutral-600">You haven’t posted any internships yet.</p>
                  <Link
                    href="/employer/internships?tab=new"
                    className={cn(buttonVariants({ variant: "default" }), "block")}
                  >
                    Post an Internship
                  </Link>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* metrics */}
              <motion.div
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, staggerChildren: 0.1 },
                  },
                }}
              >
                {isIntern && (
                  <>
                    <div className={metricWrapper}>
                      <MetricCard
                        icon={UserCheck}
                        label="Profile Completion"
                        value={profileCompletion}
                        suffix="%"
                      />
                    </div>
                    <div className={metricWrapper}>
                      <MetricCard icon={Send} label="Applications Submitted" value={0} />
                    </div>
                    <div className={metricWrapper}>
                      <MetricCard icon={Briefcase} label="Open Internships" value={openInternships.length} />
                    </div>
                  </>
                )}

                {isEmployer && (
                  <>
                    <div className={metricWrapper}>
                      <MetricCard icon={Briefcase} label="Internship Postings" value={myInternships.length} />
                    </div>
                    <div className={metricWrapper}>
                      <MetricCard
                        icon={Send}
                        label="Pending Applications"
                        value={myInternships.reduce(
                          (sum, j) => sum + (j.applications_count ?? 0),
                          0,
                        )}
                      />
                    </div>
                    <div className={metricWrapper}>
                      <MetricCard icon={Lightbulb} label="Recent Activity">
                        {myInternships.length
                          ? (() => {
                              const last = new Date(
                                Math.max(...myInternships.map((j) => new Date(j.posted_at).getTime())),
                              );
                              const diff = Math.floor((Date.now() - last.getTime()) / 86_400_000);
                              if (diff === 0) return "Last posting: Today";
                              if (diff === 1) return "Last posting: Yesterday";
                              if (diff < 7) return `Last posting: ${diff} days ago`;
                              return `Last posting: ${last.toLocaleDateString()}`;
                            })()
                          : "No recent activity"}
                      </MetricCard>
                    </div>
                  </>
                )}
              </motion.div>

              {/* tips & activity feed */}
              {isIntern && (
                <>
                  <div className="mt-10">
                    <TipCarousel />
                  </div>
                  {openInternships.length > 0 && (
                    <div className="mt-8">
                      <ActivityFeed items={openInternships.slice(0, 5)} />
                    </div>
                  )}
                </>
              )}

              {/* quick links */}
              <motion.div
                className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, staggerChildren: 0.05 },
                  },
                }}
              >
                {tiles.map(({ href, icon, title, desc }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group focus:outline-none focus:ring-4 focus:ring-[--accent-primary]/50"
                  >
                    <Card className="h-full rounded-2xl bg-white/80 backdrop-blur ring-1 ring-gray-200 shadow-sm transition group-hover:-translate-y-1 group-hover:shadow-md">
                      <CardHeader className="flex flex-row items-center gap-3 pb-0">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                          {icon}
                        </div>
                        <CardTitle className="text-lg">{title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 text-sm text-neutral-600">{desc}</CardContent>
                    </Card>
                  </Link>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
