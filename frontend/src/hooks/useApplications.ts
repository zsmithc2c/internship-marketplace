"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Minimal row shown in the “Applicants” list */
export type Application = {
  id: number;
  intern_email: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;

  /* optional submitted materials (list view may omit) */
  cover_letter?: string | null;
  references?: string | null;
  resume_url?: string | null;
};

/** Full application record (detail view) */
export type FullApplication = {
  id: number;
  intern_email: string;
  internship_id: number;               // NEW  ←──────────────
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  cover_letter: string | null;
  references: string | null;           // normalised to string
  resume_url: string | null;
};

/* ------------------------------------------------------------------ */
/*  API calls                                                          */
/* ------------------------------------------------------------------ */

/* GET employer-view list of applications (per internship) */
async function getApplications(listingId: number): Promise<Application[]> {
  const res = await fetchWithAuth(
    `/api/internships/${listingId}/applications/`,
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* GET one full application (employer detail view) */
async function getApplication(id: number): Promise<FullApplication> {
  const res = await fetchWithAuth(`/api/applications/${id}/`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* PATCH employer accept / reject */
async function patchApplication({
  id,
  status,
}: {
  id: number;
  status: "accepted" | "rejected";
}): Promise<Application> {
  const res = await fetchWithAuth(`/api/applications/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ── Intern POST: apply ──────────────────────────────────────────── */
type ApplyPayload = {
  cover_letter?: string;
  references?: string;
  resume_file?: File;
};

async function postApplication({
  listingId,
  data,
}: {
  listingId: number;
  data: ApplyPayload;
}): Promise<Application> {
  /* If a résumé file is present, use FormData; otherwise JSON */
  let body: BodyInit;
  let headers: HeadersInit | undefined;

  if (data.resume_file) {
    const fd = new FormData();
    fd.append("resume", data.resume_file);
    if (data.cover_letter) fd.append("cover_letter", data.cover_letter);
    if (data.references) fd.append("references", data.references);
    body = fd;
    headers = undefined; // browser sets multipart boundary
  } else {
    body = JSON.stringify({
      cover_letter: data.cover_letter,
      references: data.references,
    });
    headers = { "Content-Type": "application/json" };
  }

  const res = await fetchWithAuth(
    `/api/internships/${listingId}/applications/`,
    {
      method: "POST",
      headers,
      body,
    },
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  React-Query hooks                                                  */
/* ------------------------------------------------------------------ */

/** Employer: list all applicants for a given internship */
export function useApplications(listingId: number) {
  return useQuery({
    queryKey: ["applications", listingId],
    queryFn: () => getApplications(listingId),
    enabled: Number.isFinite(listingId),
  });
}

/** Employer: fetch one application in full detail */
export function useApplication(id: number, enabled = true) {
  return useQuery({
    queryKey: ["application", id],
    queryFn: () => getApplication(id),
    enabled: enabled && Number.isFinite(id),
    staleTime: 60_000,
  });
}

/** Employer: update application status */
export function useUpdateApplication(listingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchApplication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications", listingId] });
      qc.invalidateQueries({ queryKey: ["application"] });
    },
  });
}

/** Intern: apply to an internship */
export function useApplyToInternship(listingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplyPayload) => postApplication({ listingId, data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internships", "open"] });
    },
  });
}
