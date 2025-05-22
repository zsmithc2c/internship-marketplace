/* Intern-side profile hooks
   =================================================================== */

   "use client";

   import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
   import { fetchWithAuth } from "@/lib/fetchWithAuth";
   
   /* ------------------------------------------------------------------ *
    *  Types that mimic the DRF serializer                               *
    * ------------------------------------------------------------------ */
   export interface Availability {
     status: "IMMEDIATELY" | "FROM_DATE";
     earliest_start?: string | null;
     remote_ok?: boolean;
     onsite_ok?: boolean;
     hours_per_week?: number | null;
   }
   
   export interface Skill {
     id: number;
     name: string;
   }
   
   export interface Education {
     id: number;
     institution: string;
     degree?: string | null;
     field_of_study?: string | null;
     start_date: string;
     end_date?: string | null;
     gpa?: number | null;
     description?: string | null;
   }
   
   export interface InternProfile {
     id: number;
     avatar_url: string | null;
     headline: string | null;
     bio: string | null;
     city: string | null;
     state: string | null;
     country: string | null;
     availability: Availability | null;
     resume: string | null;             // URL to PDF
     skills: Skill[];
     educations: Education[];
     updated_at: string;
   }
   
   /* ------------------------------------------------------------------ *
    *  API helpers                                                       *
    * ------------------------------------------------------------------ */
   const ENDPOINT = "/api/profile/me/";              // ← correct path
   
   async function fetchProfile(): Promise<InternProfile> {
     const res = await fetchWithAuth(ENDPOINT);
     if (!res.ok) throw new Error(await res.text());
     return res.json();
   }
   
   async function patchProfile(
     data: Partial<InternProfile>,
   ): Promise<InternProfile> {
     const res = await fetchWithAuth(ENDPOINT, {
       method: "PATCH",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(data),
     });
     if (!res.ok) throw new Error(await res.text());
     return res.json();
   }
   
   /* ------------------------------------------------------------------ *
    *  React-Query hooks                                                 *
    * ------------------------------------------------------------------ */
   export function useInternProfile() {
     return useQuery({
       queryKey: ["intern", "profile"],
       queryFn: fetchProfile,
     });
   }
   
   export function useUpdateInternProfile() {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: patchProfile,
       onSuccess: (data) => {
         // keep cache in sync
         qc.setQueryData(["intern", "profile"], data);
       },
     });
   }
   