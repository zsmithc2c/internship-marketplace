// frontend/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { useVoiceAgentCtx } from "@/context/VoiceAgentContext";

import {
  User,
  Briefcase,
  GraduationCap,
  LogOut,
  Mic,
} from "lucide-react";

interface JwtPayload {
  role: string;
  exp: number;
  iat: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const va = useVoiceAgentCtx();

  /* ── auth guard ─────────────────────────────────────────────── */
  useEffect(() => {
    const t = localStorage.getItem("access");
    if (!t) return router.replace("/login");
    try {
      setRole(jwtDecode<JwtPayload>(t).role);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const { data: profile, isLoading } = useProfile();

  /* ── quick-link tiles ───────────────────────────────────────── */
  const tiles = [
    {
      icon: <User className="h-6 w-6" />,
      title: "My Account",
      desc: "Manage credentials & notifications.",
      href: "/account",
    },
  ];

  if (role === "INTERN") {
    tiles.push(
      {
        icon: <GraduationCap className="h-6 w-6" />,
        title: "My Profile",
        desc: "See what employers see.",
        href: "/profile",
      },
      {
        icon: <Briefcase className="h-6 w-6" />,
        title: "Internships",
        desc: "Browse & apply in seconds.",
        href: "/internships",
      },
    );
  }

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <main className="pt-14">
      {/* ───── Hero + Agent CTA ───── */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600">
        {/* decorative overlay – ignore clicks */}
        <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light [mask-image:radial-gradient(transparent_45%,black)]" />

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-20 text-center">
          {/* greeting */}
          <div className="space-y-3">
            <h1 className="text-3xl/tight font-extrabold tracking-tight text-white drop-shadow-lg">
              Welcome back{role ? `, ${role.toLowerCase()}!` : "!"}
            </h1>
            <p className="max-w-lg text-white/90">
              Pipeline pairs ambitious talent with curated internships — and
              your personal AI mentor is ready to help.
            </p>
          </div>

          {/* voice-agent card */}
          <Card
            /* Only start / stop recording; no transcript toggle */
            onPointerDown={() => va?.start?.()}
            onPointerUp={() => va?.stop?.()}
            onPointerCancel={() => va?.stop?.()}
            className="relative z-10 flex max-w-md cursor-pointer items-center gap-4 rounded-3xl bg-white/90 p-6 shadow-lg transition hover:shadow-2xl active:scale-[0.98]"
          >
            <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary shadow-md">
              {va?.isRecording ? (
                <span className="animate-pulse text-lg">●</span>
              ) : (
                <Mic className="h-7 w-7" />
              )}
            </span>

            <div className="flex-1 space-y-1 text-left">
              <h2 className="text-lg font-semibold text-primary">
                Hold to talk with your Pipeline&nbsp;Agent
              </h2>
              <p className="text-xs text-muted-foreground">
                The voice bubble at the bottom-right follows you everywhere for
                quick access.
              </p>
            </div>
          </Card>

          {/* logout */}
          <button
            onClick={() => {
              localStorage.removeItem("access");
              localStorage.removeItem("refresh");
              router.push("/login");
            }}
            className="group inline-flex items-center gap-1 rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-inset ring-white/20 backdrop-blur-lg transition hover:bg-white/20"
          >
            <LogOut className="h-4 w-4 stroke-[2.5]" /> Log out
          </button>
        </div>
      </section>

      {/* ───── Quick links & profile freshness ───── */}
      <section className="bg-gray-50/60 pb-24 pt-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map(({ href, icon, title, desc }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full rounded-2xl border border-transparent bg-white/90 shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center gap-3 pb-0">
                  <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
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

        {/* profile freshness */}
        {role === "INTERN" && (
          <div className="mx-auto mt-12 max-w-6xl px-6">
            <Card className="rounded-xl border-l-4 border-primary bg-white/90 shadow-sm">
              <CardContent className="flex items-center gap-2 py-4 text-sm">
                {isLoading ? (
                  <>Checking profile…</>
                ) : profile ? (
                  <>
                    Your profile was last updated&nbsp;
                    {new Date(profile.updated_at).toLocaleDateString()}
                    — hold the Agent bubble to refine it!
                  </>
                ) : (
                  <>
                    No profile yet — hold the Agent bubble and we&rsquo;ll build
                    it together.
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </main>
  );
}
