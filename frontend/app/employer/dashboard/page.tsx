"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase, FilePlus, UserCog, LifeBuoy } from "lucide-react";

export default function EmployerDashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  const tiles = [
    {
      href: "/employer/internships",
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
      href: "/employer/account",
      icon: <UserCog className="h-6 w-6" />,
      title: "Account",
      desc: "Update your account settings.",
    },
    {
      href: "/employer/help",
      icon: <LifeBuoy className="h-6 w-6" />,
      title: "Help",
      desc: "Get support or learn more.",
    },
  ];

  return (
    <main className="pt-14">
      {/* ───── Hero banner ───── */}
      <section className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-[--accent-employer] to-[--accent] px-6 text-center text-white">
        <div className="relative z-10 space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            Welcome back{role ? `, ${role.toLowerCase()}!` : "!"}
          </h1>
          <p className="text-sm opacity-90">
            Start managing your internships and company profile
          </p>
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
