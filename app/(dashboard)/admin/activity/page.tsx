"use client";

import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, RefreshCw, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useDashboardLanguage } from "@/components/crm/DashboardLanguage";

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
  const { language } = useDashboardLanguage();
  const tr = (en: string, es: string) => language === "es" ? es : en;
  const [pane, setPane] = useState("events");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const listScroll = useRef<HTMLDivElement>(null);
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

  const panes = [
    { id: "events", label: tr("Events", "Eventos"), count: events.length },
    { id: "daily", label: tr("Daily totals", "Totales diarios"), count: dailyTrend.length },
    { id: "locations", label: tr("Locations", "Ubicaciones"), count: topCities.length },
  ];
  const pageCount = Math.max(1, Math.ceil(events.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleEvents = events.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const inputClass = "min-w-0 w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]";
  const commandClass = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
  const cellClass = "px-3 py-3 align-top [overflow-wrap:anywhere]";
  function changePage(next: number) {
    setPage(next);
    listScroll.current?.scrollTo({ top: 0 });
  }

  if (loading) {
    return <p role="status" className="text-sm text-[var(--gl-ink-muted)]">{tr("Loading recycling activity...", "Cargando actividad de reciclaje...")}</p>;
  }

  return (
    <div className="space-y-4 text-[var(--gl-ink)]">
      <WorkspaceHeader className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{tr("Recycling activity", "Actividad de reciclaje")}</h1>
        <button type="button" onClick={exportSelectedActivityCsv} disabled={events.length === 0}
          className={commandClass + " bg-[var(--gl-green)] text-white hover:bg-[var(--gl-green-deep)]"}
          title={tr("Export all returned rows", "Exportar todas las filas devueltas")}>
          <Download size={16} aria-hidden="true" />{tr("Export CSV", "Exportar CSV")}
        </button>
      </WorkspaceHeader>

      {error ? <div role="alert" className="rounded-md bg-[var(--gl-coral-soft)] px-4 py-3 text-sm text-[var(--gl-coral-ink)]">{error}</div> : null}

      <section aria-label={tr("Activity filters", "Filtros de actividad")} className="space-y-2">
        <div className="grid grid-cols-2 items-end gap-2 xl:grid-cols-[1fr_1fr_1.3fr_1.5fr]">
          <label className="min-w-0 text-xs text-[var(--gl-ink-muted)]">
            {tr("From", "Desde")}
            <input type="date" value={filters.from} className={inputClass + " mt-1"}
              onChange={(e) => { setPage(0); setFilters((current) => ({ ...current, from: e.target.value })); }} />
          </label>
          <label className="min-w-0 text-xs text-[var(--gl-ink-muted)]">
            {tr("To", "Hasta")}
            <input type="date" value={filters.to} className={inputClass + " mt-1"}
              onChange={(e) => { setPage(0); setFilters((current) => ({ ...current, to: e.target.value })); }} />
          </label>
          <label className="min-w-0 text-xs text-[var(--gl-ink-muted)]">
            {tr("City", "Ciudad")}
            <select aria-label={tr("City", "Ciudad")} value={filters.city} className={inputClass + " mt-1"}
              onChange={(e) => { setPage(0); setFilters((current) => ({ ...current, city: e.target.value })); }}>
              <option value="">{tr("All cities", "Todas las ciudades")}</option>
              {filteredCityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs text-[var(--gl-ink-muted)]">
            {tr("User", "Usuario")}
            <select aria-label={tr("User", "Usuario")} value={filters.userId} className={inputClass + " mt-1"}
              onChange={(e) => { setPage(0); setFilters((current) => ({ ...current, userId: e.target.value })); }}>
              <option value="">{tr("All users", "Todos los usuarios")}</option>
              {filteredUserOptions.map((user) => <option key={user.id} value={user.id}>{user.label}{user.email ? ` · ${user.email}` : ""}</option>)}
            </select>
          </label>
        </div>
        <div className="flex items-start justify-between gap-2">
          <details className="min-w-0 flex-1 text-sm">
            <summary className="w-fit cursor-pointer py-2.5 text-[var(--gl-ink-muted)]">{tr("Find a city or user", "Buscar ciudad o usuario")}{citySearch || userSearch ? ` (${Number(Boolean(citySearch)) + Number(Boolean(userSearch))})` : ""}</summary>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <input aria-label={tr("Search city", "Buscar ciudad")} placeholder={tr("Search city", "Buscar ciudad")} value={citySearch} onChange={(e) => setCitySearch(e.target.value)} className={inputClass} />
              <input aria-label={tr("Search user", "Buscar usuario")} placeholder={tr("Search user", "Buscar usuario")} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className={inputClass} />
            </div>
          </details>
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => loadReport(filters)} title={tr("Refresh activity", "Actualizar actividad")} aria-label={tr("Refresh activity", "Actualizar actividad")}
              className={commandClass + " hover:bg-[var(--gl-green-soft)]"}><RefreshCw size={17} /></button>
            <button type="button" title={tr("Reset filters", "Restablecer filtros")} aria-label={tr("Reset filters", "Restablecer filtros")}
              onClick={() => { setPage(0); setCitySearch(""); setUserSearch(""); loadReport({ from: "", to: "", city: "", userId: "" }); }}
              className={commandClass + " hover:bg-[var(--gl-green-soft)]"}><RotateCcw size={17} /></button>
          </div>
        </div>
      </section>

      <section aria-label={tr("Activity totals", "Totales de actividad")} className="grid grid-cols-2 gap-x-4 gap-y-3 bg-[var(--gl-paper)] px-4 py-3 sm:grid-cols-4">
        <MetricCard label={tr("Units recycled", "Unidades recicladas")} value={String(report?.totals?.totalUnits ?? 0)} />
        <MetricCard label={tr("Recycling events", "Eventos de reciclaje")} value={String(report?.totals?.totalEvents ?? 0)} />
        <MetricCard label={tr("Unique users", "Usuarios únicos")} value={String(report?.totals?.uniqueConsumers ?? 0)} />
        <MetricCard label={tr("EcoPoints issued", "EcoPoints emitidos")} value={String(report?.totals?.ecoPointsIssued ?? 0)} />
      </section>

      <div role="tablist" aria-label={tr("Activity views", "Vistas de actividad")} className="flex gap-1 border-b border-[var(--gl-hairline)]">
        {panes.map((item, index) => (
          <button key={item.id} type="button" role="tab" id={`activity-tab-${item.id}`} aria-controls={`activity-panel-${item.id}`}
            aria-selected={pane === item.id} tabIndex={pane === item.id ? 0 : -1} onClick={() => setPane(item.id)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % panes.length;
              else if (event.key === "ArrowLeft") next = (index + panes.length - 1) % panes.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = panes.length - 1;
              else return;
              event.preventDefault();
              setPane(panes[next].id);
              document.getElementById(`activity-tab-${panes[next].id}`)?.focus();
            }}
            className={"min-w-0 border-b-2 px-2 py-2.5 text-sm font-medium sm:px-3 " + (pane === item.id ? "border-[var(--gl-green)] text-[var(--gl-green-deep)]" : "border-transparent text-[var(--gl-ink-muted)] hover:text-[var(--gl-ink)]")}>
            {item.label}<span className="ml-1.5 hidden text-xs font-normal text-[var(--gl-ink-muted)] sm:inline">{item.count}</span>
          </button>
        ))}
      </div>

      <section role="tabpanel" id="activity-panel-events" aria-labelledby="activity-tab-events" hidden={pane !== "events"} tabIndex={0}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--gl-ink-muted)]">
          <p aria-live="polite" title={tr("Returned rows", "Filas devueltas")}>{events.length ? currentPage * pageSize + 1 : 0}–{Math.min((currentPage + 1) * pageSize, events.length)} / {events.length}<span className="sr-only sm:not-sr-only"> {tr("returned rows", "filas devueltas")}</span></p>
          <div className="flex items-center gap-1">
            <label className="flex items-center gap-2"><span className="sr-only sm:not-sr-only">{tr("Rows", "Filas")}</span>
              <select aria-label={tr("Rows", "Filas")} className="rounded border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-2 py-1.5 text-sm" value={pageSize}
                onChange={(event) => { setPageSize(Number(event.target.value)); changePage(0); }}>
                {[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <button type="button" disabled={currentPage === 0} title={tr("Previous page", "Página anterior")} aria-label={tr("Previous page", "Página anterior")} onClick={() => changePage(currentPage - 1)} className={commandClass}><ChevronLeft size={16} /></button>
            <button type="button" disabled={currentPage + 1 >= pageCount} title={tr("Next page", "Página siguiente")} aria-label={tr("Next page", "Página siguiente")} onClick={() => changePage(currentPage + 1)} className={commandClass}><ChevronRight size={16} /></button>
          </div>
        </div>
        <div ref={listScroll} role="region" aria-label={tr("Recycling rows", "Filas de reciclaje")} tabIndex={0} className="max-h-[max(16rem,calc(100dvh-28rem))] overflow-auto bg-[var(--gl-paper)]">
          {events.length === 0 ? <p className="p-4 text-sm text-[var(--gl-ink-muted)]">{tr("No recycling events found for the current filter.", "No hay eventos de reciclaje para estos filtros.")}</p> : <>
            <table className="hidden w-full table-fixed border-collapse text-left text-sm xl:table">
              <colgroup><col className="w-[17%]" /><col className="w-[23%]" /><col className="w-[17%]" /><col className="w-[25%]" /><col className="w-[8%]" /><col className="w-[10%]" /></colgroup>
              <thead className="sticky top-0 bg-[var(--gl-card-cream)] text-xs text-[var(--gl-ink-muted)]">
                <tr>{[tr("When", "Cuándo"), tr("User", "Usuario"), tr("City", "Ciudad"), tr("Product / barcode", "Producto / código"), tr("Units", "Unidades"), "EcoPoints"].map((label) => <th key={label} className="px-3 py-2.5 font-medium">{label}</th>)}</tr>
              </thead>
              <tbody>{visibleEvents.map((event, index) => (
                <tr key={`${event.event_id}-${index}`} className="border-b border-[var(--gl-hairline)] hover:bg-[var(--gl-card-cream)]">
                  <td className={cellClass}>{formatDateTime(event.created_at)}</td>
                  <td className={cellClass}><p className="font-medium">{event.display_name || tr("Unknown user", "Usuario desconocido")}</p><p className="mt-0.5 text-xs text-[var(--gl-ink-muted)]">{event.email || event.user_id || "—"}</p></td>
                  <td className={cellClass}>{event.city || tr("Unknown city", "Ciudad desconocida")}</td>
                  <td className={cellClass}>{event.product_name || tr("Unknown product", "Producto desconocido")}<p className="mt-0.5 text-xs text-[var(--gl-ink-muted)]">{event.barcode || "—"}</p></td>
                  <td className={cellClass + " tabular-nums"}>{Number(event.units || 0)}</td>
                  <td className={cellClass + " font-medium tabular-nums text-[var(--gl-green)]"}>{Number(event.points_issued || 0)}</td>
                </tr>
              ))}</tbody>
            </table>
            <div className="divide-y divide-[var(--gl-hairline)] xl:hidden">
              {visibleEvents.map((event, index) => (
                <article key={`${event.event_id}-${index}`} className="space-y-2 px-3 py-3 text-sm [overflow-wrap:anywhere]">
                  <div className="flex items-start justify-between gap-3"><p className="min-w-0 font-medium">{event.product_name || tr("Unknown product", "Producto desconocido")}</p><p className="shrink-0 tabular-nums">{Number(event.units || 0)} {tr("units", "unidades")}</p></div>
                  <p className="text-xs text-[var(--gl-ink-muted)]">{formatDateTime(event.created_at)} · {event.city || tr("Unknown city", "Ciudad desconocida")}</p>
                  <div className="flex items-start justify-between gap-3"><p className="min-w-0">{event.display_name || tr("Unknown user", "Usuario desconocido")}</p><p className="shrink-0 text-xs font-medium text-[var(--gl-green)]">{Number(event.points_issued || 0)} EcoPoints</p></div>
                  <details className="text-xs text-[var(--gl-ink-muted)]"><summary className="w-fit cursor-pointer py-1">{tr("Details", "Detalles")}</summary>
                    <dl className="mt-1 space-y-1"><div><dt className="inline">{tr("Email / user ID", "Correo / ID de usuario")}: </dt><dd className="inline">{event.email || event.user_id || "—"}</dd></div>
                      <div><dt className="inline">{tr("Barcode", "Código de barras")}: </dt><dd className="inline">{event.barcode || "—"}</dd></div></dl>
                  </details>
                </article>
              ))}
            </div>
          </>}
        </div>
      </section>

      <section role="tabpanel" id="activity-panel-daily" aria-labelledby="activity-tab-daily" hidden={pane !== "daily"} tabIndex={0} className="max-h-[max(16rem,calc(100dvh-26rem))] overflow-auto bg-[var(--gl-paper)]">
        {dailyTrend.length === 0 ? <p className="p-4 text-sm text-[var(--gl-ink-muted)]">{tr("No daily recycling activity for this filter.", "No hay actividad diaria para estos filtros.")}</p> :
          <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-[var(--gl-card-cream)] text-xs text-[var(--gl-ink-muted)]"><tr><th className="px-4 py-2.5 font-medium">{tr("Date", "Fecha")}</th><th className="px-4 py-2.5 text-right font-medium">{tr("Units recycled", "Unidades recicladas")}</th></tr></thead>
            <tbody>{dailyTrend.map((day) => <tr key={day.date} className="border-b border-[var(--gl-hairline)]"><td className="px-4 py-3">{day.date}</td><td className="px-4 py-3 text-right tabular-nums">{Number(day.units || 0)}</td></tr>)}</tbody></table>}
      </section>

      <section role="tabpanel" id="activity-panel-locations" aria-labelledby="activity-tab-locations" hidden={pane !== "locations"} tabIndex={0} className="max-h-[max(16rem,calc(100dvh-26rem))] overflow-auto bg-[var(--gl-paper)]">
        {topCities.length === 0 ? <p className="p-4 text-sm text-[var(--gl-ink-muted)]">{tr("No location data for this filter.", "No hay ubicaciones para estos filtros.")}</p> :
          <table className="w-full table-fixed text-left text-sm"><thead className="sticky top-0 bg-[var(--gl-card-cream)] text-xs text-[var(--gl-ink-muted)]"><tr><th className="w-1/2 px-4 py-2.5 font-medium">{tr("City", "Ciudad")}</th><th className="px-4 py-2.5 text-right font-medium">{tr("Users", "Usuarios")}</th><th className="px-4 py-2.5 text-right font-medium">{tr("Units", "Unidades")}</th></tr></thead>
            <tbody>{topCities.map((location, index) => <tr key={`${location.city}-${index}`} className="border-b border-[var(--gl-hairline)]"><td className="px-4 py-3 [overflow-wrap:anywhere]">{location.city || tr("Unknown city", "Ciudad desconocida")}</td><td className="px-4 py-3 text-right tabular-nums">{Number(location.consumers || 0)}</td><td className="px-4 py-3 text-right tabular-nums">{Number(location.units || 0)}</td></tr>)}</tbody></table>}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-1 break-words text-2xl font-semibold tabular-nums text-[var(--gl-ink)]">{value}</p>
    </div>
  );
}
