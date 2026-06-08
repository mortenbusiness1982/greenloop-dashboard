"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

const AdminRecyclingHeatmap = dynamic(() => import("@/components/AdminRecyclingHeatmap"), {
  ssr: false,
});

type GeoEvent = {
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
  event_id?: string | number;
  points_issued?: number;
};

type GeoCity = {
  city?: string | null;
  units?: number;
  consumers?: number;
};

type PlatformGeoResponse = {
  totals?: {
    totalUnits?: number;
    totalEvents?: number;
    uniqueConsumers?: number;
    ecoPointsIssued?: number;
  };
  geoBreakdown?: GeoCity[];
  events?: GeoEvent[];
};

type Filters = {
  from: string;
  to: string;
  city: string;
};

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function AdminMapsWorkspace({ heatmapOnly = false }: { heatmapOnly?: boolean }) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>({ from: "", to: "", city: "" });
  const [report, setReport] = useState<PlatformGeoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGeo = useCallback(async () => {
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
      const result = await apiFetch(`/admin/reports/platform${params.toString() ? `?${params}` : ""}`, { token });
      setReport(result as PlatformGeoResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load geo intelligence");
    } finally {
      setLoading(false);
    }
  }, [filters, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadGeo(), 250);
    return () => window.clearTimeout(timer);
  }, [loadGeo]);

  const events = useMemo(() => report?.events ?? [], [report]);
  const mappableEvents = useMemo(
    () => events.filter((event) => Number.isFinite(Number(event.lat)) && Number.isFinite(Number(event.lng))),
    [events]
  );
  const cities = useMemo(() => report?.geoBreakdown ?? [], [report]);
  const totals = report?.totals;

  function exportGeoCsv() {
    const headers = ["created_at", "city", "product_name", "barcode", "units", "points_issued", "lat", "lng", "user", "email", "event_id"];
    const rows = events.map((event) => ({
      created_at: event.created_at || "",
      city: event.city || "",
      product_name: event.product_name || "",
      barcode: event.barcode || "",
      units: event.units || 0,
      points_issued: event.points_issued || 0,
      lat: event.lat ?? "",
      lng: event.lng ?? "",
      user: event.display_name || "",
      email: event.email || "",
      event_id: event.event_id || "",
    }));
    const csv = [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((key) => csvCell(row[key as keyof typeof row])).join(","))].join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `greenloop-geo-events-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--gl-green)]">Maps / Geo Intelligence</p>
          <h1 className="text-3xl font-semibold text-[var(--gl-ink)]">
            {heatmapOnly ? "Recycling Heatmap" : "Geo Intelligence"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--gl-ink-muted)]">
            Full-screen recycling location intelligence with date and city filters, top locations, units, events, and export.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!heatmapOnly ? (
            <Link href="/admin/maps/recycling-heatmap" className="rounded-lg border border-[var(--gl-hairline)] bg-white px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">
              Open heatmap
            </Link>
          ) : (
            <Link href="/admin/maps" className="rounded-lg border border-[var(--gl-hairline)] bg-white px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">
              Geo dashboard
            </Link>
          )}
          <button onClick={exportGeoCsv} className="rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gl-green)]">
            Export Geo CSV
          </button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-xl border border-[var(--gl-hairline)] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">From</span>
            <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">To</span>
            <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">City</span>
            <input value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))} placeholder="Filter by city" className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
          </label>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Mapped events" value={mappableEvents.length} />
        <Kpi label="Total units" value={Number(totals?.totalUnits || 0)} />
        <Kpi label="Total events" value={Number(totals?.totalEvents || 0)} />
        <Kpi label="Unique users" value={Number(totals?.uniqueConsumers || 0)} />
      </div>

      <section className="rounded-xl border border-[var(--gl-hairline)] bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--gl-ink)]">Recycling activity map</h2>
            <p className="text-sm text-[var(--gl-ink-muted)]">
              {loading ? "Loading map points..." : `${mappableEvents.length} mapped events from ${events.length} loaded rows.`}
            </p>
          </div>
        </div>
        <AdminRecyclingHeatmap events={mappableEvents} className={heatmapOnly ? "h-[720px]" : "h-[620px]"} />
      </section>

      {!heatmapOnly ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-xl border border-[var(--gl-hairline)] bg-white shadow-sm">
            <div className="border-b border-[var(--gl-hairline)] p-4">
              <h2 className="text-lg font-semibold text-[var(--gl-ink)]">Recent mapped activity</h2>
              <p className="text-sm text-[var(--gl-ink-muted)]">Latest geo-tagged recycling events from the current filter.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
                  <tr>
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5">City</th>
                    <th className="px-4 py-2.5">Units</th>
                    <th className="px-4 py-2.5">Coordinates</th>
                    <th className="px-4 py-2.5">User</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <EmptyRow colSpan={5} text="Loading activity..." />
                  ) : mappableEvents.length === 0 ? (
                    <EmptyRow colSpan={5} text="No mapped events match these filters." />
                  ) : (
                    mappableEvents.slice(0, 100).map((event, index) => (
                      <tr key={`${event.event_id || index}-${event.created_at || ""}`} className="border-t border-[var(--gl-card-cream)] hover:bg-[var(--gl-card-cream)]/70">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-[var(--gl-ink)]">{event.product_name || "Unknown product"}</div>
                          <div className="text-xs text-[var(--gl-ink-muted)]">{event.barcode || "-"}</div>
                        </td>
                        <td className="px-4 py-2.5">{event.city || "-"}</td>
                        <td className="px-4 py-2.5">{event.units || 0}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{event.lat}, {event.lng}</td>
                        <td className="px-4 py-2.5">{event.display_name || event.email || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--gl-hairline)] bg-white shadow-sm">
            <div className="border-b border-[var(--gl-hairline)] p-4">
              <h2 className="text-lg font-semibold text-[var(--gl-ink)]">Top locations</h2>
              <p className="text-sm text-[var(--gl-ink-muted)]">Cities ranked by recycled units.</p>
            </div>
            <div className="divide-y divide-[var(--gl-card-cream)]">
              {cities.length === 0 ? (
                <div className="p-4 text-sm text-[var(--gl-ink-muted)]">No city data available.</div>
              ) : (
                cities.slice(0, 15).map((city, index) => (
                  <div key={`${city.city || "unknown"}-${index}`} className="flex items-center justify-between p-4 text-sm">
                    <div>
                      <div className="font-semibold text-[var(--gl-ink)]">{city.city || "Unknown city"}</div>
                      <div className="text-xs text-[var(--gl-ink-muted)]">{city.consumers || 0} users</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[var(--gl-ink)]">{city.units || 0}</div>
                      <div className="text-xs text-[var(--gl-ink-muted)]">units</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--gl-hairline)] bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--gl-ink)]">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{text}</td>
    </tr>
  );
}
