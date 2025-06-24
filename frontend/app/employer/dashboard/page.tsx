// /frontend/app/employer/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceAgentCtx } from "@/context/VoiceAgentContext";
import { useEmployerProfile } from "@/hooks/useEmployerProfile";
import { useEmployerInternships } from "@/hooks/useEmployerInternships";
import MetricCard from "../../dashboard/MetricCard";
import {
  Briefcase,
  FilePlus,
  UserCog,
  LifeBuoy,
  Mic,
  LogOut,
  Send,
  Lightbulb,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────── */
function Typewriter({ text, speed = 50 }: { text: string; speed?: number }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (idx === text.length) return;
    const t = setTimeout(() => setIdx((i) => i + 1), speed);
    return () => clearTimeout(t);
  }, [idx, text, speed]);
  return <span>{text.slice(0, idx)}</span>;
}

const metricWrapper =
  "rounded-xl bg-white/80 backdrop-blur ring-1 ring-gray-200 shadow-sm";

export default function EmployerDashboardPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const va = useVoiceAgentCtx();
  const { data: profile } = useEmployerProfile();
  const { data: myInternships = [], isLoading: internshipsLoading } =
    useEmployerInternships();

  const tiles = [
    {
      href: "/employer/internships?tab=new",
      icon: <FilePlus className="h-6 w-6" />,
      title: "Create Internship",
      desc: "Post a new internship listing.",
    },
    {
      href: "/employer/internships",
      icon: <Briefcase className="h-6 w-6" />,
      title: "View Listings",
      desc: "Manage your internship postings.",
    },
    {
      href: "/employer/profile",
      icon: <UserCog className="h-6 w-6" />,
      title: "Company Profile",
      desc: "Edit company information.",
    },
    {
      href: "/employer/help",
      icon: <LifeBuoy className="h-6 w-6" />,
      title: "Help",
      desc: "Get support or learn more.",
    },
  ];

  /* ─────────── Voice button handlers ─────────── */
  const handlePressStart = () => {
    if (va?.start) va.start();
    else router.push("/employer/profile#agent");
  };
  const handlePressEnd = () => va?.stop?.();

  const greeting = profile?.company_name ? `, ${profile.company_name}` : "!";

  return (
    <main className="pt-14">
      {/* ───── Hero banner with voice agent CTA ───── */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-20">
          <div className="absolute -top-1/3 left-0 h-[150%] w-full bg-gradient-to-tr from-[--accent-employer]/30 via-orange-300/20 to-transparent blur-3xl" />
        </div>
        <div className="absolute inset-0 -z-10">
          <Image
            src="/globe.svg"
            alt="Dashboard banner"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-24 text-center text-black">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <Typewriter text={`Welcome back${greeting}`} />
          </h1>
          <p className="max-w-lg opacity-80">
            Manage your internships and let the AI assistant help you find talent.
          </p>

        {/* front-and-center voice agent card */}
        <Card
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            handlePressStart();
          }}
          onPointerUp={(e) => {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            handlePressEnd();
          }}
          onPointerCancel={handlePressEnd}
          className="relative flex max-w-md cursor-pointer items-center gap-4 rounded-3xl bg-white/90 p-6 text-black shadow-lg transition hover:shadow-xl active:scale-[0.97]"
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
              Hold (or press space/enter) to start a conversation.
            </p>
          </div>
        </Card>

        <button
          onClick={logout}
          className="mt-4 inline-flex items-center gap-1 rounded-md bg-black/10 px-4 py-2 text-sm font-medium text-black ring-1 ring-black/10 backdrop-blur transition hover:bg-black/20"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
        </div>
      </section>

      {/* ───── Metrics grid ───── */}
      <section className="bg-gray-50/60 pb-16 pt-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 sm:grid-cols-3">
          <div className={metricWrapper}>
            <MetricCard
              icon={Briefcase}
              label="Internship Postings"
              value={myInternships.length}
              loading={internshipsLoading}
            />
          </div>
          <div className={metricWrapper}>
            <MetricCard
              icon={Send}
              label="Pending Applications"
              value={myInternships.reduce((s, j) => s + (j.applications_count ?? 0), 0)}
              loading={internshipsLoading}
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
        </div>
      </section>

      {/* ───── Quick-link cards ───── */}
      <section className="bg-gray-50/60 pb-24 pt-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map(({ href, icon, title, desc }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full rounded-2xl border border-transparent bg-white/90 shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:border-[--accent-employer]/30 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center gap-3 pb-0">
                  <div className="grid size-10 place-items-center rounded-lg bg-[--accent-employer]/10 text-[--accent-employer] transition group-hover:bg-[--accent-employer] group-hover:text-white">
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
        </div>
      </section>
    </main>
  );
}
