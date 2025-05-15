"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* -------------------- types -------------------- */
export type Internship = {
  id: number;
  title: string;
  description: string;
  location: string;
  is_remote: boolean;
  requirements: string;
  posted_at: string;
  updated_at: string;
  employer_name: string;
  employer_logo: string | null;
};

/* ------------------ API calls ------------------ */
async function getAllInternships(): Promise<Internship[]> {
  const res = await fetchWithAuth("/api/internships/");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* -------------------- hook -------------------- */
export function useInternships() {
  return useQuery({
    queryKey: ["internships", "all"],
    queryFn: getAllInternships,
    staleTime: 60 * 1000, // 1 minute
  });
}
