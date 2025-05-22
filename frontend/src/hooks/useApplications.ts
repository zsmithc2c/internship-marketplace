"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* -------------------- Types -------------------- */
export type Application = {
  id: number;
  intern_email: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

/* ------------------ API calls ------------------ */
async function getApplications(listingId: number): Promise<Application[]> {
  const res = await fetchWithAuth(`/api/internships/${listingId}/applications/`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

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

/* -------------------- Hooks -------------------- */
export function useApplications(listingId: number) {
  return useQuery({
    queryKey: ["applications", listingId],
    queryFn: () => getApplications(listingId),
  });
}

export function useUpdateApplication(listingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchApplication,
    onSuccess: () => {
      // Refresh the applications list after an update
      qc.invalidateQueries({ queryKey: ["applications", listingId] });
    },
  });
}
