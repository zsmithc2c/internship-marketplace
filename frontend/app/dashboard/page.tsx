"use client";

import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  User, Briefcase, GraduationCap,
  LogOut, Sparkles,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

interface JwtPayload { role: string; exp: number; iat: number }

export default function Dashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("access");
    if (!t) return router.replace("/login");
    try { setRole(jwtDecode<JwtPayload>(t).role); }
    catch { router.replace("/login"); }
  }, [router]);

  const { data: profile, isLoading } = useProfile();

  /* —— cards to surface —— */
  const tiles = [
    { icon: <Sparkles className="h-6 w-6" />, title: "Pipeline Agent",
      desc: "Ask anything – your AI mentor is listening.",
      href: "/profile/builder" },
    { icon: <User className="h-6 w-6" />, title: "My Account",
      desc: "Manage credentials & notifications.", href: "/account" },
  ];

  if (role === "INTERN") {
    tiles.push(
      { icon: <GraduationCap className="h-6 w-6" />, title: "My Profile",
        desc: "See what employers see.", href: "/profile" },
      { icon: <Briefcase className="h-6 w-6" />, title: "Internships",
        desc: "Browse & apply in seconds.", href: "/internships" },
    );
  }

  /* —— render —— */
  return (
    <main className="pt-14"> {/* makes room for fixed nav */}
      {/* hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br
                           from-indigo-500 via-violet-600 to-fuchsia-600">
        <div className="absolute inset-0 opacity-30 mix-blend-soft-light
                        [mask-image:radial-gradient(transparent_40%,black)]" />
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-20 text-center">
          <h1 className="text-4xl/tight font-extrabold tracking-tight text-white drop-shadow-sm">
            Welcome back{role ? `, ${role.toLowerCase()}!` : "!"}
          </h1>
          <p className="max-w-lg text-white/90">
            Pipeline pairs top early-talent with curated internships
            and an always-on AI career coach.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("access");
              localStorage.removeItem("refresh");
              router.push("/login");
            }}
            className="group mt-4 inline-flex items-center gap-1 rounded-md
                       bg-white/10 px-4 py-2 text-sm font-medium text-white
                       ring-1 ring-inset ring-white/20 backdrop-blur-lg
                       transition hover:bg-white/20"
          >
            <LogOut className="h-4 w-4 stroke-[2.5]" /> Log out
          </button>
        </div>
      </section>

      {/* quick-links */}
      <section className="-mt-16 bg-gray-50/60 pb-20 pt-24">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map(({ href, icon, title, desc }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full rounded-2xl border border-transparent bg-white/90
                                shadow-sm ring-1 ring-gray-200 transition
                                hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center gap-3 pb-0">
                  <div className="grid size-10 place-items-center rounded-lg
                                   bg-primary/10 text-primary transition
                                   group-hover:bg-primary group-hover:text-white">
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

        {/* profile freshness banner */}
        {role === "INTERN" && (
          <div className="mx-auto mt-10 max-w-6xl px-6">
            <Card className="rounded-xl border-l-4 border-primary bg-white/90 shadow-sm">
              <CardContent className="flex items-center gap-2 py-4 text-sm">
                {isLoading ? (
                  <>Checking profile…</>
                ) : profile ? (
                  <>
                    Your profile was last updated&nbsp;
                    {new Date(profile.updated_at).toLocaleDateString()} – speak
                    to the mic-bubble to keep refining!
                  </>
                ) : (
                  <>No profile data found.</>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </main>
  );
}
