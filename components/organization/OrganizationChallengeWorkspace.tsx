"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Flag, Leaf, RefreshCcw, Target, Trash2, UserPlus, Users } from "lucide-react";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { ChallengeInvitationTools } from "@/components/challenges/ChallengeInvitationTools";

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
  visibility?: "public" | "private";
  allowJoinRequests?: boolean;
  allowDirectInvites?: boolean;
  leaderboardEnabled?: boolean;
};

type ChallengeParticipant = {
  id: string;
  status: "requested" | "invited" | "approved" | "rejected" | "removed";
  source: string;
  displayName?: string | null;
  email?: string | null;
  approvedRecycles: number;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("en-US");
}

function parseParticipantInvites(value: string) {
  const byEmail = new Map<string, { email: string; displayName?: string }>();
  for (const line of value.split(/[\n;]+/).map((item) => item.trim()).filter(Boolean)) {
    const parts = line.split(",").map((item) => item.trim()).filter(Boolean);
    if (parts.length >= 2 && !parts[0].includes("@") && parts[1].includes("@")) {
      byEmail.set(parts[1].toLowerCase(), { email: parts[1], displayName: parts[0] });
      continue;
    }
    for (const email of parts.filter((item) => item.includes("@"))) {
      byEmail.set(email.toLowerCase(), { email });
    }
  }
  return Array.from(byEmail.values());
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
  const [participants, setParticipants] = useState<ChallengeParticipant[]>([]);
  const [inviteEmails, setInviteEmails] = useState("");
  const [participantAction, setParticipantAction] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
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

  useEffect(() => {
    if (!selected?.id) return;
    const token = getToken();
    if (!token) return;
    apiFetch<{ participants: ChallengeParticipant[] }>(`/organization/challenges/${selected.id}/participants`, { token })
      .then((data) => setParticipants(data.participants || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load participants"));
  }, [selected?.id]);

  async function inviteParticipants() {
    if (!selected) return;
    const token = getToken();
    if (!token) return router.replace("/login");
    const invitees = parseParticipantInvites(inviteEmails);
    if (!invitees.length) return;

    setParticipantAction("invite");
    setError(null);
    try {
      await apiFetch(`/organization/challenges/${selected.id}/invitations`, {
        token,
        method: "POST",
        body: { participants: invitees },
      });
      setInviteEmails("");
      const data = await apiFetch<{ participants: ChallengeParticipant[] }>(`/organization/challenges/${selected.id}/participants`, { token });
      setParticipants(data.participants || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not invite participants");
    } finally {
      setParticipantAction(null);
    }
  }

  async function decideParticipant(participantId: string, status: "approved" | "rejected" | "removed") {
    if (!selected) return;
    const token = getToken();
    if (!token) return router.replace("/login");
    setParticipantAction(`${participantId}-${status}`);
    setError(null);
    try {
      await apiFetch(`/organization/challenges/${selected.id}/participants/${participantId}`, {
        token,
        method: "PATCH",
        body: { status },
      });
      const data = await apiFetch<{ participants: ChallengeParticipant[] }>(`/organization/challenges/${selected.id}/participants`, { token });
      setParticipants(data.participants || []);
      await loadChallenges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update participant");
    } finally {
      setParticipantAction(null);
    }
  }

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
      <div className="space-y-5">
        <section className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-8 text-center shadow-[var(--gl-shadow-sm)]">
          <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-[var(--gl-green-soft)] ring-1 ring-[var(--gl-green-ring)]">
            <Image src="/bella-stage-2.png" alt="GreenLoop companion turtle" width={104} height={104} className="h-24 w-24 object-contain" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--gl-green)]">Organization portal</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--gl-ink)]">Create your first challenge</h1>
          <p className="mt-2 text-[var(--gl-ink-muted)]">Choose public discovery or private participant access from the start.</p>
          <button type="button" onClick={() => setShowCreate(true)} className="mt-5 rounded-[var(--gl-radius)] bg-[var(--gl-green)] px-5 py-2.5 text-sm font-semibold text-white">New challenge</button>
        </section>
        {showCreate ? <OrganizationChallengeCreatePanel onCancel={() => setShowCreate(false)} onCreated={async () => { setShowCreate(false); await loadChallenges(); }} /> : null}
      </div>
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
            <button type="button" onClick={() => setShowCreate((current) => !current)} className="inline-flex items-center gap-2 rounded-[var(--gl-radius)] bg-[var(--gl-green)] px-3 py-2 text-sm font-semibold text-white shadow-[var(--gl-shadow-sm)]">
              <UserPlus className="h-4 w-4" /> New challenge
            </button>
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

      {showCreate ? <OrganizationChallengeCreatePanel onCancel={() => setShowCreate(false)} onCreated={async () => { setShowCreate(false); await loadChallenges(); }} /> : null}

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

          <section className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-6 shadow-[var(--gl-shadow-sm)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gl-green-soft)] text-[var(--gl-green)]"><Users className="h-4 w-4" /></span>
                  <h2 className="text-lg font-semibold text-[var(--gl-ink)]">Participants</h2>
                </div>
                <p className="mt-2 text-sm text-[var(--gl-ink-muted)]">{selected.visibility === "private" ? "Private challenge access and requests." : "People who joined this public challenge."}</p>
              </div>
              {selected.visibility === "private" && selected.allowDirectInvites ? (
                <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
                  <textarea value={inviteEmails} onChange={(event) => setInviteEmails(event.target.value)} rows={2} placeholder={"Name, name@example.com\nanother@example.com"} className="min-h-20 flex-1 rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
                  <button type="button" onClick={inviteParticipants} disabled={!inviteEmails.trim() || participantAction === "invite"} className="inline-flex items-center justify-center gap-2 rounded-[var(--gl-radius)] bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    <UserPlus className="h-4 w-4" /> {participantAction === "invite" ? "Inviting..." : "Invite"}
                  </button>
                </div>
              ) : null}
            </div>

            {selected.visibility === "private" && selected.allowDirectInvites ? (
              <ChallengeInvitationTools challengeId={selected.id} basePath="/organization/challenges" />
            ) : null}

            <div className="mt-5 overflow-x-auto rounded-[var(--gl-radius)] border border-[var(--gl-hairline)]">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead className="bg-[var(--gl-bg-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]"><tr><th className="px-4 py-3">Participant</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Approved recycles</th><th className="px-4 py-3">Action</th></tr></thead>
                <tbody>
                  {participants.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">No participants yet.</td></tr> : participants.map((participant) => (
                    <tr key={participant.id} className="border-t border-[var(--gl-hairline)]">
                      <td className="px-4 py-3"><div className="font-semibold text-[var(--gl-ink)]">{participant.displayName || participant.email || "Pending user"}</div>{participant.displayName && participant.email ? <div className="text-xs text-[var(--gl-ink-muted)]">{participant.email}</div> : null}</td>
                      <td className="px-4 py-3 capitalize text-[var(--gl-ink-soft)]">{participant.status}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--gl-ink)]">{formatNumber(participant.approvedRecycles)}</td>
                      <td className="px-4 py-3"><div className="flex gap-2">{participant.status === "requested" ? <><button type="button" onClick={() => decideParticipant(participant.id, "approved")} className="rounded-lg bg-[var(--gl-green)] px-3 py-1.5 font-semibold text-white">Approve</button><button type="button" onClick={() => decideParticipant(participant.id, "rejected")} className="rounded-lg border border-[var(--gl-hairline)] px-3 py-1.5 font-semibold">Reject</button></> : null}{participant.status === "approved" ? <button type="button" onClick={() => decideParticipant(participant.id, "removed")} className="rounded-lg border border-red-200 px-3 py-1.5 font-semibold text-red-700">Remove</button> : null}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <OrganizationTeamsWorkspace />

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

type OrganizationTeam = {
  id: string;
  name: string;
  active: boolean;
  members: number;
};

function OrganizationTeamsWorkspace() {
  const [teams, setTeams] = useState<OrganizationTeam[]>([]);
  const [teamName, setTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [memberEmails, setMemberEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadTeams() {
    const token = getToken();
    if (!token) return;
    const response = await apiFetch<{ teams: OrganizationTeam[] }>("/organization/teams", { token });
    setTeams(response.teams || []);
    setSelectedTeamId((current) => current || response.teams?.[0]?.id || "");
  }

  useEffect(() => {
    void loadTeams();
  }, []);

  async function createTeam() {
    const token = getToken();
    if (!token || !teamName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await apiFetch<{ team: OrganizationTeam }>("/organization/teams", {
        token,
        method: "POST",
        body: { name: teamName.trim() },
      });
      setTeamName("");
      setSelectedTeamId(response.team.id);
      setNotice(`${response.team.name} created.`);
      await loadTeams();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Could not create team");
    } finally {
      setBusy(false);
    }
  }

  async function addMembers() {
    const token = getToken();
    if (!token || !selectedTeamId) return;
    const emails = Array.from(new Set(memberEmails.split(/[\s,;]+/).map((email) => email.trim().toLowerCase()).filter((email) => email.includes("@"))));
    if (!emails.length) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await apiFetch<{ addedCount: number }>(`/organization/teams/${selectedTeamId}/members`, {
        token,
        method: "POST",
        body: { emails },
      });
      setMemberEmails("");
      setNotice(`${response.addedCount} organization members added to the team.`);
      await loadTeams();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Could not add team members");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-6 shadow-[var(--gl-shadow-sm)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--gl-green-soft)] text-[var(--gl-green)]"><Users className="h-4 w-4" /></span>
        <div>
          <h2 className="text-lg font-semibold text-[var(--gl-ink)]">Leaderboard teams</h2>
          <p className="mt-1 text-sm text-[var(--gl-ink-muted)]">Group organization members into teams for the shared team ranking.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="flex gap-2">
          <input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Team name" className="min-w-0 flex-1 rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
          <button type="button" onClick={createTeam} disabled={busy || !teamName.trim()} className="rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create</button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} className="rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm">
            <option value="">Choose team</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name} ({team.members})</option>)}
          </select>
          <input value={memberEmails} onChange={(event) => setMemberEmails(event.target.value)} placeholder="Member emails" className="min-w-0 flex-1 rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
          <button type="button" onClick={addMembers} disabled={busy || !selectedTeamId || !memberEmails.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--gl-hairline)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink)] disabled:opacity-50"><UserPlus className="h-4 w-4" /> Add</button>
        </div>
      </div>
      {notice ? <p className="mt-3 text-sm font-medium text-[var(--gl-ink-muted)]">{notice}</p> : null}
      {teams.length ? <div className="mt-4 flex flex-wrap gap-2">{teams.map((team) => <span key={team.id} className="rounded-full bg-[var(--gl-bg-cream)] px-3 py-1.5 text-sm font-semibold text-[var(--gl-ink)]">{team.name} · {team.members}</span>)}</div> : null}
    </section>
  );
}

function OrganizationChallengeCreatePanel({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [allowJoinRequests, setAllowJoinRequests] = useState(false);
  const [allowDirectInvites, setAllowDirectInvites] = useState(false);
  const [requiredCount, setRequiredCount] = useState("100");
  const [bonusPoints, setBonusPoints] = useState("0");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/organization/challenges", {
        token,
        method: "POST",
        body: {
          title,
          description,
          challengeType: "community",
          visibility,
          allowJoinRequests: visibility === "private" && allowJoinRequests,
          allowDirectInvites: visibility === "private" && allowDirectInvites,
          leaderboardEnabled: true,
          targetKind: "any",
          requiredCount: Number(requiredCount),
          bonusPoints: Number(bonusPoints || 0),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        },
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create challenge");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-6 shadow-[var(--gl-shadow-sm)]">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--gl-green)]">New challenge</p><h2 className="mt-1 text-2xl font-semibold text-[var(--gl-ink)]">Set the participation rules</h2></div><button type="button" onClick={onCancel} className="text-sm font-semibold text-[var(--gl-ink-muted)]">Close</button></div>
      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="md:col-span-2"><span className="mb-1 block text-sm font-semibold text-[var(--gl-ink)]">Title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2" /></label>
        <label className="md:col-span-2"><span className="mb-1 block text-sm font-semibold text-[var(--gl-ink)]">Description</span><textarea required rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2" /></label>
        <label><span className="mb-1 block text-sm font-semibold text-[var(--gl-ink)]">Access</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "private")} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2"><option value="public">Public - anyone can join</option><option value="private">Private - controlled access</option></select></label>
        <label><span className="mb-1 block text-sm font-semibold text-[var(--gl-ink)]">Shared recycle target</span><input required min="1" type="number" value={requiredCount} onChange={(event) => setRequiredCount(event.target.value)} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2" /></label>
        {visibility === "private" ? <div className="space-y-3 rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-bg-cream)] p-4 md:col-span-2"><label className="flex gap-3 text-sm"><input type="checkbox" checked={allowJoinRequests} onChange={(event) => setAllowJoinRequests(event.target.checked)} className="h-4 w-4 accent-[var(--gl-green)]" /><span><strong className="block">Approve join requests</strong>Let users ask to join.</span></label><label className="flex gap-3 text-sm"><input type="checkbox" checked={allowDirectInvites} onChange={(event) => setAllowDirectInvites(event.target.checked)} className="h-4 w-4 accent-[var(--gl-green)]" /><span><strong className="block">Invite participants</strong>Add emails after creation.</span></label></div> : null}
        <label><span className="mb-1 block text-sm font-semibold text-[var(--gl-ink)]">Starts</span><input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2" /></label>
        <label><span className="mb-1 block text-sm font-semibold text-[var(--gl-ink)]">Ends</span><input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2" /></label>
        <label><span className="mb-1 block text-sm font-semibold text-[var(--gl-ink)]">EcoPoints per participant</span><input min="0" type="number" value={bonusPoints} onChange={(event) => setBonusPoints(event.target.value)} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2" /></label>
      </div>
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg border border-[var(--gl-hairline)] px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Creating..." : "Create challenge"}</button></div>
    </form>
  );
}
