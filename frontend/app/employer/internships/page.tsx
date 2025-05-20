"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useEmployerInternships,
  useCreateInternship,
  useUpdateInternship,
  useDeleteInternship,
  EmployerInternship,
} from "@/hooks/useEmployerInternships";

/* helper – decide initial tab from URL  */
function getInitialTab(): "listings" | "new" {
  if (typeof window === "undefined") return "listings";
  if (window.location.hash === "#new") return "new";
  const sp = new URLSearchParams(window.location.search);
  if (sp.get("tab") === "new") return "new";
  return "listings";
}

export default function EmployerInternshipsPage() {
  /* state ---------------------------------------------------------- */
  const [tab, setTab] = useState<"listings" | "new">(getInitialTab);
  const [editingId, setEditingId] = useState<number | null>(null);

  /* --------------------------------------------------------------- */
  /*  URL hash <--> tab sync                                         */
  /* --------------------------------------------------------------- */

  const searchParams = useSearchParams();

  useEffect(() => {
    /* when user manually changes hash (e.g. agent navigated) */
    const onHash = () => {
      if (window.location.hash === "#new") setTab("new");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /* if ?tab=new query param is present, switch */
  useEffect(() => {
    if (searchParams?.get("tab") === "new") setTab("new");
  }, [searchParams]);

  /* --------------------------------------------------------------- */
  /*  data hooks / mutations (unchanged)                             */
  /* --------------------------------------------------------------- */
  const { data: internships, isLoading, error } = useEmployerInternships();
  const { mutate: createInternship, isPending: isCreating, error: createError } =
    useCreateInternship();
  const { mutate: updateInternship, isPending: isUpdating, error: updateError } =
    useUpdateInternship();
  const { mutate: deleteInternship, error: deleteError } = useDeleteInternship();

  /* form state ----------------------------------------------------- */
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    requirements: "",
    is_remote: false,
  });

  /* populate form when editing ------------------------------------ */
  useEffect(() => {
    if (editingId && internships) {
      const current = internships.find((it) => it.id === editingId);
      if (current) {
        setFormData({
          title: current.title,
          description: current.description,
          location: current.location || "",
          requirements: current.requirements || "",
          is_remote: current.is_remote,
        });
        setTab("new");
      }
    }
  }, [editingId, internships]);

  /* submit handler ------------------------------------------------- */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) return;

    if (editingId) {
      updateInternship(
        { id: editingId, data: formData },
        {
          onSuccess: () => {
            resetForm();
            setTab("listings");
          },
        }
      );
    } else {
      createInternship(formData, {
        onSuccess: () => {
          resetForm();
          setTab("listings");
        },
      });
    }
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      location: "",
      requirements: "",
      is_remote: false,
    });
  }

  /* actions -------------------------------------------------------- */
  const handleEdit = (job: EmployerInternship) => setEditingId(job.id);
  const handleDelete = (id: number) => {
    if (confirm("Delete this listing?")) deleteInternship(id);
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <main className="min-h-screen bg-gray-50/60 pt-14">
      <section className="mx-auto max-w-4xl px-6 py-16">
        {/* tab bar */}
        <div className="mb-6 flex border-b border-gray-200">
          {(["listings", "new"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === "listings") resetForm();
                setTab(t);
              }}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t
                  ? "border-b border-[--accent-employer] text-[--accent-employer]"
                  : "border-b border-transparent text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {t === "listings" ? "Listings" : editingId ? "Edit Internship" : "Create New"}
            </button>
          ))}
        </div>

        {tab === "listings" ? (
          /* ------------------- LISTINGS TABLE ------------------- */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  {["Title", "Status", "Applicants", "Actions"].map((h) => (
                    <th key={h} className="py-2 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-red-600">
                      {(error as Error).message}
                    </td>
                  </tr>
                ) : internships && internships.length ? (
                  internships.map((job) => (
                    <tr key={job.id} className="border-b">
                      <td className="py-2">{job.title}</td>
                      <td className="py-2">Open</td>
                      <td className="py-2">
                        <Link
                          href={`/employer/internships/${job.id}/applications`}
                          className="underline"
                        >
                          {job.applications_count ?? 0}
                        </Link>
                      </td>
                      <td className="py-2 space-x-2">
                        <Button size="sm" onClick={() => handleEdit(job)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-red-600"
                          onClick={() => handleDelete(job.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No listings yet.
                    </td>
                  </tr>
                )}

                {/* combined mutation errors */}
                {(createError || updateError || deleteError) && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-red-600">
                      {((createError || updateError || deleteError) as Error).message}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ------------------- CREATE/EDIT FORM ------------------ */
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Location</label>
              <Input
                value={formData.location}
                disabled={formData.is_remote}
                placeholder={formData.is_remote ? "Remote internship" : ""}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                required={!formData.is_remote}
              />
              <label className="mt-1 inline-flex items-center text-xs">
                <input
                  type="checkbox"
                  className="mr-1"
                  checked={formData.is_remote}
                  onChange={(e) =>
                    setFormData({ ...formData, is_remote: e.target.checked })
                  }
                />{" "}
                Remote position
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Requirements</label>
              <Input
                value={formData.requirements}
                placeholder="Skills (optional)"
                onChange={(e) =>
                  setFormData({ ...formData, requirements: e.target.value })
                }
              />
            </div>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {editingId
                ? isUpdating
                  ? "Saving…"
                  : "Save Changes"
                : isCreating
                ? "Posting…"
                : "Post Internship"}
            </Button>
            {(createError || updateError) && (
              <p className="text-sm text-red-600">
                {((createError || updateError) as Error).message}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
