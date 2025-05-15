"use client";

export default function EmployerHelpPage() {
  return (
    <main className="min-h-screen bg-gray-50/60">
      {/* ───── hero section ───── */}
      <section className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-[--accent-employer] to-[--accent] px-6 text-center text-white">
        <h1 className="text-4xl font-semibold tracking-tight">Help &amp; Support</h1>
      </section>

      {/* ───── content placeholder ───── */}
      <section className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Support documentation is coming soon.
        </p>
      </section>
    </main>
  );
}
