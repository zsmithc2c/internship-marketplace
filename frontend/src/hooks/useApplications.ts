// src/hooks/useApplications.ts
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
  internship_id: number;          // owner internship (for back-link)
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  cover_letter: string | null;
  references: string | null;
  resume_url: string | null;
};

/* ------------------------------------------------------------------ */
/*  API helpers                                                        */
/* ------------------------------------------------------------------ */

/* Employer – list all applications for one internship */
async function getApplications(listingId: number): Promise<Application[]> {
  const res = await fetchWithAuth(
    `/api/internships/${listingId}/applications/`,
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* Employer – fetch one application in full detail */
async function getApplication(id: number): Promise<FullApplication> {
  const res = await fetchWithAuth(`/api/applications/${id}/`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* Employer – accept / reject */
async function patchApplication(params: {
  id: number;
  status: "accepted" | "rejected";
}): Promise<Application> {
  const res = await fetchWithAuth(`/api/applications/${params.id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: params.status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* Intern – create a new application */
type ApplyPayload = {
  cover_letter?: string;
  references?: string;
  resume_file?: File;
};

async function postApplication(opts: {
  listingId: number;
  data: ApplyPayload;
}): Promise<Application> {
  const { listingId, data } = opts;

  /* decide between multipart and json */
  let body: BodyInit;
  let headers: HeadersInit | undefined;

  if (data.resume_file) {
    const fd = new FormData();
    fd.append("resume", data.resume_file);
    if (data.cover_letter) fd.append("cover_letter", data.cover_letter);
    if (data.references) fd.append("references", data.references);
    body = fd;              // browser will add boundary
  } else {
    body = JSON.stringify({
      cover_letter: data.cover_letter,
      references: data.references,
    });
    headers = { "Content-Type": "application/json" };
  }

  const res = await fetchWithAuth(
    `/api/internships/${listingId}/applications/`,
    { method: "POST", body, headers },
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  React-Query hooks                                                  */
/* ------------------------------------------------------------------ */

/** Employer: list applicants for a listing */
export function useApplications(listingId: number) {
  return useQuery({
    queryKey: ["applications", listingId],
    queryFn: () => getApplications(listingId),
    enabled: Number.isFinite(listingId),
  });
}

/** Employer: view one application */
export function useApplication(id: number, enabled = true) {
  return useQuery({
    queryKey: ["application", id],
    queryFn: () => getApplication(id),
    enabled: enabled && Number.isFinite(id),
    staleTime: 60_000,
  });
}

/** Employer: update status */
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
      /* refresh both the open-list feed *and* the detail page */
      qc.invalidateQueries({ queryKey: ["internships", "open"] });
      qc.invalidateQueries({ queryKey: ["internship", listingId] });
    },
  });
}
