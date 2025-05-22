"use client";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import type { Internship } from "@/hooks/useInternships";

/** Fetch all open internships (status=open). */
async function getOpenInternships(): Promise<Internship[]> {
  const res = await fetchWithAuth("/api/internships?status=open");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Hook to retrieve currently open internships (for intern dashboard metrics/feed). */
export function useOpenInternships(options: Partial<UseQueryOptions<Internship[]>> = {}) {
  return useQuery<Internship[]>({
    queryKey: ["internships", "open"],
    queryFn: getOpenInternships,
    staleTime: 60_000,
    ...options,
  });
}
