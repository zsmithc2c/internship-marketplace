"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useApplications,
  useUpdateApplication,
} from "@/hooks/useApplications";

export default function ApplicationsPage() {
  /* ----------- routing ----------- */
  const params = useParams();
  const router = useRouter();
  const internshipId = Number(params?.id ?? 0);
  const idIsValid = Number.isFinite(internshipId) && internshipId > 0;

  /* redirect if id is invalid (run after first render) */
  useEffect(() => {
    if (!idIsValid) router.push("/employer/internships");
  }, [idIsValid, router]);

  /* -------- data hooks ----------- */
  const {
    data: apps,
    isLoading,
    error,
  } = useApplications(idIsValid ? internshipId : 0);
  
  const {
    mutate: updateApp,
    error: updateError,
  } = useUpdateApplication(internshipId);

  /* if ID invalid just render nothing (redirect handled above) */
  if (!idIsValid) return null;

  /* --------- render -------------- */
  return (
    <main className="min-h-screen bg-gray-50/60 pt-14">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-6 text-2xl font-semibold">
          Applicants for Internship #{internshipId}
        </h1>

        <p className="mb-4">
          <Link
            href="/employer/internships"
            className="text-sm text-primary underline"
          >
            ← Back to My Listings
          </Link>
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Applicant</th>
                <th className="py-2 text-left font-medium">Status</th>
                <th className="py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">
                    Loading applications…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-red-600">
                    {(error as Error).message}
                  </td>
                </tr>
              ) : apps && apps.length ? (
                apps.map((app) => (
                  <tr key={app.id} className="border-b">
                    <td className="py-2">{app.intern_email}</td>
                    <td className="py-2 capitalize">{app.status}</td>
                    <td className="py-2">
                      {app.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateApp({ id: app.id, status: "accepted" })
                            }
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="ml-2 text-red-600"
                            onClick={() =>
                              updateApp({ id: app.id, status: "rejected" })
                            }
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <em className="text-xs text-muted-foreground">
                          No actions
                        </em>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">
                    No applications yet.
                  </td>
                </tr>
              )}
              {updateError && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-red-600">
                    {(updateError as Error).message}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
