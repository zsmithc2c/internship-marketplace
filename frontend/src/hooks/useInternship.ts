// frontend/src/hooks/useInternship.ts
"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ------------------------------------------------------------------ */
/*  Types — shared across intern-side pages                           */
/* ------------------------------------------------------------------ */
export type Internship = {
  id: number;
  title: string;
  description: string;
  location: string | null;
  is_remote: boolean;
  requirements: string | null;

  /* ── NEW optional application-settings & status ─────────────────── */
  requires_cover_letter?: boolean;
  requires_resume?: boolean;
  requires_references?: boolean;
  external_application_url?: string | null;
  is_open?: boolean;
  /* ---------------------------------------------------------------- */

  posted_at: string;
  updated_at: string;

  /* employer helpers */
  employer_name: string;
  employer_logo_url: string | null;

  /* derived flags / counters */
  applications_count?: number;
  has_applied?: boolean;
};

/* ------------------------------------------------------------------ */
/*  API helpers                                                       */
/* ------------------------------------------------------------------ */

/** GET list of internships (default: all open listings). */
async function getAllInternships(): Promise<Internship[]> {
  const res = await fetchWithAuth("/api/internships/");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** GET a single internship by id. */
async function getInternship(id: number): Promise<Internship> {
  const res = await fetchWithAuth(`/api/internships/${id}/`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                             */
/* ------------------------------------------------------------------ */

/** Retrieve internships feed (intern-side). */
export function useInternships(options: Partial<UseQueryOptions<Internship[]>> = {}) {
  return useQuery<Internship[]>({
    queryKey: ["internships", "all"],
    queryFn: getAllInternships,
    staleTime: 60_000, // 1 minute
    ...options,
  });
}

/**
 * Retrieve ONE internship (detail page).
 *
 * @param id       primary-key from the URL
 * @param options  React-Query overrides – e.g. `{ enabled:false }`
 */
export function useInternship(
  id: number,
  options: Partial<UseQueryOptions<Internship>> = {},
) {
  return useQuery<Internship>({
    queryKey: ["internship", id],
    queryFn: () => getInternship(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 60_000, // 1 minute
    ...options,
  });
}
