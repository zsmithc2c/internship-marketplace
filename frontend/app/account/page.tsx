"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { UserCog, ArrowLeft } from "lucide-react";

/* ---------------- animation helper ---------------- */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-gray-50/60">
      {/* ───── hero ───── */}
      <section className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-[--accent-primary] to-[--accent] px-6 text-center text-white">
        <motion.div
          className="pointer-events-none absolute -left-14 -top-14 size-40 rounded-full bg-white/10 blur-3xl"
          animate={{ y: [0, 10, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10 space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Account&nbsp;Settings</h1>
          <p className="text-sm opacity-90">Manage your Pipeline account</p>
        </div>
      </section>

      {/* ───── content card ───── */}
      <section className="mx-auto -mt-14 max-w-3xl px-6 pb-20">
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Card className="rounded-3xl shadow-lg transition-shadow hover:shadow-xl">
            <CardHeader className="flex items-center gap-3 border-b bg-gradient-to-r from-background to-muted/50 rounded-t-3xl p-6">
              <UserCog className="h-6 w-6 text-[--accent-primary]" />
              <CardTitle className="text-xl font-semibold">Profile &amp; Security</CardTitle>
            </CardHeader>

            <CardContent className="space-y-10 p-8">
              {/* PERSONAL INFO placeholder */}
              <section>
                <h2 className="mb-2 text-lg font-medium text-[--accent-primary]">
                  Personal information
                </h2>
                <p className="text-sm text-muted-foreground">
                  {/* replace with real form later */}
                  Name, email, and contact details will go here.
                </p>
              </section>

              {/* SECURITY placeholder */}
              <section>
                <h2 className="mb-2 text-lg font-medium text-[--accent-primary]">
                  Security
                </h2>
                <p className="text-sm text-muted-foreground">
                  Password, 2-factor auth, connected accounts…
                </p>
              </section>

              {/* NOTIFICATIONS placeholder */}
              <section>
                <h2 className="mb-2 text-lg font-medium text-[--accent-primary]">
                  Notifications
                </h2>
                <p className="text-sm text-muted-foreground">
                  Email / push preferences will live here.
                </p>
              </section>

              {/* BACK LINK */}
              <div className="pt-4">
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "inline-flex items-center gap-1"
                  )}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to dashboard
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </main>
  );
}
