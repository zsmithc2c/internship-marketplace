"use client";

import { useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";

interface JwtPayload {
  role: string;
  exp: number;
  iat: number;
}

export default function Login() {
  const router = useRouter();
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      try {
        const { role } = jwtDecode<JwtPayload>(data.access);
        if (role === "EMPLOYER") {
          router.push("/employer/dashboard");
        } else {
          router.push("/dashboard");
        }
      } catch {
        router.push("/dashboard");
      }
    } else {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setError(JSON.stringify(data));
      } catch {
        setError(text);   // plain HTML or string
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded border p-6 shadow"
      >
        <h1 className="text-2xl font-semibold text-center">Log in</h1>

        <input
          className="w-full rounded border p-2"
          placeholder="Email"
          type="email"
          value={creds.email}
          onChange={(e) => setCreds({ ...creds, email: e.target.value })}
          required
        />

        <input
          className="w-full rounded border p-2"
          placeholder="Password"
          type="password"
          value={creds.password}
          onChange={(e) => setCreds({ ...creds, password: e.target.value })}
          required
        />

        {error && (
          <p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded bg-black px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Log In
        </button>

        <p className="text-center text-sm">
          Need an account?{" "}
          <a href="/signup" className="underline">
            Sign up
          </a>
        </p>
      </form>
    </main>
  );
}
