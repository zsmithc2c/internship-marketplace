"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";

interface JwtPayload {
  role: string;
  exp: number;
  iat: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      setRole(decoded.role);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  if (!role) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-semibold">
          Welcome, <span className="capitalize">{role.toLowerCase()}</span>!
        </h1>
        <button
          className="rounded bg-gray-800 px-4 py-2 text-white"
          onClick={() => {
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
            router.push("/login");
          }}
        >
          Log out
        </button>
      </div>
    </main>
  );
}
