"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard",   label: "Dashboard" },
  { href: "/account",     label: "Account"   },
  { href: "/profile",     label: "Profile"   },
  { href: "/internships", label: "Internships" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 bg-gray-900 shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        {/* --- left links --- */}
        <nav className="flex items-center gap-8">
          {navLinks.slice(0, 2).map(({ href, label }) => (
            <NavItem key={href} href={href} label={label} active={pathname === href} />
          ))}
        </nav>

        {/* --- brand --- */}
        <Link
          href="/dashboard"
          className="select-none text-xl font-semibold tracking-wide text-white"
        >
          Pipeline
        </Link>

        {/* --- right links --- */}
        <nav className="flex items-center gap-8">
          {navLinks.slice(2).map(({ href, label }) => (
            <NavItem key={href} href={href} label={label} active={pathname === href} />
          ))}
        </nav>
      </div>
    </header>
  );
}

/* --------- helper ---------- */
function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        active
          ? "text-white border-b-2 border-white pb-1"
          : "text-gray-300 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
