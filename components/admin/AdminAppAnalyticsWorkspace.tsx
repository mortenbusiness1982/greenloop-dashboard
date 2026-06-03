"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, BarChart3, GitBranch, HeartPulse, Route, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type FilterOptions = {
  platforms: string[];
  locales: string[];
  appVersions: string[];
  screens: string[];
  eventNames: string[];
};

type AppAnalyticsResponse = {
  totals: {
    totalEvents: number;
    trackedUsers: number;
    trackedSessions: number;
    eventsPerSession: number;
    averageSessionDurationMs: number;
  };
  movement: {
    daily: { day: string; events: number; users: number; sessions: number }[];
    topScreens: { screen: string; screen_views: number; users: number; sessions: number }[];
    topTransitions: { previous_screen: string; screen: string; transitions: number; users: number; sessions: number }[];
    entryScreens: { screen: string; entries: number; users: number; sessions: number }[];
    exitScreens: { screen: string; exits: number; users: number; sessions: number }[];
    screenLoops: { screen: string; repeats: number; users: number; sessions: number }[];
    averageDurationByScreen: { screen: string; average_duration_ms: number; measured_events: number }[];
  };
  funnels: Record<"recycling" | "rewards" | "challenges", {
    steps: FunnelStep[];
    largestDropOff: { from: string; to: string; users: number } | null;
  }>;
  friction: {
    byScreen: { event_name: string; screen: string; platform: string; locale: string; app_version: string; events: number; users: number }[];
    byDay: { day: string; event_name: string; events: number }[];
  };
  breakdowns: {
    platform: { platform: string; events: number; users: number; sessions: number }[];
    appVersion: { app_version: string; platform: string; events: number; users: number; sessions: number }[];
  };
  outcomes: { outcome: string; viewedUsers: number; outcomeUsers: number; overlapUsers: number; conversionRate: number | null }[];
  health: {
    latestAppEventAt: string | null;
    totalEvents: number;
    sessionIdPercent: number;
    sequenceIndexPercent: number;
    durationMsPercent: number;
    appVersionsSeen: number;
    platformsSeen: number;
  };
  filterOptions: FilterOptions;
  privacy: { aggregateOnly: boolean; rawMetadataExposed: boolean; rawUserIdsExposed: boolean; source: string };
};

type FunnelStep = {
  step: string;
  events: number;
  users: number;
  sessions: number;
  conversionFromPrevious: number | null;
  dropOffFromPrevious: number;
};

type Filters = {
  from: string;
  to: string;
  platform: string;
  locale: string;
  appVersion: string;
  screen: string;
  eventName: string;
};

const emptyOptions: FilterOptions = {
  platforms: [],
  locales: [],
  appVersions: [],
  screens: [],
  eventNames: [],
};

function formatNumber(value: number | undefined, digits = 0) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "-";
  return `${formatNumber(value * 100, 1)}%`;
}

function formatDuration(ms: number | undefined) {
  const value = Number(ms || 0);
  if (value < 1000) return `${formatNumber(value)} ms`;
  if (value < 60_000) return `${formatNumber(value / 1000, 1)} sec`;
  return `${formatNumber(value / 60_000, 1)} min`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function humanize(value: string) {
  return value.replace(/^backend_/, "").replace(/_/g, " ");
}

export function AdminAppAnalyticsWorkspace() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>({ from: "", to: "", platform: "", locale: "", appVersion: "", screen: "", eventName: "" });
  const [data, setData] = useState<AppAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.platform) params.set("platform", filters.platform);
      if (filters.locale) params.set("locale", filters.locale);
      if (filters.appVersion) params.set("appVersion", filters.appVersion);
      if (filters.screen) params.set("screen", filters.screen);
      if (filters.eventName) params.set("eventName", filters.eventName);

      const response = await apiFetch<AppAnalyticsResponse>(`/admin/reports/app-analytics${params.toString() ? `?${params.toString()}` : ""}`, { token });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load app analytics");
    } finally {
      setLoading(false);
    }
  }, [filters, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAnalytics(), 250);
    return () => window.clearTimeout(timer);
  }, [loadAnalytics]);

  const options = data?.filterOptions ?? emptyOptions;
  const totals = data?.totals;
  const health = data?.health;

  const frictionTotal = useMemo(
    () => (data?.friction.byScreen ?? []).reduce((sum, row) => sum + Number(row.events || 0), 0),
    [data?.friction.byScreen]
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--gl-green)]">Admin · Product Behavior</p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--gl-ink)]">App Analytics</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--gl-ink-muted)]">
            Aggregate-only production app behavior analytics from reporting views. No raw metadata, user IDs, emails, tokens, media URLs, or precise locations are shown.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/reports" className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">
            Reports hub
          </Link>
        </div>
      </header>

      {error ? <div role="alert" className="rounded-lg border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] p-4 text-sm text-[var(--gl-coral-ink)]">{error}</div> : null}

      <FiltersPanel filters={filters} setFilters={setFilters} options={options} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Activity} label="Total events" value={loading ? "-" : formatNumber(totals?.totalEvents)} />
        <Kpi icon={BarChart3} label="Tracked users" value={loading ? "-" : formatNumber(totals?.trackedUsers)} />
        <Kpi icon={Route} label="Tracked sessions" value={loading ? "-" : formatNumber(totals?.trackedSessions)} />
        <Kpi icon={GitBranch} label="Events/session" value={loading ? "-" : formatNumber(totals?.eventsPerSession, 1)} />
        <Kpi icon={HeartPulse} label="Avg session duration" value={loading ? "-" : formatDuration(totals?.averageSessionDurationMs)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <HealthCard health={health} loading={loading} />
        <PrivacyCard privacy={data?.privacy} frictionTotal={frictionTotal} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <FunnelCard title="Recycling funnel" data={data?.funnels.recycling} loading={loading} />
        <FunnelCard title="Reward funnel" data={data?.funnels.rewards} loading={loading} />
        <FunnelCard title="Challenge funnel" data={data?.funnels.challenges} loading={loading} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SimpleTable
          title="Daily tracked users"
          headers={["Day", "Events", "Users", "Sessions"]}
          loading={loading}
          rows={(data?.movement.daily ?? []).slice(0, 14).map((row) => [formatDate(row.day).split(",")[0], row.events, row.users, row.sessions])}
        />
        <SimpleTable
          title="App version / platform breakdown"
          headers={["Version", "Platform", "Events", "Users", "Sessions"]}
          loading={loading}
          rows={(data?.breakdowns.appVersion ?? []).map((row) => [row.app_version, row.platform, row.events, row.users, row.sessions])}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SimpleTable
          title="Top screens"
          headers={["Screen", "Views", "Users", "Sessions"]}
          loading={loading}
          rows={(data?.movement.topScreens ?? []).map((row) => [row.screen, row.screen_views, row.users, row.sessions])}
        />
        <SimpleTable
          title="Top transitions"
          headers={["From", "To", "Transitions", "Users", "Sessions"]}
          loading={loading}
          rows={(data?.movement.topTransitions ?? []).map((row) => [row.previous_screen, row.screen, row.transitions, row.users, row.sessions])}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <SimpleTable
          title="Entry screens"
          headers={["Screen", "Entries", "Users", "Sessions"]}
          loading={loading}
          rows={(data?.movement.entryScreens ?? []).map((row) => [row.screen, row.entries, row.users, row.sessions])}
        />
        <SimpleTable
          title="Exit screens"
          headers={["Screen", "Exits", "Users", "Sessions"]}
          loading={loading}
          rows={(data?.movement.exitScreens ?? []).map((row) => [row.screen, row.exits, row.users, row.sessions])}
        />
        <SimpleTable
          title="Screen loops"
          headers={["Screen", "Repeats", "Users", "Sessions"]}
          loading={loading}
          rows={(data?.movement.screenLoops ?? []).map((row) => [row.screen, row.repeats, row.users, row.sessions])}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SimpleTable
          title="Average duration by screen"
          headers={["Screen", "Avg duration", "Measured events"]}
          loading={loading}
          rows={(data?.movement.averageDurationByScreen ?? []).map((row) => [row.screen, formatDuration(row.average_duration_ms), row.measured_events])}
        />
        <SimpleTable
          title="Platform breakdown"
          headers={["Platform", "Events", "Users", "Sessions"]}
          loading={loading}
          rows={(data?.breakdowns.platform ?? []).map((row) => [row.platform, row.events, row.users, row.sessions])}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <SimpleTable
          title="Friction events by screen"
          headers={["Event", "Screen", "Platform", "Locale", "Version", "Events", "Users"]}
          loading={loading}
          rows={(data?.friction.byScreen ?? []).map((row) => [row.event_name, row.screen, row.platform, row.locale, row.app_version, row.events, row.users])}
        />
        <SimpleTable
          title="Friction events by day"
          headers={["Day", "Event", "Events"]}
          loading={loading}
          rows={(data?.friction.byDay ?? []).map((row) => [formatDate(row.day).split(",")[0], row.event_name, row.events])}
        />
      </section>

      <SimpleTable
        title="Behavior to outcome overlaps"
        headers={["Outcome", "Viewed users", "Outcome users", "Overlap users", "Overlap conversion"]}
        loading={loading}
        rows={(data?.outcomes ?? []).map((row) => [humanize(row.outcome), row.viewedUsers, row.outcomeUsers, row.overlapUsers, formatPercent(row.conversionRate)])}
      />
    </div>
  );
}

function FiltersPanel({
  filters,
  setFilters,
  options,
}: {
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  options: FilterOptions;
}) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <FilterInput label="From" type="date" value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value }))} />
        <FilterInput label="To" type="date" value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value }))} />
        <FilterSelect label="Platform" value={filters.platform} options={options.platforms} onChange={(value) => setFilters((current) => ({ ...current, platform: value }))} />
        <FilterSelect label="Locale" value={filters.locale} options={options.locales} onChange={(value) => setFilters((current) => ({ ...current, locale: value }))} />
        <FilterSelect label="App version" value={filters.appVersion} options={options.appVersions} onChange={(value) => setFilters((current) => ({ ...current, appVersion: value }))} />
        <FilterSelect label="Screen" value={filters.screen} options={options.screens} onChange={(value) => setFilters((current) => ({ ...current, screen: value }))} />
        <FilterSelect label="Event" value={filters.eventName} options={options.eventNames} onChange={(value) => setFilters((current) => ({ ...current, eventName: value }))} />
      </div>
    </section>
  );
}

function FilterInput({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-[var(--gl-ink-soft)]">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]" />
    </label>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-[var(--gl-ink-soft)]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]">
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">
        <Icon className="h-4 w-4 text-[var(--gl-green)]" />
        {label}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums text-[var(--gl-ink)]">{value}</div>
    </div>
  );
}

function HealthCard({ health, loading }: { health?: AppAnalyticsResponse["health"]; loading: boolean }) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[var(--gl-green)]" />
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">Instrumentation Health</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Latest event" value={loading ? "-" : formatDate(health?.latestAppEventAt)} />
        <Metric label="Session ID coverage" value={loading ? "-" : `${formatNumber(health?.sessionIdPercent, 1)}%`} />
        <Metric label="Sequence index coverage" value={loading ? "-" : `${formatNumber(health?.sequenceIndexPercent, 1)}%`} />
        <Metric label="Duration coverage" value={loading ? "-" : `${formatNumber(health?.durationMsPercent, 1)}%`} />
        <Metric label="App versions seen" value={loading ? "-" : formatNumber(health?.appVersionsSeen)} />
        <Metric label="Platforms seen" value={loading ? "-" : formatNumber(health?.platformsSeen)} />
      </div>
    </section>
  );
}

function PrivacyCard({ privacy, frictionTotal }: { privacy?: AppAnalyticsResponse["privacy"]; frictionTotal: number }) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-[var(--gl-amber)]" />
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">Safety summary</h2>
      </div>
      <div className="mt-4 space-y-3">
        <Metric label="Friction events" value={formatNumber(frictionTotal)} />
        <Metric label="Source" value={privacy?.source || "reporting.*"} />
        <Metric label="Raw metadata exposed" value={privacy?.rawMetadataExposed ? "Yes" : "No"} />
        <Metric label="Raw user IDs exposed" value={privacy?.rawUserIdsExposed ? "Yes" : "No"} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-[var(--gl-ink)]">{value}</div>
    </div>
  );
}

function FunnelCard({ title, data, loading }: { title: string; data?: AppAnalyticsResponse["funnels"]["recycling"]; loading: boolean }) {
  const maxUsers = Math.max(...(data?.steps ?? []).map((step) => Number(step.users || 0)), 1);
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{title}</h2>
      {data?.largestDropOff ? (
        <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">
          Largest drop-off: {humanize(data.largestDropOff.from)} → {humanize(data.largestDropOff.to)} ({formatNumber(data.largestDropOff.users)} users)
        </p>
      ) : <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">Largest drop-off appears once enough events are tracked.</p>}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-lg bg-[var(--gl-card-cream)] p-4 text-sm text-[var(--gl-ink-muted)]">Loading funnel...</div>
        ) : (data?.steps ?? []).length === 0 ? (
          <div className="rounded-lg bg-[var(--gl-card-cream)] p-4 text-sm text-[var(--gl-ink-muted)]">No funnel data available.</div>
        ) : (data?.steps ?? []).map((step) => (
          <div key={step.step}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium capitalize text-[var(--gl-ink)]">{humanize(step.step)}</span>
              <span className="shrink-0 text-xs text-[var(--gl-ink-muted)]">{formatNumber(step.users)} users · {formatPercent(step.conversionFromPrevious)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--gl-card-cream)]">
              <div className="h-full rounded-full bg-[var(--gl-green)]" style={{ width: `${Math.max(4, (step.users / maxUsers) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SimpleTable({
  title,
  headers,
  rows,
  loading,
}: {
  title: string;
  headers: string[];
  rows: unknown[][];
  loading: boolean;
}) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
      <div className="border-b border-[var(--gl-hairline)] p-4">
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[620px] w-full text-left text-sm">
          <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">No rows available.</td></tr>
            ) : rows.slice(0, 200).map((row, index) => (
              <tr key={index} className="border-t border-[var(--gl-hairline)] hover:bg-[var(--gl-card-cream)]">
                {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className="px-4 py-3 text-[var(--gl-ink-soft)]">{String(cell ?? "-")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
