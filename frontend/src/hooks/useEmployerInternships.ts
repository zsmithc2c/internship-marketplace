"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ------------------------------------------------------------------ */
/*  Type                                                               */
/* ------------------------------------------------------------------ */
export type EmployerInternship = {
  id: number;
  title: string;
  description: string;
  location: string | null;
  is_remote: boolean;
  requirements: string | null;

  /* ── NEW optional application-settings ─────────────────────────── */
  requires_cover_letter?: boolean;
  requires_resume?: boolean;
  requires_references?: boolean;
  external_application_url?: string | null;
  is_open?: boolean;
  /* ──────────────────────────────────────────────────────────────── */

  posted_at: string;
  updated_at: string;
  /** number of applicants returned by the API (may be undefined if not annotated) */
  applications_count?: number;
};

/* ------------------------------------------------------------------ */
/*  API helpers                                                        */
/* ------------------------------------------------------------------ */

async function getMine(): Promise<EmployerInternship[]> {
  const res = await fetchWithAuth("/api/internships?mine=true");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* POST create listing – all new fields are optional */
type NewListingPayload = Omit<
  EmployerInternship,
  "id" | "posted_at" | "updated_at" | "applications_count"
>;
async function postListing(data: NewListingPayload): Promise<EmployerInternship> {
  const res = await fetchWithAuth("/api/internships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* PUT update listing */
type UpdateListingPayload = Omit<
  EmployerInternship,
  "posted_at" | "updated_at" | "applications_count"
>;
async function putListing(data: UpdateListingPayload): Promise<EmployerInternship> {
  const { id, ...fields } = data;
  const res = await fetchWithAuth(`/api/internships/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* DELETE listing */
async function deleteListing(id: number): Promise<void> {
  const res = await fetchWithAuth(`/api/internships/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

/* ------------------------------------------------------------------ */
/*  React-Query hooks                                                  */
/* ------------------------------------------------------------------ */

export function useEmployerInternships() {
  return useQuery({
    queryKey: ["internships", "mine"],
    queryFn: getMine,
  });
}

export function useCreateInternship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postListing,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["internships", "mine"] }),
  });
}

export function useUpdateInternship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: putListing,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["internships", "mine"] }),
  });
}

export function useDeleteInternship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteListing,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["internships", "mine"] }),
  });
}
