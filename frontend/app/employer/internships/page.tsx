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

/*──────────────── helper ─────────────────*/
function getInitialTab(): "listings" | "new" {
  if (typeof window === "undefined") return "listings";
  if (window.location.hash === "#new") return "new";
  const sp = new URLSearchParams(window.location.search);
  return sp.get("tab") === "new" ? "new" : "listings";
}

/*──────────────── component ────────────────*/
export default function EmployerInternshipsPage() {
  /* tabs & editing */
  const [tab, setTab] = useState<"listings" | "new">(getInitialTab);
  const [editing, setEditing] = useState<EmployerInternship | null>(null);

  /* draft / form state */
  const BLANK = {
    title: "",
    description: "",
    location: "",
    requirements: "",
    is_remote: false,
    requires_cover_letter: false,
    requires_resume: false,
    requires_references: false,
    external_application_url: "",
    is_open: true,
  };
  const [newJob, setNewJob] = useState({ ...BLANK });
  const [editJob, setEditJob] = useState({ ...BLANK });

  /* URL & hash sync */
  const searchParams = useSearchParams();

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#new") setTab("new");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (searchParams?.get("tab") === "new") setTab("new");
  }, [searchParams]);

  /* ⭐ listen for AI-generated draft */
  useEffect(() => {
    const onDraft = (e: Event) => {
      const d = (e as CustomEvent<Record<string, unknown>>).detail ?? {};
      setNewJob({
        title: String(d.title ?? ""),
        description: String(d.description ?? ""),
        location: String(d.location ?? ""),
        requirements: String(d.requirements ?? ""),
        is_remote: Boolean(d.remote),
        requires_cover_letter: Boolean(d.requires_cover_letter),
        requires_resume: Boolean(d.requires_resume),
        requires_references: Boolean(d.requires_references),
        external_application_url: String(d.external_application_url ?? ""),
        is_open: true,
      });
      setTab("new");
    };
    window.addEventListener("draft-listing", onDraft as EventListener);
    return () =>
      window.removeEventListener("draft-listing", onDraft as EventListener);
  }, []);

  /* data hooks */
  const { data, isLoading, error: loadErr } = useEmployerInternships();
  const { mutate: create, isPending: creating, error: createErr } =
    useCreateInternship();
  const { mutate: update, isPending: updating, error: updateErr } =
    useUpdateInternship();
  const { mutate: remove, isPending: deleting, error: deleteErr } =
    useDeleteInternship();

  /* helpers */
  const resetNew = () => setNewJob({ ...BLANK });
  const exitEdit = () => {
    setEditing(null);
    setEditJob({ ...BLANK });
  };
  const startEdit = (it: EmployerInternship) => {
    setEditing(it);
    setEditJob({
      title: it.title,
      description: it.description,
      location: it.location ?? "",
      requirements: it.requirements ?? "",
      is_remote: it.is_remote,
      requires_cover_letter: !!it.requires_cover_letter,
      requires_resume: !!it.requires_resume,
      requires_references: !!it.requires_references,
      external_application_url: it.external_application_url ?? "",
      is_open: it.is_open ?? true,
    });
    setTab("listings");
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this internship listing?")) remove(id);
  };

  const toggleStatus = (job: EmployerInternship) => {
    update(
      { ...job, is_open: !job.is_open },
      { onSuccess: () => setEditing(null) },
    );
  };

  /* submit */
  const saveNew = (e: React.FormEvent) => {
    e.preventDefault();
    create(newJob, {
      onSuccess: () => {
        resetNew();
        setTab("listings");
        window.dispatchEvent(new Event("draft-listing-cleared"));
      },
    });
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    update({ id: editing.id, ...editJob }, { onSuccess: exitEdit });
  };

  /* accent colour */
  const accentBtn = "bg-emerald-600 hover:bg-emerald-700 text-white";

  /*──────────────── render ────────────────*/
  return (
    <main className="min-h-screen bg-gray-50/60 pt-14">
      <section className="mx-auto max-w-4xl px-6 py-16">
        {/* tabs */}
        <nav className="mb-6 flex border-b border-gray-200">
          {(["listings", "new"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === "listings") exitEdit();
                setTab(t);
              }}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t
                  ? "border-b-2 border-emerald-600 text-emerald-700"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {t === "listings"
                ? "Listings"
                : editing
                ? "Edit Internship"
                : "Create New"}
            </button>
          ))}
        </nav>

        {/* edit panel */}
        {editing && (
          <form
            onSubmit={saveEdit}
            className="mb-10 space-y-6 rounded-lg border bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold">Edit Internship</h3>

            <InputBlock
              label="Title"
              value={editJob.title}
              onChange={(v) => setEditJob({ ...editJob, title: v })}
              required
            />
            <TextAreaBlock
              label="Description"
              rows={5}
              value={editJob.description}
              onChange={(v) => setEditJob({ ...editJob, description: v })}
              required
            />
            <InputBlock
              label="Location"
              value={editJob.location}
              onChange={(v) => setEditJob({ ...editJob, location: v })}
              disabled={editJob.is_remote}
              placeholder={editJob.is_remote ? "Remote internship" : ""}
              required={!editJob.is_remote}
            />
            <Check
              label="Remote position"
              checked={editJob.is_remote}
              onChange={(c) => setEditJob({ ...editJob, is_remote: c })}
            />
            <InputBlock
              label="Requirements"
              value={editJob.requirements}
              onChange={(v) => setEditJob({ ...editJob, requirements: v })}
            />

            {/* NEW requirement flags */}
            <Check
              label="Require cover letter"
              checked={editJob.requires_cover_letter}
              onChange={(c) =>
                setEditJob({ ...editJob, requires_cover_letter: c })
              }
            />
            <Check
              label="Require resume upload"
              checked={editJob.requires_resume}
              onChange={(c) =>
                setEditJob({ ...editJob, requires_resume: c })
              }
            />
            <Check
              label="Require references"
              checked={editJob.requires_references}
              onChange={(c) =>
                setEditJob({ ...editJob, requires_references: c })
              }
            />
            <InputBlock
              label="External application URL (optional)"
              value={editJob.external_application_url}
              onChange={(v) =>
                setEditJob({ ...editJob, external_application_url: v })
              }
            />

            {updateErr && <ErrorNote err={updateErr} />}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={updating}
                className={`${accentBtn} disabled:opacity-60`}
              >
                {updating ? "Saving…" : "Save Changes"}
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={exitEdit}
                disabled={updating}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* listings or create */}
        {tab === "listings" ? (
          <>
            <ListingsTable
              internships={data}
              isLoading={isLoading}
              error={loadErr}
              onEdit={startEdit}
              onDelete={handleDelete}
              onToggle={toggleStatus}
              deleting={deleting}
              updating={updating}
            />
            {deleteErr && <ErrorNote err={deleteErr} />}
          </>
        ) : (
          <form
            onSubmit={saveNew}
            className="space-y-6 rounded-lg border bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold">New Internship</h3>

            <InputBlock
              label="Title"
              value={newJob.title}
              onChange={(v) => setNewJob({ ...newJob, title: v })}
              required
            />
            <TextAreaBlock
              label="Description"
              rows={5}
              value={newJob.description}
              onChange={(v) => setNewJob({ ...newJob, description: v })}
              required
            />
            <InputBlock
              label="Location"
              value={newJob.location}
              onChange={(v) => setNewJob({ ...newJob, location: v })}
              disabled={newJob.is_remote}
              placeholder={newJob.is_remote ? "Remote internship" : ""}
              required={!newJob.is_remote}
            />
            <Check
              label="Remote position"
              checked={newJob.is_remote}
              onChange={(c) => setNewJob({ ...newJob, is_remote: c })}
            />
            <InputBlock
              label="Requirements"
              value={newJob.requirements}
              onChange={(v) => setNewJob({ ...newJob, requirements: v })}
            />

            {/* NEW requirement flags */}
            <Check
              label="Require cover letter"
              checked={newJob.requires_cover_letter}
              onChange={(c) =>
                setNewJob({ ...newJob, requires_cover_letter: c })
              }
            />
            <Check
              label="Require resume upload"
              checked={newJob.requires_resume}
              onChange={(c) => setNewJob({ ...newJob, requires_resume: c })}
            />
            <Check
              label="Require references"
              checked={newJob.requires_references}
              onChange={(c) =>
                setNewJob({ ...newJob, requires_references: c })
              }
            />
            <InputBlock
              label="External application URL (optional)"
              value={newJob.external_application_url}
              onChange={(v) =>
                setNewJob({ ...newJob, external_application_url: v })
              }
            />

            {createErr && <ErrorNote err={createErr} />}

            <Button
              type="submit"
              disabled={creating}
              className={`${accentBtn} disabled:opacity-60`}
            >
              {creating ? "Creating…" : "Create Internship"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

/*──────── helpers ────────*/
function InputBlock(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{props.label}</label>
      <Input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        disabled={props.disabled}
        placeholder={props.placeholder}
      />
    </div>
  );
}

function TextAreaBlock(props: {
  label: string;
  rows: number;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{props.label}</label>
      <textarea
        rows={props.rows}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
      />
    </div>
  );
}

function Check(props: {
  label: string;
  checked: boolean;
  onChange: (c: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center text-sm">
      <input
        type="checkbox"
        className="mr-2 accent-emerald-600"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      {props.label}
    </label>
  );
}

function ErrorNote({ err }: { err: unknown }) {
  return (
    <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
      {(err as Error).message}
    </p>
  );
}

function ListingsTable(props: {
  internships: EmployerInternship[] | undefined;
  isLoading: boolean;
  error: unknown;
  onEdit: (it: EmployerInternship) => void;
  onDelete: (id: number) => void;
  onToggle: (it: EmployerInternship) => void;
  deleting: boolean;
  updating: boolean;
}) {
  const {
    internships,
    isLoading,
    error,
    onEdit,
    onDelete,
    onToggle,
    deleting,
    updating,
  } = props;
  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-muted-foreground">
          <tr>
            <th className="py-2 px-3 text-left font-medium">Title</th>
            <th className="py-2 px-3 text-left font-medium">Status</th>
            <th className="py-2 px-3 text-left font-medium">Applicants</th>
            <th className="py-2 px-3 text-left font-medium">Actions</th>
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
              <tr key={job.id} className="border-t">
                <td className="py-2 px-3">{job.title}</td>
                <td className="py-2 px-3">
                  {job.is_open ? (
                    <span className="text-emerald-700">Open</span>
                  ) : (
                    <span className="text-gray-500">Closed</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  <Link
                    href={`/employer/internships/${job.id}/applications`}
                    className="underline"
                  >
                    {job.applications_count ?? 0}
                  </Link>
                </td>
                <td className="py-2 px-3 space-x-3">
                  <button
                    onClick={() => onEdit(job)}
                    className="text-emerald-700 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onToggle(job)}
                    className="text-orange-600 hover:underline disabled:opacity-50"
                    disabled={updating}
                  >
                    {job.is_open ? "Close" : "Re-open"}
                  </button>
                  <button
                    onClick={() => onDelete(job.id)}
                    className="text-red-600 hover:underline disabled:opacity-50"
                    disabled={deleting}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="py-6 text-center text-muted-foreground">
                No internships yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
