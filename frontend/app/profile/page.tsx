"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { useProfile } from "@/hooks/useProfile";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  MapPin,
  GraduationCap,
  Clock,
  Pencil,
  User as UserIcon,
} from "lucide-react";

/* ---------------- animation helpers ---------------- */
const fadeSlide = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useProfile();

  /* ---------- loading / error states ---------- */
  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="size-10 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-transparent" />
      </main>
    );

  if (error)
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow">
          {(error as Error).message}
        </p>
      </main>
    );

  if (!profile)
    return (
      <main className="grid min-h-screen place-items-center">
        <p>No profile data.</p>
      </main>
    );

  /* ---------- helpers ---------- */
  const location = [profile.city, profile.state, profile.country]
    .filter(Boolean)
    .join(", ");

  /* ---------- render ---------- */
  return (
    <main className="min-h-screen bg-gray-50/60">
      {/* ───── hero header ───── */}
      <section className="relative flex h-56 items-center justify-center overflow-hidden bg-gradient-to-br from-[--accent-primary] to-[--accent] px-6 text-center text-white">
        {/* floating blobs */}
        <motion.div
          className="pointer-events-none absolute -left-16 -top-16 size-44 rounded-full bg-white/10 blur-3xl"
          animate={{ y: [0, 10, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-16 -right-16 size-72 rounded-full bg-white/10 blur-3xl"
          animate={{ y: [0, -8, 8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">My&nbsp;Profile</h1>
          <p className="text-sm opacity-90">
            How employers will see you on&nbsp;Pipeline
          </p>

          {/* edit button styled link */}
          <motion.div whileTap={{ scale: 0.94 }}>
            <Link
              href="/profile/builder"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "inline-flex items-center gap-1.5"
              )}
            >
              <Pencil className="h-4 w-4" />
              Edit in Profile&nbsp;Builder
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ───── profile card ───── */}
      <section className="mx-auto -mt-14 max-w-4xl px-6 pb-20">
        <motion.div variants={fadeSlide} initial="hidden" animate="show">
          <Card className="rounded-3xl shadow-lg transition-shadow hover:shadow-xl">
            <CardHeader className="flex flex-col items-center gap-2 border-b bg-gradient-to-r from-background to-muted/50 rounded-t-3xl p-8 text-center">
              <div className="grid size-24 place-items-center rounded-full bg-muted/50 shadow-inner">
                <UserIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <CardTitle className="mt-2 text-2xl font-semibold tracking-tight">
                {profile.headline || "—"}
              </CardTitle>

              {location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {location}
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-10 p-8">
              {/* —— bio —— */}
              <section>
                <h2 className="mb-2 text-lg font-medium text-[--accent-primary]">
                  About
                </h2>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {profile.bio || "—"}
                </p>
              </section>

              {/* —— availability —— */}
              <section>
                <h2 className="mb-2 text-lg font-medium text-[--accent-primary]">
                  Availability
                </h2>
                {profile.availability ? (
                  <p className="flex flex-wrap items-center gap-2 text-sm">
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

              {/* —— skills —— */}
              <section>
                <h2 className="mb-2 text-lg font-medium text-[--accent-primary]">
                  Skills
                </h2>
                {profile.skills.length ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s) => (
                      <motion.div
                        key={s.name}
                        whileHover={{ scale: 1.08 }}
                        whileFocus={{ scale: 1.08 }}
                      >
                        <Badge
                          variant="secondary"
                          className="text-sm shadow-sm"
                        >
                          {s.name}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No skills added yet.
                  </p>
                )}
              </section>

              {/* —— education —— */}
              <section>
                <h2 className="mb-2 text-lg font-medium text-[--accent-primary]">
                  Education
                </h2>
                {profile.educations.length ? (
                  <ul className="space-y-6">
                    {profile.educations.map((edu) => (
                      <motion.li
                        key={edu.id}
                        whileHover={{
                          y: -2,
                          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                        }}
                        className="rounded-xl border bg-background/60 p-5 transition"
                      >
                        <div className="flex items-start gap-4">
                          <GraduationCap className="mt-1 h-6 w-6 shrink-0 text-[--accent-primary]" />
                          <div className="space-y-1">
                            <p className="text-base font-medium">
                              {edu.institution}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {[edu.degree, edu.field_of_study]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {edu.start_date}
                              {` – ${edu.end_date ?? "present"}`}
                              {edu.gpa && ` • GPA ${edu.gpa}`}
                            </p>
                            {edu.description && (
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                                {edu.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No education records yet.
                  </p>
                )}
              </section>

              {/* —— timestamp —— */}
              <p className="text-right text-xs text-muted-foreground">
                Last updated&nbsp;
                {new Date(profile.updated_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </main>
  );
}
