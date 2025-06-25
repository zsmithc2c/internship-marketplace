/* app/employer/applications/[id]/page.tsx */
"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useApplication,
  useUpdateApplication,
} from "@/hooks/useApplications";

export default function ApplicationDetailPage() {
  /* ── route params ─────────────────────────────────────────── */
  const router = useRouter();
  const idParam = useParams()?.id;
  const id = Number(idParam);

  /* ── fetch full record ─────────────────────────────────────── */
  const {
    data: app,
    isLoading,
    error,
  } = useApplication(id, Number.isFinite(id));

  /* ── update status (accept / reject) ───────────────────────── */
  const { mutate: updateStatus, isPending: updating } = useUpdateApplication(
    app?.internship_id ?? 0,
  );

  /* ── quick UI states ───────────────────────────────────────── */
  if (!Number.isFinite(id))
    return <p className="p-6 text-red-600">Invalid application ID.</p>;
  if (isLoading) return <p className="p-6">Loading…</p>;
  if (error || !app)
    return (
      <p className="p-6 text-red-600">{String(error || "Not found.")}</p>
    );

  /* ── helpers ──────────────────────────────────────────────── */
  const handle = (status: "accepted" | "rejected") =>
    updateStatus({ id: app.id, status }, { onSuccess: () => router.back() });

  /** Normalise references -> string[] (split by newlines if API sends a string). */
  const references: string[] =
    Array.isArray(app.references)
      ? app.references
      : app.references
      ? app.references.split(/\r?\n/).filter((s) => s.trim() !== "")
      : [];

  /* ── render ───────────────────────────────────────────────── */
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <Link
        href={`/employer/internships/${app.internship_id}/applications`}
        className="text-sm underline"
      >
        ← Back to list
      </Link>

      <header className="space-y-1">
        <h1 className="break-all text-2xl font-semibold">{app.intern_email}</h1>
        <p className="text-sm text-muted-foreground">
          Submitted {new Date(app.created_at).toLocaleString()}
        </p>
      </header>

      {/* Cover letter */}
      <section>
        <h2 className="font-medium">Cover Letter</h2>
        <div className="whitespace-pre-wrap rounded border bg-white/80 p-4">
          {app.cover_letter || <em>No cover-letter text.</em>}
        </div>
      </section>

      {/* Résumé */}
      <section>
        <h2 className="font-medium">Résumé</h2>
        {app.resume_url ? (
          <a
            href={app.resume_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Download résumé
          </a>
        ) : (
          <em>No file uploaded.</em>
        )}
      </section>

      {/* References */}
      {references.length > 0 && (
        <section>
          <h2 className="font-medium">References</h2>
          <ul className="list-disc pl-6">
            {references.map((ref: string, i: number) => (
              <li key={i}>{ref}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Actions */}
      {app.status === "pending" && (
        <div className="flex gap-3 pt-4">
          <Button
            size="sm"
            onClick={() => handle("accepted")}
            disabled={updating}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handle("rejected")}
            disabled={updating}
          >
            Reject
          </Button>
        </div>
      )}
    </main>
  );
}
