"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LockKeyhole } from "lucide-react";
import { API_BASE } from "@/lib/api";

type InvitationPreview = {
  status: string;
  challenge: {
    title: string;
    description?: string | null;
    organizationName?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
  };
};

export default function ChallengeInvitationPage() {
  const params = useParams<{ token: string }>();
  const token = useMemo(() => String(params?.token || ""), [params]);
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/challenge-invitations/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json?.error || "Invitation not found");
        setInvitation(json.invitation);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Invitation not found"));
  }, [token]);

  const openApp = () => {
    window.location.href = `greenloop://challenge-invite/${encodeURIComponent(token)}`;
  };

  return (
    <main className="min-h-screen bg-[var(--gl-bg-cream)] px-5 py-12 text-[var(--gl-ink)]">
      <div className="mx-auto max-w-xl overflow-hidden rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-[var(--gl-shadow-md)]">
        <div className="bg-[var(--gl-green-deep)] px-7 py-8 text-white">
          <div className="flex items-center gap-4">
            <Image src="/bella-stage-2.png" alt="Bella, the GreenLoop turtle" width={84} height={84} className="h-20 w-20 object-contain" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">Private invitation</p>
              <h1 className="mt-1 text-2xl font-semibold">Join a GreenLoop challenge</h1>
            </div>
          </div>
        </div>
        <div className="p-7">
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div> : null}
          {!error && !invitation ? <p className="text-[var(--gl-ink-muted)]">Loading invitation...</p> : null}
          {invitation ? (
            <>
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-[var(--gl-green)]" />
                <div>
                  <p className="text-sm text-[var(--gl-ink-muted)]">{invitation.challenge.organizationName || "GreenLoop community"}</p>
                  <h2 className="mt-1 text-3xl font-semibold">{invitation.challenge.title}</h2>
                </div>
              </div>
              {invitation.challenge.description ? <p className="mt-5 leading-7 text-[var(--gl-ink-soft)]">{invitation.challenge.description}</p> : null}
              <div className="mt-5 flex items-center gap-2 text-sm text-[var(--gl-ink-muted)]">
                <CalendarDays className="h-4 w-4" />
                {invitation.challenge.endsAt ? `Open until ${new Date(invitation.challenge.endsAt).toLocaleDateString()}` : "Open now"}
              </div>
              {invitation.status === "available" ? (
                <button type="button" onClick={openApp} className="mt-7 w-full rounded-[var(--gl-radius)] bg-[var(--gl-green)] px-5 py-3.5 text-base font-semibold text-white">Open GreenLoop to join</button>
              ) : (
                <div className="mt-7 rounded-lg border border-amber-200 bg-amber-50 p-4 font-medium text-amber-900">This invitation is {invitation.status}.</div>
              )}
              <p className="mt-4 text-center text-xs text-[var(--gl-ink-muted)]">Only your GreenLoop display name and approved recycling contributions appear in the challenge.</p>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
