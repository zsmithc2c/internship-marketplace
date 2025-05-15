"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { Internship } from "@/hooks/useInternships";

/* ------------------ API calls ------------------ */
async function getMyInternships(): Promise<Internship[]> {
  const res = await fetchWithAuth("/api/internships?mine=true");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postInternship(data: Omit<Internship, "id" | "posted_at" | "updated_at" | "employer_name" | "employer_logo">): Promise<Internship> {
  const res = await fetchWithAuth("/api/internships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* -------------------- hooks -------------------- */
export function useEmployerInternships() {
  return useQuery({
    queryKey: ["internships", "mine"],
    queryFn: getMyInternships,
  });
}

export function useCreateInternship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postInternship,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internships", "mine"] });
    },
  });
}
