// /frontend/app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
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

/* ─────────── Types ─────────── */
type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface SummaryMetricProps {
  icon: IconComponent;
  label: string;
  children: React.ReactNode;
}

interface InternshipSummary {
  id: number;
  posted_at: string;
  applications_count?: number;
}

/* ─────────── Helpers ─────────── */
function SummaryMetric({ icon: Icon, label, children }: SummaryMetricProps) {
  return (
    <Card className="flex items-center p-4">
      <Icon className="h-6 w-6 text-[--accent-primary]" />
      <div className="ml-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{children}</p>
      </div>
    </Card>
  );
}

const ROLE_LABEL: Record<string, string> = {
  INTERN: "Intern",
  EMPLOYER: "Employer",
};

/* ─────────── Page ─────────── */
export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const va = useVoiceAgentCtx();

  /* role flags */
  const role = user?.role;
  const isEmployer = role === "EMPLOYER";
  const isIntern = role === "INTERN";

  /* queries */
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { data: employerProfile } = useEmployerProfile({ enabled: isEmployer });

  const {
    data: myInternships = [],
    isLoading: loadingInternships,
  } = useQuery<InternshipSummary[]>({
    queryKey: ["internships", "mine"],
    queryFn: () =>
      fetchWithAuth("/api/internships?mine=true").then((r) => r.json()),
    enabled: isEmployer,
    staleTime: 60_000,
  });

  /* auth guard */
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="size-10 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-transparent" />
      </main>
    );
  }
  if (!user) return null;

  /* derived values */
  const profileCompletion = profile
    ? Math.round(
        (
          [
            profile.headline,
            profile.bio,
            (profile.skills ?? []).length,
            (profile.educations ?? []).length,
            profile.city || profile.country,
          ].filter(Boolean).length /
            5
        ) *
          100,
      )
    : 0;

  const tiles = [
    {
      icon: <User className="h-6 w-6" />,
      title: "My Account",
      desc: "Manage credentials & notifications",
      href: "/account",
    },
  ];

  if (isIntern) {
    tiles.push(
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
    );
  } else if (isEmployer) {
    tiles.push(
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
    );
  }

  const greetingAddon =
    isEmployer && employerProfile?.company_name
      ? `, ${employerProfile.company_name}`
      : `, ${ROLE_LABEL[role ?? ""] ?? "User"}`;

  /* voice handlers */
  const handleAgentPressStart = () => {
    if (va?.start) va.start();
    else {
      router.push(isIntern ? "/profile/builder" : "/employer/profile#agent");
    }
  };
  const handleAgentPressEnd = () => va?.stop?.();

  /* ─────────── Render ─────────── */
  return (
    <main className="pt-14">
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/dashboard-hero.jpg"
            alt="Dashboard banner"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 text-center flex flex-col items-center gap-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-lg">
            Welcome back{greetingAddon}
          </h1>

          <p className="max-w-lg text-white/90">
            {isEmployer ? (
              <>Pipeline connects you with top talent — and your AI assistant is ready to help.</>
            ) : (
              <>Pipeline matches ambitious students with curated internships — your AI mentor is ready to help.</>
            )}
          </p>

          {/* Voice Agent CTA (no onClick fallback) */}
          <Card
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              handleAgentPressStart();
            }}
            onPointerUp={(e) => {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              handleAgentPressEnd();
            }}
            onPointerCancel={handleAgentPressEnd}
            className="relative flex max-w-md cursor-pointer items-center gap-4 rounded-3xl bg-white/90 p-6 shadow-lg transition hover:shadow-xl active:scale-[0.97]"
          >
            <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary shadow-md">
              {va?.isRecording ? (
                <span className="animate-pulse text-lg">●</span>
              ) : (
                <Mic className="h-7 w-7" />
              )}
            </span>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-semibold text-primary">
                Talk to your Pipeline&nbsp;Agent
              </h2>
              <p className="text-xs text-muted-foreground">
                Hold (space/enter works too) to start a conversation.
              </p>
            </div>
          </Card>

          <button
            onClick={logout}
            className="inline-flex items-center gap-1 rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </section>


      {/* Dashboard content */}
      <section className="bg-gray-50/60 pt-16 pb-24">
        <div className="mx-auto max-w-6xl px-6">
          {isEmployer && !loadingInternships && myInternships.length === 0 ? (
            <div className="max-w-md mx-auto">
              <Card className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center">
                <CardContent className="space-y-4">
                  <Briefcase className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-sm text-muted-foreground">
                    You haven’t posted any internships yet.
                  </p>
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
              {/* Summary metrics */}
              <motion.div
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {isIntern && (
                  <>
                    <SummaryMetric icon={UserCheck} label="Profile Completion">
                      {loadingProfile ? "…" : `${profileCompletion}%`}
                    </SummaryMetric>
                    <SummaryMetric icon={Send} label="Applications Submitted">
                      {loadingProfile ? "…" : "0"}
                    </SummaryMetric>
                    <SummaryMetric icon={Lightbulb} label="AI Tip">
                      Ask your agent to suggest profile improvements.
                    </SummaryMetric>
                  </>
                )}

                {isEmployer && (
                  <>
                    <SummaryMetric icon={Briefcase} label="Internship Postings">
                      {loadingInternships ? "…" : myInternships.length}
                    </SummaryMetric>
                    <SummaryMetric icon={Send} label="Pending Applications">
                      {loadingInternships
                        ? "…"
                        : myInternships.reduce(
                            (sum, job) => sum + (job.applications_count ?? 0),
                            0
                          )}
                    </SummaryMetric>
                    <SummaryMetric icon={Lightbulb} label="Recent Activity">
                      {loadingInternships
                        ? "…"
                        : myInternships.length
                        ? (() => {
                            const lastDate = new Date(
                              Math.max(
                                ...myInternships.map((j) =>
                                  new Date(j.posted_at).getTime()
                                )
                              )
                            );
                            const diff = Math.floor(
                              (Date.now() - lastDate.getTime()) / 86_400_000
                            );
                            if (diff === 0) return "Last posting: Today";
                            if (diff === 1) return "Last posting: Yesterday";
                            if (diff < 7) return `Last posting: ${diff} days ago`;
                            return `Last posting: ${lastDate.toLocaleDateString()}`;
                          })()
                        : "No recent activity"}
                    </SummaryMetric>
                  </>
                )}
              </motion.div>

              {/* Quick-link tiles */}
              <motion.div
                className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              >
                {tiles.map(({ href, icon, title, desc }) => (
                  <Link key={href} href={href} className="group">
                    <Card className="h-full rounded-2xl border border-transparent bg-white shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:shadow-md">
                      <CardHeader className="flex flex-row items-center gap-3 pb-0">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                          {icon}
                        </div>
                        <CardTitle className="text-lg">{title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 text-sm text-muted-foreground">
                        {desc}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
