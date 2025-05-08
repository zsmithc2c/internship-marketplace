"use client";

import { useProfile } from "@/hooks/useProfile";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, GraduationCap, Clock } from "lucide-react";

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

  /* ---------- render ---------- */
  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-4">
      {/* ——— PROFILE OVERVIEW ——— */}
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            {profile.headline || "—"}
          </CardTitle>
          {location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {location}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* BIO */}
          <section>
            <h2 className="mb-1 font-medium">About</h2>
            <p className="whitespace-pre-wrap leading-relaxed">
              {profile.bio || "—"}
            </p>
          </section>

          {/* AVAILABILITY */}
          <section>
            <h2 className="mb-1 font-medium">Availability</h2>
            {profile.availability ? (
              <p className="flex flex-wrap items-center gap-1 text-sm">
                <Clock className="h-4 w-4" />
                <span className="capitalize">
                  {profile.availability.status.toLowerCase()}
                </span>
                {profile.availability.status === "FROM_DATE" &&
                  profile.availability.earliest_start && (
                    <span>{`from ${profile.availability.earliest_start}`}</span>
                  )}
                {profile.availability.hours_per_week && (
                  <span>{`• ${profile.availability.hours_per_week} hrs/wk`}</span>
                )}
                {profile.availability.remote_ok && <span>• remote OK</span>}
                {profile.availability.onsite_ok && <span>• onsite OK</span>}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </section>

          {/* SKILLS */}
          <section>
            <h2 className="mb-1 font-medium">Skills</h2>
            {profile.skills.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <Badge key={s.name} variant="secondary" className="text-sm">
                    {s.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None added yet.</p>
            )}
          </section>

          {/* EDUCATION */}
          <section>
            <h2 className="mb-1 font-medium">Education</h2>
            {profile.educations.length ? (
              <ul className="space-y-4">
                {profile.educations.map((edu) => (
                  <li
                    key={edu.id}
                    className="relative rounded-lg border p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <GraduationCap className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <div className="space-y-1">
                        <p className="font-medium">{edu.institution}</p>
                        <p className="text-sm text-muted-foreground">
                          {[edu.degree, edu.field_of_study]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {edu.start_date}
                          {` – ${edu.end_date ?? "present"}`}
                          {edu.gpa && ` • GPA ${edu.gpa}`}
                        </p>
                        {edu.description && (
                          <p className="mt-1 whitespace-pre-wrap text-sm">
                            {edu.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No education records yet.
              </p>
            )}
          </section>

          {/* TIMESTAMP */}
          <p className="text-end text-xs text-muted-foreground">
            Last updated {new Date(profile.updated_at).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}