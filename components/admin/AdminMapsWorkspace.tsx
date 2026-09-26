"use client";

import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "@/components/crm/Workspace.module.css";
import { WorkspaceTabs } from "@/components/crm/WorkspaceTabs";
import { useDashboardLanguage } from "@/components/crm/DashboardLanguage";
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
  const { language } = useDashboardLanguage();
  const tr = (en: string, es: string) => language === "es" ? es : en;
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
      params.set("events", "all");
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
    <div className={`${styles.root} space-y-4`}>
      <WorkspaceHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="sr-only">{tr("Maps / Geo Intelligence", "Mapas / Inteligencia geográfica")}</p>
          <h1 className="text-2xl font-semibold text-[var(--gl-ink)]">
            {heatmapOnly ? tr("Recycling Heatmap", "Mapa de calor de reciclaje") : tr("Geo Intelligence", "Inteligencia geográfica")}
          </h1>
          <p className="sr-only">
            Full-screen recycling location intelligence with date and city filters, top locations, units, events, and export.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!heatmapOnly ? (
            <Link href="/admin/maps/recycling-heatmap" className="rounded-lg border border-[var(--gl-hairline)] bg-white px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">
              {tr("Open heatmap", "Abrir mapa de calor")}
            </Link>
          ) : (
            <Link href="/admin/maps" className="rounded-lg border border-[var(--gl-hairline)] bg-white px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">
              {tr("Geo dashboard", "Resumen geográfico")}
            </Link>
          )}
          <button onClick={exportGeoCsv} className="rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gl-green)]">
            {tr("Export Geo CSV", "Exportar CSV geográfico")}
          </button>
        </div>
      </WorkspaceHeader>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="min-w-0">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="block min-w-0">
            <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{tr("From", "Desde")}</span>
            <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{tr("To", "Hasta")}</span>
            <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
          </label>
          <label className="col-span-2 block min-w-0">
            <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{tr("City", "Ciudad")}</span>
            <input value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))} placeholder={tr("Filter by city", "Filtrar por ciudad")} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2 text-sm" />
          </label>
        </div>
      </section>

      <div className={styles.metrics}>
        <Kpi label={tr("Total units", "Unidades totales")} value={Number(totals?.totalUnits || 0)} />
        <Kpi label={tr("Total events", "Eventos totales")} value={Number(totals?.totalEvents || 0)} />
        <Kpi label={tr("Unique users", "Usuarios únicos")} value={Number(totals?.uniqueConsumers || 0)} />
      </div>

      <WorkspaceTabs label={tr("Geo workspace", "Espacio geográfico")} tabs={[
        { id: "map", label: tr("Map", "Mapa"), content: (<section className="min-w-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--gl-ink)]">{tr("Recycling activity map", "Mapa de actividad de reciclaje")}</h2>
          </div>
        </div>
        <AdminRecyclingHeatmap events={mappableEvents} className="h-[60dvh] min-h-[360px] max-h-[720px]" />
      </section>) },
        ...(!heatmapOnly ? [{ id: "activity", label: tr("Activity & locations", "Actividad y ubicaciones"), content: (<>{!heatmapOnly ? (
        <div className="grid min-w-0 gap-4">
          <section className="min-w-0">
            <div className="border-b border-[var(--gl-hairline)] p-4">
              <h2 className="text-base font-semibold text-[var(--gl-ink)]">{tr("Recent mapped activity", "Actividad geográfica reciente")}</h2>
              <p className="text-sm text-[var(--gl-ink-muted)]">{tr("Latest geo-tagged recycling events from the current filter.", "Últimos eventos geolocalizados del filtro actual.")}</p>
            </div>
            <div className="overflow-x-auto">
              <table className={styles.table}>
                <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
                  <tr>
                    <th className="px-4 py-2.5">{tr("Product", "Producto")}</th>
                    <th className="px-4 py-2.5">{tr("City", "Ciudad")}</th>
                    <th className="px-4 py-2.5">{tr("Units", "Unidades")}</th>
                    <th className="px-4 py-2.5">{tr("Coordinates", "Coordenadas")}</th>
                    <th className="px-4 py-2.5">{tr("User", "Usuario")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <EmptyRow colSpan={5} text={tr("Loading activity...", "Cargando actividad...")} />
                  ) : mappableEvents.length === 0 ? (
                    <EmptyRow colSpan={5} text={tr("No mapped events match these filters.", "No hay eventos geolocalizados para estos filtros.")} />
                  ) : (
                    mappableEvents.slice(0, 100).map((event, index) => (
                      <tr key={`${event.event_id || index}-${event.created_at || ""}`} className="border-t border-[var(--gl-card-cream)] hover:bg-[var(--gl-card-cream)]/70">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-[var(--gl-ink)]">{event.product_name || tr("Unknown product", "Producto desconocido")}</div>
                          <div className="text-xs text-[var(--gl-ink-muted)]">{event.barcode || "-"}</div>
                        </td>
                        <td className="px-4 py-2.5">{event.city || "-"}</td>
                        <td data-label={tr("Units", "Unidades")} className="px-4 py-2.5">{event.units || 0}</td>
                        <td data-label={tr("Coordinates", "Coordenadas")} className="px-4 py-2.5 font-mono text-xs">{event.lat}, {event.lng}</td>
                        <td className="px-4 py-2.5">{event.display_name || event.email || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="min-w-0">
            <div className="border-b border-[var(--gl-hairline)] p-4">
              <h2 className="text-base font-semibold text-[var(--gl-ink)]">{tr("Top locations", "Principales ubicaciones")}</h2>
              <p className="text-sm text-[var(--gl-ink-muted)]">{tr("Cities ranked by recycled units.", "Ciudades por unidades recicladas.")}</p>
            </div>
            <div className="divide-y divide-[var(--gl-card-cream)]">
              {cities.length === 0 ? (
                <div className="p-4 text-sm text-[var(--gl-ink-muted)]">{tr("No city data available.", "No hay datos de ciudades.")}</div>
              ) : (
                cities.slice(0, 15).map((city, index) => (
                  <div key={`${city.city || "unknown"}-${index}`} className="flex items-center justify-between p-4 text-sm">
                    <div>
                      <div className="font-semibold text-[var(--gl-ink)]">{city.city || tr("Unknown city", "Ciudad desconocida")}</div>
                      <div className="text-xs text-[var(--gl-ink-muted)]">{city.consumers || 0} {tr("users", "usuarios")}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[var(--gl-ink)]">{city.units || 0}</div>
                      <div className="text-xs text-[var(--gl-ink-muted)]">{tr("units", "unidades")}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null} </>) }] : []),
      ]} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--gl-hairline)] bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--gl-ink)]">{value.toLocaleString()}</p>
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
