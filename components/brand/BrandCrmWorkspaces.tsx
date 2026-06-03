"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { DashboardLanguage, useDashboardLanguage } from "@/components/crm/DashboardLanguage";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Download, FileSpreadsheet, FileText, LineChart, Map as MapIcon, Megaphone, Recycle, Table } from "lucide-react";

const RecyclingMap = dynamic(() => import("@/components/RecyclingMap"), { ssr: false });

const CHART_COLORS = {
  green: "#15785A",
  greenDeep: "#0F2B21",
  moss: "#1F8367",
  amber: "#F1A531",
  ink: "#14211B",
  inkMuted: "#6C8077",
  greenSoft: "#D6EBE0",
  hairline: "rgba(20, 32, 26, 0.10)",
};

type BrandWorkspaceKind =
  | "overview"
  | "rewards"
  | "challenges"
  | "reports"
  | "recycling"
  | "campaigns"
  | "behavior"
  | "geo"
  | "exports"
  | "maps"
  | "settings";

type BrandMeta = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
};

type ReportsResponse = {
  totals?: {
    totalRedemptions?: number;
    activeTokens?: number;
    expiredTokens?: number;
    redemptionRate?: number;
  };
};

type Campaign = {
  challengeId: string;
  title: string;
  startsAt?: string | null;
  endsAt?: string | null;
  participants: number;
  completed: number;
  completionRate: number;
  bonusPointsIssued: number;
  avgUnitsPerParticipant: number;
  incrementalUnitsLift: number;
};

type BehaviorResponse = {
  brandShareRedeemers?: number;
  brandShareNonRedeemers?: number;
  brandLift?: number;
  relativeLift?: number;
  redeemerCount?: number;
  nonRedeemerCount?: number;
};

type BrandProduct = {
  id: string;
  barcode: string;
  name: string;
  source?: string;
  verificationStatus?: string;
};

type EventItem = {
  recycled_at: string;
  product_name: string;
  barcode: string;
  units: number;
  points: number;
  city: string | null;
  lat: number | null;
  lng: number | null;
  scan_status: string;
  anonymized_user_id: string;
  recycling_event_id: string;
};

type BrandCrmData = {
  meta: BrandMeta | null;
  reports: ReportsResponse | null;
  campaigns: Campaign[];
  behavior: BehaviorResponse | null;
  events: EventItem[];
  products: BrandProduct[];
};

const brandCopy = {
  en: {
    brandCrm: "Brand CRM",
    products: "Products",
    exports: "Exports",
    yourBrand: "Your brand",
    unableToLoad: "Unable to load brand CRM data",
    unableToExport: "Unable to export report",
    filters: { from: "From", to: "To", city: "City", allCities: "All cities", unknown: "Unknown" },
    kpis: {
      verifiedUnits: "Verified Units",
      engagedConsumers: "Engaged Consumers",
      ecoPointsIssued: "EcoPoints Issued",
      repeatUsers: "Repeat Users",
      products: "Products",
      verifiedProducts: "Verified Products",
      campaigns: "Campaigns",
      activeRewards: "Active Rewards",
      totalRedemptions: "Total Redemptions",
      activeTokens: "Active Tokens",
      expiredTokens: "Expired Tokens",
      redemptionRate: "Redemption Rate",
      redeemers: "Redeemers",
      nonRedeemers: "Non-redeemers",
      uniqueRecyclers: "Unique Recyclers",
    },
    titles: {
      overview: "Overview",
      rewards: "Rewards",
      challenges: "Challenges / Campaigns",
      reports: "Reports",
      recycling: "Recycling Report",
      campaigns: "Campaign Report",
      behavior: "Behavior Report",
      geo: "Geo Report",
      exports: "Export Center",
      maps: "Maps",
      settings: "Settings",
    } satisfies Record<BrandWorkspaceKind, string>,
    descriptions: {
      overview: (brandName: string) => `Brand-scoped operating view for ${brandName}: recycling volume, consumers, products, campaigns, and geography.`,
      rewards: () => "View brand reward performance and unlocked reward token counts without exposing internal admin controls.",
      challenges: () => "Monitor brand campaigns, participant completion, bonus EcoPoints, and campaign lift.",
      reports: () => "Open dedicated full-screen report workspaces for recycling, campaigns, behavior, geo, and exports.",
      recycling: () => "Inspect brand-owned recycling events and verified units by product, user cohort, city, and date.",
      campaigns: () => "Review campaign participation, completions, bonus points, and incremental units.",
      behavior: () => "Compare brand share and repeat behavior between reward redeemers and non-redeemers.",
      geo: () => "Review city-level recycling performance for this brand.",
      exports: () => "Download brand-scoped reports and activity exports.",
      maps: () => "Brand-scoped recycling map with enough space for geographic analysis.",
      settings: (brandName: string) => `Profile and account settings for ${brandName}.`,
    } satisfies Record<BrandWorkspaceKind, (brandName: string) => string>,
    activity: {
      title: "Recycling activity",
      subtitle: "Brand-scoped event rows only.",
      date: "Date",
      product: "Product",
      barcode: "Barcode",
      units: "Units",
      points: "Points",
      city: "City",
      status: "Status",
      loading: "Loading activity...",
      empty: "No activity matches the current filters.",
    },
    overview: {
      brandImpact: "Brand impact",
      performance: "Verified recycling performance across the selected period.",
      recyclingVolume: "Recycling volume",
      verifiedUnitsPerDay: "Verified units per day",
      noActivityPeriod: "No recycling activity in this period yet.",
      topProducts: "Top products",
      topCities: "Top cities",
      noProductActivity: "No product activity yet.",
      noCityActivity: "No city activity yet.",
      verifiedUnits: "Verified units",
      behaviorSnapshot: "Behavior snapshot",
      avgEventsUser: "Average events/user",
      activeCampaigns: "Active campaigns",
    },
    reports: [
      { title: "Recycling Report", href: "/brand/reports/recycling", description: "Verified units, products, consumers, and activity rows.", icon: Recycle },
      { title: "Campaign Report", href: "/brand/reports/campaigns", description: "Challenge participation, completions, and bonus EcoPoints.", icon: Megaphone },
      { title: "Behavior Report", href: "/brand/reports/behavior", description: "Redeemer lift, repeat behavior, and consumer cohorts.", icon: LineChart },
      { title: "Geo Report", href: "/brand/reports/geo", description: "City performance and mapped recycling activity.", icon: MapIcon },
      { title: "Export Center", href: "/brand/reports/exports", description: "Download brand summary and raw activity exports.", icon: Download },
    ],
    campaigns: {
      performance: "Campaign performance",
      participantsVsCompleted: "Participants vs completed",
      noCampaigns: "No campaigns in this period yet.",
      campaign: "Campaign",
      participants: "Participants",
      completed: "Completed",
      completion: "Completion",
      bonusPoints: "Bonus Points",
      timeline: "Timeline",
      loading: "Loading campaigns...",
      empty: "No campaigns available.",
    },
    behavior: {
      brandLift: "Brand lift",
      redeemerShare: "Redeemer share",
      nonRedeemerShare: "Non-redeemer share",
      absoluteLift: "Absolute lift",
      relativeLift: "Relative lift",
      shareComparison: "Brand share comparison",
      shareDescription: "Share of recycling attributable to your brand.",
      noBehavior: "No behavior data in this period yet.",
      redeemers: "Redeemers",
      nonRedeemers: "Non-redeemers",
    },
    geo: {
      cityPerformance: "City performance",
      city: "City",
      units: "Units",
      consumers: "Consumers",
      loading: "Loading cities...",
      recyclingByCity: "Recycling by city",
      noCityActivityPeriod: "No city activity in this period yet.",
    },
    maps: {
      title: "Brand recycling map",
      loading: "Loading locations...",
      mappedEvents: (count: number) => `${count} mapped events`,
    },
    exportPanel: {
      preparing: "Preparing export...",
      download: "Download",
      items: [
        { label: "Report PDF", path: "/brand/export/report.pdf", filenamePrefix: "greenloop-brand-report", format: "PDF", description: "Formatted brand report, ready to share.", icon: FileText },
        { label: "Report XLSX", path: "/brand/export/report.xlsx", filenamePrefix: "greenloop-brand-report", format: "XLSX", description: "Full report workbook with breakdowns.", icon: FileSpreadsheet },
        { label: "Raw Events XLSX", path: "/brand/export/events.xlsx", filenamePrefix: "greenloop-brand-events", format: "XLSX", description: "Item-level recycling event rows.", icon: Table },
      ],
    },
    settings: {
      brandProfile: "Brand profile",
      loading: "Loading settings...",
      brandName: "Brand name",
      brandId: "Brand ID",
      initials: "Initials",
      brandColor: "Brand color",
    },
    rewards: { rewardTokens: "Reward tokens", activeVsExpired: "Active vs expired", noTokens: "No reward tokens issued in this period yet.", active: "Active", expired: "Expired" },
  },
  es: {
    brandCrm: "CRM de marca",
    products: "Productos",
    exports: "Exportaciones",
    yourBrand: "Tu marca",
    unableToLoad: "No se pudieron cargar los datos del CRM de marca",
    unableToExport: "No se pudo exportar el informe",
    filters: { from: "Desde", to: "Hasta", city: "Ciudad", allCities: "Todas las ciudades", unknown: "Desconocida" },
    kpis: {
      verifiedUnits: "Unidades verificadas",
      engagedConsumers: "Consumidores implicados",
      ecoPointsIssued: "EcoPoints emitidos",
      repeatUsers: "Usuarios recurrentes",
      products: "Productos",
      verifiedProducts: "Productos verificados",
      campaigns: "Campañas",
      activeRewards: "Recompensas activas",
      totalRedemptions: "Canjes totales",
      activeTokens: "Tokens activos",
      expiredTokens: "Tokens caducados",
      redemptionRate: "Tasa de canje",
      redeemers: "Usuarios que canjearon",
      nonRedeemers: "Usuarios sin canje",
      uniqueRecyclers: "Recicladores únicos",
    },
    titles: {
      overview: "Resumen",
      rewards: "Recompensas",
      challenges: "Retos / Campañas",
      reports: "Informes",
      recycling: "Informe de reciclaje",
      campaigns: "Informe de campañas",
      behavior: "Informe de comportamiento",
      geo: "Informe geográfico",
      exports: "Centro de exportación",
      maps: "Mapas",
      settings: "Configuración",
    } satisfies Record<BrandWorkspaceKind, string>,
    descriptions: {
      overview: (brandName: string) => `Vista operativa de marca para ${brandName}: volumen reciclado, consumidores, productos, campañas y geografía.`,
      rewards: () => "Consulta el rendimiento de recompensas de marca y los tokens desbloqueados sin exponer controles internos de admin.",
      challenges: () => "Supervisa campañas de marca, participación, finalizaciones, EcoPoints extra e impacto.",
      reports: () => "Abre espacios de informe a pantalla completa para reciclaje, campañas, comportamiento, geografía y exportaciones.",
      recycling: () => "Revisa eventos de reciclaje vinculados a la marca y unidades verificadas por producto, cohorte, ciudad y fecha.",
      campaigns: () => "Consulta participación, finalizaciones, puntos extra y unidades incrementales.",
      behavior: () => "Compara cuota de marca y recurrencia entre usuarios que canjearon recompensas y quienes no.",
      geo: () => "Revisa el rendimiento de reciclaje por ciudad para esta marca.",
      exports: () => "Descarga informes y exportaciones de actividad acotados a la marca.",
      maps: () => "Mapa de reciclaje acotado a la marca con espacio suficiente para análisis geográfico.",
      settings: (brandName: string) => `Perfil y configuración de cuenta para ${brandName}.`,
    } satisfies Record<BrandWorkspaceKind, (brandName: string) => string>,
    activity: {
      title: "Actividad de reciclaje",
      subtitle: "Solo eventos asociados a esta marca.",
      date: "Fecha",
      product: "Producto",
      barcode: "Código de barras",
      units: "Unidades",
      points: "Puntos",
      city: "Ciudad",
      status: "Estado",
      loading: "Cargando actividad...",
      empty: "No hay actividad que coincida con los filtros actuales.",
    },
    overview: {
      brandImpact: "Impacto de marca",
      performance: "Rendimiento de reciclaje verificado durante el periodo seleccionado.",
      recyclingVolume: "Volumen de reciclaje",
      verifiedUnitsPerDay: "Unidades verificadas por día",
      noActivityPeriod: "Aún no hay actividad de reciclaje en este periodo.",
      topProducts: "Productos principales",
      topCities: "Ciudades principales",
      noProductActivity: "Aún no hay actividad por producto.",
      noCityActivity: "Aún no hay actividad por ciudad.",
      verifiedUnits: "Unidades verificadas",
      behaviorSnapshot: "Resumen de comportamiento",
      avgEventsUser: "Eventos medios/usuario",
      activeCampaigns: "Campañas activas",
    },
    reports: [
      { title: "Informe de reciclaje", href: "/brand/reports/recycling", description: "Unidades verificadas, productos, consumidores y filas de actividad.", icon: Recycle },
      { title: "Informe de campañas", href: "/brand/reports/campaigns", description: "Participación en retos, finalizaciones y EcoPoints extra.", icon: Megaphone },
      { title: "Informe de comportamiento", href: "/brand/reports/behavior", description: "Impacto de canjes, recurrencia y cohortes de consumidores.", icon: LineChart },
      { title: "Informe geográfico", href: "/brand/reports/geo", description: "Rendimiento por ciudad y actividad de reciclaje mapeada.", icon: MapIcon },
      { title: "Centro de exportación", href: "/brand/reports/exports", description: "Descarga informes de marca y actividad detallada.", icon: Download },
    ],
    campaigns: {
      performance: "Rendimiento de campañas",
      participantsVsCompleted: "Participantes vs. completados",
      noCampaigns: "Aún no hay campañas en este periodo.",
      campaign: "Campaña",
      participants: "Participantes",
      completed: "Completados",
      completion: "Finalización",
      bonusPoints: "Puntos extra",
      timeline: "Periodo",
      loading: "Cargando campañas...",
      empty: "No hay campañas disponibles.",
    },
    behavior: {
      brandLift: "Impacto de marca",
      redeemerShare: "Cuota con canje",
      nonRedeemerShare: "Cuota sin canje",
      absoluteLift: "Impacto absoluto",
      relativeLift: "Impacto relativo",
      shareComparison: "Comparativa de cuota de marca",
      shareDescription: "Porcentaje de reciclaje atribuible a tu marca.",
      noBehavior: "Aún no hay datos de comportamiento en este periodo.",
      redeemers: "Con canje",
      nonRedeemers: "Sin canje",
    },
    geo: {
      cityPerformance: "Rendimiento por ciudad",
      city: "Ciudad",
      units: "Unidades",
      consumers: "Consumidores",
      loading: "Cargando ciudades...",
      recyclingByCity: "Reciclaje por ciudad",
      noCityActivityPeriod: "Aún no hay actividad por ciudad en este periodo.",
    },
    maps: {
      title: "Mapa de reciclaje de marca",
      loading: "Cargando ubicaciones...",
      mappedEvents: (count: number) => `${count} eventos mapeados`,
    },
    exportPanel: {
      preparing: "Preparando exportación...",
      download: "Descargar",
      items: [
        { label: "Informe PDF", path: "/brand/export/report.pdf", filenamePrefix: "greenloop-informe-marca", format: "PDF", description: "Informe de marca formateado y listo para compartir.", icon: FileText },
        { label: "Informe XLSX", path: "/brand/export/report.xlsx", filenamePrefix: "greenloop-informe-marca", format: "XLSX", description: "Libro completo con desgloses.", icon: FileSpreadsheet },
        { label: "Eventos XLSX", path: "/brand/export/events.xlsx", filenamePrefix: "greenloop-eventos-marca", format: "XLSX", description: "Filas detalladas de eventos de reciclaje.", icon: Table },
      ],
    },
    settings: {
      brandProfile: "Perfil de marca",
      loading: "Cargando configuración...",
      brandName: "Nombre de marca",
      brandId: "ID de marca",
      initials: "Iniciales",
      brandColor: "Color de marca",
    },
    rewards: { rewardTokens: "Tokens de recompensa", activeVsExpired: "Activos vs. caducados", noTokens: "Aún no se han emitido tokens de recompensa en este periodo.", active: "Activos", expired: "Caducados" },
  },
};

type BrandCopy = typeof brandCopy.en;

function normalizeList<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
}

function localeForLanguage(language: DashboardLanguage) {
  return language === "es" ? "es-ES" : "en-US";
}

function formatNumber(value: number | undefined, digits = 0, language: DashboardLanguage = "en") {
  return Number(value || 0).toLocaleString(localeForLanguage(language), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatPercent(value: number | undefined, language: DashboardLanguage = "en") {
  return `${formatNumber(Number(value || 0) * 100, 1, language)}%`;
}

function formatDate(value?: string | null, language: DashboardLanguage = "en") {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(localeForLanguage(language));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatShortDate(value: string, language: DashboardLanguage = "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(localeForLanguage(language), { month: "short", day: "numeric" });
}

function truncateLabel(value: string, max = 18) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function BrandCrmWorkspace({ kind }: { kind: BrandWorkspaceKind }) {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const copy = brandCopy[language];
  const [data, setData] = useState<BrandCrmData>({
    meta: null,
    reports: null,
    campaigns: [],
    behavior: null,
    events: [],
    products: [],
  });
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBrand = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const query = fromDate || toDate ? `?from=${fromDate}&to=${toDate}` : "";
      const [meta, reports, campaigns, behavior, events, products] = await Promise.all([
        apiFetch("/brand/meta", { token }),
        apiFetch("/brand/reports/redemptions", { token }),
        apiFetch(`/brand/reports/campaigns${query}`, { token }),
        apiFetch(`/brand/reports/behavior${query}`, { token }),
        apiFetch(`/brand/reports/events${query}`, { token }),
        apiFetch("/brand/products", { token }),
      ]);

      setData({
        meta: (meta as { brand?: BrandMeta })?.brand ?? null,
        reports: reports as ReportsResponse,
        campaigns: normalizeList<Campaign>(campaigns, "campaigns"),
        behavior: behavior as BehaviorResponse,
        events: Array.isArray(events) ? (events as EventItem[]) : normalizeList<EventItem>(events, "events"),
        products: normalizeList<BrandProduct>(products, "products"),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.unableToLoad);
    } finally {
      setLoading(false);
    }
  }, [copy.unableToLoad, fromDate, router, toDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBrand(), 250);
    return () => window.clearTimeout(timer);
  }, [loadBrand]);

  const cities = useMemo(
    () => ["all", ...Array.from(new Set(data.events.map((event) => event.city || copy.filters.unknown))).sort()],
    [copy.filters.unknown, data.events]
  );

  const rawFilteredEvents = useMemo(
    () => data.events.filter((event) => cityFilter === "all" || (event.city || copy.filters.unknown) === cityFilter),
    [cityFilter, copy.filters.unknown, data.events]
  );

  const filteredEvents = useMemo(
    () => rawFilteredEvents.map((event) => ({ ...event, city: event.city || copy.filters.unknown })),
    [copy.filters.unknown, rawFilteredEvents]
  );

  useEffect(() => {
    setCityFilter("all");
  }, [language]);

  const languageAwareEvents = filteredEvents;

  const derived = useMemo(() => {
    const userCounts = new Map<string, number>();
    const productUnits = new Map<string, number>();
    const cityUnits = new Map<string, { units: number; consumers: Set<string> }>();

    for (const event of languageAwareEvents) {
      userCounts.set(event.anonymized_user_id, (userCounts.get(event.anonymized_user_id) || 0) + 1);
      productUnits.set(event.product_name, (productUnits.get(event.product_name) || 0) + Number(event.units || 0));
      const city = event.city || copy.filters.unknown;
      const current = cityUnits.get(city) ?? { units: 0, consumers: new Set<string>() };
      current.units += Number(event.units || 0);
      current.consumers.add(event.anonymized_user_id);
      cityUnits.set(city, current);
    }

    const uniqueUsers = userCounts.size;
    const totalUnits = languageAwareEvents.reduce((sum, event) => sum + Number(event.units || 0), 0);
    const totalPoints = languageAwareEvents.reduce((sum, event) => sum + Number(event.points || 0), 0);

    return {
      totalUnits,
      totalPoints,
      uniqueUsers,
      repeatUsers: Array.from(userCounts.values()).filter((count) => count > 1).length,
      avgEventsPerUser: uniqueUsers > 0 ? languageAwareEvents.length / uniqueUsers : 0,
      verifiedProducts: data.products.filter((product) => product.verificationStatus === "verified").length,
      topProducts: Array.from(productUnits.entries())
        .map(([name, units]) => ({ name, units }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 6),
      topCities: Array.from(cityUnits.entries())
        .map(([name, value]) => ({ name, units: value.units, consumers: value.consumers.size }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 8),
    };
  }, [copy.filters.unknown, data.products, languageAwareEvents]);

  async function exportReport(path: string, filename: string) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setExporting(filename);
      const query = fromDate || toDate ? `?from=${fromDate}&to=${toDate}` : "";
      const blob = await apiFetchBlob(`${path}${query}`, { token });
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.unableToExport);
    } finally {
      setExporting(null);
    }
  }

  const brandName = data.meta?.name ?? copy.yourBrand;
  const title = titleForKind(kind, language);
  const description = descriptionForKind(kind, brandName, language);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--gl-green)]">{copy.brandCrm}</p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--gl-ink)]">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--gl-ink-muted)]">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/brand/products" className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">
            {copy.products}
          </Link>
          <Link href="/brand/reports/exports" className="rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gl-green-deep)]">
            {copy.exports}
          </Link>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {kind === "settings" ? <SettingsPanel brand={data.meta} loading={loading} copy={copy} /> : null}

      {kind !== "settings" ? (
        <Filters
          fromDate={fromDate}
          toDate={toDate}
          cityFilter={cityFilter}
          cities={cities}
          setFromDate={setFromDate}
          setToDate={setToDate}
          setCityFilter={setCityFilter}
          copy={copy}
        />
      ) : null}

      {kind === "overview" ? (
        <BrandOverview
          brandName={brandName}
          derived={derived}
          data={data}
          filteredEvents={languageAwareEvents}
          loading={loading}
          language={language}
          copy={copy}
        />
      ) : null}

      {kind !== "settings" && kind !== "overview" && kind !== "exports" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={copy.kpis.verifiedUnits} value={derived.totalUnits} loading={loading} language={language} />
          <Kpi label={copy.kpis.engagedConsumers} value={derived.uniqueUsers} loading={loading} language={language} />
          <Kpi label={copy.kpis.ecoPointsIssued} value={derived.totalPoints} loading={loading} language={language} />
          <Kpi label={copy.kpis.repeatUsers} value={derived.repeatUsers} loading={loading} language={language} />
          <Kpi label={copy.kpis.products} value={data.products.length} loading={loading} language={language} />
          <Kpi label={copy.kpis.verifiedProducts} value={derived.verifiedProducts} loading={loading} language={language} />
          <Kpi label={copy.kpis.campaigns} value={data.campaigns.length} loading={loading} language={language} />
          <Kpi label={copy.kpis.activeRewards} value={data.reports?.totals?.activeTokens || 0} loading={loading} language={language} />
        </div>
      ) : null}

      {kind === "reports" ? <ReportHub copy={copy} /> : null}
      {kind === "recycling" ? <ActivityTable events={languageAwareEvents} loading={loading} language={language} copy={copy} /> : null}
      {kind === "campaigns" || kind === "challenges" ? (
        <div className="space-y-5">
          <CampaignChart campaigns={data.campaigns} copy={copy} />
          <CampaignTable campaigns={data.campaigns} loading={loading} language={language} copy={copy} />
        </div>
      ) : null}
      {kind === "behavior" ? <BehaviorPanel behavior={data.behavior} derived={derived} loading={loading} language={language} copy={copy} /> : null}
      {kind === "geo" ? (
        <div className="space-y-5">
          <CityChart cities={derived.topCities} copy={copy} />
          <CityTable cities={derived.topCities} loading={loading} language={language} copy={copy} />
        </div>
      ) : null}
      {kind === "maps" ? <MapPanel events={languageAwareEvents} loading={loading} copy={copy} /> : null}
      {kind === "exports" ? (
        <ExportPanel
          exporting={exporting}
          onExport={(path, filename) => void exportReport(path, filename)}
          copy={copy}
        />
      ) : null}
      {kind === "rewards" ? (
        <div className="space-y-5">
          <RewardsPanel reports={data.reports} loading={loading} language={language} copy={copy} />
          <RewardsChart reports={data.reports} copy={copy} />
        </div>
      ) : null}
    </div>
  );
}

function titleForKind(kind: BrandWorkspaceKind, language: DashboardLanguage) {
  return brandCopy[language].titles[kind];
}

function descriptionForKind(kind: BrandWorkspaceKind, brandName: string, language: DashboardLanguage) {
  return brandCopy[language].descriptions[kind](brandName);
}

function Filters({
  fromDate,
  toDate,
  cityFilter,
  cities,
  setFromDate,
  setToDate,
  setCityFilter,
  copy,
}: {
  fromDate: string;
  toDate: string;
  cityFilter: string;
  cities: string[];
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
  setCityFilter: (value: string) => void;
  copy: BrandCopy;
}) {
  return (
    <section className="grid gap-3 rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm md:grid-cols-3">
      <label className="text-sm font-medium text-[var(--gl-ink-soft)]">
        {copy.filters.from}
        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]" />
      </label>
      <label className="text-sm font-medium text-[var(--gl-ink-soft)]">
        {copy.filters.to}
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]" />
      </label>
      <label className="text-sm font-medium text-[var(--gl-ink-soft)]">
        {copy.filters.city}
        <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]">
          {cities.map((city) => <option key={city} value={city}>{city === "all" ? copy.filters.allCities : city}</option>)}
        </select>
      </label>
    </section>
  );
}

function Kpi({ label, value, loading, language = "en" }: { label: string; value: number; loading: boolean; language?: DashboardLanguage }) {
  return (
    <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-[var(--gl-ink)]">{loading ? "-" : formatNumber(value, 0, language)}</div>
    </div>
  );
}

function ActivityTable({ events, loading, language, copy }: { events: EventItem[]; loading: boolean; language: DashboardLanguage; copy: BrandCopy }) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
      <div className="border-b border-[var(--gl-hairline)] p-4">
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.activity.title}</h2>
        <p className="text-sm text-[var(--gl-ink-muted)]">{copy.activity.subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
            <tr>
              <th className="px-4 py-2.5">{copy.activity.date}</th>
              <th className="px-4 py-2.5">{copy.activity.product}</th>
              <th className="px-4 py-2.5">{copy.activity.barcode}</th>
              <th className="px-4 py-2.5">{copy.activity.units}</th>
              <th className="px-4 py-2.5">{copy.activity.points}</th>
              <th className="px-4 py-2.5">{copy.activity.city}</th>
              <th className="px-4 py-2.5">{copy.activity.status}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.activity.loading}</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.activity.empty}</td></tr>
            ) : (
              events.map((event) => (
                <tr key={event.recycling_event_id} className="border-t border-[var(--gl-hairline)] hover:bg-[var(--gl-card-cream)]">
                  <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{formatDate(event.recycled_at, language)}</td>
                  <td className="px-4 py-2.5 font-medium text-[var(--gl-ink)]">{event.product_name}</td>
                  <td className="px-4 py-2.5 text-[var(--gl-ink-muted)]">{event.barcode}</td>
                  <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{event.units}</td>
                  <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{event.points}</td>
                  <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{event.city || "-"}</td>
                  <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{event.scan_status || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type OverviewDerived = {
  totalUnits: number;
  totalPoints: number;
  uniqueUsers: number;
  repeatUsers: number;
  avgEventsPerUser: number;
  verifiedProducts: number;
  topProducts: { name: string; units: number }[];
  topCities: { name: string; units: number; consumers: number }[];
};

function BrandOverview({
  brandName,
  derived,
  data,
  filteredEvents,
  loading,
  language,
  copy,
}: {
  brandName: string;
  derived: OverviewDerived;
  data: BrandCrmData;
  filteredEvents: EventItem[];
  loading: boolean;
  language: DashboardLanguage;
  copy: BrandCopy;
}) {
  const dailyTrend = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const event of filteredEvents) {
      const date = new Date(event.recycled_at);
      if (Number.isNaN(date.getTime())) continue;
      const key = date.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + Number(event.units || 0));
    }
    return Array.from(byDay.entries())
      .map(([date, units]) => ({ date, units }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredEvents]);

  return (
    <div className="space-y-5">
      <section
        className="overflow-hidden rounded-2xl border border-[var(--gl-hairline)] text-white shadow-sm"
        style={{ background: "linear-gradient(135deg, var(--gl-green-deep), var(--gl-green-forest))" }}
      >
        <div className="flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">{copy.overview.brandImpact}</p>
            <h2 className="mt-2 break-words text-3xl font-bold leading-tight md:text-4xl">{brandName}</h2>
            <p className="mt-2 max-w-md text-sm text-white/70">{copy.overview.performance}</p>
          </div>
          <div className="grid grid-cols-3 gap-5 sm:gap-6">
            <HeroStat label={copy.overview.verifiedUnits} value={loading ? "-" : formatNumber(derived.totalUnits, 0, language)} />
            <HeroStat label={copy.kpis.ecoPointsIssued} value={loading ? "-" : formatNumber(derived.totalPoints, 0, language)} />
            <HeroStat label={copy.kpis.engagedConsumers} value={loading ? "-" : formatNumber(derived.uniqueUsers, 0, language)} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label={copy.kpis.repeatUsers} value={derived.repeatUsers} loading={loading} language={language} />
        <Kpi label={copy.kpis.products} value={data.products.length} loading={loading} language={language} />
        <Kpi label={copy.kpis.verifiedProducts} value={derived.verifiedProducts} loading={loading} language={language} />
        <Kpi label={copy.kpis.campaigns} value={data.campaigns.length} loading={loading} language={language} />
        <Kpi label={copy.kpis.activeRewards} value={data.reports?.totals?.activeTokens || 0} loading={loading} language={language} />
      </div>

      <ChartCard title={copy.overview.recyclingVolume} subtitle={copy.overview.verifiedUnitsPerDay}>
        {loading ? (
          <EmptyChart message={copy.activity.loading} />
        ) : dailyTrend.length === 0 ? (
          <EmptyChart message={copy.overview.noActivityPeriod} />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyTrend} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="brandTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.hairline} vertical={false} />
              <XAxis dataKey="date" tickFormatter={(value) => formatShortDate(String(value), language)} tick={{ fontSize: 11, fill: CHART_COLORS.inkMuted }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} width={40} tick={{ fontSize: 11, fill: CHART_COLORS.inkMuted }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: CHART_COLORS.greenSoft }}
                contentStyle={{ borderRadius: 12, border: `1px solid ${CHART_COLORS.hairline}`, fontSize: 12 }}
                labelFormatter={(label) => formatShortDate(String(label), language)}
              />
              <Area type="monotone" dataKey="units" stroke={CHART_COLORS.green} strokeWidth={2} fill="url(#brandTrendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title={copy.overview.topProducts} subtitle={copy.overview.verifiedUnits}>
          {derived.topProducts.length === 0 ? (
            <EmptyChart message={copy.overview.noProductActivity} />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, derived.topProducts.length * 40)}>
              <BarChart data={derived.topProducts} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid horizontal={false} stroke={CHART_COLORS.hairline} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.inkMuted }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={130} tickFormatter={(value) => truncateLabel(String(value))} tick={{ fontSize: 11, fill: CHART_COLORS.ink }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: CHART_COLORS.greenSoft, opacity: 0.4 }}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${CHART_COLORS.hairline}`, fontSize: 12 }}
                />
                <Bar dataKey="units" fill={CHART_COLORS.green} radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={copy.overview.topCities} subtitle={copy.overview.verifiedUnits}>
          {derived.topCities.length === 0 ? (
            <EmptyChart message={copy.overview.noCityActivity} />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, derived.topCities.length * 40)}>
              <BarChart data={derived.topCities} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid horizontal={false} stroke={CHART_COLORS.hairline} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.inkMuted }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={130} tickFormatter={(value) => truncateLabel(String(value))} tick={{ fontSize: 11, fill: CHART_COLORS.ink }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: CHART_COLORS.greenSoft, opacity: 0.4 }}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${CHART_COLORS.hairline}`, fontSize: 12 }}
                />
                <Bar dataKey="units" fill={CHART_COLORS.moss} radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ActivityTable events={filteredEvents.slice(0, 8)} loading={loading} language={language} copy={copy} />
        <BehaviorSnapshot derived={derived} campaigns={data.campaigns} behavior={data.behavior} language={language} copy={copy} />
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums md:text-3xl">{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-white/60">{label}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{title}</h2>
        {subtitle ? <p className="text-sm text-[var(--gl-ink-muted)]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-lg bg-[var(--gl-card-cream)] text-sm text-[var(--gl-ink-muted)]">
      {message}
    </div>
  );
}

function BehaviorSnapshot({
  derived,
  campaigns,
  behavior,
  language,
  copy,
}: {
  derived: { avgEventsPerUser: number };
  campaigns: Campaign[];
  behavior: BehaviorResponse | null;
  language: DashboardLanguage;
  copy: BrandCopy;
}) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.overview.behaviorSnapshot}</h2>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-[var(--gl-ink-muted)]">{copy.overview.avgEventsUser}</span><strong className="text-[var(--gl-ink)]">{formatNumber(derived.avgEventsPerUser, 1, language)}</strong></div>
        <div className="flex justify-between"><span className="text-[var(--gl-ink-muted)]">{copy.kpis.redeemers}</span><strong className="text-[var(--gl-ink)]">{formatNumber(behavior?.redeemerCount, 0, language)}</strong></div>
        <div className="flex justify-between"><span className="text-[var(--gl-ink-muted)]">{copy.overview.activeCampaigns}</span><strong className="text-[var(--gl-ink)]">{formatNumber(campaigns.length, 0, language)}</strong></div>
      </div>
    </section>
  );
}

function ReportHub({ copy }: { copy: BrandCopy }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {copy.reports.map((report) => {
        const Icon = report.icon;
        return (
          <Link
            key={report.href}
            href={report.href}
            className="group flex flex-col rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm transition hover:border-[var(--gl-green)] hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]">
                <Icon className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-[var(--gl-ink-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--gl-green)]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--gl-ink)]">{report.title}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--gl-ink-muted)]">{report.description}</p>
          </Link>
        );
      })}
    </div>
  );
}

function CampaignChart({ campaigns, copy }: { campaigns: Campaign[]; copy: BrandCopy }) {
  if (campaigns.length === 0) {
    return (
      <ChartCard title={copy.campaigns.performance} subtitle={copy.campaigns.participantsVsCompleted}>
        <EmptyChart message={copy.campaigns.noCampaigns} />
      </ChartCard>
    );
  }
  const chartData = campaigns.map((campaign) => ({
    name: campaign.title,
    participants: campaign.participants,
    completed: campaign.completed,
  }));
  return (
    <ChartCard title={copy.campaigns.performance} subtitle={copy.campaigns.participantsVsCompleted}>
      <ResponsiveContainer width="100%" height={Math.max(180, campaigns.length * 64)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barGap={2}>
          <CartesianGrid horizontal={false} stroke={CHART_COLORS.hairline} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.inkMuted }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={130} tickFormatter={(value) => truncateLabel(String(value))} tick={{ fontSize: 11, fill: CHART_COLORS.ink }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: CHART_COLORS.greenSoft, opacity: 0.4 }} contentStyle={{ borderRadius: 12, border: `1px solid ${CHART_COLORS.hairline}`, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="participants" name={copy.campaigns.participants} fill={CHART_COLORS.green} radius={[0, 6, 6, 0]} barSize={12} />
          <Bar dataKey="completed" name={copy.campaigns.completed} fill={CHART_COLORS.moss} radius={[0, 6, 6, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function CampaignTable({ campaigns, loading, language, copy }: { campaigns: Campaign[]; loading: boolean; language: DashboardLanguage; copy: BrandCopy }) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
      <div className="border-b border-[var(--gl-hairline)] p-4">
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.campaigns.performance}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
            <tr>
              <th className="px-4 py-2.5">{copy.campaigns.campaign}</th>
              <th className="px-4 py-2.5">{copy.campaigns.participants}</th>
              <th className="px-4 py-2.5">{copy.campaigns.completed}</th>
              <th className="px-4 py-2.5">{copy.campaigns.completion}</th>
              <th className="px-4 py-2.5">{copy.campaigns.bonusPoints}</th>
              <th className="px-4 py-2.5">{copy.campaigns.timeline}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.campaigns.loading}</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.campaigns.empty}</td></tr>
            ) : campaigns.map((campaign) => (
              <tr key={campaign.challengeId} className="border-t border-[var(--gl-hairline)]">
                <td className="px-4 py-2.5 font-medium text-[var(--gl-ink)]">{campaign.title}</td>
                <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{campaign.participants}</td>
                <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{campaign.completed}</td>
                <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{formatPercent(campaign.completionRate, language)}</td>
                <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{formatNumber(campaign.bonusPointsIssued, 0, language)}</td>
                <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{formatDate(campaign.startsAt, language)} - {formatDate(campaign.endsAt, language)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BehaviorPanel({
  behavior,
  derived,
  loading,
  language,
  copy,
}: {
  behavior: BehaviorResponse | null;
  derived: { uniqueUsers: number; repeatUsers: number; avgEventsPerUser: number };
  loading: boolean;
  language: DashboardLanguage;
  copy: BrandCopy;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Kpi label={copy.kpis.redeemers} value={behavior?.redeemerCount || 0} loading={loading} language={language} />
      <Kpi label={copy.kpis.nonRedeemers} value={behavior?.nonRedeemerCount || 0} loading={loading} language={language} />
      <Kpi label={copy.kpis.uniqueRecyclers} value={derived.uniqueUsers} loading={loading} language={language} />
      <LiftChart behavior={behavior} copy={copy} />
      <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm md:col-span-2 xl:col-span-3">
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.behavior.brandLift}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Metric label={copy.behavior.redeemerShare} value={formatPercent(behavior?.brandShareRedeemers, language)} />
          <Metric label={copy.behavior.nonRedeemerShare} value={formatPercent(behavior?.brandShareNonRedeemers, language)} />
          <Metric label={copy.behavior.absoluteLift} value={formatPercent(behavior?.brandLift, language)} />
          <Metric label={copy.behavior.relativeLift} value={formatPercent(behavior?.relativeLift, language)} />
        </div>
      </section>
    </div>
  );
}

function CityTable({ cities, loading, language, copy }: { cities: { name: string; units: number; consumers: number }[]; loading: boolean; language: DashboardLanguage; copy: BrandCopy }) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
      <div className="border-b border-[var(--gl-hairline)] p-4">
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.geo.cityPerformance}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[560px] w-full text-left text-sm">
          <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
            <tr><th className="px-4 py-2.5">{copy.geo.city}</th><th className="px-4 py-2.5">{copy.geo.units}</th><th className="px-4 py-2.5">{copy.geo.consumers}</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={3} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.geo.loading}</td></tr> : cities.map((city) => (
              <tr key={city.name} className="border-t border-[var(--gl-hairline)]">
                <td className="px-4 py-2.5 font-medium text-[var(--gl-ink)]">{city.name}</td>
                <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{formatNumber(city.units, 0, language)}</td>
                <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{formatNumber(city.consumers, 0, language)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MapPanel({ events, loading, copy }: { events: EventItem[]; loading: boolean; copy: BrandCopy }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
      <div className="border-b border-[var(--gl-hairline)] p-4">
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.maps.title}</h2>
        <p className="text-sm text-[var(--gl-ink-muted)]">{loading ? copy.maps.loading : copy.maps.mappedEvents(events.filter((event) => typeof event.lat === "number" && typeof event.lng === "number").length)}</p>
      </div>
      <div className="h-[640px]">
        <RecyclingMap events={events} />
      </div>
    </section>
  );
}

function ExportPanel({ exporting, onExport, copy }: { exporting: string | null; onExport: (path: string, filename: string) => void; copy: BrandCopy }) {
  const today = new Date().toISOString().slice(0, 10);
  const exports = copy.exportPanel.items.map((item) => ({
    ...item,
    filename: `${item.filenamePrefix}-${today}.${item.format.toLowerCase()}`,
  }));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {exports.map((item) => {
        const Icon = item.icon;
        const isExporting = exporting === item.filename;
        return (
          <button
            key={item.path}
            onClick={() => onExport(item.path, item.filename)}
            disabled={Boolean(exporting)}
            className="group flex items-start gap-4 rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 text-left shadow-sm transition hover:border-[var(--gl-green)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-[var(--gl-ink)]">{item.label}</span>
                <span className="rounded-full bg-[var(--gl-card-cream)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{item.format}</span>
              </span>
              <span className="mt-1 block text-sm text-[var(--gl-ink-muted)]">{item.description}</span>
              <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--gl-green)]">
                <Download className="h-3.5 w-3.5" />
                {isExporting ? copy.exportPanel.preparing : copy.exportPanel.download}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RewardsPanel({ reports, loading, language, copy }: { reports: ReportsResponse | null; loading: boolean; language: DashboardLanguage; copy: BrandCopy }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Kpi label={copy.kpis.totalRedemptions} value={reports?.totals?.totalRedemptions || 0} loading={loading} language={language} />
      <Kpi label={copy.kpis.activeTokens} value={reports?.totals?.activeTokens || 0} loading={loading} language={language} />
      <Kpi label={copy.kpis.expiredTokens} value={reports?.totals?.expiredTokens || 0} loading={loading} language={language} />
      <Kpi label={copy.kpis.redemptionRate} value={Math.round(Number(reports?.totals?.redemptionRate || 0) * 100)} loading={loading} language={language} />
    </div>
  );
}

function SettingsPanel({ brand, loading, copy }: { brand: BrandMeta | null; loading: boolean; copy: BrandCopy }) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.settings.brandProfile}</h2>
      {loading ? <p className="mt-4 text-sm text-[var(--gl-ink-muted)]">{copy.settings.loading}</p> : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Metric label={copy.settings.brandName} value={brand?.name || "-"} />
          <Metric label={copy.settings.brandId} value={brand?.id || "-"} />
          <Metric label={copy.settings.initials} value={brand?.initials || "-"} />
          <Metric label={copy.settings.brandColor} value={brand?.color || "-"} />
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{label}</div>
      <div className="mt-2 break-words text-lg font-semibold text-[var(--gl-ink)]">{value}</div>
    </div>
  );
}

function CityChart({ cities, copy }: { cities: { name: string; units: number; consumers: number }[]; copy: BrandCopy }) {
  if (cities.length === 0) {
    return (
      <ChartCard title={copy.geo.recyclingByCity} subtitle={copy.overview.verifiedUnits}>
        <EmptyChart message={copy.geo.noCityActivityPeriod} />
      </ChartCard>
    );
  }
  return (
    <ChartCard title={copy.geo.recyclingByCity} subtitle={copy.overview.verifiedUnits}>
      <ResponsiveContainer width="100%" height={Math.max(180, cities.length * 40)}>
        <BarChart data={cities} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid horizontal={false} stroke={CHART_COLORS.hairline} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.inkMuted }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={130} tickFormatter={(value) => truncateLabel(String(value))} tick={{ fontSize: 11, fill: CHART_COLORS.ink }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: CHART_COLORS.greenSoft, opacity: 0.4 }} contentStyle={{ borderRadius: 12, border: `1px solid ${CHART_COLORS.hairline}`, fontSize: 12 }} />
          <Bar dataKey="units" fill={CHART_COLORS.green} radius={[0, 6, 6, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function LiftChart({ behavior, copy }: { behavior: BehaviorResponse | null; copy: BrandCopy }) {
  const redeemerShare = Number(behavior?.brandShareRedeemers || 0) * 100;
  const nonRedeemerShare = Number(behavior?.brandShareNonRedeemers || 0) * 100;

  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm md:col-span-2 xl:col-span-3">
      <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.behavior.shareComparison}</h2>
      <p className="text-sm text-[var(--gl-ink-muted)]">{copy.behavior.shareDescription}</p>
      <div className="mt-4">
        {redeemerShare === 0 && nonRedeemerShare === 0 ? (
          <EmptyChart message={copy.behavior.noBehavior} />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={[
                { name: copy.behavior.redeemers, share: Number(redeemerShare.toFixed(1)) },
                { name: copy.behavior.nonRedeemers, share: Number(nonRedeemerShare.toFixed(1)) },
              ]}
              layout="vertical"
              margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
            >
              <CartesianGrid horizontal={false} stroke={CHART_COLORS.hairline} />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: CHART_COLORS.inkMuted }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: CHART_COLORS.ink }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: CHART_COLORS.greenSoft, opacity: 0.4 }} contentStyle={{ borderRadius: 12, border: `1px solid ${CHART_COLORS.hairline}`, fontSize: 12 }} />
              <Bar dataKey="share" fill={CHART_COLORS.green} radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function RewardsChart({ reports, copy }: { reports: ReportsResponse | null; copy: BrandCopy }) {
  const active = Number(reports?.totals?.activeTokens || 0);
  const expired = Number(reports?.totals?.expiredTokens || 0);

  if (active === 0 && expired === 0) {
    return (
      <ChartCard title={copy.rewards.rewardTokens} subtitle={copy.rewards.activeVsExpired}>
        <EmptyChart message={copy.rewards.noTokens} />
      </ChartCard>
    );
  }

  return (
    <ChartCard title={copy.rewards.rewardTokens} subtitle={copy.rewards.activeVsExpired}>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={[
            { name: copy.rewards.active, tokens: active },
            { name: copy.rewards.expired, tokens: expired },
          ]}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
        >
          <CartesianGrid horizontal={false} stroke={CHART_COLORS.hairline} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.inkMuted }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: CHART_COLORS.ink }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: CHART_COLORS.greenSoft, opacity: 0.4 }} contentStyle={{ borderRadius: 12, border: `1px solid ${CHART_COLORS.hairline}`, fontSize: 12 }} />
          <Bar dataKey="tokens" radius={[0, 6, 6, 0]} barSize={18}>
            <Cell fill={CHART_COLORS.green} />
            <Cell fill={CHART_COLORS.amber} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
