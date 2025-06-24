import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useCreateInternship,
} from "@/hooks/useEmployerInternships";

/*──────────────── types ─────────────────*/
export interface InternshipDraft {
  title?: string;
  description?: string;
  location?: string;
  requirements?: string;
  remote?: boolean;
}

interface NewListingFormProps {
  /**
   * If the Employer AI suggested a draft, pass it here to pre‑fill the form.
   * All fields are optional.
   */
  initialDraft?: InternshipDraft;

  /**
   * Called after a successful Create — parent can switch tabs or refetch.
   */
  onCreated?: () => void;

  /**
   * Called when the user clicks Reset (or after create succeeds).
   */
  onReset?: () => void;
}

/*──────────────── component ────────────────*/
export default function NewListingForm({
  initialDraft,
  onCreated,
  onReset,
}: NewListingFormProps) {
  /* blank template */
  const BLANK = {
    title: "",
    description: "",
    location: "",
    requirements: "",
    is_remote: false,
  };

  /* local form state */
  const [form, setForm] = useState({ ...BLANK });

  /* load incoming draft (if any) */
  useEffect(() => {
    if (!initialDraft) return;
    setForm({
      title: String(initialDraft.title ?? ""),
      description: String(initialDraft.description ?? ""),
      location: String(initialDraft.location ?? ""),
      requirements: String(initialDraft.requirements ?? ""),
      is_remote: Boolean(initialDraft.remote),
    });
  }, [initialDraft]);

  /* data hook */
  const {
    mutate: create,
    isPending: creating,
    error: createErr,
  } = useCreateInternship();

  /* field helpers */
  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  /* reset helper */
  const reset = () => {
    setForm({ ...BLANK });
    // Let any listeners know the draft has been cleared/used
    window.dispatchEvent(new Event("draft-listing-cleared"));
    onReset?.();
  };

  /* submit */
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create(form, {
      onSuccess: () => {
        reset();
        onCreated?.();
      },
    });
  };

  const accentBtn = "bg-emerald-600 hover:bg-emerald-700 text-white";

  /*──────────────── render ────────────────*/
  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-lg border bg-white p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold">New Internship</h3>

      <InputBlock
        label="Title"
        value={form.title}
        onChange={(v) => set("title", v)}
        required
      />
      <TextAreaBlock
        label="Description"
        rows={5}
        value={form.description}
        onChange={(v) => set("description", v)}
        required
      />
      <InputBlock
        label="Location"
        value={form.location}
        onChange={(v) => set("location", v)}
        disabled={form.is_remote}
        placeholder={form.is_remote ? "Remote internship" : ""}
        required={!form.is_remote}
      />
      <Check
        label="Remote position"
        checked={form.is_remote}
        onChange={(c) => set("is_remote", c)}
      />
      <InputBlock
        label="Requirements"
        value={form.requirements}
        onChange={(v) => set("requirements", v)}
      />

      {createErr && <ErrorNote err={createErr} />}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={creating}
          className={`${accentBtn} disabled:opacity-60`}
        >
          {creating ? "Creating…" : "Create Internship"}
        </Button>
        <Button type="button" variant="secondary" onClick={reset} disabled={creating}>
          Reset
        </Button>
      </div>
    </form>
  );
}

/*──────── small field helpers (local) ────────*/
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
