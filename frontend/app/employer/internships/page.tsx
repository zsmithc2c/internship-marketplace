"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EmployerInternshipsPage() {
  const [tab, setTab] = useState<"listings" | "new">("listings");

  return (
    <main className="min-h-screen bg-gray-50/60 pt-14">
      <section className="mx-auto max-w-4xl px-6 py-16">
        {/* Tabs navigation */}
        <div className="mb-6 border-b border-gray-200 flex">
          <button
            onClick={() => setTab("listings")}
            className={`px-4 py-2 text-sm font-medium ${
              tab === "listings"
                ? "text-[--accent-employer] border-b border-[--accent-employer]"
                : "text-muted-foreground border-b border-transparent hover:text-foreground/80"
            }`}
          >
            Listings
          </button>
          <button
            onClick={() => setTab("new")}
            className={`px-4 py-2 text-sm font-medium ${
              tab === "new"
                ? "text-[--accent-employer] border-b border-[--accent-employer]"
                : "text-muted-foreground border-b border-transparent hover:text-foreground/80"
            }`}
          >
            Create New
          </button>
        </div>

        {/* Tabs content */}
        {tab === "listings" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Title</th>
                  <th className="py-2 text-left font-medium">Status</th>
                  <th className="py-2 text-left font-medium">Applicants</th>
                  <th className="py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    No internships yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input type="text" placeholder="Internship title" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent-primary] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe the internship role"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Location
              </label>
              <Input type="text" placeholder="City, State or Remote" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Skills Required
              </label>
              <Input type="text" placeholder="e.g., Python, Project Management" />
            </div>
            <Button type="button" disabled>
              Create Internship
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
