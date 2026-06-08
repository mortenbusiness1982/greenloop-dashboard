"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Coins,
  Flag,
  Gift,
  MapPin,
  ShieldCheck,
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

const moduleLinks = [
  { key: "users", href: "/admin/users", icon: Users },
  { key: "activity", href: "/admin/activity", icon: Activity },
  { key: "rewards", href: "/admin/rewards", icon: Gift },
  { key: "challenges", href: "/admin/challenges", icon: Flag },
  { key: "moderation", href: "/admin/moderation", icon: ShieldCheck },
  { key: "reports", href: "/admin/reports", icon: BarChart3 },
] as const;

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
      title: "Top cities",
      subtitle: "By recycled units",
      loading: "Loading city activity...",
      empty: "No city data available.",
      unknown: "Unknown city",
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
      title: "Ciudades principales",
      subtitle: "Por unidades recicladas",
      loading: "Cargando actividad por ciudad...",
      empty: "No hay datos de ciudad disponibles.",
      unknown: "Ciudad desconocida",
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

  const topCities = [...(data.platform?.geoBreakdown ?? [])]
    .sort((a, b) => Number(b.units || 0) - Number(a.units || 0))
    .slice(0, 5);

  const recentEvents = (data.platform?.events ?? []).slice(0, 8);
  const maxCityUnits = Math.max(...topCities.map((city) => Number(city.units || 0)), 1);

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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[var(--gl-hairline)] bg-[radial-gradient(circle_at_top_left,rgba(21,120,90,0.14),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f3f0e2_58%,#d6ebe0_100%)] p-6 shadow-[var(--gl-shadow-sm)] md:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gl-green)]/30 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--gl-green)] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[var(--gl-green)]" />
              {copy.hero.badge}
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-normal text-[var(--gl-ink)] md:text-5xl">{copy.hero.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--gl-ink-soft)]">
              {copy.hero.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/activity" className="inline-flex items-center gap-2 rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2.5 text-sm font-semibold text-[var(--gl-ink)] shadow-sm transition-colors hover:bg-[var(--gl-card-cream)]">
              {copy.hero.reviewActivity}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/admin/reports/exports" className="inline-flex items-center gap-2 rounded-xl bg-[var(--gl-green)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--gl-green-deep)]">
              {copy.hero.exportCenter}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{copy.summary.platformVolume}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--gl-ink)]">{loading ? "-" : formatNumber(kpis.totalUnits, language)}</p>
            <p className="mt-1 text-sm text-[var(--gl-ink-soft)]">{copy.summary.unitsAcross(loading ? "-" : formatNumber(kpis.totalEvents, language))}</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{copy.summary.network}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--gl-ink)]">{loading ? "-" : formatNumber(kpis.brands + kpis.partners, language)}</p>
            <p className="mt-1 text-sm text-[var(--gl-ink-soft)]">{copy.summary.brandsAndPartners}</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{copy.summary.rewardMotion}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--gl-ink)]">{loading ? "-" : formatNumber(kpis.ecoPoints, language)}</p>
            <p className="mt-1 text-sm text-[var(--gl-ink-soft)]">{copy.summary.ecoPointsToDate}</p>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((card) => (
          <Kpi key={card.label} {...card} loading={loading} language={language} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <section className="overflow-hidden rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-[var(--gl-shadow-sm)]">
          <div className="flex flex-col gap-2 border-b border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.activity.title}</h2>
              <p className="text-sm text-[var(--gl-ink-muted)]">{copy.activity.subtitle}</p>
            </div>
            <Link href="/admin/activity" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--gl-green)] transition-colors hover:text-[var(--gl-green-deep)]">
              {copy.activity.open}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[780px] w-full text-left text-sm">
              <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
                <tr>
                  <th className="px-4 py-2.5">{copy.activity.when}</th>
                  <th className="px-4 py-2.5">{copy.activity.user}</th>
                  <th className="px-4 py-2.5">{copy.activity.product}</th>
                  <th className="px-4 py-2.5">{copy.activity.units}</th>
                  <th className="px-4 py-2.5">{copy.activity.city}</th>
                  <th className="px-4 py-2.5">{copy.activity.points}</th>
                  <th className="px-4 py-2.5">{copy.activity.status}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.activity.loading}</td></tr>
                ) : recentEvents.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.activity.empty}</td></tr>
                ) : (
                  recentEvents.map((event, index) => (
                    <tr key={`${event.created_at || "event"}-${index}`} className="border-t border-[var(--gl-hairline)] transition-colors hover:bg-[var(--gl-card-cream)]">
                      <td className="px-4 py-3 text-[var(--gl-ink-soft)]">
                        <div className="font-medium text-[var(--gl-ink)]">{formatShortDate(event.created_at, language)}</div>
                        <div className="text-xs text-[var(--gl-ink-muted)]">{formatTime(event.created_at, language)}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-[var(--gl-ink)]">{event.display_name || copy.activity.unknownUser}</div>
                        <div className="text-xs text-[var(--gl-ink-muted)]">{event.email || "-"}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-[var(--gl-ink)]">{event.product_name || copy.activity.unknownProduct}</div>
                        <div className="text-xs text-[var(--gl-ink-muted)]">{event.barcode || "-"}</div>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{event.units || 0}</td>
                      <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{event.city || "-"}</td>
                      <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{event.points_issued || 0}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={event.scan_status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-[var(--gl-shadow-sm)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gl-green-soft)] text-[var(--gl-green)]">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.cities.title}</h2>
                <p className="text-sm text-[var(--gl-ink-muted)]">{copy.cities.subtitle}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-[var(--gl-ink-muted)]">{copy.cities.loading}</p>
              ) : topCities.length === 0 ? (
                <p className="text-sm text-[var(--gl-ink-muted)]">{copy.cities.empty}</p>
              ) : (
                topCities.map((city) => (
                  <div key={city.city || "unknown"} className="rounded-xl bg-[var(--gl-card-cream)] px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-[var(--gl-ink)]">{city.city || copy.cities.unknown}</span>
                      <span className="shrink-0 text-[var(--gl-ink-muted)]">{formatNumber(city.units, language)} {copy.cities.units}</span>
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
          </section>

          <section className="rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-[var(--gl-shadow-sm)]">
            <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.modulesTitle}</h2>
            <div className="mt-4 space-y-3">
              {moduleLinks.map((module) => (
                <Link key={module.href} href={module.href} className="group flex gap-3 rounded-xl border border-[var(--gl-hairline)] p-3 transition-colors hover:border-[var(--gl-green)]/40 hover:bg-[var(--gl-green-soft)]/40">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gl-card-cream)] text-[var(--gl-ink-muted)] group-hover:bg-[var(--gl-paper)] group-hover:text-[var(--gl-green)]">
                    <module.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--gl-ink)]">{copy.modules[module.key][0]}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--gl-ink-faint)] group-hover:text-[var(--gl-green)]" />
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[var(--gl-ink-muted)]">{copy.modules[module.key][1]}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </aside>
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
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${classes}`}>
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
    <div className="rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-[var(--gl-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--gl-shadow-md)]" style={{ borderTopColor: accent, borderTopWidth: 4 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{label}</div>
          <div className="mt-2 text-2xl font-bold text-[var(--gl-ink)]">{loading ? "-" : formatNumber(value, language)}</div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gl-card-cream)]" style={{ color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--gl-ink-muted)]">{helper}</p>
    </div>
  );
}
