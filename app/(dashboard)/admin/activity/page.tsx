"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

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

type UserOption = {
  id: string;
  label: string;
  email: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function getTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
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
  const [citySearch, setCitySearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

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

  function exportSelectedActivityCsv() {
    const headers = [
      "created_at",
      "user",
      "email",
      "user_id",
      "city",
      "product_name",
      "barcode",
      "units",
      "ecopoints",
      "scan_status",
      "lat",
      "lng",
      "bin_id",
      "event_id",
    ];

    const rows = events.map((event) => ({
      created_at: event.created_at ?? "",
      user: event.display_name || "Unknown user",
      email: event.email ?? "",
      user_id: event.user_id ?? "",
      city: event.city || "Unknown city",
      product_name: event.product_name || "Unknown product",
      barcode: event.barcode ?? "",
      units: Number(event.units || 0),
      ecopoints: Number(event.points_issued || 0),
      scan_status: event.scan_status ?? "",
      lat: event.lat ?? "",
      lng: event.lng ?? "",
      bin_id: event.bin_id ?? "",
      event_id: event.event_id ?? "",
    }));

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => headers.map((key) => csvCell(row[key as keyof typeof row])).join(",")),
    ].join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const from = filters.from || "all";
    const to = filters.to || "all";
    anchor.href = url;
    anchor.download = `greenloop-recycling-activity-${from}-to-${to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const topCities = useMemo(() => report?.geoBreakdown ?? [], [report]);
  const dailyTrend = useMemo(
    () => [...(report?.dailyTrend ?? [])].sort((a, b) => getTime(b.date) - getTime(a.date)),
    [report]
  );
  const events = useMemo(
    () => [...(report?.events ?? [])].sort((a, b) => getTime(b.created_at) - getTime(a.created_at)),
    [report]
  );
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
  const filteredCityOptions = useMemo(() => {
    const query = citySearch.trim().toLowerCase();
    if (!query) return cityOptions;
    return cityOptions.filter((city) => city.toLowerCase().includes(query));
  }, [cityOptions, citySearch]);
  const userOptions = useMemo(() => {
    const values = new Map<string, UserOption>();

    for (const event of events) {
      const id = String(event.user_id || "").trim();
      if (!id) continue;
      const displayName = String(event.display_name || "").trim();
      const email = String(event.email || "").trim();

      values.set(id, {
        id,
        label: displayName || email || id,
        email,
      });
    }

    return Array.from(values.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [events]);
  const filteredUserOptions = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return userOptions;
    return userOptions.filter((user) =>
      `${user.label} ${user.email} ${user.id}`.toLowerCase().includes(query)
    );
  }, [userOptions, userSearch]);

  if (loading) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-[var(--gl-ink-muted)]">Loading recycling activity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gl-green)]">
          Admin · Operations
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--gl-ink)] md:text-4xl">
          Recycling activity
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--gl-ink-muted)]">
          Review platform-wide recycling history across all users.
        </p>
      </header>

      {error ? (
        <div role="alert" className="rounded-xl border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] px-5 py-4 text-sm text-[var(--gl-coral-ink)]">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--gl-ink)]">Filters</h2>
          <p className="mt-1 text-sm text-[var(--gl-ink-muted)]">
            Filter by day range, location, or user name.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">From</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((current) => ({ ...current, from: e.target.value }))}
              className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">To</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((current) => ({ ...current, to: e.target.value }))}
              className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">City</span>
            <select
              value={filters.city}
              onChange={(e) => setFilters((current) => ({ ...current, city: e.target.value }))}
              className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
            >
              <option value="">All cities</option>
              {filteredCityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <input
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              placeholder="Search city"
              className="mt-2 w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">User Name</span>
            <select
              value={filters.userId}
              onChange={(e) => setFilters((current) => ({ ...current, userId: e.target.value }))}
              className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
            >
              <option value="">All users</option>
              {filteredUserOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label}{user.email ? ` · ${user.email}` : ""}
                </option>
              ))}
            </select>
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search user"
              className="mt-2 w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadReport(filters)}
            className="rounded-md bg-[var(--gl-green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--gl-green-deep)]"
          >
            Review Activity
          </button>
          <button
            type="button"
            onClick={() => {
              setCitySearch("");
              setUserSearch("");
              loadReport({
                from: "",
                to: "",
                city: "",
                userId: "",
              });
            }}
            className="rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-medium text-[var(--gl-ink-soft)] transition hover:bg-[var(--gl-card-cream)]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={exportSelectedActivityCsv}
            disabled={events.length === 0}
            className="rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-medium text-[var(--gl-ink-soft)] transition hover:bg-[var(--gl-card-cream)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export Selected CSV
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Units Recycled" value={String(report?.totals?.totalUnits ?? 0)} />
        <MetricCard label="Recycling Events" value={String(report?.totals?.totalEvents ?? 0)} />
        <MetricCard label="Unique Users" value={String(report?.totals?.uniqueConsumers ?? 0)} />
        <MetricCard label="EcoPoints Issued" value={String(report?.totals?.ecoPointsIssued ?? 0)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--gl-ink)]">Daily Recycling Totals</h2>
          <div className="space-y-2">
            {dailyTrend.length === 0 ? (
              <p className="text-sm text-[var(--gl-ink-muted)]">No daily recycling activity for this filter.</p>
            ) : (
              dailyTrend.map((day) => (
                <div key={day.date} className="flex items-center justify-between rounded-lg border border-[var(--gl-hairline)] p-3 text-sm">
                  <span className="font-medium text-[var(--gl-ink)]">{day.date}</span>
                  <span className="text-[var(--gl-ink-soft)]">{Number(day.units || 0)} units</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--gl-ink)]">Top Locations</h2>
          <div className="space-y-2">
            {topCities.length === 0 ? (
              <p className="text-sm text-[var(--gl-ink-muted)]">No location data for this filter.</p>
            ) : (
              topCities.map((location, index) => (
                <div key={`${location.city}-${index}`} className="flex items-center justify-between rounded-lg border border-[var(--gl-hairline)] p-3 text-sm">
                  <div>
                    <p className="font-medium text-[var(--gl-ink)]">{location.city || "Unknown city"}</p>
                    <p className="text-xs text-[var(--gl-ink-muted)]">{Number(location.consumers || 0)} users</p>
                  </div>
                  <span className="text-[var(--gl-ink-soft)]">{Number(location.units || 0)} units</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-[var(--gl-ink)]">Recycling Events</h2>
          <button
            type="button"
            onClick={exportSelectedActivityCsv}
            disabled={events.length === 0}
            className="inline-flex rounded-md bg-[var(--gl-green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--gl-green-deep)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export to CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-left">
            <thead className="bg-[var(--gl-card-cream)]">
              <tr className="border-b border-[var(--gl-hairline)]">
                <th className="px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Date</th>
                <th className="px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">User</th>
                <th className="px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Location</th>
                <th className="px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Product</th>
                <th className="px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Barcode</th>
                <th className="px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Units</th>
                <th className="px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">EcoPoints</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-[var(--gl-ink-muted)]">
                    No recycling events found for the current filter.
                  </td>
                </tr>
              ) : (
                events.map((event, index) => (
                  <tr key={`${event.event_id}-${index}`} className="border-b border-[var(--gl-hairline)]">
                    <td className="px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{formatDateTime(event.created_at)}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">
                      <div>
                        <p className="font-medium text-[var(--gl-ink)]">{event.display_name || "Unknown user"}</p>
                        <p className="text-xs text-[var(--gl-ink-muted)]">{event.email || event.user_id || "—"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{event.city || "Unknown city"}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{event.product_name || "Unknown product"}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{event.barcode || "—"}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{Number(event.units || 0)}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-emerald-700">{Number(event.points_issued || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
      <p className="text-sm font-medium text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-[var(--gl-ink)]">{value}</p>
    </div>
  );
}
