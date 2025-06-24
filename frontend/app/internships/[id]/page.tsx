"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Building,
  MapPin,
  UploadCloud,
  Send,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// @ts-expect-error — ensure the hook exists at this path
import { useInternship } from "@/hooks/useInternship";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useAuth } from "@/hooks/useAuth";

/* ── helper components ─────────────────────────────── */
function Pill({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {label}
    </span>
  );
}
function ErrorNote({ err }: { err: unknown }) {
  return (
    <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
      {(err as Error).message}
    </p>
  );
}

/* ───────────────────────────────────────────────────── */
export default function InternshipDetailPage() {
  const params = useParams();
  const id = Number(params?.id ?? 0);

  /* -------- fetch listing data -------- */
  const {
    data: job,
    isLoading,
    error,
  } = useInternship(id, { enabled: id > 0 });

  /* -------- auth for email prefilling -------- */
  const { user } = useAuth();

  /* -------- form state -------- */
  const [email, setEmail] = useState(
    (user as { email?: string })?.email ?? "",
  );
  const [cover, setCover] = useState("");
  const [refs, setRefs] = useState("");
  const resumeRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);
  const [submitted, setSubmitted] = useState(false);

  /* -------- prefill from agent draft -------- */
  useEffect(() => {
    const onDraft = (e: Event) => {
      const d = (e as CustomEvent<Record<string, unknown>>).detail ?? {};
      if (typeof d.cover_letter === "string") setCover(d.cover_letter);
      if (typeof d.references === "string") setRefs(d.references);
    };
    window.addEventListener("application-draft", onDraft as EventListener);
    return () =>
      window.removeEventListener(
        "application-draft",
        onDraft as EventListener,
      );
  }, []);

  /* -------- submit handler -------- */
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setSubmitError(null);
    setSubmitting(true);
    setSubmitted(false);
    try {
      const form = new FormData();
      form.append("email", email);
      if (cover) form.append("cover_letter", cover);
      if (refs) form.append("references", refs);
      if (resumeRef.current?.files?.[0]) {
        form.append("resume", resumeRef.current.files[0]);
      }
      const res = await fetchWithAuth(
        `/api/internships/${job.id}/applications/`,
        { method: "POST", body: form },
      );
      if (!res.ok) throw new Error(await res.text());
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err as Error);
    } finally {
      setSubmitting(false);
    }
  };

  /* -------- loading / error -------- */
  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="size-10 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-transparent" />
      </main>
    );
  }
  if (error || !job) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <ErrorNote err={error ?? new Error("Listing not found")} />
      </main>
    );
  }

  /* -------- UI -------- */
  const {
    title,
    description,
    employer_name,
    employer_logo_url,
    location,
    is_remote,
    requires_cover_letter,
    requires_resume,
    requires_references,
    external_application_url,
  } = job;

  return (
    <main className="min-h-screen bg-gray-50/60 pt-14">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold">{title}</h1>

        {/* company & location */}
        <p className="mt-2 flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
          {employer_logo_url ? (
            <Image
              src={employer_logo_url}
              alt={employer_name ?? "Company logo"}
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/50">
              <Building className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
          <span className="ml-2">{employer_name}</span>
          {is_remote ? (
            <>
              <span className="mx-2">•</span>Remote
            </>
          ) : location ? (
            <>
              <span className="mx-2">•</span>
              <MapPin className="mr-1 inline-block h-4 w-4 text-muted-foreground" />
              {location}
            </>
          ) : null}
        </p>

        {/* requirement pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          {requires_cover_letter && <Pill label="Cover Letter" />}
          {requires_resume && <Pill label="Resume" />}
          {requires_references && <Pill label="References" />}
          {external_application_url && <Pill label="External Link" />}
        </div>

        {/* description */}
        <article className="prose prose-sm mt-6 whitespace-pre-wrap">
          {description}
        </article>

        {/* application section */}
        <div className="mt-10 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Apply Now</h2>

          {external_application_url ? (
            <a
              href={external_application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300/40"
            >
              Apply on Company Site
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : submitted ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Application submitted! We’ll notify you when the employer responds.
            </p>
          ) : (
            <form onSubmit={send} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {requires_cover_letter && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Cover Letter
                  </label>
                  <textarea
                    rows={6}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={cover}
                    onChange={(e) => setCover(e.target.value)}
                    required
                  />
                </div>
              )}

              {requires_resume && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Resume (PDF)
                  </label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    ref={resumeRef}
                    required
                  />
                </div>
              )}

              {requires_references && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    References
                  </label>
                  <textarea
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={refs}
                    onChange={(e) => setRefs(e.target.value)}
                    required
                  />
                </div>
              )}

              {submitError && <ErrorNote err={submitError} />}

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit Application"}
                {requires_resume ? (
                  <UploadCloud className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
