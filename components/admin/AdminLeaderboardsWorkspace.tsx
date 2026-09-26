"use client";

import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";

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
import { useDashboardLanguage } from "@/components/crm/DashboardLanguage";

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
  const { language } = useDashboardLanguage();
  const tr = (en: string, es: string) => language === "es" ? es : en;
  const scopeLabels: Record<LeaderboardScope, string> = {
    team: tr("Teams", "Equipos"), school: tr("Schools", "Colegios"),
    hotel: tr("Hotels", "Hoteles"), brand: tr("Brands", "Marcas"),
    organization: tr("Organizations", "Organizaciones"), country: tr("Countries", "Países"),
  };
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
    <div className="min-w-0 space-y-4">
      <WorkspaceHeader className="flex items-center justify-between gap-3">
        <h1 className="flex min-w-0 items-center gap-2 text-2xl font-semibold text-[var(--gl-ink)]">
          <Trophy aria-hidden="true" className="hidden h-5 w-5 shrink-0 text-[var(--gl-green)] sm:block" />
          {tr("Leaderboards", "Clasificaciones")}
        </h1>
        <button
          type="button"
          onClick={() => void loadLeaderboard()}
          disabled={loading}
          aria-label={tr("Refresh rankings", "Actualizar clasificaciones")}
          title={tr("Refresh rankings", "Actualizar clasificaciones")}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--gl-hairline)] bg-white text-[var(--gl-ink)] hover:bg-[var(--gl-card-cream)] disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </WorkspaceHeader>

      <div className="grid grid-cols-3 border-b border-[var(--gl-hairline)] sm:flex" role="tablist" aria-label={tr("Leaderboard type", "Tipo de clasificación")}>
        {scopes.map((item, index) => {
          const Icon = item.icon;
          const selected = item.id === scope;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`leaderboard-tab-${item.id}`}
              aria-controls="leaderboard-panel"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              disabled={loading}
              onClick={() => setScope(item.id)}
              onKeyDown={(event) => {
                const target = event.key === "Home" ? 0 : event.key === "End" ? scopes.length - 1
                  : event.key === "ArrowRight" ? (index + 1) % scopes.length
                  : event.key === "ArrowLeft" ? (index + scopes.length - 1) % scopes.length : null;
                if (target === null) return;
                event.preventDefault();
                document.getElementById(`leaderboard-tab-${scopes[target].id}`)?.focus();
                setScope(scopes[target].id);
              }}
              className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 border-b-2 px-1 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                selected
                  ? "border-[var(--gl-green)] bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"
                  : "border-transparent text-[var(--gl-ink-muted)] hover:bg-[var(--gl-paper)]"
              }`}
            >
              <Icon aria-hidden="true" className="hidden h-4 w-4 shrink-0 lg:block" />
              <span className="break-words">{scopeLabels[item.id]}</span>
            </button>
          );
        })}
      </div>

      <section id="leaderboard-panel" role="tabpanel" aria-labelledby={`leaderboard-tab-${activeScope.id}`} aria-busy={loading} className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[var(--gl-ink-muted)]">
          <p>{tr("Only approved recycling counts.", "Solo cuenta el reciclaje aprobado.")}</p>
          {!loading && leaderboard ? <p>{tr("Top", "Top")} {number(leaderboard.top.length)} · {number(leaderboard.participantCount)} {tr("ranked", "en la clasificación")}</p> : null}
        </div>

        {loading ? <p role="status" className="bg-[var(--gl-paper)] px-4 py-8 text-center text-sm text-[var(--gl-ink-muted)]">{tr("Loading rankings...", "Cargando clasificaciones...")}</p> : null}
        {error ? <p role="alert" className="rounded-lg border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] p-4 text-sm font-medium text-[var(--gl-coral-ink)]">{error}</p> : null}
        {!loading && !error && leaderboard?.top.length === 0 ? (
          <p className="bg-[var(--gl-paper)] px-4 py-8 text-center text-sm text-[var(--gl-ink-muted)]">{tr("No ranked communities yet.", "Todavía no hay comunidades clasificadas.")}</p>
        ) : null}
        {!loading && !error && leaderboard?.top.length ? (
          <div role="region" aria-label={tr("Rankings", "Clasificación")} tabIndex={0} className="max-h-[65dvh] overflow-auto bg-[var(--gl-paper)] focus-visible:outline-2 focus-visible:outline-[var(--gl-green)]">
            <table className="w-full table-fixed text-sm">
              <caption className="sr-only">{scopeLabels[activeScope.id]} — {tr("Top 10 by approved recycles", "Top 10 por reciclajes aprobados")}</caption>
              <thead className="sticky top-0 bg-[var(--gl-card-cream)] text-xs text-[var(--gl-ink-muted)]">
                <tr>
                  <th scope="col" className="w-11 px-2 py-3 text-center"><span aria-hidden="true">#</span><span className="sr-only">{tr("Rank", "Puesto")}</span></th>
                  <th scope="col" className="px-2 py-3 text-left font-medium">{scopeLabels[activeScope.id]}</th>
                  <th scope="col" className="hidden w-28 px-3 py-3 text-right font-medium sm:table-cell">{tr("Members", "Miembros")}</th>
                  <th scope="col" className="w-28 px-3 py-3 text-right font-medium sm:w-40">{tr("Approved recycles", "Reciclajes aprobados")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gl-hairline)]">
                {leaderboard.top.map((entry) => (
                  <tr key={entry.entityId}>
                    <td className="px-2 py-3 align-top"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${entry.rank <= 3 ? "bg-amber-100 text-amber-800" : "text-[var(--gl-ink-muted)]"}`}>{entry.rank}</span></td>
                    <th scope="row" className="break-words px-2 py-3 text-left align-top font-medium text-[var(--gl-ink)]">
                      {entry.displayName}
                      <span className="mt-0.5 block text-xs font-normal text-[var(--gl-ink-muted)] sm:hidden">{number(entry.memberCount)} {tr("members", "miembros")}</span>
                    </th>
                    <td className="hidden px-3 py-3 text-right align-top tabular-nums text-[var(--gl-ink-muted)] sm:table-cell">{number(entry.memberCount)}</td>
                    <td className="break-words px-3 py-3 text-right align-top font-semibold tabular-nums text-[var(--gl-ink)]">{number(entry.approvedRecycles)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
