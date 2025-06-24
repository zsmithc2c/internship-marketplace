"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ------------------------------------------------------------------ */
/*  Types — shared across intern-side pages                            */
/* ------------------------------------------------------------------ */
export type Internship = {
  id: number;
  title: string;
  description: string;
  location: string | null;
  is_remote: boolean;
  requirements: string | null;

  /* ── NEW optional application-settings & status ────────────────── */
  requires_cover_letter?: boolean;
  requires_resume?: boolean;
  requires_references?: boolean;
  external_application_url?: string | null;
  is_open?: boolean;
  /* ──────────────────────────────────────────────────────────────── */

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
/*  API calls                                                          */
/* ------------------------------------------------------------------ */

/** GET list of internships (default: open listings). */
async function getAllInternships(): Promise<Internship[]> {
  const res = await fetchWithAuth("/api/internships/");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/** Retrieve internships feed (intern-side). */
export function useInternships() {
  return useQuery({
    queryKey: ["internships", "all"],
    queryFn: getAllInternships,
    staleTime: 60_000, // 1 minute
  });
}
