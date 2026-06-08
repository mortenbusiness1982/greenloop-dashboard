"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Flag, RefreshCcw, Trash2 } from "lucide-react";
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

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--gl-ink)]">{value}</p>
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
    return <div className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-6 text-[var(--gl-ink-muted)]">Loading organization challenges...</div>;
  }

  if (!challenges.length) {
    return (
      <section className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--gl-green)]">Organization portal</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--gl-ink)]">No challenges yet</h1>
        <p className="mt-2 text-[var(--gl-ink-muted)]">Approved community challenges for your organization will appear here.</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--gl-green)]">Organization portal</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--gl-ink)]">{selected?.title}</h1>
            <p className="mt-2 max-w-3xl text-[var(--gl-ink-muted)]">{selected?.description}</p>
            <p className="mt-3 text-sm text-[var(--gl-ink-muted)]">
              {selected?.organization?.name || "Your organization"} · {formatDate(selected?.startsAt)} - {formatDate(selected?.endsAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={loadChallenges} className="inline-flex items-center gap-2 rounded-md border border-[var(--gl-hairline)] px-3 py-2 text-sm font-semibold text-[var(--gl-ink)]">
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>
            <button type="button" onClick={() => downloadCertificate("en")} disabled={!selected?.certificateAvailable} className="inline-flex items-center gap-2 rounded-md bg-[var(--gl-green)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Download className="h-4 w-4" /> Certificate EN
            </button>
            <button type="button" onClick={() => downloadCertificate("es")} disabled={!selected?.certificateAvailable} className="inline-flex items-center gap-2 rounded-md border border-[var(--gl-hairline)] px-3 py-2 text-sm font-semibold text-[var(--gl-ink)] disabled:opacity-50">
              <Download className="h-4 w-4" /> Certificate ES
            </button>
          </div>
        </div>

        {message ? <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      </section>

      {challenges.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {challenges.map((challenge) => (
            <button
              key={challenge.id}
              type="button"
              onClick={() => setSelectedId(challenge.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${challenge.id === selected?.id ? "bg-[var(--gl-green)] text-white" : "border-[var(--gl-hairline)] bg-[var(--gl-paper)] text-[var(--gl-ink)]"}`}
            >
              {challenge.title}
            </button>
          ))}
        </div>
      ) : null}

      {selected ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Progress" value={`${selected.percentComplete}%`} detail={`${formatNumber(selected.progressCount)} / ${formatNumber(selected.targetItems)} items`} />
            <StatCard label="Approved items" value={formatNumber(selected.approvedItems)} detail={`${formatNumber(selected.approvedEvents)} approved actions`} />
            <StatCard label="Participants" value={formatNumber(selected.participants)} detail={`${formatNumber(selected.pendingEvents)} pending items`} />
            <StatCard label="CO2 saved" value={`${selected.estimatedCO2Saved.toFixed(1)} kg`} detail={selected.certificateAvailable ? "Certificate available" : "Certificate after completion"} />
          </div>

          <section className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5">
            <div className="mb-3 flex items-center gap-2 text-[var(--gl-ink)]">
              <Flag className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Challenge status</h2>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--gl-green-soft)]">
              <div className="h-full rounded-full bg-[var(--gl-green)]" style={{ width: `${Math.min(100, selected.percentComplete)}%` }} />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-[var(--gl-ink-muted)] md:grid-cols-3">
              <p><strong className="text-[var(--gl-ink)]">Status:</strong> {selected.status}</p>
              <p><strong className="text-[var(--gl-ink)]">Target:</strong> {formatNumber(selected.targetItems)} items</p>
              <p><strong className="text-[var(--gl-ink)]">Certificate:</strong> {selected.certificateAvailable ? "Available" : "Available after completion"}</p>
            </div>
          </section>

          <section className="rounded-lg border border-red-200 bg-red-50 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-red-900">Cancel challenge</h2>
                <p className="mt-1 text-sm text-red-700">This removes the challenge from public participation without deleting historical recycling records.</p>
              </div>
              <button type="button" onClick={cancelChallenge} className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white">
                <Trash2 className="h-4 w-4" /> Cancel challenge
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
