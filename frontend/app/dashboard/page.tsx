"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Loader2,
  User,
  Mic,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

interface JwtPayload {
  role: string;
  exp: number;
  iat: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  // ─────────── Auth guard + role extraction ───────────
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      setRole(decoded.role);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  // ─────────── Profile query (always call hooks at top level) ───────────
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfile();

  // ─────────── Loading screen while determining role ───────────
  if (!role) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  // ─────────── Helpers ───────────
  function handleLogout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.push("/login");
  }

  const cards = [
    {
      icon: <User className="h-6 w-6" />,
      title: "My Account",
      desc: "Manage your login & email settings.",
      href: "/account",
    },
  ];

  if (role === "INTERN") {
    cards.push(
      {
        icon: <Mic className="h-6 w-6" />,
        title: "Pipeline Agent",
        desc: "Interact with our Pipeline AI Agent to get started",
        href: "/profile/builder",
      },
      {
        icon: <GraduationCap className="h-6 w-6" />,
        title: "My Profile",
        desc: "View how employers will see you.",
        href: "/profile",
      },
      {
        icon: <Briefcase className="h-6 w-6" />,
        title: "Internships",
        desc: "Browse and apply to openings.",
        href: "/internships",
      }
    );
  }

  // ─────────── Render ───────────
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back, <span className="capitalize">{role.toLowerCase()}</span>!
          </h1>
          <button
            onClick={handleLogout}
            className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Log out
          </button>
        </header>

        {/* Quick-link cards */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="group">
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader className="flex flex-row items-center gap-3 pb-0">
                  <div className="rounded-md bg-gray-100 p-3 text-gray-900 transition-colors group-hover:bg-primary group-hover:text-white">
                    {c.icon}
                  </div>
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-3 text-sm text-muted-foreground">
                  {c.desc}
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        {/* Profile status (interns only) */}
        {role === "INTERN" && (
          <section>
            <Card className="border-l-4 border-primary">
              <CardContent className="space-y-2 py-4">
                {profileLoading && (
                  <p className="flex items-center gap-1 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking profile …
                  </p>
                )}
                {profileError && (
                  <p className="text-sm text-red-700">
                    {(profileError as Error).message}
                  </p>
                )}
                {profile && (
                  <p className="text-sm">
                    Profile last updated&nbsp;
                    {new Date(profile.updated_at).toLocaleDateString()} – keep
                    refining via the Profile Builder!
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
