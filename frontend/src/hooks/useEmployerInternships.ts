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

async function postListing(
  data: Omit<
    EmployerInternship,
    | "id"
    | "posted_at"
    | "updated_at"
    | "applications_count"
  >
): Promise<EmployerInternship> {
  const res = await fetchWithAuth("/api/internships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function patchListing({
  id,
  data,
}: {
  id: number;
  data: Partial<EmployerInternship>;
}): Promise<EmployerInternship> {
  const res = await fetchWithAuth(`/api/internships/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function deleteListing(id: number): Promise<void> {
  const res = await fetchWithAuth(`/api/internships/${id}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["internships", "mine"] }),
  });
}

export function useUpdateInternship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchListing,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["internships", "mine"] }),
  });
}

export function useDeleteInternship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteListing,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["internships", "mine"] }),
  });
}
