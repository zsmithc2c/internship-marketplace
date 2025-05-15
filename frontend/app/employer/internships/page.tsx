"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useEmployerInternships,
  useCreateInternship,
} from "@/hooks/useEmployerInternships";

export default function EmployerInternshipsPage() {
  /* ───── state & data hooks ───── */
  const [tab, setTab] = useState<"listings" | "new">("listings");

  const {
    data: internships,
    isLoading,       // from useQuery → isLoading is valid
    error,
  } = useEmployerInternships();

  const {
    mutate: createInternship,
    isPending: isCreating,   // ← fixed: v5 flag name
    error: createError,
  } = useCreateInternship();

  /* ───── form state for new listing ───── */
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    location: "",
    requirements: "",
    is_remote: false,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createInternship(newJob, {
      onSuccess: () => {
        setNewJob({
          title: "",
          description: "",
          location: "",
          requirements: "",
          is_remote: false,
        });
        setTab("listings");
      },
    });
  };

  /* ───── render ───── */
  return (
    <main className="min-h-screen bg-gray-50/60 pt-14">
      <section className="mx-auto max-w-4xl px-6 py-16">
        {/* Tabs navigation */}
        <div className="mb-6 flex border-b border-gray-200">
          <button
            onClick={() => setTab("listings")}
            className={`px-4 py-2 text-sm font-medium ${
              tab === "listings"
                ? "border-b border-[--accent-employer] text-[--accent-employer]"
                : "border-b border-transparent text-muted-foreground hover:text-foreground/80"
            }`}
          >
            Listings
          </button>
          <button
            onClick={() => setTab("new")}
            className={`px-4 py-2 text-sm font-medium ${
              tab === "new"
                ? "border-b border-[--accent-employer] text-[--accent-employer]"
                : "border-b border-transparent text-muted-foreground hover:text-foreground/80"
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
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-muted-foreground"
                    >
                      Loading internships…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-red-600">
                      {(error as Error).message}
                    </td>
                  </tr>
                ) : internships && internships.length > 0 ? (
                  internships.map((internship) => (
                    <tr key={internship.id} className="border-b">
                      <td className="py-2">{internship.title}</td>
                      <td className="py-2">Open</td>
                      <td className="py-2">0</td>
                      <td className="py-2"></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No internships yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input
                type="text"
                placeholder="Internship title"
                value={newJob.title}
                onChange={(e) =>
                  setNewJob({ ...newJob, title: e.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>
              <textarea
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent-primary] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Describe the internship role"
                value={newJob.description}
                onChange={(e) =>
                  setNewJob({ ...newJob, description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Location</label>
              <Input
                type="text"
                placeholder="City, State (leave blank if remote)"
                value={newJob.location}
                onChange={(e) =>
                  setNewJob({ ...newJob, location: e.target.value })
                }
              />
              <div className="mt-2">
                <label className="flex items-center text-sm font-medium">
                  <input
                    type="checkbox"
                    className="mr-2 h-4 w-4 rounded border-gray-300 text-[--accent-employer] focus:ring-[--accent-employer]"
                    checked={newJob.is_remote}
                    onChange={(e) =>
                      setNewJob({ ...newJob, is_remote: e.target.checked })
                    }
                  />
                  Remote
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Skills Required
              </label>
              <Input
                type="text"
                placeholder="e.g., Python, Project Management"
                value={newJob.requirements}
                onChange={(e) =>
                  setNewJob({ ...newJob, requirements: e.target.value })
                }
              />
            </div>

            {createError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow">
                {(createError as Error).message}
              </p>
            )}

            <Button
              type="submit"
              disabled={isCreating || !newJob.title || !newJob.description}
            >
              {isCreating ? "Creating…" : "Create Internship"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
