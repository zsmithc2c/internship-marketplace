// frontend/src/hooks/useEmployerProfile.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

/* ------------------------------------------------------------------ */
/*                                 Types                              */
/* ------------------------------------------------------------------ */
export type EmployerProfile = {
  id: number;
  company_name: string;
  logo: string | null;          // URL or null
  mission: string;
  location: string;
  website: string;
};

type SavePayload = FormData | Partial<EmployerProfile>;

/* ------------------------------------------------------------------ */
/*                           API helpers                              */
/* ------------------------------------------------------------------ */
async function getEmployerProfile(): Promise<EmployerProfile> {
  const res = await fetchWithAuth("/api/employer/me");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putEmployerProfile(payload: SavePayload): Promise<EmployerProfile> {
  const isFormData = payload instanceof FormData;

  const res = await fetchWithAuth("/api/employer/me", {
    method: "PUT",
    body: isFormData ? payload : JSON.stringify(payload),
    // Let the browser set the boundary for multipart; otherwise use JSON header
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ------------------------------------------------------------------ */
/*                               Hooks                                */
/* ------------------------------------------------------------------ */

/**
 * Fetch the logged-in employer profile.
 *
 * @param options React-Query overrides (e.g. `{ enabled:false }` for interns)
 */
export function useEmployerProfile(
  options: Partial<UseQueryOptions<EmployerProfile>> = {},
) {
  return useQuery<EmployerProfile>({
    queryKey: ["employer", "me"],
    queryFn: getEmployerProfile,
    staleTime: 60_000, // 1 min
    ...options,
  });
}

/**
 * Save (create/update) the employer profile.
 * Accepts either a JSON patch or a multipart FormData payload.
 */
export function useUpdateEmployerProfile() {
  const qc = useQueryClient();
  return useMutation<EmployerProfile, Error, SavePayload>({
    mutationFn: putEmployerProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employer", "me"] });
    },
  });
}
