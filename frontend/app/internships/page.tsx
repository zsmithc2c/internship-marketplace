/* app/internships/page.tsx */
"use client";

import Image from "next/image";
import Link from "next/link";
import { Building, MapPin, BadgeCheck } from "lucide-react";
import { useOpenInternships } from "@/hooks/useOpenInternships";

/* small pill component */
function Pill({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {label}
    </span>
  );
}

export default function InternshipsPage() {
  /* -------------------------------------------------- */
  /* data                                               */
  /* -------------------------------------------------- */
  const {
    data: internships,
    isLoading,
    error,
  } = useOpenInternships({ staleTime: 60_000 });

  /* -------------------------------------------------- */
  /* loading / error states                             */
  /* -------------------------------------------------- */
  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="size-10 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-transparent" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow">
          {(error as Error).message}
        </p>
      </main>
    );
  }

  /* -------------------------------------------------- */
  /* render list                                        */
  /* -------------------------------------------------- */
  return (
    <main className="min-h-screen bg-gray-50/60 pt-14">
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-6 text-3xl font-semibold">Browse Internships</h1>

        {internships && internships.length > 0 ? (
          <div className="space-y-4">
            {internships.map((it) => (
              <Link
                key={it.id}
                href={`/internships/${it.id}`}
                aria-disabled={it.has_applied}
                className={`block rounded-xl border bg-white p-6 shadow-sm transition-shadow focus:outline-none focus:ring-4 focus:ring-emerald-300/40
                  hover:shadow-md
                  ${it.has_applied ? "opacity-60 cursor-default" : ""}`}
              >
                <h2 className="text-xl font-semibold">{it.title}</h2>

                {/* company + location */}
                <p className="mt-1 flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
                  {it.employer_logo_url ? (
                    <Image
                      src={it.employer_logo_url}
                      alt={it.employer_name ?? "Company logo"}
                      width={24}
                      height={24}
                      className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted/50">
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </span>
                  )}
                  <span className="ml-2">{it.employer_name}</span>

                  {it.is_remote ? (
                    <>
                      <span className="mx-2">•</span>Remote
                    </>
                  ) : it.location ? (
                    <>
                      <span className="mx-2">•</span>
                      <MapPin className="mr-1 inline-block h-4 w-4 text-muted-foreground" />
                      {it.location}
                    </>
                  ) : null}
                </p>

                {/* description teaser */}
                <p className="mt-2 text-sm">
                  {it.description.length > 100
                    ? `${it.description.slice(0, 100)}…`
                    : it.description}
                </p>

                {/* requirement flags + applied indicator */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {it.has_applied && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      <BadgeCheck className="h-3 w-3" />
                      Applied
                    </span>
                  )}
                  {it.requires_cover_letter && <Pill label="Cover Letter" />}
                  {it.requires_resume && <Pill label="Resume" />}
                  {it.requires_references && <Pill label="References" />}
                  {it.external_application_url && (
                    <Pill label="External Link" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            No internships available at the moment.
          </p>
        )}
      </section>
    </main>
  );
}
