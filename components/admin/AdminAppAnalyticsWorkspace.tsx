"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, BarChart3, GitBranch, HeartPulse, Route, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { DashboardLanguage, useDashboardLanguage } from "@/components/crm/DashboardLanguage";

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

const appAnalyticsCopy = {
  en: {
    eyebrow: "Admin · Product Behavior",
    title: "App Analytics",
    description: "Aggregate-only production app behavior analytics from reporting views. No raw metadata, user IDs, emails, tokens, media URLs, or precise locations are shown.",
    reportsHub: "Reports hub",
    loadError: "Unable to load app analytics",
    filters: {
      from: "From",
      to: "To",
      platform: "Platform",
      locale: "Locale",
      appVersion: "App version",
      screen: "Screen",
      event: "Event",
      all: "All",
    },
    kpis: {
      totalEvents: "Total events",
      trackedUsers: "Tracked users",
      trackedSessions: "Tracked sessions",
      eventsPerSession: "Events/session",
      avgSessionDuration: "Avg session duration",
    },
    health: {
      title: "Instrumentation Health",
      latestEvent: "Latest event",
      sessionIdCoverage: "Session ID coverage",
      sequenceIndexCoverage: "Sequence index coverage",
      durationCoverage: "Duration coverage",
      appVersionsSeen: "App versions seen",
      platformsSeen: "Platforms seen",
    },
    safety: {
      title: "Safety summary",
      frictionEvents: "Friction events",
      source: "Source",
      rawMetadata: "Raw metadata exposed",
      rawUserIds: "Raw user IDs exposed",
      yes: "Yes",
      no: "No",
    },
    funnels: {
      recycling: "Recycling funnel",
      rewards: "Reward funnel",
      challenges: "Challenge funnel",
      largestDropOff: "Largest drop-off",
      users: "users",
      enoughEvents: "Largest drop-off appears once enough events are tracked.",
      loading: "Loading funnel...",
      empty: "No funnel data available.",
    },
    tables: {
      loading: "Loading...",
      empty: "No rows available.",
      dailyTrackedUsers: "Daily tracked users",
      appVersionBreakdown: "App version / platform breakdown",
      topScreens: "Top screens",
      topTransitions: "Top transitions",
      entryScreens: "Entry screens",
      exitScreens: "Exit screens",
      screenLoops: "Screen loops",
      averageDurationByScreen: "Average duration by screen",
      platformBreakdown: "Platform breakdown",
      frictionByScreen: "Friction events by screen",
      frictionByDay: "Friction events by day",
      behaviorOutcomes: "Behavior to outcome overlaps",
      headers: {
        day: "Day",
        events: "Events",
        users: "Users",
        sessions: "Sessions",
        version: "Version",
        platform: "Platform",
        screen: "Screen",
        views: "Views",
        from: "From",
        to: "To",
        transitions: "Transitions",
        entries: "Entries",
        exits: "Exits",
        repeats: "Repeats",
        avgDuration: "Avg duration",
        measuredEvents: "Measured events",
        event: "Event",
        locale: "Locale",
        outcome: "Outcome",
        viewedUsers: "Viewed users",
        outcomeUsers: "Outcome users",
        overlapUsers: "Overlap users",
        overlapConversion: "Overlap conversion",
      },
    },
    units: { ms: "ms", sec: "sec", min: "min" },
  },
  es: {
    eyebrow: "Admin · Comportamiento de producto",
    title: "Analítica de app",
    description: "Analítica agregada del comportamiento de la app en producción desde vistas de reporting. No se muestran metadatos brutos, IDs de usuario, emails, tokens, URLs de medios ni ubicaciones precisas.",
    reportsHub: "Centro de informes",
    loadError: "No se pudo cargar la analítica de app",
    filters: {
      from: "Desde",
      to: "Hasta",
      platform: "Plataforma",
      locale: "Idioma",
      appVersion: "Versión app",
      screen: "Pantalla",
      event: "Evento",
      all: "Todos",
    },
    kpis: {
      totalEvents: "Eventos totales",
      trackedUsers: "Usuarios medidos",
      trackedSessions: "Sesiones medidas",
      eventsPerSession: "Eventos/sesión",
      avgSessionDuration: "Duración media",
    },
    health: {
      title: "Salud de instrumentación",
      latestEvent: "Último evento",
      sessionIdCoverage: "Cobertura de Session ID",
      sequenceIndexCoverage: "Cobertura de secuencia",
      durationCoverage: "Cobertura de duración",
      appVersionsSeen: "Versiones vistas",
      platformsSeen: "Plataformas vistas",
    },
    safety: {
      title: "Resumen de seguridad",
      frictionEvents: "Eventos de fricción",
      source: "Fuente",
      rawMetadata: "Metadatos brutos expuestos",
      rawUserIds: "IDs de usuario expuestos",
      yes: "Sí",
      no: "No",
    },
    funnels: {
      recycling: "Embudo de reciclaje",
      rewards: "Embudo de recompensas",
      challenges: "Embudo de retos",
      largestDropOff: "Mayor abandono",
      users: "usuarios",
      enoughEvents: "El mayor abandono aparecerá cuando haya suficientes eventos medidos.",
      loading: "Cargando embudo...",
      empty: "No hay datos de embudo disponibles.",
    },
    tables: {
      loading: "Cargando...",
      empty: "No hay filas disponibles.",
      dailyTrackedUsers: "Usuarios medidos por día",
      appVersionBreakdown: "Desglose por versión / plataforma",
      topScreens: "Pantallas principales",
      topTransitions: "Transiciones principales",
      entryScreens: "Pantallas de entrada",
      exitScreens: "Pantallas de salida",
      screenLoops: "Repeticiones de pantalla",
      averageDurationByScreen: "Duración media por pantalla",
      platformBreakdown: "Desglose por plataforma",
      frictionByScreen: "Eventos de fricción por pantalla",
      frictionByDay: "Eventos de fricción por día",
      behaviorOutcomes: "Cruces entre comportamiento y resultados",
      headers: {
        day: "Día",
        events: "Eventos",
        users: "Usuarios",
        sessions: "Sesiones",
        version: "Versión",
        platform: "Plataforma",
        screen: "Pantalla",
        views: "Vistas",
        from: "Desde",
        to: "Hasta",
        transitions: "Transiciones",
        entries: "Entradas",
        exits: "Salidas",
        repeats: "Repeticiones",
        avgDuration: "Duración media",
        measuredEvents: "Eventos medidos",
        event: "Evento",
        locale: "Idioma",
        outcome: "Resultado",
        viewedUsers: "Usuarios vistos",
        outcomeUsers: "Usuarios con resultado",
        overlapUsers: "Usuarios cruzados",
        overlapConversion: "Conversión cruzada",
      },
    },
    units: { ms: "ms", sec: "s", min: "min" },
  },
} as const;

type AppAnalyticsCopy = (typeof appAnalyticsCopy)[DashboardLanguage];

function localeFor(language: DashboardLanguage) {
  return language === "es" ? "es-ES" : "en-US";
}

function formatNumber(value: number | undefined, digits = 0, language: DashboardLanguage = "en") {
  return Number(value || 0).toLocaleString(localeFor(language), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatPercent(value: number | null | undefined, language: DashboardLanguage = "en") {
  if (value == null) return "-";
  return `${formatNumber(value * 100, 1, language)}%`;
}

function formatDuration(ms: number | undefined, copy: AppAnalyticsCopy = appAnalyticsCopy.en, language: DashboardLanguage = "en") {
  const value = Number(ms || 0);
  if (value < 1000) return `${formatNumber(value, 0, language)} ${copy.units.ms}`;
  if (value < 60_000) return `${formatNumber(value / 1000, 1, language)} ${copy.units.sec}`;
  return `${formatNumber(value / 60_000, 1, language)} ${copy.units.min}`;
}

function formatDate(value?: string | null, language: DashboardLanguage = "en") {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(localeFor(language));
}

function humanize(value: string) {
  return value.replace(/^backend_/, "").replace(/_/g, " ");
}

export function AdminAppAnalyticsWorkspace() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const copy = appAnalyticsCopy[language];
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
      setError(err instanceof Error ? err.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, filters, router]);

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
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--gl-green)]">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--gl-ink)]">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--gl-ink-muted)]">
            {copy.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/reports" className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">
            {copy.reportsHub}
          </Link>
        </div>
      </header>

      {error ? <div role="alert" className="rounded-lg border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] p-4 text-sm text-[var(--gl-coral-ink)]">{error}</div> : null}

      <FiltersPanel filters={filters} setFilters={setFilters} options={options} copy={copy} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Activity} label={copy.kpis.totalEvents} value={loading ? "-" : formatNumber(totals?.totalEvents, 0, language)} />
        <Kpi icon={BarChart3} label={copy.kpis.trackedUsers} value={loading ? "-" : formatNumber(totals?.trackedUsers, 0, language)} />
        <Kpi icon={Route} label={copy.kpis.trackedSessions} value={loading ? "-" : formatNumber(totals?.trackedSessions, 0, language)} />
        <Kpi icon={GitBranch} label={copy.kpis.eventsPerSession} value={loading ? "-" : formatNumber(totals?.eventsPerSession, 1, language)} />
        <Kpi icon={HeartPulse} label={copy.kpis.avgSessionDuration} value={loading ? "-" : formatDuration(totals?.averageSessionDurationMs, copy, language)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <HealthCard health={health} loading={loading} copy={copy} language={language} />
        <PrivacyCard privacy={data?.privacy} frictionTotal={frictionTotal} copy={copy} language={language} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <FunnelCard title={copy.funnels.recycling} data={data?.funnels.recycling} loading={loading} copy={copy} language={language} />
        <FunnelCard title={copy.funnels.rewards} data={data?.funnels.rewards} loading={loading} copy={copy} language={language} />
        <FunnelCard title={copy.funnels.challenges} data={data?.funnels.challenges} loading={loading} copy={copy} language={language} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SimpleTable
          title={copy.tables.dailyTrackedUsers}
          headers={[copy.tables.headers.day, copy.tables.headers.events, copy.tables.headers.users, copy.tables.headers.sessions]}
          loading={loading}
          rows={(data?.movement.daily ?? []).slice(0, 14).map((row) => [formatDate(row.day, language).split(",")[0], row.events, row.users, row.sessions])}
          copy={copy}
        />
        <SimpleTable
          title={copy.tables.appVersionBreakdown}
          headers={[copy.tables.headers.version, copy.tables.headers.platform, copy.tables.headers.events, copy.tables.headers.users, copy.tables.headers.sessions]}
          loading={loading}
          rows={(data?.breakdowns.appVersion ?? []).map((row) => [row.app_version, row.platform, row.events, row.users, row.sessions])}
          copy={copy}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SimpleTable
          title={copy.tables.topScreens}
          headers={[copy.tables.headers.screen, copy.tables.headers.views, copy.tables.headers.users, copy.tables.headers.sessions]}
          loading={loading}
          rows={(data?.movement.topScreens ?? []).map((row) => [row.screen, row.screen_views, row.users, row.sessions])}
          copy={copy}
        />
        <SimpleTable
          title={copy.tables.topTransitions}
          headers={[copy.tables.headers.from, copy.tables.headers.to, copy.tables.headers.transitions, copy.tables.headers.users, copy.tables.headers.sessions]}
          loading={loading}
          rows={(data?.movement.topTransitions ?? []).map((row) => [row.previous_screen, row.screen, row.transitions, row.users, row.sessions])}
          copy={copy}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <SimpleTable
          title={copy.tables.entryScreens}
          headers={[copy.tables.headers.screen, copy.tables.headers.entries, copy.tables.headers.users, copy.tables.headers.sessions]}
          loading={loading}
          rows={(data?.movement.entryScreens ?? []).map((row) => [row.screen, row.entries, row.users, row.sessions])}
          copy={copy}
        />
        <SimpleTable
          title={copy.tables.exitScreens}
          headers={[copy.tables.headers.screen, copy.tables.headers.exits, copy.tables.headers.users, copy.tables.headers.sessions]}
          loading={loading}
          rows={(data?.movement.exitScreens ?? []).map((row) => [row.screen, row.exits, row.users, row.sessions])}
          copy={copy}
        />
        <SimpleTable
          title={copy.tables.screenLoops}
          headers={[copy.tables.headers.screen, copy.tables.headers.repeats, copy.tables.headers.users, copy.tables.headers.sessions]}
          loading={loading}
          rows={(data?.movement.screenLoops ?? []).map((row) => [row.screen, row.repeats, row.users, row.sessions])}
          copy={copy}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SimpleTable
          title={copy.tables.averageDurationByScreen}
          headers={[copy.tables.headers.screen, copy.tables.headers.avgDuration, copy.tables.headers.measuredEvents]}
          loading={loading}
          rows={(data?.movement.averageDurationByScreen ?? []).map((row) => [row.screen, formatDuration(row.average_duration_ms, copy, language), row.measured_events])}
          copy={copy}
        />
        <SimpleTable
          title={copy.tables.platformBreakdown}
          headers={[copy.tables.headers.platform, copy.tables.headers.events, copy.tables.headers.users, copy.tables.headers.sessions]}
          loading={loading}
          rows={(data?.breakdowns.platform ?? []).map((row) => [row.platform, row.events, row.users, row.sessions])}
          copy={copy}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <SimpleTable
          title={copy.tables.frictionByScreen}
          headers={[copy.tables.headers.event, copy.tables.headers.screen, copy.tables.headers.platform, copy.tables.headers.locale, copy.tables.headers.version, copy.tables.headers.events, copy.tables.headers.users]}
          loading={loading}
          rows={(data?.friction.byScreen ?? []).map((row) => [row.event_name, row.screen, row.platform, row.locale, row.app_version, row.events, row.users])}
          copy={copy}
        />
        <SimpleTable
          title={copy.tables.frictionByDay}
          headers={[copy.tables.headers.day, copy.tables.headers.event, copy.tables.headers.events]}
          loading={loading}
          rows={(data?.friction.byDay ?? []).map((row) => [formatDate(row.day, language).split(",")[0], row.event_name, row.events])}
          copy={copy}
        />
      </section>

      <SimpleTable
        title={copy.tables.behaviorOutcomes}
        headers={[copy.tables.headers.outcome, copy.tables.headers.viewedUsers, copy.tables.headers.outcomeUsers, copy.tables.headers.overlapUsers, copy.tables.headers.overlapConversion]}
        loading={loading}
        rows={(data?.outcomes ?? []).map((row) => [humanize(row.outcome), row.viewedUsers, row.outcomeUsers, row.overlapUsers, formatPercent(row.conversionRate, language)])}
        copy={copy}
      />
    </div>
  );
}

function FiltersPanel({
  filters,
  setFilters,
  options,
  copy,
}: {
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  options: FilterOptions;
  copy: AppAnalyticsCopy;
}) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <FilterInput label={copy.filters.from} type="date" value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value }))} />
        <FilterInput label={copy.filters.to} type="date" value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value }))} />
        <FilterSelect label={copy.filters.platform} value={filters.platform} options={options.platforms} allLabel={copy.filters.all} onChange={(value) => setFilters((current) => ({ ...current, platform: value }))} />
        <FilterSelect label={copy.filters.locale} value={filters.locale} options={options.locales} allLabel={copy.filters.all} onChange={(value) => setFilters((current) => ({ ...current, locale: value }))} />
        <FilterSelect label={copy.filters.appVersion} value={filters.appVersion} options={options.appVersions} allLabel={copy.filters.all} onChange={(value) => setFilters((current) => ({ ...current, appVersion: value }))} />
        <FilterSelect label={copy.filters.screen} value={filters.screen} options={options.screens} allLabel={copy.filters.all} onChange={(value) => setFilters((current) => ({ ...current, screen: value }))} />
        <FilterSelect label={copy.filters.event} value={filters.eventName} options={options.eventNames} allLabel={copy.filters.all} onChange={(value) => setFilters((current) => ({ ...current, eventName: value }))} />
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

function FilterSelect({ label, value, options, allLabel, onChange }: { label: string; value: string; options: string[]; allLabel: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-[var(--gl-ink-soft)]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]">
        <option value="">{allLabel}</option>
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

function HealthCard({ health, loading, copy, language }: { health?: AppAnalyticsResponse["health"]; loading: boolean; copy: AppAnalyticsCopy; language: DashboardLanguage }) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[var(--gl-green)]" />
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.health.title}</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label={copy.health.latestEvent} value={loading ? "-" : formatDate(health?.latestAppEventAt, language)} />
        <Metric label={copy.health.sessionIdCoverage} value={loading ? "-" : `${formatNumber(health?.sessionIdPercent, 1, language)}%`} />
        <Metric label={copy.health.sequenceIndexCoverage} value={loading ? "-" : `${formatNumber(health?.sequenceIndexPercent, 1, language)}%`} />
        <Metric label={copy.health.durationCoverage} value={loading ? "-" : `${formatNumber(health?.durationMsPercent, 1, language)}%`} />
        <Metric label={copy.health.appVersionsSeen} value={loading ? "-" : formatNumber(health?.appVersionsSeen, 0, language)} />
        <Metric label={copy.health.platformsSeen} value={loading ? "-" : formatNumber(health?.platformsSeen, 0, language)} />
      </div>
    </section>
  );
}

function PrivacyCard({ privacy, frictionTotal, copy, language }: { privacy?: AppAnalyticsResponse["privacy"]; frictionTotal: number; copy: AppAnalyticsCopy; language: DashboardLanguage }) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-[var(--gl-amber)]" />
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.safety.title}</h2>
      </div>
      <div className="mt-4 space-y-3">
        <Metric label={copy.safety.frictionEvents} value={formatNumber(frictionTotal, 0, language)} />
        <Metric label={copy.safety.source} value={privacy?.source || "reporting.*"} />
        <Metric label={copy.safety.rawMetadata} value={privacy?.rawMetadataExposed ? copy.safety.yes : copy.safety.no} />
        <Metric label={copy.safety.rawUserIds} value={privacy?.rawUserIdsExposed ? copy.safety.yes : copy.safety.no} />
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

function FunnelCard({ title, data, loading, copy, language }: { title: string; data?: AppAnalyticsResponse["funnels"]["recycling"]; loading: boolean; copy: AppAnalyticsCopy; language: DashboardLanguage }) {
  const maxUsers = Math.max(...(data?.steps ?? []).map((step) => Number(step.users || 0)), 1);
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{title}</h2>
      {data?.largestDropOff ? (
        <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">
          {copy.funnels.largestDropOff}: {humanize(data.largestDropOff.from)} → {humanize(data.largestDropOff.to)} ({formatNumber(data.largestDropOff.users, 0, language)} {copy.funnels.users})
        </p>
      ) : <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">{copy.funnels.enoughEvents}</p>}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-lg bg-[var(--gl-card-cream)] p-4 text-sm text-[var(--gl-ink-muted)]">{copy.funnels.loading}</div>
        ) : (data?.steps ?? []).length === 0 ? (
          <div className="rounded-lg bg-[var(--gl-card-cream)] p-4 text-sm text-[var(--gl-ink-muted)]">{copy.funnels.empty}</div>
        ) : (data?.steps ?? []).map((step) => (
          <div key={step.step}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium capitalize text-[var(--gl-ink)]">{humanize(step.step)}</span>
              <span className="shrink-0 text-xs text-[var(--gl-ink-muted)]">{formatNumber(step.users, 0, language)} {copy.funnels.users} · {formatPercent(step.conversionFromPrevious, language)}</span>
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
  copy,
}: {
  title: string;
  headers: string[];
  rows: unknown[][];
  loading: boolean;
  copy: AppAnalyticsCopy;
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
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.tables.loading}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.tables.empty}</td></tr>
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
