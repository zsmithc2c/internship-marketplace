"use client";

import { Building, MapPin } from "lucide-react";
import { useInternships } from "@/hooks/useInternships";

export default function InternshipsPage() {
  const { data: internships, isLoading, error } = useInternships();

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

  return (
    <main className="min-h-screen bg-gray-50/60 pt-14">
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-6 text-3xl font-semibold">Browse Internships</h1>
        {internships && internships.length > 0 ? (
          <div className="space-y-4">
            {internships.map((internship) => (
              <div
                key={internship.id}
                className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <h2 className="text-xl font-semibold">{internship.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground flex items-center">
                  {internship.employer_logo ? (
                    <img
                      src={internship.employer_logo}
                      alt={internship.employer_name}
                      className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-muted/50 flex-shrink-0 flex items-center justify-center">
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="ml-2">{internship.employer_name}</span>
                  {internship.is_remote ? (
                    <>
                      <span className="mx-2">•</span>Remote
                    </>
                  ) : internship.location ? (
                    <>
                      <span className="mx-2">•</span>
                      <MapPin className="mr-1 inline-block h-4 w-4 text-muted-foreground" />
                      {internship.location}
                    </>
                  ) : null}
                </p>
                <p className="mt-2 text-sm">
                  {internship.description.length > 100
                    ? internship.description.slice(0, 100) + "..."
                    : internship.description}
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
