// frontend/src/hooks/useEmployerProfile.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
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

async function putEmployerProfile(
  data: Partial<EmployerProfile>,
): Promise<EmployerProfile> {
  const res = await fetchWithAuth("/api/employer/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* -------------------- hooks -------------------- */

/**
 * Fetch the logged-in employer’s profile.
 *
 * @param options Optional React-Query options — pass `{ enabled: false }`
 *                if you want to disable the query for non-employer users.
 */
export function useEmployerProfile(
  options: Partial<UseQueryOptions<EmployerProfile>> = {},
) {
  return useQuery<EmployerProfile>({
    queryKey: ["employer", "me"],
    queryFn: getEmployerProfile,
    staleTime: 60_000, // 1 minute
    ...options,        // allow caller overrides (enabled, staleTime, etc.)
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
