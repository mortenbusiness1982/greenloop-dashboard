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

export default function PartnerPage() {
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

  if (loading) {
    return <main className="min-h-screen p-6 text-gray-700">Loading partner dashboard...</main>;
  }

  const now = new Date();

  const activeCount = pendingRedemptions.filter((r) => r.expires_at && new Date(r.expires_at) > now).length;

  const expiredCount = pendingRedemptions.filter((r) => r.expires_at && new Date(r.expires_at) < now).length;

  const redeemedCount = history.length;

  const activeRedemptions = pendingRedemptions.filter(
    (r) => r.expires_at && new Date(r.expires_at).getTime() > now.getTime(),
  );

  const sortedPendingRedemptions = [...activeRedemptions].sort((a, b) => {
    const aTime = a.expires_at ? new Date(a.expires_at).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.expires_at ? new Date(b.expires_at).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });

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

        <div>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white p-4 shadow">
              <div className="text-sm text-gray-500">Active Rewards</div>
              <div className="text-2xl font-bold">{activeCount}</div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow">
              <div className="text-sm text-gray-500">Redeemed</div>
              <div className="text-2xl font-bold">{redeemedCount}</div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow">
              <div className="text-sm text-gray-500">Expired</div>
              <div className="text-2xl font-bold">{expiredCount}</div>
            </div>
          </div>

          {activeCount === 0 && (
            <div className="mt-6 text-center">
              <div className="text-lg font-semibold text-gray-700">No active rewards</div>
              <div className="mt-2 text-sm text-gray-500">
                All rewards have been redeemed or expired.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
