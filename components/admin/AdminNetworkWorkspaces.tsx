"use client";

import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "@/components/crm/Workspace.module.css";
import { useRouter } from "next/navigation";
import { ChevronDown, RefreshCw, RotateCcw, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { DashboardLanguage, useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type Brand = {
  id: string;
  name: string;
  created_at?: string | null;
  product_count?: number;
  admin_count?: number;
  reward_count?: number;
  eco_points_issued?: number;
};

type Product = {
  id: string;
  ean?: string | null;
  barcode?: string | null;
  name?: string | null;
  source?: string | null;
  brand_id?: string | null;
  brand_name?: string | null;
  verification_status?: string | null;
  created_by_brand_admin?: boolean;
  updated_at?: string | null;
  scan_count?: number;
  recycled_units_count?: number;
  is_placeholder_name?: boolean;
};

type Partner = {
  id: string;
  display_name?: string | null;
  email?: string | null;
  created_at?: string | null;
  deactivated_at?: string | null;
  fulfilled_unlocks_count?: number;
  last_fulfillment_at?: string | null;
  status?: string;
};

const networkCopy = {
  en: {
    eyebrow: "Catalog & Network",
    common: {
      detail: "Detail",
      products: "Products",
      reports: "Reports",
      links: "Links",
      created: "Created",
      status: "Status",
      active: "active",
      inactive: "inactive",
      unknown: "unknown",
    },
    brands: {
      loadError: "Unable to load brands",
      title: "Brands",
      description: "Manage brand customers, assigned products, brand admins, brand rewards, and brand-level operational visibility.",
      reportsButton: "Brand reports",
      kpis: ["Brands", "Assigned products", "Brand admins", "Brand rewards"],
      tableTitle: "Brand list",
      tableDescription: "Counts are calculated from existing products, users, rewards, and ledger data.",
      search: "Search brand",
      loading: "Loading brands...",
      empty: "No brands match the current search.",
      headers: ["Brand", "Products", "Admins", "Rewards", "EcoPoints issued", "Created", "Links"],
    },
    products: {
      loadError: "Unable to load products",
      title: "Products",
      description: "Inspect barcode catalog health, brand assignment, verification status, placeholder products, and recycling usage.",
      kpis: ["Loaded products", "Placeholder names", "Verified", "Recycled units"],
      tableTitle: "Product catalog",
      tableDescription: "Limited to 500 recent/filtered rows from the admin API.",
      search: "Search name, barcode, brand",
      allBrands: "All brands",
      allStatuses: "All statuses",
      verified: "Verified",
      imported: "Imported",
      pending: "Pending",
      loading: "Loading products...",
      empty: "No products match the current filters.",
      unknownProduct: "Unknown product",
      placeholderName: "Placeholder name",
      headers: ["Product", "Brand", "Status", "Source", "Scans", "Units", "Updated"],
    },
    partners: {
      loadError: "Unable to load partners",
      title: "Partners",
      description: "Inspect partner accounts, fulfillment activity, status, and partner-specific operational history.",
      unlocksButton: "Reward unlocks",
      kpis: ["Partners", "Active", "Fulfilled unlocks", "Inactive"],
      tableTitle: "Partner accounts",
      tableDescription: "Partners are currently derived from users with the partner role.",
      search: "Search partner",
      loading: "Loading partners...",
      empty: "No partners match the current search.",
      unnamed: "Unnamed partner",
      unlockHistory: "Unlock history",
      headers: ["Partner", "Status", "Fulfilled unlocks", "Last fulfillment", "Created", "Links"],
    },
  },
  es: {
    eyebrow: "Catálogo y red",
    common: {
      detail: "Detalle",
      products: "Productos",
      reports: "Informes",
      links: "Enlaces",
      created: "Creado",
      status: "Estado",
      active: "activo",
      inactive: "inactivo",
      unknown: "desconocido",
    },
    brands: {
      loadError: "No se pudieron cargar las marcas",
      title: "Marcas",
      description: "Gestiona clientes de marca, productos asignados, admins de marca, recompensas de marca y visibilidad operativa.",
      reportsButton: "Informes de marca",
      kpis: ["Marcas", "Productos asignados", "Admins de marca", "Recompensas de marca"],
      tableTitle: "Lista de marcas",
      tableDescription: "Los recuentos se calculan desde productos, usuarios, recompensas y datos de ledger existentes.",
      search: "Buscar marca",
      loading: "Cargando marcas...",
      empty: "Ninguna marca coincide con la búsqueda actual.",
      headers: ["Marca", "Productos", "Admins", "Recompensas", "EcoPoints emitidos", "Creado", "Enlaces"],
    },
    products: {
      loadError: "No se pudieron cargar los productos",
      title: "Productos",
      description: "Inspecciona la salud del catálogo de códigos de barras, asignación de marca, verificación, productos placeholder y uso de reciclaje.",
      kpis: ["Productos cargados", "Nombres placeholder", "Verificados", "Unidades recicladas"],
      tableTitle: "Catálogo de productos",
      tableDescription: "Limitado a 500 filas recientes/filtradas desde la API admin.",
      search: "Buscar nombre, código de barras, marca",
      allBrands: "Todas las marcas",
      allStatuses: "Todos los estados",
      verified: "Verificado",
      imported: "Importado",
      pending: "Pendiente",
      loading: "Cargando productos...",
      empty: "Ningún producto coincide con los filtros actuales.",
      unknownProduct: "Producto desconocido",
      placeholderName: "Nombre placeholder",
      headers: ["Producto", "Marca", "Estado", "Fuente", "Escaneos", "Unidades", "Actualizado"],
    },
    partners: {
      loadError: "No se pudieron cargar los partners",
      title: "Partners",
      description: "Inspecciona cuentas partner, actividad de cumplimiento, estado e historial operativo específico de partners.",
      unlocksButton: "Desbloqueos",
      kpis: ["Partners", "Activos", "Desbloqueos cumplidos", "Inactivos"],
      tableTitle: "Cuentas partner",
      tableDescription: "Los partners se derivan actualmente de usuarios con rol partner.",
      search: "Buscar partner",
      loading: "Cargando partners...",
      empty: "Ningún partner coincide con la búsqueda actual.",
      unnamed: "Partner sin nombre",
      unlockHistory: "Historial de desbloqueos",
      headers: ["Partner", "Estado", "Desbloqueos cumplidos", "Último cumplimiento", "Creado", "Enlaces"],
    },
  },
} as const;

function formatDate(value: string | null | undefined, language: DashboardLanguage = "en") {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(language === "es" ? "es-ES" : "en-US");
}

function normalizeList<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
}

export function AdminBrandsWorkspace() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const copy = networkCopy[language];
  const [brands, setBrands] = useState<Brand[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBrands = useCallback(async () => {
    const token = getToken();
    if (!token) return router.replace("/login");
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/admin/brands", { token });
      setBrands(normalizeList<Brand>(result, "brands"));
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.brands.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.brands.loadError, router]);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return brands.filter((brand) => !needle || brand.name.toLowerCase().includes(needle));
  }, [brands, query]);

  const totals = useMemo(
    () => ({
      brands: brands.length,
      products: brands.reduce((sum, brand) => sum + Number(brand.product_count || 0), 0),
      admins: brands.reduce((sum, brand) => sum + Number(brand.admin_count || 0), 0),
      rewards: brands.reduce((sum, brand) => sum + Number(brand.reward_count || 0), 0),
    }),
    [brands]
  );

  return (
    <WorkspaceFrame
      eyebrow={copy.eyebrow}
      title={copy.brands.title}
      description={copy.brands.description}
      error={error}
      actions={<LinkButton href="/admin/reports/brands">{copy.brands.reportsButton}</LinkButton>}
    >
      <KpiGrid>
        <Kpi label={copy.brands.kpis[0]} value={totals.brands} />
        <Kpi label={copy.brands.kpis[1]} value={totals.products} />
        <Kpi label={copy.brands.kpis[2]} value={totals.admins} />
        <Kpi label={copy.brands.kpis[3]} value={totals.rewards} />
      </KpiGrid>
      <TableCard
        title={copy.brands.tableTitle}
        description={copy.brands.tableDescription}
        controls={<input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={copy.brands.search} placeholder={copy.brands.search} className="rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />}
      >
        <table className={styles.table}>
          <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
            <tr>
              {copy.brands.headers.map((header) => <th key={header} className="px-4 py-2.5">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyRow colSpan={7} text={copy.brands.loading} />
            ) : filtered.length === 0 ? (
              <EmptyRow colSpan={7} text={copy.brands.empty} />
            ) : (
              filtered.map((brand) => (
                <tr key={brand.id} className="border-t border-[var(--gl-card-cream)] hover:bg-[var(--gl-card-cream)]/70">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-[var(--gl-ink)]">{brand.name}</div>
                    <div className="text-xs text-[var(--gl-ink-muted)]">{brand.id}</div>
                  </td>
                  <td data-label={copy.brands.headers[1]} className="px-4 py-2.5">{brand.product_count || 0}</td>
                  <td data-label={copy.brands.headers[2]} className="px-4 py-2.5">{brand.admin_count || 0}</td>
                  <td data-label={copy.brands.headers[3]} className="px-4 py-2.5">{brand.reward_count || 0}</td>
                  <td data-label={copy.brands.headers[4]} className="px-4 py-2.5">{brand.eco_points_issued || 0}</td>
                  <td data-label={copy.brands.headers[5]} className="px-4 py-2.5">{formatDate(brand.created_at, language)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/brands/${brand.id}`} className="text-sm font-semibold text-[var(--gl-green)] hover:text-[var(--gl-green-deep)]">{copy.common.detail}</Link>
                      <Link href={`/admin/products?brandId=${brand.id}`} className="text-sm font-semibold text-[var(--gl-green)] hover:text-[var(--gl-green-deep)]">{copy.common.products}</Link>
                      <Link href={`/admin/reports/brands?brandId=${brand.id}`} className="text-sm font-semibold text-[var(--gl-green)] hover:text-[var(--gl-green-deep)]">{copy.common.reports}</Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </WorkspaceFrame>
  );
}

export function AdminProductsWorkspace() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const copy = networkCopy[language];
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [query, setQuery] = useState("");
  const [brandId, setBrandId] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    const token = getToken();
    if (!token) return router.replace("/login");
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      if (brandId) params.set("brandId", brandId);
      if (verificationStatus) params.set("verificationStatus", verificationStatus);
      const [productsResult, brandsResult] = await Promise.all([
        apiFetch(`/admin/products${params.toString() ? `?${params.toString()}` : ""}`, { token }),
        apiFetch("/admin/brands", { token }),
      ]);
      setProducts(normalizeList<Product>(productsResult, "products"));
      setBrands(normalizeList<Brand>(brandsResult, "brands"));
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.products.loadError);
    } finally {
      setLoading(false);
    }
  }, [brandId, copy.products.loadError, query, router, verificationStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProducts(), 250);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  const totals = useMemo(
    () => ({
      products: products.length,
      placeholders: products.filter((product) => product.is_placeholder_name).length,
      verified: products.filter((product) => product.verification_status === "verified").length,
      units: products.reduce((sum, product) => sum + Number(product.recycled_units_count || 0), 0),
    }),
    [products]
  );

  const tr = (en: string, es: string) => language === "es" ? es : en;
  const number = (value: number) => value.toLocaleString(language === "es" ? "es-ES" : "en-US");
  const statusLabel = (status?: string | null) => {
    if (status === "verified") return copy.products.verified;
    if (status === "pending") return copy.products.pending;
    if (status === "imported") return copy.products.imported;
    return status || copy.common.unknown;
  };
  const fieldClass = "min-h-11 w-full min-w-0 rounded-lg border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm text-[var(--gl-ink)] focus:border-[var(--gl-green)] focus:outline-none focus:ring-2 focus:ring-[var(--gl-green-ring)]";

  return (
    <div className="min-w-0 space-y-4">
      <WorkspaceHeader className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[var(--gl-ink)]">{copy.products.title}</h1>
        <button type="button" onClick={() => void loadProducts()} disabled={loading} aria-label={tr("Refresh products", "Actualizar productos")} title={tr("Refresh products", "Actualizar productos")} className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[var(--gl-hairline)] bg-white text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)] disabled:opacity-50">
          <RefreshCw size={18} aria-hidden="true" className={loading ? "animate-spin" : ""} />
        </button>
      </WorkspaceHeader>
      {error ? <div role="alert" className="rounded-lg border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] p-3 text-sm text-[var(--gl-coral-ink)]">{error}</div> : null}
      <section aria-label={tr("Product filters", "Filtros de productos")} className="grid min-w-0 grid-cols-2 items-end gap-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="col-span-2 min-w-0 xl:col-span-1">
          <span className="sr-only">{copy.products.search}</span>
          <span className="relative block">
            <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-[var(--gl-ink-muted)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.products.search} className={`${fieldClass} pl-9`} />
          </span>
        </label>
        <label className="min-w-0 text-xs text-[var(--gl-ink-muted)]">
          <span className="mb-1 block">{copy.products.headers[1]}</span>
          <select value={brandId} onChange={(event) => setBrandId(event.target.value)} className={fieldClass}>
              <option value="">{copy.products.allBrands}</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-xs text-[var(--gl-ink-muted)]">
          <span className="mb-1 block">{copy.common.status}</span>
          <select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value)} className={fieldClass}>
              <option value="">{copy.products.allStatuses}</option>
              <option value="verified">{copy.products.verified}</option>
              <option value="imported">{copy.products.imported}</option>
              <option value="pending">{copy.products.pending}</option>
          </select>
        </label>
        <button type="button" onClick={() => { setQuery(""); setBrandId(""); setVerificationStatus(""); }} disabled={!query && !brandId && !verificationStatus} aria-label={tr("Clear filters", "Borrar filtros")} title={tr("Clear filters", "Borrar filtros")} className="col-span-2 flex size-11 items-center justify-center justify-self-end rounded-lg border border-[var(--gl-hairline)] bg-white text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)] disabled:opacity-40 xl:col-span-1">
          <RotateCcw size={18} aria-hidden="true" />
        </button>
      </section>
      <dl aria-label={tr("Loaded catalog summary", "Resumen del catálogo cargado")} className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--gl-hairline)] py-3 sm:grid-cols-4">
        {[totals.products, totals.placeholders, totals.verified, totals.units].map((value, index) => (
          <div key={copy.products.kpis[index]} className="min-w-0">
            <dt className="text-xs text-[var(--gl-ink-muted)]">{copy.products.kpis[index]}</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums text-[var(--gl-ink)]">{loading ? "..." : number(value)}</dd>
          </div>
        ))}
      </dl>
      <section id="product-catalog" aria-label={copy.products.tableTitle} aria-busy={loading} className="min-w-0">
        <p className="mb-2 text-xs text-[var(--gl-ink-muted)]">{tr("Up to 500 matching products · Summary reflects loaded rows", "Hasta 500 productos coincidentes · Resumen de las filas cargadas")}</p>
        {loading ? <p role="status" className="py-8 text-center text-sm text-[var(--gl-ink-muted)]">{copy.products.loading}</p> : products.length === 0 ? <p className="py-8 text-center text-sm text-[var(--gl-ink-muted)]">{copy.products.empty}</p> : <>
        <table className="hidden w-full table-fixed text-left text-sm xl:table">
          <colgroup><col className="w-[30%]" /><col className="w-[17%]" /><col className="w-[13%]" /><col className="w-[12%]" /><col className="w-[7%]" /><col className="w-[7%]" /><col className="w-[14%]" /></colgroup>
          <thead className="text-xs text-[var(--gl-ink-muted)]">
            <tr>
              {copy.products.headers.map((header, index) => <th key={header} scope="col" className={`px-3 py-2.5 font-medium ${index === 4 || index === 5 ? "text-right" : ""}`}>{header}</th>)}
            </tr>
          </thead>
          <tbody className="bg-white">
            {
              products.map((product) => (
                <tr key={product.id} className="border-t border-[var(--gl-hairline)] align-top [overflow-wrap:anywhere] hover:bg-[var(--gl-card-cream)]">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-[var(--gl-ink)]">{product.name || product.ean || copy.products.unknownProduct}</div>
                    <div className="text-xs text-[var(--gl-ink-muted)]">{product.ean || product.barcode || "-"}</div>
                    {product.is_placeholder_name ? <Badge tone="amber">{copy.products.placeholderName}</Badge> : null}
                  </td>
                  <td className="px-3 py-3">{product.brand_name || "-"}</td>
                  <td className="px-3 py-3"><Badge tone={product.verification_status === "verified" ? "green" : "slate"}>{statusLabel(product.verification_status)}</Badge></td>
                  <td className="px-3 py-3 text-[var(--gl-ink-muted)]">{product.source || "-"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{number(product.scan_count || 0)}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{number(product.recycled_units_count || 0)}</td>
                  <td className="px-3 py-3 text-[var(--gl-ink-muted)]">{formatDate(product.updated_at, language)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
        <div className="divide-y divide-[var(--gl-hairline)] bg-white xl:hidden">
          {products.map((product) => (
            <details key={product.id} className="group px-3 py-3 [overflow-wrap:anywhere]">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-[var(--gl-ink)]">{product.name || product.ean || copy.products.unknownProduct}</h2>
                    <p className="mt-0.5 text-xs text-[var(--gl-ink-muted)]">{product.ean || product.barcode || "-"} · {product.brand_name || "-"}</p>
                  </div>
                  <ChevronDown size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--gl-ink-muted)] transition-transform group-open:rotate-180" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <Badge tone={product.verification_status === "verified" ? "green" : "slate"}>{statusLabel(product.verification_status)}</Badge>
                  <span className="tabular-nums text-[var(--gl-ink-soft)]">{copy.products.headers[4]}: {number(product.scan_count || 0)}</span>
                  <span className="font-semibold tabular-nums text-[var(--gl-ink)]">{copy.products.headers[5]}: {number(product.recycled_units_count || 0)}</span>
                  {product.is_placeholder_name ? <Badge tone="amber">{copy.products.placeholderName}</Badge> : null}
                </div>
              </summary>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-[var(--gl-ink-muted)]">{copy.products.headers[3]}</dt><dd className="mt-1 text-[var(--gl-ink)]">{product.source || "-"}</dd></div>
                <div><dt className="text-[var(--gl-ink-muted)]">{copy.products.headers[6]}</dt><dd className="mt-1 text-[var(--gl-ink)]">{formatDate(product.updated_at, language)}</dd></div>
              </dl>
            </details>
          ))}
        </div>
        </>}
      </section>
    </div>
  );
}

export function AdminPartnersWorkspace() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const copy = networkCopy[language];
  const [partners, setPartners] = useState<Partner[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    const token = getToken();
    if (!token) return router.replace("/login");
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/admin/partners", { token });
      setPartners(normalizeList<Partner>(result, "partners"));
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.partners.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.partners.loadError, router]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return partners.filter((partner) => {
      const name = `${partner.display_name || ""} ${partner.email || ""}`.toLowerCase();
      return !needle || name.includes(needle);
    });
  }, [partners, query]);

  const totals = useMemo(
    () => ({
      partners: partners.length,
      active: partners.filter((partner) => !partner.deactivated_at).length,
      fulfilled: partners.reduce((sum, partner) => sum + Number(partner.fulfilled_unlocks_count || 0), 0),
      inactive: partners.filter((partner) => partner.deactivated_at).length,
    }),
    [partners]
  );

  return (
    <WorkspaceFrame
      eyebrow={copy.eyebrow}
      title={copy.partners.title}
      description={copy.partners.description}
      error={error}
      actions={<LinkButton href="/admin/rewards/unlocks">{copy.partners.unlocksButton}</LinkButton>}
    >
      <KpiGrid>
        <Kpi label={copy.partners.kpis[0]} value={totals.partners} />
        <Kpi label={copy.partners.kpis[1]} value={totals.active} />
        <Kpi label={copy.partners.kpis[2]} value={totals.fulfilled} />
        <Kpi label={copy.partners.kpis[3]} value={totals.inactive} />
      </KpiGrid>
      <TableCard
        title={copy.partners.tableTitle}
        description={copy.partners.tableDescription}
        controls={<input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={copy.partners.search} placeholder={copy.partners.search} className="rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />}
      >
        <table className={styles.table}>
          <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
            <tr>
              {copy.partners.headers.map((header) => <th key={header} className="px-4 py-2.5">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyRow colSpan={6} text={copy.partners.loading} />
            ) : filtered.length === 0 ? (
              <EmptyRow colSpan={6} text={copy.partners.empty} />
            ) : (
              filtered.map((partner) => (
                <tr key={partner.id} className="border-t border-[var(--gl-card-cream)] hover:bg-[var(--gl-card-cream)]/70">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-[var(--gl-ink)]">{partner.display_name || partner.email || copy.partners.unnamed}</div>
                    <div className="text-xs text-[var(--gl-ink-muted)]">{partner.email || partner.id}</div>
                  </td>
                  <td className="px-4 py-2.5"><Badge tone={partner.deactivated_at ? "slate" : "green"}>{partner.deactivated_at ? copy.common.inactive : copy.common.active}</Badge></td>
                  <td data-label={copy.partners.headers[2]} className="px-4 py-2.5">{partner.fulfilled_unlocks_count || 0}</td>
                  <td data-label={copy.partners.headers[3]} className="px-4 py-2.5">{formatDate(partner.last_fulfillment_at, language)}</td>
                  <td data-label={copy.partners.headers[4]} className="px-4 py-2.5">{formatDate(partner.created_at, language)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/partners/${partner.id}`} className="text-sm font-semibold text-[var(--gl-green)] hover:text-[var(--gl-green-deep)]">{copy.common.detail}</Link>
                      <Link href={`/admin/rewards/unlocks?partnerId=${partner.id}`} className="text-sm font-semibold text-[var(--gl-green)] hover:text-[var(--gl-green-deep)]">
                        {copy.partners.unlockHistory}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </WorkspaceFrame>
  );
}

function WorkspaceFrame({
  eyebrow,
  title,
  description,
  actions,
  error,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.root} space-y-4`}>
      <WorkspaceHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="sr-only">{eyebrow}</p>
          <h1 className="text-2xl font-semibold text-[var(--gl-ink)]">{title}</h1>
          <p className="sr-only">{description}</p>
        </div>
        {actions}
      </WorkspaceHeader>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {children}
    </div>
  );
}

function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.metrics}>{children}</div>;
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--gl-hairline)] bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--gl-ink)]">{value}</p>
    </div>
  );
}

function TableCard({
  title,
  description,
  controls,
  children,
}: {
  title: string;
  description: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-3 border-b border-[var(--gl-hairline)] py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--gl-ink)]">{title}</h2>
          <p className="text-sm text-[var(--gl-ink-muted)]">{description}</p>
        </div>
        {controls}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg border border-[var(--gl-hairline)] bg-white px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">
      {children}
    </Link>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{text}</td>
    </tr>
  );
}

function Badge({ children, tone = "emerald" }: { children: React.ReactNode; tone?: "emerald" | "green" | "amber" | "slate" }) {
  const classes =
    tone === "green"
      ? "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"
      : tone === "amber"
        ? "bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]"
        : tone === "slate"
          ? "bg-[var(--gl-card-cream)] text-[var(--gl-ink-soft)]"
          : "bg-[var(--gl-green-soft)] text-[var(--gl-green)]";
  return <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}
