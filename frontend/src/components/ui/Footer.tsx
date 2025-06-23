/* frontend/app/components/Footer.tsx
   Shared footer for marketing pages & in‑app dashboards.
   Dark background, responsive 3‑column grid, current year auto‑generated. */

import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-gray-900 text-gray-300">
      <div className="mx-auto grid max-w-6xl gap-y-8 px-6 py-12 sm:grid-cols-3">
        {/* Brand column */}
        <div>
          <h3 className="text-lg font-semibold text-white">Pipeline</h3>
          <p className="mt-2 max-w-xs text-sm leading-relaxed">
            AI‑powered internship marketplace linking emerging talent with
            forward‑thinking companies.
          </p>
        </div>

        {/* Navigation column */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-white">Navigation</h4>
          <ul className="mt-2 space-y-1 text-sm">
            {/* Real routes can replace “#” as pages roll out */}
            <li>
              <Link
                href="#"
                className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent-primary]"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent-primary]"
              >
                Privacy
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent-primary]"
              >
                Terms
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent-primary]"
              >
                Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* Call‑to‑action / copyright column */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white">Get started</h4>
          <Link
            href="/signup"
            className="inline-block rounded-md bg-[--accent-primary] px-4 py-2 text-sm font-medium text-white shadow transition-transform hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Sign Up
          </Link>

          <p className="pt-6 text-xs text-gray-400">
            © {year} Pipeline. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
