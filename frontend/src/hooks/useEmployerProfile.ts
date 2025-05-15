"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* -------------------- types -------------------- */
export type EmployerProfile = {
  id: number;
  company_name: string;
  logo: string | null;
  mission: string;
  location: string;
  website: string;
};

/* ------------------ API calls ------------------ */
async function getEmployerProfile(): Promise<EmployerProfile> {
  const res = await fetchWithAuth("/api/employer/me");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putEmployerProfile(data: Partial<EmployerProfile>): Promise<EmployerProfile> {
  const res = await fetchWithAuth("/api/employer/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* -------------------- hooks -------------------- */
export function useEmployerProfile() {
  return useQuery({
    queryKey: ["employer", "me"],
    queryFn: getEmployerProfile,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useUpdateEmployerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: putEmployerProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employer", "me"] });
    },
  });
}
