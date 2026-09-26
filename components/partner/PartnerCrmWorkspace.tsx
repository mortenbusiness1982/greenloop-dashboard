"use client";

import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";

import Link from "next/link";
import styles from "@/components/crm/Workspace.module.css";
import { WorkspaceTabs } from "@/components/crm/WorkspaceTabs";
import { WorkspaceLabel, useWorkspaceLabels } from "@/components/crm/WorkspaceLabels";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getSession, getToken } from "@/lib/auth";

type PartnerWorkspaceKind = "overview" | "rewards" | "unlocks" | "history" | "settings";

type PendingRedemption = {
  token: string;
  reward_title: string;
  user_email: string;
  expires_at: string | null;
};

type RedemptionHistoryItem = {
  reward_title: string;
  user_email: string;
  redeemed_at: string | null;
  redeemed_by_partner_email: string;
};

function normalizeList<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    for (const key of keys) {
      const nested = (value as Record<string, unknown>)[key];
      if (Array.isArray(nested)) return nested as T[];
    }
  }
  return [];
}

function formatDateTime(value: string | null) {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function isExpired(redemption: PendingRedemption, now = new Date()) {
  return Boolean(redemption.expires_at && new Date(redemption.expires_at).getTime() < now.getTime());
}

function isActive(redemption: PendingRedemption, now = new Date()) {
  return !redemption.expires_at || new Date(redemption.expires_at).getTime() >= now.getTime();
}

export function PartnerCrmWorkspace({ kind }: { kind: PartnerWorkspaceKind }) {
  const router = useRouter();
  const t = useWorkspaceLabels();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRedemptions, setPendingRedemptions] = useState<PendingRedemption[]>([]);
  const [history, setHistory] = useState<RedemptionHistoryItem[]>([]);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [pendingResult, historyResult] = await Promise.all([
        apiFetch("/partner/redemptions/pending", { token }),
        apiFetch("/partner/redemptions/history", { token }),
      ]);

      setPendingRedemptions(normalizeList<PendingRedemption>(pendingResult, ["pending", "redemptions", "data"]));
      setHistory(normalizeList<RedemptionHistoryItem>(historyResult, ["history", "redemptions", "data"]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load partner CRM");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeRedemptions = pendingRedemptions.filter((redemption) => isActive(redemption)).sort((a, b) => {
      const aTime = a.expires_at ? new Date(a.expires_at).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.expires_at ? new Date(b.expires_at).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  const expiredRedemptions = pendingRedemptions.filter((redemption) => isExpired(redemption));
  const activeRewardTitles = Array.from(new Set(activeRedemptions.map((redemption) => redemption.reward_title))).sort();
  const session = getSession();

  return (
    <div className={`${styles.root} space-y-4`}>
      <WorkspaceHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="sr-only"><WorkspaceLabel text="Partner CRM" /></p>
          <h1 className="text-2xl font-semibold text-[var(--gl-ink)]">{t(titleForKind(kind))}</h1>
          <p className="sr-only">{descriptionForKind(kind)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/partner/unlocks" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {t("Unlock Queue")}
          </Link>
          <Link href="/partner/history" className="rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gl-green-deep)]">
            {t("History")}
          </Link>
        </div>
      </WorkspaceHeader>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {kind !== "settings" ? (
        <div className={styles.metrics}>
          <Kpi label="Active Unlocks" value={activeRedemptions.length} loading={loading} />
          <Kpi label="Assigned Rewards" value={activeRewardTitles.length} loading={loading} />
          <Kpi label="Used Rewards" value={history.length} loading={loading} />
          <Kpi label="Expired Unlocks" value={expiredRedemptions.length} loading={loading} />
        </div>
      ) : null}

      {kind === "overview" ? <WorkspaceTabs label={t("Overview")} tabs={[
        { id: "unlocks", label: `${t("Unlock Queue")} (${activeRedemptions.length})`, content: <UnlockTable title="Upcoming unlocks" redemptions={activeRedemptions} loading={loading} /> },
        { id: "rewards", label: `${t("Active Rewards")} (${activeRewardTitles.length})`, content: <RewardList rewards={activeRewardTitles} loading={loading} /> },
        { id: "history", label: `${t("History")} (${history.length})`, content: <RecentHistory history={history} loading={loading} /> },
      ]} /> : null}

      {kind === "rewards" ? <RewardList rewards={activeRewardTitles} loading={loading} full /> : null}
      {kind === "unlocks" ? <UnlockTable title="Active and pending unlocks" redemptions={activeRedemptions} loading={loading} /> : null}
      {kind === "history" ? (
        <div className={`${styles.root} space-y-4`}>
          <WorkspaceTabs label={t("History")} tabs={[
            { id: "used", label: t("Used reward history"), content: <HistoryTable history={history} loading={loading} /> },
            { id: "expired", label: t("Expired unlocks"), content: <UnlockTable title="Expired unlocks" redemptions={expiredRedemptions} loading={loading} emptyText="No expired unlocks." /> },
          ]} />
        </div>
      ) : null}
      {kind === "settings" ? <SettingsPanel email={session?.email} userId={session?.userId} /> : null}
    </div>
  );
}

function titleForKind(kind: PartnerWorkspaceKind) {
  const titles: Record<PartnerWorkspaceKind, string> = {
    overview: "Overview",
    rewards: "Active Rewards",
    unlocks: "Reward Unlocks",
    history: "History",
    settings: "Settings",
  };
  return titles[kind];
}

function descriptionForKind(kind: PartnerWorkspaceKind) {
  const descriptions: Record<PartnerWorkspaceKind, string> = {
    overview: "Fulfillment command center for active rewards, pending unlocks, used rewards, and recent activity.",
    rewards: "Rewards currently assigned to this partner account based on active unlock activity.",
    unlocks: "Active and pending reward unlocks that may need partner fulfillment support.",
    history: "Used and expired reward activity for partner support and reconciliation.",
    settings: "Partner account identity and profile information available to this dashboard.",
  };
  return descriptions[kind];
}

function Kpi({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  const t = useWorkspaceLabels();
  return (
    <div className="min-w-0 border-t border-[var(--gl-hairline)] py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{t(label)}</div>
      <div className="mt-2 text-2xl font-bold text-[var(--gl-ink)]">{loading ? "-" : value.toLocaleString()}</div>
    </div>
  );
}

function UnlockTable({
  title,
  redemptions,
  loading,
  emptyText = "No active unlocks.",
}: {
  title: string;
  redemptions: PendingRedemption[];
  loading: boolean;
  emptyText?: string;
}) {
  const t = useWorkspaceLabels();
  return (
    <section className="min-w-0">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-base font-semibold text-[var(--gl-ink)]">{t(title)}</h2>
        <p className="text-sm text-[var(--gl-ink-muted)]"><WorkspaceLabel text="Partner-scoped reward tokens only." /></p>
      </div>
      <div className="overflow-x-auto">
        <table className={styles.table}>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
            <tr>
              <th className="px-4 py-2.5"><WorkspaceLabel text="Reward" /></th>
              <th className="px-4 py-2.5"><WorkspaceLabel text="Customer" /></th>
              <th className="px-4 py-2.5"><WorkspaceLabel text="Token" /></th>
              <th className="px-4 py-2.5"><WorkspaceLabel text="Expires" /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]"><WorkspaceLabel text="Loading unlocks..." /></td></tr>
            ) : redemptions.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{t(emptyText)}</td></tr>
            ) : (
              redemptions.map((redemption) => (
                <tr key={redemption.token} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{redemption.reward_title}</td>
                  <td data-label={t("Customer")} className="px-4 py-2.5 text-slate-700">{redemption.user_email}</td>
                  <td data-label={t("Token")} className="px-4 py-2.5 font-mono text-slate-700">{redemption.token}</td>
                  <td data-label={t("Expires")} className="px-4 py-2.5 text-slate-700">{t(formatDateTime(redemption.expires_at))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HistoryTable({ history, loading }: { history: RedemptionHistoryItem[]; loading: boolean }) {
  const t = useWorkspaceLabels();
  return (
    <section className="min-w-0">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-base font-semibold text-[var(--gl-ink)]"><WorkspaceLabel text="Used reward history" /></h2>
      </div>
      <div className="overflow-x-auto">
        <table className={styles.table}>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
            <tr>
              <th className="px-4 py-2.5"><WorkspaceLabel text="Reward" /></th>
              <th className="px-4 py-2.5"><WorkspaceLabel text="Customer" /></th>
              <th className="px-4 py-2.5"><WorkspaceLabel text="Redeemed" /></th>
              <th className="px-4 py-2.5"><WorkspaceLabel text="Partner" /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]"><WorkspaceLabel text="Loading history..." /></td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]"><WorkspaceLabel text="No used rewards yet." /></td></tr>
            ) : (
              history.map((item, index) => (
                <tr key={`${item.reward_title}-${item.user_email}-${item.redeemed_at ?? index}`} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{item.reward_title}</td>
                  <td data-label={t("Customer")} className="px-4 py-2.5 text-slate-700">{item.user_email}</td>
                  <td data-label={t("Redeemed")} className="px-4 py-2.5 text-slate-700">{formatDateTime(item.redeemed_at)}</td>
                  <td data-label={t("Partner")} className="px-4 py-2.5 text-slate-700">{item.redeemed_by_partner_email || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RewardList({ rewards, loading, full = false }: { rewards: string[]; loading: boolean; full?: boolean }) {
  return (
    <section className={`min-w-0 border-t border-[var(--gl-hairline)] py-3 ${full ? "w-full" : ""}`}>
      <h2 className="text-base font-semibold text-[var(--gl-ink)]"><WorkspaceLabel text="Assigned active rewards" /></h2>
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-[var(--gl-ink-muted)]"><WorkspaceLabel text="Loading rewards..." /></p>
        ) : rewards.length === 0 ? (
          <p className="text-sm text-[var(--gl-ink-muted)]"><WorkspaceLabel text="No active rewards assigned from current unlocks." /></p>
        ) : (
          rewards.map((reward) => (
            <div key={reward} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
              {reward}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function RecentHistory({ history, loading }: { history: RedemptionHistoryItem[]; loading: boolean }) {
  return (
    <section className="min-w-0 border-t border-[var(--gl-hairline)] py-3">
      <h2 className="text-base font-semibold text-[var(--gl-ink)]"><WorkspaceLabel text="Recent used rewards" /></h2>
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-[var(--gl-ink-muted)]"><WorkspaceLabel text="Loading history..." /></p>
        ) : history.length === 0 ? (
          <p className="text-sm text-[var(--gl-ink-muted)]"><WorkspaceLabel text="No used rewards yet." /></p>
        ) : (
          history.map((item, index) => (
            <div key={`${item.reward_title}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div className="font-medium text-slate-900">{item.reward_title}</div>
              <div className="text-xs text-[var(--gl-ink-muted)]">{formatDateTime(item.redeemed_at)}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function SettingsPanel({ email, userId }: { email?: string; userId?: string }) {
  return (
    <section className="min-w-0 border-t border-[var(--gl-hairline)] py-3">
      <h2 className="text-base font-semibold text-[var(--gl-ink)]"><WorkspaceLabel text="Partner profile" /></h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Metric label="Signed-in email" value={email || "-"} />
        <Metric label="User ID" value={userId || "-"} />
        <Metric label="Workspace" value="Partner CRM" />
        <Metric label="Permissions" value="Partner-scoped fulfillment only" />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const t = useWorkspaceLabels();
  return (
    <div className="min-w-0 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{t(label)}</div>
      <div className="mt-2 break-words text-base font-semibold text-[var(--gl-ink)]">{t(value)}</div>
    </div>
  );
}
