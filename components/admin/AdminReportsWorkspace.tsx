"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { DashboardLanguage, useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type ReportKind = "hub" | "platform" | "brands" | "users" | "geo" | "exports";

type PlatformReport = {
  totals?: {
    totalUnits?: number;
    totalEvents?: number;
    uniqueConsumers?: number;
    ecoPointsIssued?: number;
  };
  perProduct?: { product_name?: string; units_recycled?: number }[];
  geoBreakdown?: { city?: string | null; units?: number; consumers?: number }[];
  dailyTrend?: { date: string; units?: number }[];
  events?: PlatformEvent[];
};

type PlatformEvent = {
  created_at?: string;
  product_name?: string;
  barcode?: string;
  units?: number;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  scan_status?: string;
  user_id?: string | number;
  display_name?: string | null;
  email?: string | null;
  bin_id?: string | number | null;
  event_id?: string | number;
  points_issued?: number;
};

type RedemptionReport = {
  totals?: {
    totalRedemptions?: number;
    activeTokens?: number;
    expiredTokens?: number;
    redemptionRate?: number;
  };
};

type Brand = {
  id: string;
  name: string;
  product_count?: number;
  admin_count?: number;
  reward_count?: number;
  eco_points_issued?: number;
};

type AdminUser = {
  id: string;
  display_name?: string | null;
  email?: string | null;
  role?: string;
  wallet_points?: number;
  recycling_events_count?: number;
  recycled_units_count?: number;
  latest_city?: string | null;
  created_at?: string;
};

type Product = {
  id: string;
  ean?: string;
  name?: string;
  brand_name?: string | null;
  verification_status?: string | null;
  recycled_units_count?: number;
};

type Unlock = {
  id: string;
  unlock_status?: string;
  token?: string;
  promo_code?: string | null;
  created_at?: string;
  expires_at?: string | null;
  redeemed_at?: string | null;
  reward?: { title?: string | null; partner_name?: string | null };
  user?: { email?: string | null; display_name?: string | null };
};

type Filters = {
  from: string;
  to: string;
  city: string;
};

const adminReportsCopy = {
  en: {
    eyebrow: "Reports",
    description: "Full-screen reporting workspace for platform operations, brands, users, geo intelligence, rewards, and exports.",
    hubButton: "Reports hub",
    exportCenterButton: "Export center",
    loadError: "Unable to load reports",
    filters: { from: "From", to: "To", city: "City", cityPlaceholder: "City filter" },
    titles: {
      hub: "Reports Hub",
      platform: "Platform Reports",
      brands: "Brand Reports",
      users: "User Reports",
      geo: "Geo Reports",
      exports: "Export Center",
    },
    links: [
      { title: "Platform Reports", href: "/admin/reports/platform", description: "Units, events, EcoPoints, products, and activity rows." },
      { title: "Product Behavior / App Analytics", href: "/admin/reports/app-analytics", description: "Movement, funnels, drop-offs, friction, outcomes, and instrumentation health from app events." },
      { title: "Brand Reports", href: "/admin/reports/brands", description: "Brand customer reporting and brand-linked operational counts." },
      { title: "User Reports", href: "/admin/reports/users", description: "User activity, wallet points, recycling counts, and city signals." },
      { title: "Geo Reports", href: "/admin/reports/geo", description: "City performance and location export." },
      { title: "Export Center", href: "/admin/reports/exports", description: "CSV exports for platform activity, brands, users, products, and unlocks." },
    ],
    kpis: {
      totalUnits: "Total units",
      ecoPointsIssued: "EcoPoints issued",
      brands: "Brands",
      users: "Users",
      totalEvents: "Total events",
      uniqueUsers: "Unique users",
      assignedProducts: "Assigned products",
      brandAdmins: "Brand admins",
      brandRewards: "Brand rewards",
      admins: "Admins",
      partners: "Partners",
      recycledUnits: "Recycled units",
      cities: "Cities",
      mappedRows: "Mapped rows",
      units: "Units",
      platformRows: "Platform rows",
      unlocks: "Unlocks",
      totalRedemptions: "Total redemptions",
      activeTokens: "Active tokens",
      expiredTokens: "Expired tokens",
      redemptionRate: "Redemption rate %",
    },
    tables: {
      topProducts: "Top products",
      dailyTrend: "Daily trend",
      brandReport: "Brand report",
      userReport: "User report",
      geoReport: "Geo report",
      platformRowsTitle: "Platform activity rows",
      platformRowsDescription: "Most recent filtered events.",
      loading: "Loading...",
      loadingActivity: "Loading activity...",
      noRows: "No rows available.",
      noEvents: "No events available.",
      unknown: "Unknown",
      unknownProduct: "Unknown product",
      headers: {
        product: "Product",
        units: "Units",
        date: "Date",
        brand: "Brand",
        products: "Products",
        admins: "Admins",
        rewards: "Rewards",
        ecoPoints: "EcoPoints",
        user: "User",
        role: "Role",
        wallet: "Wallet",
        events: "Events",
        city: "City",
        users: "Users",
        created: "Created",
      },
    },
    actions: {
      exportBrands: "Export brands",
      exportUsers: "Export users",
      exportGeoEvents: "Export geo events",
      exportEvents: "Export events",
      exportCsv: "Export CSV",
    },
    exportCards: {
      platformActivity: ["Platform activity", "Filtered recycling event rows."],
      brands: ["Brands", "Brand customers and operational counts."],
      users: ["Users", "Users, roles, points, and recycling activity."],
      products: ["Products", "Product catalog export from current admin product API."],
      rewardUnlocks: ["Reward unlocks", "Reward support and redemption history export."],
    },
  },
  es: {
    eyebrow: "Informes",
    description: "Espacio de informes a pantalla completa para operaciones de plataforma, marcas, usuarios, inteligencia geográfica, recompensas y exportaciones.",
    hubButton: "Centro de informes",
    exportCenterButton: "Centro de exportación",
    loadError: "No se pudieron cargar los informes",
    filters: { from: "Desde", to: "Hasta", city: "Ciudad", cityPlaceholder: "Filtrar por ciudad" },
    titles: {
      hub: "Centro de informes",
      platform: "Informes de plataforma",
      brands: "Informes de marcas",
      users: "Informes de usuarios",
      geo: "Informes geográficos",
      exports: "Centro de exportación",
    },
    links: [
      { title: "Informes de plataforma", href: "/admin/reports/platform", description: "Unidades, eventos, EcoPoints, productos y filas de actividad." },
      { title: "Comportamiento de producto / analítica de app", href: "/admin/reports/app-analytics", description: "Movimiento, embudos, abandonos, fricción, resultados y salud de instrumentación desde eventos de la app." },
      { title: "Informes de marcas", href: "/admin/reports/brands", description: "Informes de clientes de marca y métricas operativas vinculadas a marcas." },
      { title: "Informes de usuarios", href: "/admin/reports/users", description: "Actividad de usuarios, puntos en wallet, recuentos de reciclaje y señales por ciudad." },
      { title: "Informes geográficos", href: "/admin/reports/geo", description: "Rendimiento por ciudad y exportación de ubicación." },
      { title: "Centro de exportación", href: "/admin/reports/exports", description: "Exportaciones CSV de actividad de plataforma, marcas, usuarios, productos y desbloqueos." },
    ],
    kpis: {
      totalUnits: "Unidades totales",
      ecoPointsIssued: "EcoPoints emitidos",
      brands: "Marcas",
      users: "Usuarios",
      totalEvents: "Eventos totales",
      uniqueUsers: "Usuarios únicos",
      assignedProducts: "Productos asignados",
      brandAdmins: "Admins de marca",
      brandRewards: "Recompensas de marca",
      admins: "Admins",
      partners: "Partners",
      recycledUnits: "Unidades recicladas",
      cities: "Ciudades",
      mappedRows: "Filas mapeadas",
      units: "Unidades",
      platformRows: "Filas de plataforma",
      unlocks: "Desbloqueos",
      totalRedemptions: "Canjes totales",
      activeTokens: "Tokens activos",
      expiredTokens: "Tokens expirados",
      redemptionRate: "Tasa de canje %",
    },
    tables: {
      topProducts: "Productos principales",
      dailyTrend: "Tendencia diaria",
      brandReport: "Informe de marca",
      userReport: "Informe de usuarios",
      geoReport: "Informe geográfico",
      platformRowsTitle: "Filas de actividad de plataforma",
      platformRowsDescription: "Eventos filtrados más recientes.",
      loading: "Cargando...",
      loadingActivity: "Cargando actividad...",
      noRows: "No hay filas disponibles.",
      noEvents: "No hay eventos disponibles.",
      unknown: "Desconocido",
      unknownProduct: "Producto desconocido",
      headers: {
        product: "Producto",
        units: "Unidades",
        date: "Fecha",
        brand: "Marca",
        products: "Productos",
        admins: "Admins",
        rewards: "Recompensas",
        ecoPoints: "EcoPoints",
        user: "Usuario",
        role: "Rol",
        wallet: "Wallet",
        events: "Eventos",
        city: "Ciudad",
        users: "Usuarios",
        created: "Creado",
      },
    },
    actions: {
      exportBrands: "Exportar marcas",
      exportUsers: "Exportar usuarios",
      exportGeoEvents: "Exportar eventos geo",
      exportEvents: "Exportar eventos",
      exportCsv: "Exportar CSV",
    },
    exportCards: {
      platformActivity: ["Actividad de plataforma", "Filas filtradas de eventos de reciclaje."],
      brands: ["Marcas", "Clientes de marca y métricas operativas."],
      users: ["Usuarios", "Usuarios, roles, puntos y actividad de reciclaje."],
      products: ["Productos", "Exportación del catálogo desde la API actual de productos admin."],
      rewardUnlocks: ["Desbloqueos de recompensas", "Exportación de soporte e historial de canjes."],
    },
  },
} as const;

type AdminReportsCopy = (typeof adminReportsCopy)[DashboardLanguage];

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function normalizeList<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
}

function formatDate(value?: string | null, language: DashboardLanguage = "en") {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language === "es" ? "es-ES" : "en-US");
}

export function AdminReportsWorkspace({ kind }: { kind: ReportKind }) {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const copy = adminReportsCopy[language];
  const [filters, setFilters] = useState<Filters>({ from: "", to: "", city: "" });
  const [platform, setPlatform] = useState<PlatformReport | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionReport | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const needsPlatform = kind === "hub" || kind === "platform" || kind === "geo" || kind === "exports";
  const needsBrands = kind === "hub" || kind === "brands" || kind === "exports";
  const needsUsers = kind === "hub" || kind === "users" || kind === "exports";
  const needsExports = kind === "exports";

  const loadReports = useCallback(async () => {
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
      if (filters.city.trim()) params.set("city", filters.city.trim());

      const requests: Promise<unknown>[] = [];
      const names: string[] = [];

      if (needsPlatform) {
        names.push("platform", "redemptions");
        requests.push(
          apiFetch(`/admin/reports/platform${params.toString() ? `?${params}` : ""}`, { token }),
          apiFetch("/admin/reports/redemptions", { token })
        );
      }
      if (needsBrands) {
        names.push("brands");
        requests.push(apiFetch("/admin/brands", { token }));
      }
      if (needsUsers) {
        names.push("users");
        requests.push(apiFetch("/admin/users", { token }));
      }
      if (needsExports) {
        names.push("products", "unlocks");
        requests.push(apiFetch("/admin/products", { token }), apiFetch("/admin/rewards/unlocks", { token }));
      }

      const results = await Promise.all(requests);
      names.forEach((name, index) => {
        const result = results[index];
        if (name === "platform") setPlatform(result as PlatformReport);
        if (name === "redemptions") setRedemptions(result as RedemptionReport);
        if (name === "brands") setBrands(normalizeList<Brand>(result, "brands"));
        if (name === "users") setUsers(normalizeList<AdminUser>(result, "users"));
        if (name === "products") setProducts(normalizeList<Product>(result, "products"));
        if (name === "unlocks") setUnlocks(normalizeList<Unlock>(result, "unlocks"));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, filters, needsBrands, needsExports, needsPlatform, needsUsers, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReports(), 250);
    return () => window.clearTimeout(timer);
  }, [loadReports]);

  const userTotals = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      brandAdmins: users.filter((user) => user.role === "brand_admin").length,
      partners: users.filter((user) => user.role === "partner").length,
      units: users.reduce((sum, user) => sum + Number(user.recycled_units_count || 0), 0),
    }),
    [users]
  );

  function exportCsv(name: string, headers: string[], rows: Record<string, unknown>[]) {
    const csv = [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `greenloop-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportPlatformEvents() {
    const headers = ["created_at", "product_name", "barcode", "units", "city", "points_issued", "scan_status", "user", "email", "lat", "lng", "event_id"];
    exportCsv("platform-events", headers, (platform?.events ?? []).map((event) => ({
      created_at: event.created_at || "",
      product_name: event.product_name || "",
      barcode: event.barcode || "",
      units: event.units || 0,
      city: event.city || "",
      points_issued: event.points_issued || 0,
      scan_status: event.scan_status || "",
      user: event.display_name || "",
      email: event.email || "",
      lat: event.lat ?? "",
      lng: event.lng ?? "",
      event_id: event.event_id || "",
    })));
  }

  function exportBrands() {
    const headers = ["id", "name", "product_count", "admin_count", "reward_count", "eco_points_issued"];
    exportCsv("brands", headers, brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      product_count: brand.product_count || 0,
      admin_count: brand.admin_count || 0,
      reward_count: brand.reward_count || 0,
      eco_points_issued: brand.eco_points_issued || 0,
    })));
  }

  function exportUsers() {
    const headers = ["id", "display_name", "email", "role", "wallet_points", "recycling_events_count", "recycled_units_count", "latest_city", "created_at"];
    exportCsv("users", headers, users.map((user) => ({
      id: user.id,
      display_name: user.display_name || "",
      email: user.email || "",
      role: user.role || "",
      wallet_points: user.wallet_points || 0,
      recycling_events_count: user.recycling_events_count || 0,
      recycled_units_count: user.recycled_units_count || 0,
      latest_city: user.latest_city || "",
      created_at: user.created_at || "",
    })));
  }

  function exportProducts() {
    const headers = ["id", "ean", "name", "brand_name", "verification_status", "recycled_units_count"];
    exportCsv("products", headers, products.map((product) => ({
      id: product.id,
      ean: product.ean || "",
      name: product.name || "",
      brand_name: product.brand_name || "",
      verification_status: product.verification_status || "",
      recycled_units_count: product.recycled_units_count || 0,
    })));
  }

  function exportUnlocks() {
    const headers = ["id", "status", "reward", "user", "promo_code", "token", "created_at", "expires_at", "redeemed_at"];
    exportCsv("reward-unlocks", headers, unlocks.map((unlock) => ({
      id: unlock.id,
      status: unlock.unlock_status || "",
      reward: unlock.reward?.title || "",
      user: unlock.user?.email || unlock.user?.display_name || "",
      promo_code: unlock.promo_code || "",
      token: unlock.token || "",
      created_at: unlock.created_at || "",
      expires_at: unlock.expires_at || "",
      redeemed_at: unlock.redeemed_at || "",
    })));
  }

  const totals = platform?.totals;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--gl-green)]">{copy.eyebrow}</p>
          <h1 className="text-3xl font-semibold text-[var(--gl-ink)]">{copy.titles[kind]}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--gl-ink-muted)]">
            {copy.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {kind !== "hub" ? <LinkButton href="/admin/reports">{copy.hubButton}</LinkButton> : null}
          {kind !== "exports" ? <LinkButton href="/admin/reports/exports">{copy.exportCenterButton}</LinkButton> : null}
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {(kind === "platform" || kind === "geo" || kind === "exports") ? (
        <section className="rounded-xl border border-[var(--gl-hairline)] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{copy.filters.from}</span>
              <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{copy.filters.to}</span>
              <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{copy.filters.city}</span>
              <input value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))} placeholder={copy.filters.cityPlaceholder} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
            </label>
          </div>
        </section>
      ) : null}

      {kind === "hub" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label={copy.kpis.totalUnits} value={Number(totals?.totalUnits || 0)} language={language} />
            <Kpi label={copy.kpis.ecoPointsIssued} value={Number(totals?.ecoPointsIssued || 0)} language={language} />
            <Kpi label={copy.kpis.brands} value={brands.length} language={language} />
            <Kpi label={copy.kpis.users} value={users.length} language={language} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {copy.links.map((report) => (
              <Link key={report.href} href={report.href} className="rounded-xl border border-[var(--gl-hairline)] bg-white p-4 shadow-sm transition hover:border-[var(--gl-green)]/25 hover:shadow-md">
                <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{report.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--gl-ink-muted)]">{report.description}</p>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {kind === "platform" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label={copy.kpis.totalUnits} value={Number(totals?.totalUnits || 0)} language={language} />
            <Kpi label={copy.kpis.totalEvents} value={Number(totals?.totalEvents || 0)} language={language} />
            <Kpi label={copy.kpis.uniqueUsers} value={Number(totals?.uniqueConsumers || 0)} language={language} />
            <Kpi label={copy.kpis.ecoPointsIssued} value={Number(totals?.ecoPointsIssued || 0)} language={language} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SimpleTable title={copy.tables.topProducts} headers={[copy.tables.headers.product, copy.tables.headers.units]} loading={loading} rows={(platform?.perProduct ?? []).map((row) => [row.product_name || copy.tables.unknown, row.units_recycled || 0])} copy={copy} />
            <SimpleTable title={copy.tables.dailyTrend} headers={[copy.tables.headers.date, copy.tables.headers.units]} loading={loading} rows={(platform?.dailyTrend ?? []).map((row) => [row.date, row.units || 0])} copy={copy} />
          </div>
          <EventTable events={platform?.events ?? []} loading={loading} onExport={exportPlatformEvents} language={language} copy={copy} />
        </>
      ) : null}

      {kind === "brands" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label={copy.kpis.brands} value={brands.length} language={language} />
            <Kpi label={copy.kpis.assignedProducts} value={brands.reduce((sum, brand) => sum + Number(brand.product_count || 0), 0)} language={language} />
            <Kpi label={copy.kpis.brandAdmins} value={brands.reduce((sum, brand) => sum + Number(brand.admin_count || 0), 0)} language={language} />
            <Kpi label={copy.kpis.brandRewards} value={brands.reduce((sum, brand) => sum + Number(brand.reward_count || 0), 0)} language={language} />
          </div>
          <SimpleTable
            title={copy.tables.brandReport}
            headers={[copy.tables.headers.brand, copy.tables.headers.products, copy.tables.headers.admins, copy.tables.headers.rewards, copy.tables.headers.ecoPoints]}
            loading={loading}
            rows={brands.map((brand) => [brand.name, brand.product_count || 0, brand.admin_count || 0, brand.reward_count || 0, brand.eco_points_issued || 0])}
            action={<button onClick={exportBrands} className="rounded-lg bg-[var(--gl-green)] px-3 py-2 text-sm font-semibold text-white">{copy.actions.exportBrands}</button>}
            copy={copy}
          />
        </>
      ) : null}

      {kind === "users" ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Kpi label={copy.kpis.users} value={userTotals.total} language={language} />
            <Kpi label={copy.kpis.admins} value={userTotals.admins} language={language} />
            <Kpi label={copy.kpis.brandAdmins} value={userTotals.brandAdmins} language={language} />
            <Kpi label={copy.kpis.partners} value={userTotals.partners} language={language} />
            <Kpi label={copy.kpis.recycledUnits} value={userTotals.units} language={language} />
          </div>
          <SimpleTable
            title={copy.tables.userReport}
            headers={[copy.tables.headers.user, copy.tables.headers.role, copy.tables.headers.wallet, copy.tables.headers.events, copy.tables.headers.units, copy.tables.headers.city]}
            loading={loading}
            rows={users.map((user) => [user.email || user.display_name || user.id, user.role || "-", user.wallet_points || 0, user.recycling_events_count || 0, user.recycled_units_count || 0, user.latest_city || "-"])}
            action={<button onClick={exportUsers} className="rounded-lg bg-[var(--gl-green)] px-3 py-2 text-sm font-semibold text-white">{copy.actions.exportUsers}</button>}
            copy={copy}
          />
        </>
      ) : null}

      {kind === "geo" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label={copy.kpis.cities} value={platform?.geoBreakdown?.length || 0} language={language} />
            <Kpi label={copy.kpis.mappedRows} value={(platform?.events ?? []).filter((event) => event.lat && event.lng).length} language={language} />
            <Kpi label={copy.kpis.units} value={Number(totals?.totalUnits || 0)} language={language} />
            <Kpi label={copy.kpis.users} value={Number(totals?.uniqueConsumers || 0)} language={language} />
          </div>
          <SimpleTable
            title={copy.tables.geoReport}
            headers={[copy.tables.headers.city, copy.tables.headers.units, copy.tables.headers.users]}
            loading={loading}
            rows={(platform?.geoBreakdown ?? []).map((city) => [city.city || copy.tables.unknown, city.units || 0, city.consumers || 0])}
            action={<button onClick={exportPlatformEvents} className="rounded-lg bg-[var(--gl-green)] px-3 py-2 text-sm font-semibold text-white">{copy.actions.exportGeoEvents}</button>}
            copy={copy}
          />
        </>
      ) : null}

      {kind === "exports" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label={copy.kpis.platformRows} value={platform?.events?.length || 0} language={language} />
            <Kpi label={copy.kpis.brands} value={brands.length} language={language} />
            <Kpi label={copy.kpis.users} value={users.length} language={language} />
            <Kpi label={copy.kpis.unlocks} value={unlocks.length} language={language} />
          </div>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ExportCard title={copy.exportCards.platformActivity[0]} description={copy.exportCards.platformActivity[1]} onClick={exportPlatformEvents} disabled={loading} buttonLabel={copy.actions.exportCsv} />
            <ExportCard title={copy.exportCards.brands[0]} description={copy.exportCards.brands[1]} onClick={exportBrands} disabled={loading} buttonLabel={copy.actions.exportCsv} />
            <ExportCard title={copy.exportCards.users[0]} description={copy.exportCards.users[1]} onClick={exportUsers} disabled={loading} buttonLabel={copy.actions.exportCsv} />
            <ExportCard title={copy.exportCards.products[0]} description={copy.exportCards.products[1]} onClick={exportProducts} disabled={loading} buttonLabel={copy.actions.exportCsv} />
            <ExportCard title={copy.exportCards.rewardUnlocks[0]} description={copy.exportCards.rewardUnlocks[1]} onClick={exportUnlocks} disabled={loading} buttonLabel={copy.actions.exportCsv} />
          </section>
          {redemptions?.totals ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Kpi label={copy.kpis.totalRedemptions} value={Number(redemptions.totals.totalRedemptions || 0)} language={language} />
              <Kpi label={copy.kpis.activeTokens} value={Number(redemptions.totals.activeTokens || 0)} language={language} />
              <Kpi label={copy.kpis.expiredTokens} value={Number(redemptions.totals.expiredTokens || 0)} language={language} />
              <Kpi label={copy.kpis.redemptionRate} value={Math.round(Number(redemptions.totals.redemptionRate || 0) * 100)} language={language} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, language }: { label: string; value: number; language: DashboardLanguage }) {
  return (
    <div className="rounded-xl border border-[var(--gl-hairline)] bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--gl-ink)]">{value.toLocaleString(language === "es" ? "es-ES" : "en-US")}</p>
    </div>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="rounded-lg border border-[var(--gl-hairline)] bg-white px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">{children}</Link>;
}

function SimpleTable({
  title,
  headers,
  rows,
  loading,
  action,
  copy,
}: {
  title: string;
  headers: string[];
  rows: unknown[][];
  loading: boolean;
  action?: React.ReactNode;
  copy: AdminReportsCopy;
}) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--gl-hairline)] p-4">
        <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{title}</h2>
        {action}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-2.5">{header}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.tables.loading}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.tables.noRows}</td></tr>
            ) : (
              rows.slice(0, 200).map((row, index) => (
                <tr key={index} className="border-t border-[var(--gl-card-cream)] hover:bg-[var(--gl-card-cream)]/70">
                  {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className="px-4 py-2.5">{String(cell ?? "-")}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EventTable({ events, loading, onExport, language, copy }: { events: PlatformEvent[]; loading: boolean; onExport: () => void; language: DashboardLanguage; copy: AdminReportsCopy }) {
  return (
    <section className="rounded-xl border border-[var(--gl-hairline)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--gl-hairline)] p-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.tables.platformRowsTitle}</h2>
          <p className="text-sm text-[var(--gl-ink-muted)]">{copy.tables.platformRowsDescription}</p>
        </div>
        <button onClick={onExport} className="rounded-lg bg-[var(--gl-green)] px-3 py-2 text-sm font-semibold text-white">{copy.actions.exportEvents}</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
            <tr>
              <th className="px-4 py-2.5">{copy.tables.headers.created}</th>
              <th className="px-4 py-2.5">{copy.tables.headers.product}</th>
              <th className="px-4 py-2.5">{copy.tables.headers.city}</th>
              <th className="px-4 py-2.5">{copy.tables.headers.units}</th>
              <th className="px-4 py-2.5">{copy.tables.headers.ecoPoints}</th>
              <th className="px-4 py-2.5">{copy.tables.headers.user}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.tables.loadingActivity}</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.tables.noEvents}</td></tr>
            ) : (
              events.slice(0, 200).map((event, index) => (
                <tr key={`${event.event_id || index}-${event.created_at || ""}`} className="border-t border-[var(--gl-card-cream)] hover:bg-[var(--gl-card-cream)]/70">
                  <td className="px-4 py-2.5">{formatDate(event.created_at, language)}</td>
                  <td className="px-4 py-2.5">{event.product_name || copy.tables.unknownProduct}</td>
                  <td className="px-4 py-2.5">{event.city || "-"}</td>
                  <td className="px-4 py-2.5">{event.units || 0}</td>
                  <td className="px-4 py-2.5">{event.points_issued || 0}</td>
                  <td className="px-4 py-2.5">{event.display_name || event.email || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExportCard({ title, description, onClick, disabled, buttonLabel }: { title: string; description: string; onClick: () => void; disabled?: boolean; buttonLabel: string }) {
  return (
    <div className="rounded-xl border border-[var(--gl-hairline)] bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--gl-ink-muted)]">{description}</p>
      <button disabled={disabled} onClick={onClick} className="mt-4 rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gl-green)] disabled:opacity-60">
        {buttonLabel}
      </button>
    </div>
  );
}
