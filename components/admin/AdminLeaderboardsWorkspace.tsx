"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Flag,
  Globe2,
  Hotel,
  RefreshCw,
  School,
  Trophy,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type LeaderboardScope = "team" | "school" | "hotel" | "brand" | "organization" | "country";

type LeaderboardEntry = {
  rank: number;
  entityId: string;
  displayName: string;
  approvedRecycles: number;
  memberCount: number;
  isCurrentEntity: boolean;
};

type LeaderboardResponse = {
  scope: LeaderboardScope;
  participantCount: number;
  countsOnlyApprovedRecycles: true;
  top: LeaderboardEntry[];
  currentEntities: LeaderboardEntry[];
};

const scopes: Array<{
  id: LeaderboardScope;
  label: string;
  description: string;
  icon: typeof Users;
}> = [
  { id: "team", label: "Teams", description: "Reusable teams created by organizations", icon: Users },
  { id: "school", label: "Schools", description: "School communities ranked by approved recycles", icon: School },
  { id: "hotel", label: "Hotels", description: "Hotel communities ranked by approved recycles", icon: Hotel },
  { id: "brand", label: "Brands", description: "Approved recycles linked to each brand's products", icon: Flag },
  { id: "organization", label: "Organizations", description: "All registered organizations", icon: Building2 },
  { id: "country", label: "Countries", description: "Approved recycling activity by country", icon: Globe2 },
];

function number(value: number) {
  return new Intl.NumberFormat().format(value || 0);
}

export function AdminLeaderboardsWorkspace() {
  const [scope, setScope] = useState<LeaderboardScope>("team");
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeScope = useMemo(() => scopes.find((item) => item.id === scope) || scopes[0], [scope]);

  const loadLeaderboard = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ leaderboard: LeaderboardResponse }>(`/leaderboards/${scope}?limit=10`, { token });
      setLeaderboard(response.leaderboard);
    } catch (reason) {
      setLeaderboard(null);
      setError(reason instanceof Error ? reason.message : "Could not load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--gl-green)]">Community performance</p>
          <h1 className="mt-1 text-3xl font-semibold text-[var(--gl-ink)]">Leaderboards</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--gl-ink-muted)]">
            Compare approved recycling across GreenLoop communities. Pending and rejected events never count.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadLeaderboard()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--gl-hairline)] bg-white px-4 py-2 text-sm font-semibold text-[var(--gl-ink)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Leaderboard type">
        {scopes.map((item) => {
          const Icon = item.icon;
          const selected = item.id === scope;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setScope(item.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                selected
                  ? "border-[var(--gl-green)] bg-[var(--gl-green)] text-white"
                  : "border-[var(--gl-hairline)] bg-white text-[var(--gl-ink)] hover:bg-[var(--gl-bg-cream)]"
              }`}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-[var(--gl-radius)] border border-[var(--gl-hairline)] bg-white shadow-[var(--gl-shadow-sm)]">
        <div className="flex items-start gap-3 border-b border-[var(--gl-hairline)] bg-[var(--gl-bg-cream)] px-5 py-4">
          <Trophy className="mt-0.5 h-5 w-5 text-[var(--gl-green)]" />
          <div>
            <h2 className="font-semibold text-[var(--gl-ink)]">{activeScope.label}</h2>
            <p className="text-sm text-[var(--gl-ink-muted)]">{activeScope.description}</p>
          </div>
          {leaderboard ? <span className="ml-auto text-xs font-semibold text-[var(--gl-ink-muted)]">{leaderboard.participantCount} ranked</span> : null}
        </div>

        {loading ? <p className="px-5 py-10 text-center text-sm text-[var(--gl-ink-muted)]">Loading rankings...</p> : null}
        {error ? <p className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{error}</p> : null}
        {!loading && !error && leaderboard?.top.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[var(--gl-ink-muted)]">No ranked communities yet.</p>
        ) : null}
        {!loading && !error && leaderboard?.top.length ? (
          <div className="divide-y divide-[var(--gl-hairline)]">
            {leaderboard.top.map((entry) => (
              <div key={entry.entityId} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${entry.rank <= 3 ? "bg-amber-100 text-amber-800" : "bg-[var(--gl-bg-cream)] text-[var(--gl-ink)]"}`}>#{entry.rank}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--gl-ink)]">{entry.displayName}</p>
                  <p className="text-xs text-[var(--gl-ink-muted)]">{number(entry.memberCount)} members</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-[var(--gl-ink)]">{number(entry.approvedRecycles)}</p>
                  <p className="text-xs text-[var(--gl-ink-muted)]">approved recycles</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
