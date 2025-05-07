// frontend/app/profile/page.tsx
"use client";

import { useProfile } from "@/hooks/useProfile";

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useProfile();

  /* ---------- loading / error ---------- */
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading profile…</p>
      </main>
    );
  }
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="rounded bg-red-100 p-3 text-red-700">
          {(error as Error).message}
        </p>
      </main>
    );
  }
  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>No profile data.</p>
      </main>
    );
  }

  /* ---------- helpers ---------- */
  const location = [profile.city, profile.state, profile.country]
    .filter(Boolean)
    .join(", ");
  const avail = profile.availability ?? null;

  /* ---------- render ---------- */
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6 rounded border p-6 shadow">
        {/* HEADLINE & BIO */}
        <section>
          <h1 className="text-2xl font-semibold">
            {profile.headline || "—"}
          </h1>
          <p className="mt-2 whitespace-pre-wrap">{profile.bio || "—"}</p>
        </section>

        {/* LOCATION & AVAILABILITY */}
        <section className="text-sm space-y-1">
          <p>
            <span className="font-medium">Location:</span>{" "}
            {location || "—"}
          </p>
          <p>
            <span className="font-medium">Availability:</span>{" "}
            {avail ? (
              <>
                {avail.status}
                {avail.status === "FROM_DATE" &&
                  avail.earliest_start &&
                  ` from ${avail.earliest_start}`}
                {avail.hours_per_week &&
                  ` • ${avail.hours_per_week} hrs/wk`}
                {avail.remote_ok && " • remote OK"}
                {avail.onsite_ok && " • onsite OK"}
              </>
            ) : (
              "—"
            )}
          </p>
        </section>

        {/* SKILLS */}
        <section>
          <h2 className="font-medium">Skills</h2>
          {profile.skills.length ? (
            <ul className="ml-4 list-disc">
              {profile.skills.map((s) => (
                <li key={s.name}>{s.name}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">None added yet.</p>
          )}
        </section>

        {/* EDUCATION */}
        <section>
          <h2 className="font-medium">Education</h2>
          {profile.educations.length ? (
            <ul className="space-y-3">
              {profile.educations.map((edu) => (
                <li key={edu.id} className="rounded bg-gray-50 p-3 text-sm">
                  <p className="font-medium">{edu.institution}</p>
                  <p className="text-gray-700">
                    {[edu.degree, edu.field_of_study]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                  <p className="text-gray-500">
                    {edu.start_date}
                    {edu.end_date ? ` – ${edu.end_date}` : " – present"}
                    {edu.gpa && ` • GPA ${edu.gpa}`}
                  </p>
                  {edu.description && (
                    <p className="mt-1 whitespace-pre-wrap">
                      {edu.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No education records yet.
            </p>
          )}
        </section>

        {/* TIMESTAMP */}
        <p className="text-xs text-right text-gray-400">
          Last updated&nbsp;
          {new Date(profile.updated_at).toLocaleString()}
        </p>
      </div>
    </main>
  );
}
