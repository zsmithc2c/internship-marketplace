"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

/* ------------------------------------------------------------------ */
/*  Per-role link sets                                                */
/* ------------------------------------------------------------------ */
const internLinks = [
  { href: "/dashboard",     label: "Dashboard"    },
  { href: "/profile",       label: "Profile"      },
  { href: "/account",       label: "Account"      },
  { href: "/internships",   label: "Internships"  },   // public list
];

const employerLinks = [
  { href: "/employer/dashboard",   label: "Employer Dashboard" },
  { href: "/employer/profile",     label: "Profile"            },
  { href: "/employer/internships", label: "Internships"        },
  { href: "/employer/account",     label: "Account"            },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function NavBar() {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();              // { role: "EMPLOYER" | "INTERN" | … }

  const isEmployer = user?.role === "EMPLOYER";

  const links   = isEmployer ? employerLinks : internLinks;
  const accent  = isEmployer ? "bg-[--accent-employer]" : "bg-primary";
  const homeURL = isEmployer ? "/employer/dashboard" : "/dashboard";

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between
                 gap-2 rounded-b-xl border-b border-white/10 bg-neutral-900/60
                 px-6 shadow-sm backdrop-blur-md"
    >
      {/* logo / brand */}
      <Link href={homeURL} className="text-xl font-semibold tracking-tight text-white">
        Pipeline
      </Link>

      {/* nav links */}
      <nav className="hidden items-center gap-4 text-sm font-medium text-neutral-200 md:flex">
        {links.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative px-2 py-1 transition-colors hover:text-white",
                active && "text-white",
              )}
            >
              {label}
              {active && (
                <span
                  className={`absolute inset-x-1 -bottom-0.5 h-0.5 rounded ${accent}`}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
