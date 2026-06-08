"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Flag, Leaf, RefreshCcw, Target, Trash2, Users } from "lucide-react";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { getToken } from "@/lib/auth";

type OrganizationChallenge = {
  id: string;
  title: string;
  description?: string | null;
  organization?: { name?: string | null; type?: string | null };
  status: string;
  startsAt?: string | null;
  endsAt?: string | null;
  targetItems: number;
  progressCount: number;
  percentComplete: number;
  participants: number;
  approvedEvents: number;
  approvedItems: number;
  pendingEvents: number;
  estimatedCO2Saved: number;
  certificateAvailable: boolean;
  certificateStatus: string;
  certificateGeneratedAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("en-US");
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = "green",
}: {
  label: string;
  value: string;
  detail?: string;
  icon: typeof Target;
  accent?: "green" | "amber";
}) {
  const accentClass =
    accent === "amber"
      ? "bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]"
      : "bg-[var(--gl-green-soft)] text-[var(--gl-green)]";
  return (
    <div className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-[var(--gl-shadow-sm)] transition-shadow hover:shadow-[var(--gl-shadow-md)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gl-ink-muted)]">{label}</p>
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${accentClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-[var(--gl-ink)]">{value}</p>
      {detail ? <p className="mt-1 text-sm text-[var(--gl-ink-muted)]">{detail}</p> : null}
    </div>
  );
}

export function OrganizationChallengeWorkspace() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<OrganizationChallenge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => challenges.find((challenge) => challenge.id === selectedId) || challenges[0] || null,
    [challenges, selectedId]
  );

  async function loadChallenges() {
    const token = getToken();
    if (!token) return router.replace("/login");
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ challenges: OrganizationChallenge[] }>("/organization/challenges", { token });
      setChallenges(data.challenges || []);
      if (!selectedId && data.challenges?.[0]?.id) setSelectedId(data.challenges[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load challenges");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChallenges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelChallenge() {
    if (!selected) return;
    const confirmed = window.confirm("Are you sure? This will remove the challenge from public participation.");
    if (!confirmed) return;
    const token = getToken();
    if (!token) return router.replace("/login");
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/organization/challenges/${selected.id}/cancel`, {
        token,
        method: "PATCH",
        body: { reason: "Cancelled from organization portal" },
      });
      setMessage("Challenge cancelled. It is no longer available for public participation.");
      await loadChallenges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel challenge");
    }
  }

  async function downloadCertificate(locale: "en" | "es" = "en") {
    if (!selected) return;
    const token = getToken();
    if (!token) return router.replace("/login");
    setMessage(null);
    setError(null);
    try {
      const blob = await apiFetchBlob(`/organization/challenges/${selected.id}/certificate?locale=${locale}`, { token });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `greenloop-impact-certificate-${selected.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}${locale === "es" ? "-es" : ""}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Certificate download started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download certificate");
    }
  }

  if (loading) {
    return <div className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-6 text-[var(--gl-ink-muted)] shadow-[var(--gl-shadow-sm)]">Loading organization challenges...</div>;
  }

  if (!challenges.length) {
    return (
      <section className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-8 text-center shadow-[var(--gl-shadow-sm)]">
        <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-[var(--gl-green-soft)] ring-1 ring-[var(--gl-green-ring)]">
          <Image src="/bella-stage-2.png" alt="GreenLoop companion turtle" width={104} height={104} className="h-24 w-24 object-contain" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--gl-green)]">Organization portal</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--gl-ink)]">No challenges yet</h1>
        <p className="mt-2 text-[var(--gl-ink-muted)]">Approved community challenges for your organization will appear here.</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-6 shadow-[var(--gl-shadow-sm)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--gl-green-soft)] ring-1 ring-[var(--gl-green-ring)] sm:flex">
              <Image src="/bella-stage-2.png" alt="GreenLoop companion turtle" width={56} height={56} className="h-14 w-14 object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--gl-green)]">Organization portal</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-[var(--gl-ink)]">{selected?.title}</h1>
                {selected?.status ? (
                  <span className="inline-flex items-center rounded-full bg-[var(--gl-green-soft)] px-2.5 py-0.5 text-xs font-semibold capitalize text-[var(--gl-green)]">
                    {selected.status}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 max-w-3xl text-[var(--gl-ink-muted)]">{selected?.description}</p>
              <p className="mt-3 text-sm text-[var(--gl-ink-muted)]">
                {selected?.organization?.name || "Your organization"} · {formatDate(selected?.startsAt)} - {formatDate(selected?.endsAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={loadChallenges} className="inline-flex items-center gap-2 rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] px-3 py-2 text-sm font-semibold text-[var(--gl-ink)] transition-colors hover:bg-[var(--gl-bg-cream)]">
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>
            <button type="button" onClick={() => downloadCertificate("en")} disabled={!selected?.certificateAvailable} className="inline-flex items-center gap-2 rounded-[var(--gl-radius)] bg-[var(--gl-green)] px-3 py-2 text-sm font-semibold text-white shadow-[var(--gl-shadow-sm)] transition-opacity hover:opacity-90 disabled:opacity-50">
              <Download className="h-4 w-4" /> Certificate EN
            </button>
            <button type="button" onClick={() => downloadCertificate("es")} disabled={!selected?.certificateAvailable} className="inline-flex items-center gap-2 rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] px-3 py-2 text-sm font-semibold text-[var(--gl-ink)] transition-colors hover:bg-[var(--gl-bg-cream)] disabled:opacity-50">
              <Download className="h-4 w-4" /> Certificate ES
            </button>
          </div>
        </div>

        {message ? <div className="mt-4 rounded-[var(--gl-radius)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div className="mt-4 rounded-[var(--gl-radius)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      </section>

      {challenges.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {challenges.map((challenge) => (
            <button
              key={challenge.id}
              type="button"
              onClick={() => setSelectedId(challenge.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${challenge.id === selected?.id ? "border-transparent bg-[var(--gl-green)] text-white shadow-[var(--gl-shadow-sm)]" : "border-[var(--gl-hairline)] bg-[var(--gl-paper)] text-[var(--gl-ink)] hover:bg-[var(--gl-bg-cream)]"}`}
            >
              {challenge.title}
            </button>
          ))}
        </div>
      ) : null}

      {selected ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Target} label="Progress" value={`${selected.percentComplete}%`} detail={`${formatNumber(selected.progressCount)} / ${formatNumber(selected.targetItems)} items`} />
            <StatCard icon={CheckCircle2} label="Approved items" value={formatNumber(selected.approvedItems)} detail={`${formatNumber(selected.approvedEvents)} approved actions`} />
            <StatCard icon={Users} label="Participants" value={formatNumber(selected.participants)} detail={`${formatNumber(selected.pendingEvents)} pending items`} />
            <StatCard icon={Leaf} accent="amber" label="CO2 saved" value={`${selected.estimatedCO2Saved.toFixed(1)} kg`} detail={selected.certificateAvailable ? "Certificate available" : "Certificate after completion"} />
          </div>

          <section className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-6 shadow-[var(--gl-shadow-sm)]">
            <div className="mb-4 flex items-center gap-2 text-[var(--gl-ink)]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gl-green-soft)] text-[var(--gl-green)]">
                <Flag className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-semibold">Challenge status</h2>
              <span className="ml-auto text-sm font-semibold text-[var(--gl-green)]">{selected.percentComplete}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--gl-green-soft)]">
              <div className="h-full rounded-full bg-[var(--gl-green)] transition-all" style={{ width: `${Math.min(100, selected.percentComplete)}%` }} />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-bg-cream)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gl-ink-muted)]">Status</p>
                <p className="mt-1 text-sm font-semibold capitalize text-[var(--gl-ink)]">{selected.status}</p>
              </div>
              <div className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-bg-cream)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gl-ink-muted)]">Target</p>
                <p className="mt-1 text-sm font-semibold text-[var(--gl-ink)]">{formatNumber(selected.targetItems)} items</p>
              </div>
              <div className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-bg-cream)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gl-ink-muted)]">Certificate</p>
                <p className="mt-1 text-sm font-semibold text-[var(--gl-ink)]">{selected.certificateAvailable ? "Available" : "Available after completion"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[var(--gl-radius)] border border-red-200 bg-red-50 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <Trash2 className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-red-900">Cancel challenge</h2>
                  <p className="mt-1 text-sm text-red-700">This removes the challenge from public participation without deleting historical recycling records.</p>
                </div>
              </div>
              <button type="button" onClick={cancelChallenge} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--gl-radius)] bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800">
                <Trash2 className="h-4 w-4" /> Cancel challenge
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
