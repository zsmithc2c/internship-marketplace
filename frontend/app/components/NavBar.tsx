"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

/* ------------------------------------------------------------------ */
/*  Link sets for each role                                           */
/* ------------------------------------------------------------------ */
const internLinks = [
  { href: "/dashboard",   label: "Dashboard"  },
  { href: "/profile",     label: "Profile"    },
  { href: "/account",     label: "Account"    },
  { href: "/internships", label: "Internships"},
];

const employerLinks = [
  { href: "/employer/dashboard",   label: "Dashboard"   },
  { href: "/employer/profile",     label: "Profile"     },
  { href: "/employer/internships", label: "Internships" },
  { href: "/employer/account",     label: "Account"     },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function NavBar() {
  const pathname = usePathname() ?? "/";
  const { user }  = useAuth();           // { role?: "EMPLOYER" | "INTERN" | ... }

  /* ----------------------------------------------------------------
     We normalise the role string to guard against any casing issues
     coming from the backend or localStorage (“Employer”, “employer”).
  ---------------------------------------------------------------- */
  const role = user?.role?.toString().toUpperCase() ?? null;
  const isEmployer = role === "EMPLOYER";

  /*  Fallback:  if we don't have user info yet (first render)        *
   *  infer role from the current URL – avoids “jumping” menus.       */
  const isEmployerPath = pathname.startsWith("/employer");
  const finalIsEmployer = isEmployer || (!role && isEmployerPath);

  const links   = finalIsEmployer ? employerLinks : internLinks;
  const accent  = finalIsEmployer ? "bg-[--accent-employer]" : "bg-primary";
  const homeURL = finalIsEmployer ? "/employer/dashboard" : "/dashboard";

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between
                 gap-2 border-b border-white/10 bg-neutral-900/60
                 px-6 shadow-sm backdrop-blur-md"
    >
      {/* Brand / logo */}
      <Link
        href={homeURL}
        className="text-xl font-semibold tracking-tight text-white"
      >
        Pipeline
      </Link>

      {/* Nav links */}
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
