"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

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

const reportLinks = [
  { title: "Platform Reports", href: "/admin/reports/platform", description: "Units, events, EcoPoints, products, and activity rows." },
  { title: "Brand Reports", href: "/admin/reports/brands", description: "Brand customer reporting and brand-linked operational counts." },
  { title: "User Reports", href: "/admin/reports/users", description: "User activity, wallet points, recycling counts, and city signals." },
  { title: "Geo Reports", href: "/admin/reports/geo", description: "City performance and location export." },
  { title: "Export Center", href: "/admin/reports/exports", description: "CSV exports for platform activity, brands, users, products, and unlocks." },
];

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

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function AdminReportsWorkspace({ kind }: { kind: ReportKind }) {
  const router = useRouter();
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
      setError(err instanceof Error ? err.message : "Unable to load reports");
    } finally {
      setLoading(false);
    }
  }, [filters, needsBrands, needsExports, needsPlatform, needsUsers, router]);

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
          <p className="text-sm font-medium text-emerald-700">Reports</p>
          <h1 className="text-3xl font-semibold text-slate-950">{titleForKind(kind)}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Full-screen reporting workspace for platform operations, brands, users, geo intelligence, rewards, and exports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {kind !== "hub" ? <LinkButton href="/admin/reports">Reports hub</LinkButton> : null}
          {kind !== "exports" ? <LinkButton href="/admin/reports/exports">Export center</LinkButton> : null}
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {(kind === "platform" || kind === "geo" || kind === "exports") ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">From</span>
              <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">To</span>
              <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">City</span>
              <input value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))} placeholder="City filter" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
          </div>
        </section>
      ) : null}

      {kind === "hub" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label="Total units" value={Number(totals?.totalUnits || 0)} />
            <Kpi label="EcoPoints issued" value={Number(totals?.ecoPointsIssued || 0)} />
            <Kpi label="Brands" value={brands.length} />
            <Kpi label="Users" value={users.length} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reportLinks.map((report) => (
              <Link key={report.href} href={report.href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                <h2 className="text-lg font-semibold text-slate-950">{report.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{report.description}</p>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {kind === "platform" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label="Total units" value={Number(totals?.totalUnits || 0)} />
            <Kpi label="Total events" value={Number(totals?.totalEvents || 0)} />
            <Kpi label="Unique users" value={Number(totals?.uniqueConsumers || 0)} />
            <Kpi label="EcoPoints issued" value={Number(totals?.ecoPointsIssued || 0)} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SimpleTable title="Top products" headers={["Product", "Units"]} loading={loading} rows={(platform?.perProduct ?? []).map((row) => [row.product_name || "Unknown", row.units_recycled || 0])} />
            <SimpleTable title="Daily trend" headers={["Date", "Units"]} loading={loading} rows={(platform?.dailyTrend ?? []).map((row) => [row.date, row.units || 0])} />
          </div>
          <EventTable events={platform?.events ?? []} loading={loading} onExport={exportPlatformEvents} />
        </>
      ) : null}

      {kind === "brands" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label="Brands" value={brands.length} />
            <Kpi label="Assigned products" value={brands.reduce((sum, brand) => sum + Number(brand.product_count || 0), 0)} />
            <Kpi label="Brand admins" value={brands.reduce((sum, brand) => sum + Number(brand.admin_count || 0), 0)} />
            <Kpi label="Brand rewards" value={brands.reduce((sum, brand) => sum + Number(brand.reward_count || 0), 0)} />
          </div>
          <SimpleTable
            title="Brand report"
            headers={["Brand", "Products", "Admins", "Rewards", "EcoPoints"]}
            loading={loading}
            rows={brands.map((brand) => [brand.name, brand.product_count || 0, brand.admin_count || 0, brand.reward_count || 0, brand.eco_points_issued || 0])}
            action={<button onClick={exportBrands} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Export brands</button>}
          />
        </>
      ) : null}

      {kind === "users" ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Kpi label="Users" value={userTotals.total} />
            <Kpi label="Admins" value={userTotals.admins} />
            <Kpi label="Brand admins" value={userTotals.brandAdmins} />
            <Kpi label="Partners" value={userTotals.partners} />
            <Kpi label="Recycled units" value={userTotals.units} />
          </div>
          <SimpleTable
            title="User report"
            headers={["User", "Role", "Wallet", "Events", "Units", "City"]}
            loading={loading}
            rows={users.map((user) => [user.email || user.display_name || user.id, user.role || "-", user.wallet_points || 0, user.recycling_events_count || 0, user.recycled_units_count || 0, user.latest_city || "-"])}
            action={<button onClick={exportUsers} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Export users</button>}
          />
        </>
      ) : null}

      {kind === "geo" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label="Cities" value={platform?.geoBreakdown?.length || 0} />
            <Kpi label="Mapped rows" value={(platform?.events ?? []).filter((event) => event.lat && event.lng).length} />
            <Kpi label="Units" value={Number(totals?.totalUnits || 0)} />
            <Kpi label="Users" value={Number(totals?.uniqueConsumers || 0)} />
          </div>
          <SimpleTable
            title="Geo report"
            headers={["City", "Units", "Users"]}
            loading={loading}
            rows={(platform?.geoBreakdown ?? []).map((city) => [city.city || "Unknown", city.units || 0, city.consumers || 0])}
            action={<button onClick={exportPlatformEvents} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Export geo events</button>}
          />
        </>
      ) : null}

      {kind === "exports" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label="Platform rows" value={platform?.events?.length || 0} />
            <Kpi label="Brands" value={brands.length} />
            <Kpi label="Users" value={users.length} />
            <Kpi label="Unlocks" value={unlocks.length} />
          </div>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ExportCard title="Platform activity" description="Filtered recycling event rows." onClick={exportPlatformEvents} disabled={loading} />
            <ExportCard title="Brands" description="Brand customers and operational counts." onClick={exportBrands} disabled={loading} />
            <ExportCard title="Users" description="Users, roles, points, and recycling activity." onClick={exportUsers} disabled={loading} />
            <ExportCard title="Products" description="Product catalog export from current admin product API." onClick={exportProducts} disabled={loading} />
            <ExportCard title="Reward unlocks" description="Reward support and redemption history export." onClick={exportUnlocks} disabled={loading} />
          </section>
          {redemptions?.totals ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Kpi label="Total redemptions" value={Number(redemptions.totals.totalRedemptions || 0)} />
              <Kpi label="Active tokens" value={Number(redemptions.totals.activeTokens || 0)} />
              <Kpi label="Expired tokens" value={Number(redemptions.totals.expiredTokens || 0)} />
              <Kpi label="Redemption rate %" value={Math.round(Number(redemptions.totals.redemptionRate || 0) * 100)} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function titleForKind(kind: ReportKind) {
  if (kind === "platform") return "Platform Reports";
  if (kind === "brands") return "Brand Reports";
  if (kind === "users") return "User Reports";
  if (kind === "geo") return "Geo Reports";
  if (kind === "exports") return "Export Center";
  return "Reports Hub";
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value.toLocaleString()}</p>
    </div>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{children}</Link>;
}

function SimpleTable({
  title,
  headers,
  rows,
  loading,
  action,
}: {
  title: string;
  headers: string[];
  rows: unknown[][];
  loading: boolean;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-2.5">{header}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">No rows available.</td></tr>
            ) : (
              rows.slice(0, 200).map((row, index) => (
                <tr key={index} className="border-t border-slate-100 hover:bg-slate-50/70">
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

function EventTable({ events, loading, onExport }: { events: PlatformEvent[]; loading: boolean; onExport: () => void }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Platform activity rows</h2>
          <p className="text-sm text-slate-500">Most recent filtered events.</p>
        </div>
        <button onClick={onExport} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Export events</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Created</th>
              <th className="px-4 py-2.5">Product</th>
              <th className="px-4 py-2.5">City</th>
              <th className="px-4 py-2.5">Units</th>
              <th className="px-4 py-2.5">EcoPoints</th>
              <th className="px-4 py-2.5">User</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading activity...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No events available.</td></tr>
            ) : (
              events.slice(0, 200).map((event, index) => (
                <tr key={`${event.event_id || index}-${event.created_at || ""}`} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5">{formatDate(event.created_at)}</td>
                  <td className="px-4 py-2.5">{event.product_name || "Unknown product"}</td>
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

function ExportCard({ title, description, onClick, disabled }: { title: string; description: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{description}</p>
      <button disabled={disabled} onClick={onClick} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
        Export CSV
      </button>
    </div>
  );
}
