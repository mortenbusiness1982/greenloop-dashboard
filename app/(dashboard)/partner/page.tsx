"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

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
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function PartnerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRedemptions, setPendingRedemptions] = useState<PendingRedemption[]>([]);
  const [history, setHistory] = useState<RedemptionHistoryItem[]>([]);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setError(null);
      const [pendingResult, historyResult] = await Promise.all([
        apiFetch("/partner/redemptions/pending", { token }),
        apiFetch("/partner/redemptions/history", { token }),
      ]);

      setPendingRedemptions(normalizeList<PendingRedemption>(pendingResult, ["pending", "redemptions", "data"]));
      setHistory(normalizeList<RedemptionHistoryItem>(historyResult, ["history", "redemptions", "data"]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load partner dashboard");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function onLogout() {
    clearToken();
    router.replace("/login");
  }

  async function consumeReward(redemptionToken: string) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setActiveToken(redemptionToken);
      setError(null);
      await apiFetch("/rewards/consume", {
        token,
        method: "POST",
        body: { token: redemptionToken },
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to consume reward");
    } finally {
      setActiveToken(null);
    }
  }

  if (loading) {
    return <main className="min-h-screen p-6 text-gray-700">Loading partner dashboard...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Partner Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Manage pending redemptions and view redemption history.</p>
          </div>
          <button onClick={onLogout} className="rounded bg-gray-900 px-4 py-2 text-white">
            Logout
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        <div className="space-y-8">
          <SectionCard
            title="Pending Redemptions"
            description="Consume active redemption tokens presented by users."
          >
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-left">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Reward</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">User Email</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Token</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Expires At</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRedemptions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                        No pending redemptions.
                      </td>
                    </tr>
                  ) : (
                    pendingRedemptions.map((item) => (
                      <tr key={item.token} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-900">{item.reward_title}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.user_email}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.token}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDateTime(item.expires_at)}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => consumeReward(item.token)}
                            disabled={activeToken === item.token}
                            className="rounded-md bg-[#2d6a4f] px-3 py-1.5 text-white transition hover:bg-[#24543f] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Consume
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Redemption History"
            description="Review previously consumed redemptions."
          >
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-left">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Reward</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">User Email</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Redeemed At</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Redeemed By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                        No redemption history found.
                      </td>
                    </tr>
                  ) : (
                    history.map((item, index) => (
                      <tr
                        key={`${item.reward_title}-${item.user_email}-${item.redeemed_at ?? index}`}
                        className="border-b border-gray-100"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">{item.reward_title}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.user_email}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDateTime(item.redeemed_at)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.redeemed_by_partner_email || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
