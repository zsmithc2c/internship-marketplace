"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Building } from "lucide-react";
import {
  useEmployerProfile,
  useUpdateEmployerProfile,
} from "@/hooks/useEmployerProfile";

export default function EmployerProfilePage() {
  const { data: employer, isLoading, error } = useEmployerProfile();
  const updateProfile = useUpdateEmployerProfile();

  /* ───── local form state ───── */
  const [formData, setFormData] = useState({
    company_name: "",
    mission: "",
    location: "",
    website: "",
  });

  /* ───── populate form once data arrives ───── */
  useEffect(() => {
    if (employer) {
      setFormData({
        company_name: employer.company_name ?? "",
        mission: employer.mission ?? "",
        location: employer.location ?? "",
        website: employer.website ?? "",
      });
    }
  }, [employer]);

  /* ───── loading / error states ───── */
  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="size-10 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-transparent" />
      </main>
    );
  }
  if (error) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow">
          {(error as Error).message}
        </p>
      </main>
    );
  }
  if (!employer) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p>No employer profile data.</p>
      </main>
    );
  }

  /* ───── render page ───── */
  return (
    <main className="min-h-screen bg-gray-50/60 pt-14">
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <Card className="rounded-3xl shadow-lg transition-shadow hover:shadow-xl">
          <CardHeader className="flex items-center gap-3 border-b bg-gradient-to-r from-background to-muted/50 rounded-t-3xl p-6">
            <Building className="h-6 w-6 text-[--accent-employer]" />
            <CardTitle className="text-xl font-semibold">
              Company Profile
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                updateProfile.mutate(formData);
              }}
            >
              {/* Logo (read-only for now) */}
              <div>
                <label className="mb-1 block text-sm font-medium">Logo</label>
                <div className="flex items-center gap-4">
                  {employer.logo ? (
                    <Image
                      src={employer.logo}
                      alt="Company logo"
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-muted/50 shadow-inner">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Company logo
                  </span>
                </div>
              </div>

              {/* Company name */}
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <Input
                  type="text"
                  placeholder="Company name"
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                />
              </div>

              {/* Mission */}
              <div>
                <label className="mb-1 block text-sm font-medium">Mission</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent-primary] focus-visible:ring-offset-2"
                  rows={4}
                  placeholder="Company mission or tagline"
                  value={formData.mission}
                  onChange={(e) =>
                    setFormData({ ...formData, mission: e.target.value })
                  }
                />
              </div>

              {/* Location */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Location
                </label>
                <Input
                  type="text"
                  placeholder="Headquarters or Remote"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>

              {/* Website */}
              <div>
                <label className="mb-1 block text-sm font-medium">Website</label>
                <Input
                  type="text"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                />
              </div>

              {/* Mutation errors */}
              {updateProfile.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow">
                  {(updateProfile.error as Error).message}
                </p>
              )}

              {/* Save Button */}
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
