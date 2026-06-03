"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
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
      setError(err instanceof Error ? err.message : "Unable to load brands");
    } finally {
      setLoading(false);
    }
  }, [router]);

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
      eyebrow="Catalog & Network"
      title="Brands"
      description="Manage brand customers, assigned products, brand admins, brand rewards, and brand-level operational visibility."
      error={error}
      actions={<LinkButton href="/admin/reports/brands">Brand reports</LinkButton>}
    >
      <KpiGrid>
        <Kpi label="Brands" value={totals.brands} />
        <Kpi label="Assigned products" value={totals.products} />
        <Kpi label="Brand admins" value={totals.admins} />
        <Kpi label="Brand rewards" value={totals.rewards} />
      </KpiGrid>
      <TableCard
        title="Brand list"
        description="Counts are calculated from existing products, users, rewards, and ledger data."
        controls={<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search brand" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />}
      >
        <table className="min-w-[850px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Brand</th>
              <th className="px-4 py-2.5">Products</th>
              <th className="px-4 py-2.5">Admins</th>
              <th className="px-4 py-2.5">Rewards</th>
              <th className="px-4 py-2.5">EcoPoints issued</th>
              <th className="px-4 py-2.5">Created</th>
              <th className="px-4 py-2.5">Links</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyRow colSpan={7} text="Loading brands..." />
            ) : filtered.length === 0 ? (
              <EmptyRow colSpan={7} text="No brands match the current search." />
            ) : (
              filtered.map((brand) => (
                <tr key={brand.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-slate-950">{brand.name}</div>
                    <div className="text-xs text-slate-500">{brand.id}</div>
                  </td>
                  <td className="px-4 py-2.5">{brand.product_count || 0}</td>
                  <td className="px-4 py-2.5">{brand.admin_count || 0}</td>
                  <td className="px-4 py-2.5">{brand.reward_count || 0}</td>
                  <td className="px-4 py-2.5">{brand.eco_points_issued || 0}</td>
                  <td className="px-4 py-2.5">{formatDate(brand.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/brands/${brand.id}`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Detail</Link>
                      <Link href={`/admin/products?brandId=${brand.id}`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Products</Link>
                      <Link href={`/admin/reports/brands?brandId=${brand.id}`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Reports</Link>
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
      setError(err instanceof Error ? err.message : "Unable to load products");
    } finally {
      setLoading(false);
    }
  }, [brandId, query, router, verificationStatus]);

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

  return (
    <WorkspaceFrame
      eyebrow="Catalog & Network"
      title="Products"
      description="Inspect barcode catalog health, brand assignment, verification status, placeholder products, and recycling usage."
      error={error}
    >
      <KpiGrid>
        <Kpi label="Loaded products" value={totals.products} />
        <Kpi label="Placeholder names" value={totals.placeholders} />
        <Kpi label="Verified" value={totals.verified} />
        <Kpi label="Recycled units" value={totals.units} />
      </KpiGrid>
      <TableCard
        title="Product catalog"
        description="Limited to 500 recent/filtered rows from the admin API."
        controls={
          <div className="flex flex-col gap-2 lg:flex-row">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, barcode, brand" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select value={brandId} onChange={(event) => setBrandId(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">All brands</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
            <select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">All statuses</option>
              <option value="verified">Verified</option>
              <option value="imported">Imported</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        }
      >
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Product</th>
              <th className="px-4 py-2.5">Brand</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Source</th>
              <th className="px-4 py-2.5">Scans</th>
              <th className="px-4 py-2.5">Units</th>
              <th className="px-4 py-2.5">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyRow colSpan={7} text="Loading products..." />
            ) : products.length === 0 ? (
              <EmptyRow colSpan={7} text="No products match the current filters." />
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-slate-950">{product.name || product.ean || "Unknown product"}</div>
                    <div className="text-xs text-slate-500">{product.ean || product.barcode || "-"}</div>
                    {product.is_placeholder_name ? <Badge tone="amber">Placeholder name</Badge> : null}
                  </td>
                  <td className="px-4 py-2.5">{product.brand_name || "-"}</td>
                  <td className="px-4 py-2.5"><Badge tone={product.verification_status === "verified" ? "green" : "slate"}>{product.verification_status || "unknown"}</Badge></td>
                  <td className="px-4 py-2.5">{product.source || "-"}</td>
                  <td className="px-4 py-2.5">{product.scan_count || 0}</td>
                  <td className="px-4 py-2.5">{product.recycled_units_count || 0}</td>
                  <td className="px-4 py-2.5">{formatDate(product.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </WorkspaceFrame>
  );
}

export function AdminPartnersWorkspace() {
  const router = useRouter();
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
      setError(err instanceof Error ? err.message : "Unable to load partners");
    } finally {
      setLoading(false);
    }
  }, [router]);

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
      eyebrow="Catalog & Network"
      title="Partners"
      description="Inspect partner accounts, fulfillment activity, status, and partner-specific operational history."
      error={error}
      actions={<LinkButton href="/admin/rewards/unlocks">Reward unlocks</LinkButton>}
    >
      <KpiGrid>
        <Kpi label="Partners" value={totals.partners} />
        <Kpi label="Active" value={totals.active} />
        <Kpi label="Fulfilled unlocks" value={totals.fulfilled} />
        <Kpi label="Inactive" value={totals.inactive} />
      </KpiGrid>
      <TableCard
        title="Partner accounts"
        description="Partners are currently derived from users with the partner role."
        controls={<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search partner" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />}
      >
        <table className="min-w-[850px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Partner</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Fulfilled unlocks</th>
              <th className="px-4 py-2.5">Last fulfillment</th>
              <th className="px-4 py-2.5">Created</th>
              <th className="px-4 py-2.5">Links</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyRow colSpan={6} text="Loading partners..." />
            ) : filtered.length === 0 ? (
              <EmptyRow colSpan={6} text="No partners match the current search." />
            ) : (
              filtered.map((partner) => (
                <tr key={partner.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-slate-950">{partner.display_name || partner.email || "Unnamed partner"}</div>
                    <div className="text-xs text-slate-500">{partner.email || partner.id}</div>
                  </td>
                  <td className="px-4 py-2.5"><Badge tone={partner.deactivated_at ? "slate" : "green"}>{partner.deactivated_at ? "inactive" : "active"}</Badge></td>
                  <td className="px-4 py-2.5">{partner.fulfilled_unlocks_count || 0}</td>
                  <td className="px-4 py-2.5">{formatDate(partner.last_fulfillment_at)}</td>
                  <td className="px-4 py-2.5">{formatDate(partner.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/partners/${partner.id}`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Detail</Link>
                      <Link href={`/admin/rewards/unlocks?partnerId=${partner.id}`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
                        Unlock history
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
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">{eyebrow}</p>
          <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
        </div>
        {actions}
      </div>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {children}
    </div>
  );
}

function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-4">{children}</div>;
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
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
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        {controls}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
      {children}
    </Link>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-500">{text}</td>
    </tr>
  );
}

function Badge({ children, tone = "emerald" }: { children: React.ReactNode; tone?: "emerald" | "green" | "amber" | "slate" }) {
  const classes =
    tone === "green"
      ? "bg-green-100 text-green-800"
      : tone === "amber"
        ? "bg-amber-100 text-amber-800"
        : tone === "slate"
          ? "bg-slate-100 text-slate-700"
          : "bg-emerald-50 text-emerald-700";
  return <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}
