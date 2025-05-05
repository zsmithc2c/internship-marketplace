"use client";

import { jwtDecode } from "jwt-decode";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface JwtPayload {
  role: string;
  exp: number;
}

const ACCESS_KEY = "access";
const REFRESH_KEY = "refresh";

function saveTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
function getAccess() {
  return localStorage.getItem(ACCESS_KEY);
}

export function useAuth() {
  const router = useRouter();
  const qc = useQueryClient();

  /* ---------- who am I? ---------- */
  const userQ = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => {
      const token = getAccess();
      if (!token) return null;
      try {
        const { role, exp } = jwtDecode<JwtPayload>(token);
        if (Date.now() / 1000 >= exp) throw new Error("expired");
        return { role };
      } catch {
        return null;
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
      router.push("/dashboard");
    },
  });

  /* ---------- logout ---------- */
  function logout() {
    clearTokens();
    qc.invalidateQueries({ queryKey: ["auth", "me"] });
    router.push("/login");
  }

  return {
    isLoading: userQ.isLoading,
    user: userQ.data,         // null | { role: string }
    login: login.mutateAsync, // call await login({ … })
    loginError: login.error as Error | null,
    logout,
  };
}
