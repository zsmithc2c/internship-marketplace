"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useEmployerProfile,
  useUpdateEmployerProfile,
  EmployerProfile,
} from "@/hooks/useEmployerProfile";

/*──────────────────────── helpers ────────────────────────*/
const BLANK: EmployerProfile = {
  id: 0,
  company_name: "",
  mission: "",
  location: "",
  website: "",
  logo: null,
};

const accentBtn = "bg-emerald-600 hover:bg-emerald-700 text-white";

/*──────────────────── component ──────────────────────────*/
export default function EmployerProfilePage() {
  /* data */
  const {
    data: profile,
    isLoading,
    error: loadErr,
  } = useEmployerProfile();

  const {
    mutate: saveProfile,
    isPending: saving,
    isSuccess,
    error: saveErr,
  } = useUpdateEmployerProfile();

  /* local state */
  const [form, setForm] = useState<EmployerProfile>(BLANK);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm(profile);
      setDirty(false);
    }
  }, [profile]);

  /* field helpers */
  const set = (k: keyof EmployerProfile, v: string | null) => {
    setForm({ ...form, [k]: v });
    setDirty(true);
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(file);
    });
    set("logo", dataUrl);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...payload } = form;
    saveProfile(payload);
  };

  const reset = () => profile && setForm(profile);

  /* loading / error */
  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="size-10 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-transparent" />
      </main>
    );
  }
  if (loadErr) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow">
          {(loadErr as Error).message}
        </p>
      </main>
    );
  }

  /*──────────────────── render ──────────────────────────*/
  return (
    <main className="min-h-screen bg-gray-50/60 pt-14">
      <section className="mx-auto max-w-4xl space-y-10 px-6 py-16">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Company Profile</h1>
          <Link href="/employer/dashboard" className="text-sm underline">
            ← back to dashboard
          </Link>
        </header>

        <form onSubmit={submit} className="space-y-8">
          {/*──────── Brand card ────────*/}
          <Card>
            <CardHeader>
              <CardTitle>Brand</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-[120px_1fr]">
                {/* logo */}
                <div className="flex flex-col items-center gap-3 sm:items-start">
                  {form.logo ? (
                    <Image
                      src={form.logo}
                      alt={form.company_name || "Logo"}
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-lg object-cover ring-1 ring-muted-foreground/20"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted">
                      <span className="text-sm text-muted-foreground">No&nbsp;logo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    id="logoPicker"
                    onChange={pickFile}
                    hidden
                  />
                  <label
                    htmlFor="logoPicker"
                    className="cursor-pointer rounded bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200"
                  >
                    {form.logo ? "Replace logo" : "Upload logo"}
                  </label>
                </div>

                {/* company name */}
                <InputBlock
                  label="Company name"
                  required
                  value={form.company_name}
                  onChange={(v) => set("company_name", v)}
                />
              </div>
            </CardContent>
          </Card>

          {/*──────── Mission card ────────*/}
          <Card>
            <CardHeader>
              <CardTitle>Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <TextAreaBlock
                rows={4}
                placeholder="What drives your company?"
                value={form.mission}
                onChange={(v) => set("mission", v)}
              />
            </CardContent>
          </Card>

          {/*──────── Details card ────────*/}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <InputBlock
                  label="Location"
                  placeholder="City, Country (optional)"
                  value={form.location}
                  onChange={(v) => set("location", v)}
                />
                <InputBlock
                  label="Website"
                  type="url"
                  pattern="https?://.*"
                  placeholder="https://example.com"
                  value={form.website}
                  onChange={(v) => set("website", v)}
                />
              </div>
            </CardContent>
          </Card>

          {/*──────── actions ────────*/}
          {saveErr && <ErrorNote err={saveErr} />}

          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="submit"
              disabled={saving}
              className={`${accentBtn} disabled:opacity-60`}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={reset}
              disabled={!dirty || saving}
            >
              Reset
            </Button>
            {isSuccess && !saving && (
              <span className="text-sm text-green-600">✓ Saved!</span>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

/*──────────────── reusable field blocks ────────────────*/
function InputBlock(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  pattern?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {props.label}
        {props.required && <span className="text-red-500">*</span>}
      </label>
      <Input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        type={props.type}
        pattern={props.pattern}
      />
    </div>
  );
}

function TextAreaBlock(props: {
  rows: number;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      rows={props.rows}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
    />
  );
}

function ErrorNote({ err }: { err: unknown }) {
  return (
    <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
      {(err as Error).message}
    </p>
  );
}
