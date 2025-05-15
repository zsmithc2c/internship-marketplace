"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Building } from "lucide-react";

export default function EmployerProfilePage() {
  return (
    <main className="min-h-screen bg-gray-50/60 pt-14">
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <Card className="rounded-3xl shadow-lg transition-shadow hover:shadow-xl">
          <CardHeader className="flex items-center gap-3 border-b bg-gradient-to-r from-background to-muted/50 rounded-t-3xl p-6">
            <Building className="h-6 w-6 text-[--accent-employer]" />
            <CardTitle className="text-xl font-semibold">Company Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-6">
            <p className="text-sm text-muted-foreground">
              Edit functionality coming soon.
            </p>
            <form className="space-y-6">
              {/* Logo field */}
              <div>
                <label className="block text-sm font-medium mb-1">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="size-16 grid place-items-center rounded-full bg-muted/50 shadow-inner">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Company logo
                  </span>
                </div>
              </div>
              {/* Name field */}
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input type="text" placeholder="Company Name" />
              </div>
              {/* Mission field */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mission
                </label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent-primary] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Company mission or tagline"
                />
              </div>
              {/* Location field */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Location
                </label>
                <Input type="text" placeholder="Company headquarters or remote" />
              </div>
              {/* Website field */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Website
                </label>
                <Input type="text" placeholder="https://example.com" />
              </div>
              {/* Save changes button (disabled) */}
              <Button type="button" disabled>
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
