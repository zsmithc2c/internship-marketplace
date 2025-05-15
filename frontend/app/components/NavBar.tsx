"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const defaultLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/account", label: "Account" },
  { href: "/profile", label: "Profile" },
  { href: "/internships", label: "Internships" },
];
const employerLinks = [
  { href: "/employer/dashboard", label: "Employer Dashboard" },
  { href: "/employer/profile", label: "Profile" },
  { href: "/employer/internships", label: "Internships" },
  { href: "/employer/account", label: "Account" },
];

export default function NavBar() {
  const path = usePathname();
  const { user } = useAuth();
  const links = user?.role === "EMPLOYER" ? employerLinks : defaultLinks;

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between
                 gap-2 rounded-b-xl border-b border-white/10 bg-neutral-900/60
                 px-6 shadow-sm backdrop-blur-md transition-colors"
    >
      {/* logo / brand */}
      <Link
        href="/dashboard"
        className="text-xl font-semibold tracking-tight text-white"
      >
        Pipeline
      </Link>

      {/* links */}
      <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-neutral-200">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative px-2 py-1 transition-colors hover:text-white",
              path.startsWith(href) && "text-white"
            )}
          >
            {label}
            {path.startsWith(href) && (
              <span
                className={cn(
                  "absolute inset-x-1 -bottom-0.5 h-0.5 rounded",
                  user?.role === "EMPLOYER" ? "bg-[--accent-employer]" : "bg-primary"
                )}
              />
            )}
          </Link>
        ))}
      </nav>
    </header>
  );
}
