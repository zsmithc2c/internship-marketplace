"use client";

import { jwtDecode } from "jwt-decode";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  getAccess,
  refreshTokens,
  saveTokens,
  clearTokens,
} from "@/lib/auth";

interface JwtPayload {
  role: string;
  exp: number; // seconds since epoch
}

export function useAuth() {
  const router = useRouter();
  const qc = useQueryClient();

  /* ---------- who am I? ---------- */
  const userQ = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      let token = getAccess();
      if (!token) return null;

      try {
        const { role, exp } = jwtDecode<JwtPayload>(token);

        // expired? → try one silent refresh
        if (Date.now() / 1000 >= exp) {
          token = await refreshTokens();
          const { role: newRole } = jwtDecode<JwtPayload>(token);
          return { role: newRole };
        }

        return { role };
      } catch {
        return null; // corrupt token, not logged in
      }
    },
    staleTime: Infinity,
  });

  /* ---------- login ---------- */
  const login = useMutation({
    mutationFn: async (cred: { email: string; password: string }) => {
      const res = await fetch("/api/auth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cred),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      return res.json() as Promise<{ access: string; refresh: string }>;
    },
    onSuccess: ({ access, refresh }) => {
      saveTokens(access, refresh);
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      try {
        const { role } = jwtDecode<JwtPayload>(access);
        if (role === "EMPLOYER") {
          router.push("/employer/dashboard");
        } else {
          router.push("/dashboard");
        }
      } catch {
        router.push("/dashboard");
      }
    },
  });

  /* ---------- logout ---------- */
  function logout() {
    clearTokens();
    qc.invalidateQueries({ queryKey: ["auth", "me"] });
    router.push("/login");
  }

  /* ---------- exported API ---------- */
  return {
    isLoading: userQ.isLoading,
    user: userQ.data,           // null | { role: string }
    login: login.mutateAsync,   // await login({ … })
    loginError: login.error as Error | null,
    logout,
  };
}
