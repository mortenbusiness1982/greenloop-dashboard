"use client";

import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Coins,
  Flag,
  Gift,
  MapPin,
  Store,
  TicketCheck,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { DashboardLanguage, useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type PlatformReport = {
  totals?: {
    totalUnits?: number;
    totalEvents?: number;
    uniqueConsumers?: number;
    ecoPointsIssued?: number;
  };
  cityDiagnostics?: {
    eventCityMissingUnits?: number;
    unresolvedCityUnits?: number;
  };
  geoBreakdown?: { city?: string | null; units?: number; consumers?: number }[];
  events?: PlatformEvent[];
};

type PlatformEvent = {
  created_at?: string;
  product_name?: string;
  barcode?: string;
  units?: number;
  city?: string | null;
  scan_status?: string;
  display_name?: string | null;
  email?: string | null;
  points_issued?: number;
};

type AdminUser = {
  id: string;
  role?: string;
  created_at?: string;
  deactivated_at?: string | null;
};

type Reward = {
  id: string;
  active?: boolean;
  status?: string | null;
  archived_at?: string | null;
};

type Challenge = {
  id: string;
  active?: boolean;
};

type Unlock = {
  id: string;
  unlock_status?: string | null;
};

type Brand = {
  id: string;
};

type Partner = {
  id: string;
  deactivated_at?: string | null;
};

type OverviewState = {
  platform: PlatformReport | null;
  users: AdminUser[];
  rewards: Reward[];
  challenges: Challenge[];
  unlocks: Unlock[];
  brands: Brand[];
  partners: Partner[];
};

const emptyState: OverviewState = {
  platform: null,
  users: [],
  rewards: [],
  challenges: [],
  unlocks: [],
  brands: [],
  partners: [],
};

const adminOverviewCopy = {
  en: {
    loadError: "Unable to load admin overview",
    hero: {
      badge: "Superadmin CRM",
      title: "Overview",
      description: "Command center for platform health, user support volume, recycling activity, rewards, challenges, and operational shortcuts.",
      reviewActivity: "Review Activity",
      exportCenter: "Export Center",
    },
    summary: {
      platformVolume: "Platform Volume",
      network: "Network",
      rewardMotion: "Reward Motion",
      unitsAcross: (events: string) => `units across ${events} events`,
      brandsAndPartners: "brands and active partners",
      ecoPointsToDate: "EcoPoints issued to date",
    },
    kpis: [
      { label: "Total Users", helper: "Registered accounts" },
      { label: "New Users 30d", helper: "Recent signup volume" },
      { label: "Recycled Units", helper: "Validated platform units" },
      { label: "Recycling Events", helper: "Total event records" },
      { label: "EcoPoints Issued", helper: "Reward currency issued" },
      { label: "Active Rewards", helper: "Live reward offers" },
      { label: "Active Unlocks", helper: "Open redemptions" },
      { label: "Active Challenges", helper: "Running challenges" },
      { label: "Brands", helper: "Brand accounts" },
      { label: "Partners", helper: "Active partner locations" },
    ],
    activity: {
      tab: "Activity",
      title: "Recent platform activity",
      subtitle: "Latest recycling events pulled from platform reporting.",
      open: "Open full activity",
      when: "When",
      user: "User",
      product: "Product",
      units: "Units",
      city: "City",
      points: "Points",
      status: "Status",
      loading: "Loading overview...",
      empty: "No recent activity available.",
      unknownUser: "Unknown user",
      unknownProduct: "Unknown product",
    },
    cities: {
      tab: "Cities",
      title: "Top cities",
      subtitle: "Top city-attributed units",
      loading: "Loading city activity...",
      empty: "No city data available.",
      unknown: "Unknown city",
      otherCities: "Other cities",
      noCity: "No city recorded",
      breakdownNote: "City totals are split between the top 5 named cities, other named cities, and scans without city data.",
      diagnostics: (raw: string, unresolved: string) => `${raw} units have blank event-city data; ${unresolved} remain unresolved after fallback.`,
      units: "units",
    },
    modulesTitle: "Operational modules",
    modules: {
      users: ["Users", "Support users, roles, avatar resets, and recycling history."],
      activity: ["Activity", "Inspect scans and recycling events with date, city, and user filters."],
      rewards: ["Rewards", "Manage reward engine inventory, placement, status, and archive flow."],
      challenges: ["Challenges", "Create and monitor global, community, and personal challenges."],
      moderation: ["Moderation", "Review evidence, risk, validation status, and fraud signals."],
      reports: ["Reports", "Open platform, brand, user, geo, and export reporting workspaces."],
    },
  },
  es: {
    loadError: "No se pudo cargar el resumen de admin",
    hero: {
      badge: "CRM Superadmin",
      title: "Resumen",
      description: "Centro de control para salud de plataforma, volumen de soporte, actividad de reciclaje, recompensas, retos y accesos operativos.",
      reviewActivity: "Revisar actividad",
      exportCenter: "Centro de exportación",
    },
    summary: {
      platformVolume: "Volumen de plataforma",
      network: "Red",
      rewardMotion: "Movimiento de recompensas",
      unitsAcross: (events: string) => `unidades en ${events} eventos`,
      brandsAndPartners: "marcas y partners activos",
      ecoPointsToDate: "EcoPoints emitidos hasta la fecha",
    },
    kpis: [
      { label: "Usuarios totales", helper: "Cuentas registradas" },
      { label: "Usuarios nuevos 30d", helper: "Volumen reciente de altas" },
      { label: "Unidades recicladas", helper: "Unidades validadas de plataforma" },
      { label: "Eventos de reciclaje", helper: "Registros totales de eventos" },
      { label: "EcoPoints emitidos", helper: "Moneda de recompensas emitida" },
      { label: "Recompensas activas", helper: "Ofertas de recompensa activas" },
      { label: "Desbloqueos activos", helper: "Canjes abiertos" },
      { label: "Retos activos", helper: "Retos en curso" },
      { label: "Marcas", helper: "Cuentas de marca" },
      { label: "Partners", helper: "Ubicaciones partner activas" },
    ],
    activity: {
      tab: "Actividad",
      title: "Actividad reciente de plataforma",
      subtitle: "Últimos eventos de reciclaje desde los informes de plataforma.",
      open: "Abrir actividad completa",
      when: "Cuándo",
      user: "Usuario",
      product: "Producto",
      units: "Unidades",
      city: "Ciudad",
      points: "Puntos",
      status: "Estado",
      loading: "Cargando resumen...",
      empty: "No hay actividad reciente disponible.",
      unknownUser: "Usuario desconocido",
      unknownProduct: "Producto desconocido",
    },
    cities: {
      tab: "Ciudades",
      title: "Ciudades principales",
      subtitle: "Unidades principales atribuidas a ciudad",
      loading: "Cargando actividad por ciudad...",
      empty: "No hay datos de ciudad disponibles.",
      unknown: "Ciudad desconocida",
      otherCities: "Otras ciudades",
      noCity: "Sin ciudad registrada",
      breakdownNote: "Los totales se dividen entre las 5 ciudades principales, otras ciudades y escaneos sin datos de ciudad.",
      diagnostics: (raw: string, unresolved: string) => `${raw} unidades tienen ciudad vacía en el evento; ${unresolved} siguen sin resolverse tras el fallback.`,
      units: "unidades",
    },
    modulesTitle: "Módulos operativos",
    modules: {
      users: ["Usuarios", "Soporte de usuarios, roles, reinicio de avatar e historial de reciclaje."],
      activity: ["Actividad", "Inspecciona escaneos y eventos con filtros por fecha, ciudad y usuario."],
      rewards: ["Recompensas", "Gestiona inventario, ubicación, estado y archivo del motor de recompensas."],
      challenges: ["Retos", "Crea y monitoriza retos globales, comunitarios y personales."],
      moderation: ["Moderación", "Revisa evidencia, riesgo, estado de validación y señales de fraude."],
      reports: ["Informes", "Abre espacios de informes de plataforma, marca, usuario, geo y exportación."],
    },
  },
} as const;

function normalizeList<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
}

function formatNumber(value: number | undefined, language: DashboardLanguage = "en") {
  return Number(value || 0).toLocaleString(language === "es" ? "es-ES" : "en-US");
}

function formatShortDate(value?: string | null, language: DashboardLanguage = "en") {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(language === "es" ? "es-ES" : "en-US");
}

function formatTime(value?: string | null, language: DashboardLanguage = "en") {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleTimeString(language === "es" ? "es-ES" : "en-US", { hour: "2-digit", minute: "2-digit" });
}

function isActiveReward(reward: Reward) {
  return !reward.archived_at && (reward.active || reward.status === "active");
}

export function AdminOverviewWorkspace() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const copy = adminOverviewCopy[language];
  const [data, setData] = useState<OverviewState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"activity" | "cities">("activity");

  const loadOverview = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [platform, users, rewards, challenges, unlocks, brands, partners] = await Promise.all([
        apiFetch<PlatformReport>("/admin/reports/platform", { token }),
        apiFetch("/admin/users", { token }),
        apiFetch("/admin/rewards", { token }),
        apiFetch("/admin/challenges", { token }),
        apiFetch("/admin/rewards/unlocks?status=active", { token }),
        apiFetch("/admin/brands", { token }),
        apiFetch("/admin/partners", { token }),
      ]);

      setData({
        platform,
        users: normalizeList<AdminUser>(users, "users"),
        rewards: normalizeList<Reward>(rewards, "rewards"),
        challenges: normalizeList<Challenge>(challenges, "challenges"),
        unlocks: normalizeList<Unlock>(unlocks, "unlocks"),
        brands: normalizeList<Brand>(brands, "brands"),
        partners: normalizeList<Partner>(partners, "partners"),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, router]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const kpis = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const newUsers = data.users.filter((user) => {
      if (!user.created_at) return false;
      const created = new Date(user.created_at).getTime();
      return !Number.isNaN(created) && now - created <= thirtyDaysMs;
    }).length;

    return {
      totalUsers: data.users.length,
      newUsers,
      totalUnits: data.platform?.totals?.totalUnits || 0,
      totalEvents: data.platform?.totals?.totalEvents || 0,
      ecoPoints: data.platform?.totals?.ecoPointsIssued || 0,
      activeRewards: data.rewards.filter(isActiveReward).length,
      activeUnlocks: data.unlocks.length,
      activeChallenges: data.challenges.filter((challenge) => challenge.active).length,
      brands: data.brands.length,
      partners: data.partners.filter((partner) => !partner.deactivated_at).length,
    };
  }, [data]);

  const geoRows = [...(data.platform?.geoBreakdown ?? [])]
    .sort((a, b) => Number(b.units || 0) - Number(a.units || 0));
  const namedCityRows = geoRows.filter((city) => String(city.city || "").trim().length > 0);
  const blankCityUnits = geoRows
    .filter((city) => String(city.city || "").trim().length === 0)
    .reduce((sum, city) => sum + Number(city.units || 0), 0);
  const topCities = namedCityRows.slice(0, 5);

  const recentEvents = (data.platform?.events ?? []).slice(0, 8);
  const namedCityUnits = namedCityRows.reduce((sum, city) => sum + Number(city.units || 0), 0);
  const additionalCityUnits = namedCityRows.slice(5).reduce((sum, city) => sum + Number(city.units || 0), 0);
  const reportedGeoUnits = namedCityUnits + blankCityUnits;
  const unreportedGeoUnits = Math.max(0, kpis.totalUnits - reportedGeoUnits);
  const noCityUnits = blankCityUnits + unreportedGeoUnits;
  const eventCityMissingUnits = Number(data.platform?.cityDiagnostics?.eventCityMissingUnits || 0);
  const unresolvedCityUnits = Number(data.platform?.cityDiagnostics?.unresolvedCityUnits || 0);
  const cityRows = [
    ...topCities,
    ...(additionalCityUnits > 0 ? [{ city: copy.cities.otherCities, units: additionalCityUnits, consumers: 0 }] : []),
    ...(noCityUnits > 0 ? [{ city: copy.cities.noCity, units: noCityUnits, consumers: 0 }] : []),
  ];
  const maxCityUnits = Math.max(...cityRows.map((city) => Number(city.units || 0)), 1);

  // Calm GreenLoop two-tone: brand green for most metrics, amber for the
  // reward / currency metrics (EcoPoints, Rewards, Unlocks).
  const GL_GREEN = "var(--gl-green)";
  const GL_AMBER = "var(--gl-amber)";
  const kpiCards = [
    { ...copy.kpis[0], value: kpis.totalUsers, icon: Users, accent: GL_GREEN },
    { ...copy.kpis[1], value: kpis.newUsers, icon: Users, accent: GL_GREEN },
    { ...copy.kpis[2], value: kpis.totalUnits, icon: Activity, accent: GL_GREEN },
    { ...copy.kpis[3], value: kpis.totalEvents, icon: CheckCircle2, accent: GL_GREEN },
    { ...copy.kpis[4], value: kpis.ecoPoints, icon: Coins, accent: GL_AMBER },
    { ...copy.kpis[5], value: kpis.activeRewards, icon: Gift, accent: GL_AMBER },
    { ...copy.kpis[6], value: kpis.activeUnlocks, icon: TicketCheck, accent: GL_AMBER },
    { ...copy.kpis[7], value: kpis.activeChallenges, icon: Flag, accent: GL_GREEN },
    { ...copy.kpis[8], value: kpis.brands, icon: Store, accent: GL_GREEN },
    { ...copy.kpis[9], value: kpis.partners, icon: Building2, accent: GL_GREEN },
  ];

  return (
    <div className="min-w-0 space-y-4">
      <WorkspaceHeader className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold text-[var(--gl-ink)]">{copy.hero.title}</h1>
        <Link href="/admin/reports/exports" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--gl-green)] hover:text-[var(--gl-green-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gl-green)]">
          {copy.hero.exportCenter}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
        </Link>
      </WorkspaceHeader>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="crm-kpi-strip grid grid-cols-2 sm:grid-cols-5" aria-busy={loading}>
        {kpiCards.map((card) => (
          <Kpi key={card.label} {...card} loading={loading} language={language} />
        ))}
      </div>

      <div className="flex gap-1 border-b border-[var(--gl-hairline)] xl:hidden" role="tablist" aria-label={copy.hero.title}>
        {(["activity", "cities"] as const).map((pane) => (
          <button
            key={pane}
            id={`overview-${pane}-tab`}
            type="button"
            role="tab"
            aria-selected={mobilePane === pane}
            aria-controls={`overview-${pane}`}
            tabIndex={mobilePane === pane ? 0 : -1}
            onClick={() => setMobilePane(pane)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? "activity" : event.key === "End" ? "cities" : pane === "activity" ? "cities" : "activity";
              setMobilePane(next);
              document.getElementById(`overview-${next}-tab`)?.focus();
            }}
            className={`min-h-11 border-b-2 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--gl-green)] ${mobilePane === pane ? "border-[var(--gl-green)] text-[var(--gl-green)]" : "border-transparent text-[var(--gl-ink-muted)] hover:text-[var(--gl-ink)]"}`}
          >
            {copy[pane].tab}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <section id="overview-activity" role="tabpanel" tabIndex={0} aria-labelledby="overview-activity-heading" className={`min-w-0 ${mobilePane === "activity" ? "block" : "hidden"} xl:block`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3">
            <h2 id="overview-activity-heading" className="text-base font-semibold text-[var(--gl-ink)]">{copy.activity.title}</h2>
            <Link href="/admin/activity" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[var(--gl-green)] hover:text-[var(--gl-green-deep)]">
              {copy.activity.open}
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
          <div className="hidden overflow-x-auto bg-[var(--gl-paper)] md:block">
            <table className="w-full min-w-[640px] table-fixed text-left text-sm">
              <thead className="text-xs text-[var(--gl-ink-muted)]">
                <tr>
                  <th scope="col" className="w-[18%] px-3 py-2">{copy.activity.when} <span className="sr-only">/ {copy.activity.status}</span></th>
                  <th scope="col" className="w-[24%] px-3 py-2">{copy.activity.user}</th>
                  <th scope="col" className="w-[24%] px-3 py-2">{copy.activity.product}</th>
                  <th scope="col" className="w-[10%] px-2 py-2 text-right">{copy.activity.units}</th>
                  <th scope="col" className="w-[14%] px-3 py-2">{copy.activity.city}</th>
                  <th scope="col" className="w-[10%] px-2 py-2 text-right">{copy.activity.points}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-[var(--gl-ink-muted)]">{copy.activity.loading}</td></tr>
                ) : recentEvents.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-[var(--gl-ink-muted)]">{copy.activity.empty}</td></tr>
                ) : (
                  recentEvents.map((event, index) => (
                    <tr key={`${event.created_at || "event"}-${index}`} className="border-t border-[var(--gl-hairline)] transition-colors hover:bg-[var(--gl-card-cream)]">
                      <td className="px-3 py-2 align-top text-xs text-[var(--gl-ink-soft)]">
                        <div className="font-medium text-[var(--gl-ink)]">{formatShortDate(event.created_at, language)}</div>
                        <div className="mb-1 text-[var(--gl-ink-muted)]">{formatTime(event.created_at, language)}</div>
                        <StatusPill status={event.scan_status} />
                      </td>
                      <td className="break-words px-3 py-2 align-top [overflow-wrap:anywhere]">
                        <div className="font-medium text-[var(--gl-ink)]">{event.display_name || copy.activity.unknownUser}</div>
                        <div className="text-xs text-[var(--gl-ink-muted)]">{event.email || "-"}</div>
                      </td>
                      <td className="break-words px-3 py-2 align-top [overflow-wrap:anywhere]">
                        <div className="font-medium text-[var(--gl-ink)]">{event.product_name || copy.activity.unknownProduct}</div>
                        <div className="text-xs text-[var(--gl-ink-muted)]">{event.barcode || "-"}</div>
                      </td>
                      <td className="px-2 py-2 text-right align-top tabular-nums text-[var(--gl-ink-soft)]">{event.units || 0}</td>
                      <td className="break-words px-3 py-2 align-top text-[var(--gl-ink-soft)]">{event.city || "-"}</td>
                      <td className="px-2 py-2 text-right align-top tabular-nums text-[var(--gl-ink-soft)]">{event.points_issued || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[var(--gl-hairline)] bg-[var(--gl-paper)] md:hidden">
            {loading || recentEvents.length === 0 ? (
              <p className="px-3 py-6 text-sm text-[var(--gl-ink-muted)]">{loading ? copy.activity.loading : copy.activity.empty}</p>
            ) : recentEvents.map((event, index) => (
              <details key={`${event.created_at || "event"}-${index}`} className="group px-3 py-2.5 text-xs text-[var(--gl-ink-muted)] [overflow-wrap:anywhere]">
                <summary className="cursor-pointer list-none space-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gl-green)] [&::-webkit-details-marker]:hidden">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium text-[var(--gl-ink)]">{event.product_name || copy.activity.unknownProduct}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <StatusPill status={event.scan_status} />
                    <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  </div>
                </div>
                <p>{event.display_name || copy.activity.unknownUser} · {event.city || "-"}</p>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 tabular-nums">
                  <p>{formatShortDate(event.created_at, language)} · {formatTime(event.created_at, language)}</p>
                  <p>{copy.activity.units}: {event.units || 0} · {copy.activity.points}: {event.points_issued || 0}</p>
                </div>
                </summary>
                <p className="pt-2">{event.email || "-"}<br />{event.barcode || "-"}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="overview-cities" role="tabpanel" tabIndex={0} aria-labelledby="overview-cities-heading" className={`min-w-0 ${mobilePane === "cities" ? "block" : "hidden"} xl:block`}>
            <div className="mb-2 flex min-h-11 items-center gap-2">
              <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--gl-green)]" />
              <h2 id="overview-cities-heading" className="text-base font-semibold text-[var(--gl-ink)]">{copy.cities.title}</h2>
            </div>
            <div className="space-y-4 bg-[var(--gl-paper)] px-3 py-3">
              {loading ? (
                <p className="text-sm text-[var(--gl-ink-muted)]">{copy.cities.loading}</p>
              ) : cityRows.length === 0 ? (
                <p className="text-sm text-[var(--gl-ink-muted)]">{copy.cities.empty}</p>
              ) : (
                cityRows.map((city, index) => (
                  <div key={`${city.city || "unknown"}-${index}`} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 break-words font-medium text-[var(--gl-ink)]">{city.city || copy.cities.unknown}</span>
                      <span className="shrink-0 text-xs tabular-nums text-[var(--gl-ink-muted)]">{formatNumber(city.units, language)} {copy.cities.units}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--gl-green-soft)]">
                      <div
                        className="h-full rounded-full bg-[var(--gl-green)]"
                        style={{ width: `${Math.max(8, (Number(city.units || 0) / maxCityUnits) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            {!loading && (additionalCityUnits > 0 || noCityUnits > 0) ? (
              <p className="mt-3 text-xs leading-5 text-[var(--gl-ink-muted)]">
                {copy.cities.breakdownNote}
              </p>
            ) : null}
            {!loading && eventCityMissingUnits > 0 ? (
              <p className={`mt-2 rounded-lg border px-3 py-2 text-xs leading-5 ${
                unresolvedCityUnits > 0
                  ? "border-[var(--gl-amber)]/30 bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]"
                  : "border-[var(--gl-green)]/25 bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"
              }`}>
                {copy.cities.diagnostics(formatNumber(eventCityMissingUnits, language), formatNumber(unresolvedCityUnits, language))}
              </p>
            ) : null}
        </section>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  const normalized = (status || "-").toLowerCase();
  const positive = ["validated", "approved", "complete", "completed"].includes(normalized);
  const warning = ["pending", "review", "needs_review"].includes(normalized);
  const classes = positive
    ? "border-[var(--gl-green)]/25 bg-[var(--gl-green-soft)] text-[var(--gl-green)]"
    : warning
      ? "border-[var(--gl-amber)]/30 bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]"
      : "border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] text-[var(--gl-ink-muted)]";

  return (
    <span className={`inline-flex max-w-full shrink-0 break-words rounded border px-1.5 py-0.5 text-[11px] font-semibold capitalize ${classes}`}>
      {status || "-"}
    </span>
  );
}

function Kpi({
  label,
  value,
  loading,
  icon: Icon,
  accent,
  helper,
  language,
}: {
  label: string;
  value: number;
  loading: boolean;
  icon: LucideIcon;
  accent: string;
  helper: string;
  language: DashboardLanguage;
}) {
  return (
    <div className="min-w-0 rounded-md bg-[var(--gl-paper)] px-3 py-2.5" title={helper}>
      <div className="flex min-h-4 items-start justify-between gap-2">
        <div className="min-w-0 text-xs font-medium text-[var(--gl-ink-muted)]">{label}</div>
        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
      </div>
      <div className="break-words text-xl font-semibold tabular-nums text-[var(--gl-ink)]">{loading ? "-" : formatNumber(value, language)}</div>
      <p className="sr-only">{helper}</p>
    </div>
  );
}
