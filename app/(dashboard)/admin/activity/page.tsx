"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type ActivityEvent = {
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

type PlatformActivityResponse = {
  totals?: {
    totalUnits?: number;
    totalEvents?: number;
    uniqueConsumers?: number;
    ecoPointsIssued?: number;
  };
  dailyTrend?: { date: string; units?: number }[];
  geoBreakdown?: { city?: string | null; units?: number; consumers?: number }[];
  events?: ActivityEvent[];
  filters?: {
    from?: string | null;
    to?: string | null;
    userId?: string | null;
    city?: string | null;
  };
};

type FilterState = {
  from: string;
  to: string;
  city: string;
  userId: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminActivityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PlatformActivityResponse | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    from: "",
    to: "",
    city: "",
    userId: "",
  });

  const loadReport = useCallback(
    async (nextFilters?: FilterState) => {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const activeFilters = nextFilters ?? filters;
        const params = new URLSearchParams();
        if (activeFilters.from) params.set("from", activeFilters.from);
        if (activeFilters.to) params.set("to", activeFilters.to);
        if (activeFilters.city) params.set("city", activeFilters.city);
        if (activeFilters.userId) params.set("userId", activeFilters.userId);

        const result = (await apiFetch(
          `/admin/reports/platform${params.toString() ? `?${params.toString()}` : ""}`,
          { token }
        )) as PlatformActivityResponse;

        setReport(result);
        setFilters(activeFilters);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load recycling activity");
      } finally {
        setLoading(false);
      }
    },
    [filters, router]
  );

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  function onLogout() {
    clearToken();
    router.replace("/login");
  }

  const topCities = useMemo(() => report?.geoBreakdown ?? [], [report]);
  const dailyTrend = useMemo(() => report?.dailyTrend ?? [], [report]);
  const events = useMemo(() => report?.events ?? [], [report]);
  const cityOptions = useMemo(() => {
    const values = new Set<string>();

    for (const location of topCities) {
      const city = String(location.city || "").trim();
      if (city) values.add(city);
    }

    for (const event of events) {
      const city = String(event.city || "").trim();
      if (city) values.add(city);
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [events, topCities]);

  if (loading) {
    return <main className="min-h-screen p-6 text-gray-700">Loading recycling activity...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Recycling Activity</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review platform-wide recycling history across all users.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/admin/users"
                className="inline-flex rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to Users
              </Link>
              <Link
                href="/admin"
                className="inline-flex rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to Admin
              </Link>
            </div>
          </div>
          <button onClick={onLogout} className="rounded bg-gray-900 px-4 py-2 text-white">
            Logout
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <p className="mt-1 text-sm text-gray-600">
              Filter by day range, location, or a specific user ID.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">From</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((current) => ({ ...current, from: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">To</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((current) => ({ ...current, to: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">City</span>
              <select
                value={filters.city}
                onChange={(e) => setFilters((current) => ({ ...current, city: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
              >
                <option value="">All cities</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">User ID</span>
              <input
                value={filters.userId}
                onChange={(e) => setFilters((current) => ({ ...current, userId: e.target.value }))}
                placeholder="Filter by user UUID"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadReport(filters)}
              className="rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white hover:bg-[#24543f]"
            >
              Review Activity
            </button>
            <button
              type="button"
              onClick={() =>
                loadReport({
                  from: "",
                  to: "",
                  city: "",
                  userId: "",
                })
              }
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Units Recycled" value={String(report?.totals?.totalUnits ?? 0)} />
          <MetricCard label="Recycling Events" value={String(report?.totals?.totalEvents ?? 0)} />
          <MetricCard label="Unique Users" value={String(report?.totals?.uniqueConsumers ?? 0)} />
          <MetricCard label="EcoPoints Issued" value={String(report?.totals?.ecoPointsIssued ?? 0)} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Daily Recycling Totals</h2>
            <div className="space-y-2">
              {dailyTrend.length === 0 ? (
                <p className="text-sm text-gray-500">No daily recycling activity for this filter.</p>
              ) : (
                dailyTrend.map((day) => (
                  <div key={day.date} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm">
                    <span className="font-medium text-gray-900">{day.date}</span>
                    <span className="text-gray-700">{Number(day.units || 0)} units</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Locations</h2>
            <div className="space-y-2">
              {topCities.length === 0 ? (
                <p className="text-sm text-gray-500">No location data for this filter.</p>
              ) : (
                topCities.map((location, index) => (
                  <div key={`${location.city}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{location.city || "Unknown city"}</p>
                      <p className="text-xs text-gray-500">{Number(location.consumers || 0)} users</p>
                    </div>
                    <span className="text-gray-700">{Number(location.units || 0)} units</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Recycling Events</h2>
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse text-left">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">User</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Location</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Product</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Barcode</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Units</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">EcoPoints</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                      No recycling events found for the current filter.
                    </td>
                  </tr>
                ) : (
                  events.map((event, index) => (
                    <tr key={`${event.event_id}-${index}`} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(event.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div>
                          <p className="font-medium text-gray-900">{event.display_name || "Unknown user"}</p>
                          <p className="text-xs text-gray-500">{event.email || event.user_id || "—"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{event.city || "Unknown city"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{event.product_name || "Unknown product"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{event.barcode || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{Number(event.units || 0)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-emerald-700">{Number(event.points_issued || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
