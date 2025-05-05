"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "INTERN",
  });
  const [error, setError] = useState("");


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.push("/login");
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
        <h1 className="text-2xl font-semibold text-center">Create account</h1>

        <input
          className="w-full rounded border p-2"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

        <input
          className="w-full rounded border p-2"
          placeholder="Password (min 8 chars)"
          type="password"
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <select
          className="w-full rounded border p-2"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="INTERN">Intern</option>
          <option value="EMPLOYER">Employer</option>
        </select>

        {error && (
          <p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded bg-black px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Sign Up
        </button>

        <p className="text-center text-sm">
          Already have an account?{" "}
          <a href="/login" className="underline">
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}
