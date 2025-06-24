"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export type Application = {
  id: number;
  intern_email: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;

  /* ── NEW optional submitted materials ──────────────────────────── */
  cover_letter?: string | null;
  references?: string | null;
  resume_url?: string | null;
  /* ──────────────────────────────────────────────────────────────── */
};

/* ------------------------------------------------------------------ */
/*  API calls                                                          */
/* ------------------------------------------------------------------ */

/* GET employer-view list of applications */
async function getApplications(listingId: number): Promise<Application[]> {
  const res = await fetchWithAuth(`/api/internships/${listingId}/applications/`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* PATCH employer accept/reject */
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

/* ── NEW: POST intern apply ─────────────────────────────────────── */
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
  /* If a resume file is present, use FormData; otherwise JSON */
  let body: BodyInit;
  let headers: HeadersInit | undefined;

  if (data.resume_file) {
    const fd = new FormData();
    fd.append("resume", data.resume_file);
    if (data.cover_letter) fd.append("cover_letter", data.cover_letter);
    if (data.references) fd.append("references", data.references);
    body = fd;
    headers = undefined; // browser sets multipart headers
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
    }
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
  });
}

/** Employer: update status (accept / reject) */
export function useUpdateApplication(listingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchApplication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications", listingId] });
    },
  });
}

/** Intern: apply to an internship */
export function useApplyToInternship(listingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplyPayload) => postApplication({ listingId, data }),
    onSuccess: () => {
      /* On success, refetch listing so has_applied flag / count update */
      qc.invalidateQueries({ queryKey: ["internships", "open"] });
    },
  });
}
