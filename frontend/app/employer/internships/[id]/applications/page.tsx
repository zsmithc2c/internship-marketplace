"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useApplications,
  useUpdateApplication,
} from "@/hooks/useApplications";

// green accent style for Accept buttons
const accentBtn = "bg-emerald-500 hover:bg-emerald-600 text-white";

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

  /* -------- detail viewer ---------- */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = apps?.find((a) => a.id === selectedId) ?? null;
  const closeDetail = () => setSelectedId(null);

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
                    <td className="py-2 space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedId(app.id)}
                      >
                        View
                      </Button>
                      {app.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            className={accentBtn}
                            onClick={() =>
                              updateApp({ id: app.id, status: "accepted" })
                            }
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-red-600"
                            onClick={() =>
                              updateApp({ id: app.id, status: "rejected" })
                            }
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <em className="text-xs text-muted-foreground">No actions</em>
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

      {/* ─────────── Detail Modal ─────────── */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">Application Details</h2>

            <p className="mb-2 text-sm text-muted-foreground">
              <strong>Applicant:</strong> {selected.intern_email}
            </p>

            {/* resume */}
            {selected.resume_url ? (
              <p className="mb-4 text-sm">
                <strong>Resume:</strong>{" "}
                <a
                  href={selected.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Download
                </a>
              </p>
            ) : null}

            {/* cover letter */}
            {selected.cover_letter && (
              <div className="mb-6">
                <h3 className="mb-1 font-medium">Cover Letter</h3>
                <p className="whitespace-pre-wrap rounded-md border bg-gray-50 p-3 text-sm">
                  {selected.cover_letter}
                </p>
              </div>
            )}

            {/* references */}
            {selected.references && (
              <div className="mb-6">
                <h3 className="mb-1 font-medium">References</h3>
                <p className="whitespace-pre-wrap rounded-md border bg-gray-50 p-3 text-sm">
                  {selected.references}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              {selected.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    className={accentBtn}
                    onClick={() => {
                      updateApp({ id: selected.id, status: "accepted" });
                      closeDetail();
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-red-600"
                    onClick={() => {
                      updateApp({ id: selected.id, status: "rejected" });
                      closeDetail();
                    }}
                  >
                    Reject
                  </Button>
                </>
              )}
              <Button variant="secondary" size="sm" onClick={closeDetail}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
