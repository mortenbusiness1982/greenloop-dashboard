"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";

function OrganizationInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("This invite link is missing a token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{ token?: string }>("/auth/organization-invite/accept", {
        method: "POST",
        body: {
          token,
          password,
          display_name: displayName.trim() || undefined,
        },
      });
      if (!data.token) throw new Error("Missing token in response");
      setToken(data.token);
      router.replace("/organization/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--gl-bg-cream)] p-6">
      <form onSubmit={submit} className="w-full max-w-lg rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--gl-green)]">GreenLoop organization portal</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--gl-ink)]">Set up your access</h1>
        <p className="mt-2 text-sm text-[var(--gl-ink-muted)]">
          Create a password to monitor your community challenge, view progress, and download certificates when available.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--gl-ink)]">Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--gl-hairline)] px-3 py-2 text-[var(--gl-ink)] outline-none focus:border-[var(--gl-green)]"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--gl-ink)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--gl-hairline)] px-3 py-2 text-[var(--gl-ink)] outline-none focus:border-[var(--gl-green)]"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--gl-ink)]">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--gl-hairline)] px-3 py-2 text-[var(--gl-ink)] outline-none focus:border-[var(--gl-green)]"
              minLength={8}
              required
            />
          </div>
        </div>

        {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <button
          type="submit"
          disabled={loading || !token}
          className="mt-6 w-full rounded-md bg-[var(--gl-green)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Setting up..." : "Enter organization portal"}
        </button>
      </form>
    </main>
  );
}

export default function OrganizationInvitePage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[var(--gl-bg-cream)] p-6 text-sm text-[var(--gl-ink-muted)]">Loading invite...</main>}>
      <OrganizationInviteForm />
    </Suspense>
  );
}
