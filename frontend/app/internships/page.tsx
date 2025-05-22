"use client";

import Image from "next/image";
import { Building, MapPin } from "lucide-react";
import { useInternships } from "@/hooks/useInternships";

export default function InternshipsPage() {
  /* -------------------------------------------------- */
  /* data                                               */
  /* -------------------------------------------------- */
  const { data: internships, isLoading, error } = useInternships();

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
              <div
                key={it.id}
                className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <h2 className="text-xl font-semibold">{it.title}</h2>

                {/* company + location */}
                <p className="mt-1 flex items-center text-sm text-muted-foreground">
                  {it.employer_logo ? (
                    <Image
                      src={it.employer_logo}
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
              </div>
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
