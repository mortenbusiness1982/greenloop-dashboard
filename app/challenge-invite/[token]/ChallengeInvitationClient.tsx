"use client";

import Image from "next/image";
import { CalendarDays, LockKeyhole } from "lucide-react";

export type InvitationPreview = {
  status: string;
  challenge: {
    title: string;
    description?: string | null;
    heroImageUrl?: string | null;
    organizationName?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
  };
};

type ChallengeInvitationClientProps = {
  token: string;
  initialInvitation: InvitationPreview | null;
};

export default function ChallengeInvitationClient({
  token,
  initialInvitation,
}: ChallengeInvitationClientProps) {
  const invitation = initialInvitation;

  const openApp = () => {
    window.location.href = `greenloop://challenge-invite/${encodeURIComponent(token)}`;
  };

  return (
    <main className="min-h-screen bg-[var(--gl-bg-cream)] px-5 py-10 text-[var(--gl-ink)] sm:py-14">
      <div className="mx-auto max-w-xl overflow-hidden rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-[var(--gl-shadow-md)]">
        {invitation?.challenge.heroImageUrl ? (
          <div
            className="relative aspect-[16/9] bg-cover bg-center"
            style={{ backgroundImage: `url(${JSON.stringify(invitation.challenge.heroImageUrl).slice(1, -1)})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--gl-green-deep)] via-transparent to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100">Private GreenLoop challenge</p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight">{invitation.challenge.title}</h1>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--gl-green-deep)] px-7 py-8 text-white">
            <div className="flex items-center gap-4">
              <Image src="/bella-stage-2.png" alt="Bella, the GreenLoop turtle" width={96} height={96} className="h-24 w-24 object-contain" priority />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">Private GreenLoop challenge</p>
                <h1 className="mt-1 text-3xl font-semibold leading-tight">{invitation?.challenge.title || "Join the challenge"}</h1>
              </div>
            </div>
          </div>
        )}

        <div className="p-7">
          {!invitation ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">This invitation could not be found.</div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-[var(--gl-green)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--gl-green)]">You’ve been invited</p>
                  <p className="mt-1 text-lg text-[var(--gl-ink-soft)]">
                    Join {invitation.challenge.organizationName || "the GreenLoop community"} and recycle together.
                  </p>
                </div>
              </div>
              {invitation.challenge.description ? (
                <p className="mt-5 line-clamp-4 leading-7 text-[var(--gl-ink-soft)]">{invitation.challenge.description}</p>
              ) : null}
              <div className="mt-5 flex items-center gap-2 text-sm text-[var(--gl-ink-muted)]">
                <CalendarDays className="h-4 w-4" />
                {invitation.challenge.endsAt ? `Open until ${new Date(invitation.challenge.endsAt).toLocaleDateString()}` : "Open now"}
              </div>
              {invitation.status === "available" ? (
                <button type="button" onClick={openApp} className="mt-7 w-full rounded-[var(--gl-radius)] bg-[var(--gl-green)] px-5 py-3.5 text-base font-semibold text-white transition hover:brightness-95">
                  Open GreenLoop to join
                </button>
              ) : (
                <div className="mt-7 rounded-lg border border-amber-200 bg-amber-50 p-4 font-medium text-amber-900">This invitation is {invitation.status}.</div>
              )}
              <div className="mt-7 flex items-center justify-center gap-3 border-t border-[var(--gl-hairline)] pt-5">
                <Image src="/bella-stage-2.png" alt="" width={48} height={48} className="h-12 w-12 object-contain" />
                <div>
                  <p className="font-semibold text-[var(--gl-ink)]">GreenLoop Recycling App</p>
                  <p className="text-xs text-[var(--gl-ink-muted)]">Recycle together. Make every action count.</p>
                </div>
              </div>
              <p className="mt-5 text-center text-xs text-[var(--gl-ink-muted)]">Only your GreenLoop display name and approved recycling contributions appear in the challenge.</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
