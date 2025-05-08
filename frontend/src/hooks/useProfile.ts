"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";   // ⬅️ UPDATED

/* ------------------------------------------------------------ */
/*                           types                              */
/* ------------------------------------------------------------ */

export type Availability = {
  status: "IMMEDIATELY" | "FROM_DATE" | "UNAVAILABLE";
  earliest_start?: string;      // YYYY-MM-DD
  hours_per_week?: number;
  remote_ok: boolean;
  onsite_ok: boolean;
};

export type Education = {
  id?: number;
  institution: string;
  degree?: string;
  field_of_study?: string;
  start_date: string;           // YYYY-MM-DD
  end_date?: string;
  gpa?: number;
  description?: string;
};

export type Profile = {
  id: number;
  headline: string;
  bio: string;
  city: string;
  state?: string;
  country: string;
  availability: Availability;
  skills: { id?: number; name: string }[];
  educations: Education[];
  updated_at: string;
};

/* ------------------------------------------------------------ */
/*                     helper functions                         */
/* ------------------------------------------------------------ */

async function getProfile(): Promise<Profile> {
  const res = await fetchWithAuth("/api/profile/me");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putProfile(data: Partial<Profile>): Promise<Profile> {
  const res = await fetchWithAuth("/api/profile/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ------------------------------------------------------------ */
/*                      exported hooks                          */
/* ------------------------------------------------------------ */

export function useProfile() {
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: getProfile,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: putProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", "me"] }),
  });
}
