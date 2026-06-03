"use client";

import Link from "next/link";
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
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Partner CRM</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{titleForKind(kind)}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">{descriptionForKind(kind)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/partner/unlocks" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Unlock Queue
          </Link>
          <Link href="/partner/history" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            History
          </Link>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {kind !== "settings" ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Kpi label="Active Unlocks" value={activeRedemptions.length} loading={loading} />
          <Kpi label="Assigned Rewards" value={activeRewardTitles.length} loading={loading} />
          <Kpi label="Used Rewards" value={history.length} loading={loading} />
          <Kpi label="Expired Unlocks" value={expiredRedemptions.length} loading={loading} />
        </div>
      ) : null}

      {kind === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <UnlockTable title="Upcoming unlocks" redemptions={activeRedemptions.slice(0, 8)} loading={loading} />
          <aside className="space-y-5">
            <RewardList rewards={activeRewardTitles} loading={loading} />
            <RecentHistory history={history.slice(0, 6)} loading={loading} />
          </aside>
        </div>
      ) : null}

      {kind === "rewards" ? <RewardList rewards={activeRewardTitles} loading={loading} full /> : null}
      {kind === "unlocks" ? <UnlockTable title="Active and pending unlocks" redemptions={activeRedemptions} loading={loading} /> : null}
      {kind === "history" ? (
        <div className="space-y-5">
          <UnlockTable title="Expired unlocks" redemptions={expiredRedemptions} loading={loading} emptyText="No expired unlocks." />
          <HistoryTable history={history} loading={loading} />
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
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-950">{loading ? "-" : value.toLocaleString()}</div>
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
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="text-sm text-slate-500">Partner-scoped reward tokens only.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Reward</th>
              <th className="px-4 py-2.5">Customer</th>
              <th className="px-4 py-2.5">Token</th>
              <th className="px-4 py-2.5">Expires</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading unlocks...</td></tr>
            ) : redemptions.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">{emptyText}</td></tr>
            ) : (
              redemptions.map((redemption) => (
                <tr key={redemption.token} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{redemption.reward_title}</td>
                  <td className="px-4 py-2.5 text-slate-700">{redemption.user_email}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700">{redemption.token}</td>
                  <td className="px-4 py-2.5 text-slate-700">{formatDateTime(redemption.expires_at)}</td>
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
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-950">Used reward history</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Reward</th>
              <th className="px-4 py-2.5">Customer</th>
              <th className="px-4 py-2.5">Redeemed</th>
              <th className="px-4 py-2.5">Partner</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading history...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No used rewards yet.</td></tr>
            ) : (
              history.map((item, index) => (
                <tr key={`${item.reward_title}-${item.user_email}-${item.redeemed_at ?? index}`} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{item.reward_title}</td>
                  <td className="px-4 py-2.5 text-slate-700">{item.user_email}</td>
                  <td className="px-4 py-2.5 text-slate-700">{formatDateTime(item.redeemed_at)}</td>
                  <td className="px-4 py-2.5 text-slate-700">{item.redeemed_by_partner_email || "-"}</td>
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
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${full ? "max-w-4xl" : ""}`}>
      <h2 className="text-lg font-semibold text-slate-950">Assigned active rewards</h2>
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading rewards...</p>
        ) : rewards.length === 0 ? (
          <p className="text-sm text-slate-500">No active rewards assigned from current unlocks.</p>
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
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Recent used rewards</h2>
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-500">No used rewards yet.</p>
        ) : (
          history.map((item, index) => (
            <div key={`${item.reward_title}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div className="font-medium text-slate-900">{item.reward_title}</div>
              <div className="text-xs text-slate-500">{formatDateTime(item.redeemed_at)}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function SettingsPanel({ email, userId }: { email?: string; userId?: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Partner profile</h2>
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
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 break-words text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}
