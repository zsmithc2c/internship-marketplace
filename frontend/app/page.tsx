// frontend/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../src/hooks/useAuth";

export default function Index() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;              // wait until useAuth resolves

    if (user) {
      router.replace("/dashboard");     // already logged in
    } else {
      router.replace("/landing");       // not logged in → public marketing
    }
  }, [isLoading, user, router]);

  /* small placeholder while deciding */
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p>Redirecting…</p>
    </main>
  );
}
