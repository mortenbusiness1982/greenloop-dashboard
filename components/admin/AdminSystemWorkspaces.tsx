"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { DashboardLanguage, useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type Bin = {
  id: string;
  user_id?: string;
  user_email?: string | null;
  user_display_name?: string | null;
  lat?: number | null;
  lng?: number | null;
  photo_ref?: string | null;
  created_at?: string | null;
  recycling_events_count?: number;
  recycled_units_count?: number;
  last_recycling_at?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  country?: string | null;
  bin_type?: string;
  verification_status?: string;
  source?: string;
};

function normalizeList<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
}

const systemCopy = {
  en: {
    bins: {
      loadError: "Unable to load bins",
      eyebrow: "Bins / Locations",
      title: "Recycling Infrastructure",
      description: "Inspect user-reported recycling locations, coordinates, city metadata, source, verification signal, and recycling usage.",
      openMaps: "Open maps",
      exportBins: "Export bins",
      kpis: ["Bins", "Active bins", "Recycled units", "Cities"],
      tableTitle: "Bin list",
      tableDescription: "Current schema supports coordinates, photo reference, creator, and usage-derived status.",
      search: "Search id, city, user",
      headers: ["Location", "Coordinates", "Status", "Usage", "Reporter", "Dates", "Links"],
      loading: "Loading bins...",
      empty: "No bins match the current search.",
      unknownCity: "Unknown city",
      unknown: "unknown",
      bin: "bin",
      events: "events",
      units: "units",
      created: "Created",
      lastUsed: "Last used",
      openMap: "Open map",
    },
    settings: {
      eyebrow: "System",
      title: "Settings",
      description: "Operational configuration inventory for support, legal links, points defaults, app text/config, and feature flags.",
      auditLog: "Audit log",
      noteTitle: "Next implementation note",
      noteBody: "This page is now a real CRM workspace. To make settings editable, the next backend step is an `admin_settings` table and audited update endpoint.",
      cards: [
        ["Support", [["Support email", "Configured in app/API env"], ["Help routing", "Future editable setting"]]],
        ["Legal links", [["Terms", "App-side legal route/config"], ["Privacy", "App-side legal route/config"]]],
        ["EcoPoints", [["Default recycle points", "Backend checkout logic"], ["Manual adjustment", "Admin Users module"]]],
        ["Feature flags", [["Dashboard modules", "Role-based navigation enabled"], ["Future flags", "Needs backend config store"]]],
        ["Localization", [["Reward/challenge translation", "API translation service"], ["User language", "App locale setting"]]],
        ["Security", [["Role access", "API middleware + CRM shell"], ["User dashboard access", "Blocked for role user"]]],
      ],
    },
    audit: {
      eyebrow: "System",
      title: "Audit Log",
      description: "Audit coverage workspace for tracking who changed what, when, and which entity was affected.",
      settings: "Settings",
      planTitle: "Audit coverage plan",
      planDescription: "Backend audit persistence is not present yet, so this page documents the required capture points.",
      headers: ["Area", "Events to capture", "Status"],
      backendNeeded: "Backend needed",
      schemaTitle: "Recommended audit schema",
      schemaBody: "`admin_audit_log`: id, actor_user_id, action, entity_type, entity_id, before_json, after_json, metadata_json, created_at.",
      rows: [
        ["Reward changes", "Create/edit/archive/toggle rewards"],
        ["Challenge changes", "Create/edit/delete/toggle challenges"],
        ["User support actions", "Manual EcoPoints, avatar reset, role changes"],
        ["Moderation actions", "Approve/reject/bulk review decisions"],
        ["System settings", "Future editable configuration changes"],
      ],
    },
  },
  es: {
    bins: {
      loadError: "No se pudieron cargar los puntos de reciclaje",
      eyebrow: "Contenedores / ubicaciones",
      title: "Infraestructura de reciclaje",
      description: "Inspecciona ubicaciones reportadas por usuarios, coordenadas, ciudad, fuente, señal de verificación y uso de reciclaje.",
      openMaps: "Abrir mapas",
      exportBins: "Exportar ubicaciones",
      kpis: ["Ubicaciones", "Ubicaciones activas", "Unidades recicladas", "Ciudades"],
      tableTitle: "Lista de ubicaciones",
      tableDescription: "El esquema actual soporta coordenadas, referencia de foto, creador y estado derivado del uso.",
      search: "Buscar id, ciudad, usuario",
      headers: ["Ubicación", "Coordenadas", "Estado", "Uso", "Reportado por", "Fechas", "Enlaces"],
      loading: "Cargando ubicaciones...",
      empty: "Ninguna ubicación coincide con la búsqueda actual.",
      unknownCity: "Ciudad desconocida",
      unknown: "desconocido",
      bin: "contenedor",
      events: "eventos",
      units: "unidades",
      created: "Creado",
      lastUsed: "Último uso",
      openMap: "Abrir mapa",
    },
    settings: {
      eyebrow: "Sistema",
      title: "Ajustes",
      description: "Inventario de configuración operativa para soporte, enlaces legales, puntos por defecto, textos/configuración de app y feature flags.",
      auditLog: "Registro de auditoría",
      noteTitle: "Nota de próxima implementación",
      noteBody: "Esta página ya es un espacio CRM real. Para que los ajustes sean editables, el siguiente paso backend es una tabla `admin_settings` y un endpoint de actualización auditado.",
      cards: [
        ["Soporte", [["Email de soporte", "Configurado en env de app/API"], ["Ruta de ayuda", "Ajuste editable futuro"]]],
        ["Enlaces legales", [["Términos", "Ruta/config legal en la app"], ["Privacidad", "Ruta/config legal en la app"]]],
        ["EcoPoints", [["Puntos por reciclaje por defecto", "Lógica backend de checkout"], ["Ajuste manual", "Módulo Admin Usuarios"]]],
        ["Feature flags", [["Módulos del dashboard", "Navegación por roles habilitada"], ["Flags futuras", "Necesita almacén de configuración backend"]]],
        ["Localización", [["Traducción de recompensas/retos", "Servicio de traducción API"], ["Idioma de usuario", "Ajuste locale de app"]]],
        ["Seguridad", [["Acceso por roles", "Middleware API + shell CRM"], ["Acceso de usuario al dashboard", "Bloqueado para rol user"]]],
      ],
    },
    audit: {
      eyebrow: "Sistema",
      title: "Registro de auditoría",
      description: "Espacio de cobertura de auditoría para rastrear quién cambió qué, cuándo y qué entidad fue afectada.",
      settings: "Ajustes",
      planTitle: "Plan de cobertura de auditoría",
      planDescription: "La persistencia backend de auditoría aún no existe, así que esta página documenta los puntos de captura requeridos.",
      headers: ["Área", "Eventos a capturar", "Estado"],
      backendNeeded: "Backend necesario",
      schemaTitle: "Esquema de auditoría recomendado",
      schemaBody: "`admin_audit_log`: id, actor_user_id, action, entity_type, entity_id, before_json, after_json, metadata_json, created_at.",
      rows: [
        ["Cambios de recompensas", "Crear/editar/archivar/activar o pausar recompensas"],
        ["Cambios de retos", "Crear/editar/eliminar/activar o pausar retos"],
        ["Acciones de soporte de usuario", "EcoPoints manuales, reinicio de avatar, cambios de rol"],
        ["Acciones de moderación", "Decisiones de aprobar/rechazar/revisión masiva"],
        ["Ajustes del sistema", "Cambios futuros de configuración editable"],
      ],
    },
  },
} as const;

function formatDate(value?: string | null, language: DashboardLanguage = "en") {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language === "es" ? "es-ES" : "en-US");
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function AdminBinsWorkspace() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const copy = systemCopy[language];
  const [bins, setBins] = useState<Bin[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBins = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const result = await apiFetch(`/admin/bins${params.toString() ? `?${params}` : ""}`, { token });
      setBins(normalizeList<Bin>(result, "bins"));
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.bins.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.bins.loadError, router, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBins(), 250);
    return () => window.clearTimeout(timer);
  }, [loadBins]);

  const totals = useMemo(
    () => ({
      bins: bins.length,
      active: bins.filter((bin) => bin.verification_status === "active").length,
      units: bins.reduce((sum, bin) => sum + Number(bin.recycled_units_count || 0), 0),
      cities: new Set(bins.map((bin) => bin.city).filter(Boolean)).size,
    }),
    [bins]
  );

  function exportBins() {
    const headers = ["id", "lat", "lng", "city", "province", "country", "status", "events", "units", "source", "created_at", "last_recycling_at"];
    const rows = bins.map((bin) => ({
      id: bin.id,
      lat: bin.lat ?? "",
      lng: bin.lng ?? "",
      city: bin.city || "",
      province: bin.province || "",
      country: bin.country || "",
      status: bin.verification_status || "",
      events: bin.recycling_events_count || 0,
      units: bin.recycled_units_count || 0,
      source: bin.source || "",
      created_at: bin.created_at || "",
      last_recycling_at: bin.last_recycling_at || "",
    }));
    const csv = [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header as keyof typeof row])).join(","))].join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `greenloop-bins-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Frame
      eyebrow={copy.bins.eyebrow}
      title={copy.bins.title}
      description={copy.bins.description}
      error={error}
      actions={
        <>
          <LinkButton href="/admin/maps">{copy.bins.openMaps}</LinkButton>
          <button onClick={exportBins} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">{copy.bins.exportBins}</button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label={copy.bins.kpis[0]} value={totals.bins} language={language} />
        <Kpi label={copy.bins.kpis[1]} value={totals.active} language={language} />
        <Kpi label={copy.bins.kpis[2]} value={totals.units} language={language} />
        <Kpi label={copy.bins.kpis[3]} value={totals.cities} language={language} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{copy.bins.tableTitle}</h2>
            <p className="text-sm text-slate-500">{copy.bins.tableDescription}</p>
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.bins.search} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {copy.bins.headers.map((header) => <th key={header} className="px-4 py-2.5">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={7} text={copy.bins.loading} />
              ) : bins.length === 0 ? (
                <EmptyRow colSpan={7} text={copy.bins.empty} />
              ) : (
                bins.map((bin) => (
                  <tr key={bin.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-950">{bin.city || copy.bins.unknownCity}</div>
                      <div className="text-xs text-slate-500">{[bin.province, bin.region, bin.country].filter(Boolean).join(", ") || bin.id}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{bin.lat}, {bin.lng}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={bin.verification_status === "active" ? "green" : "amber"}>{bin.verification_status || copy.bins.unknown}</Badge>
                      <div className="mt-1 text-xs text-slate-500">{bin.bin_type || copy.bins.bin} · {bin.source || copy.bins.unknown}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div>{bin.recycling_events_count || 0} {copy.bins.events}</div>
                      <div className="text-xs text-slate-500">{bin.recycled_units_count || 0} {copy.bins.units}</div>
                    </td>
                    <td className="px-4 py-2.5">{bin.user_email || bin.user_display_name || bin.user_id || "-"}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs text-slate-500">{copy.bins.created}</div>
                      <div>{formatDate(bin.created_at, language)}</div>
                      <div className="mt-2 text-xs text-slate-500">{copy.bins.lastUsed}</div>
                      <div>{formatDate(bin.last_recycling_at, language)}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      {bin.lat != null && bin.lng != null ? (
                        <a href={`https://www.google.com/maps?q=${bin.lat},${bin.lng}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
                          {copy.bins.openMap}
                        </a>
                      ) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Frame>
  );
}

export function AdminSettingsWorkspace() {
  const { language } = useDashboardLanguage();
  const copy = systemCopy[language];
  return (
    <Frame
      eyebrow={copy.settings.eyebrow}
      title={copy.settings.title}
      description={copy.settings.description}
      actions={<LinkButton href="/admin/audit">{copy.settings.auditLog}</LinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {copy.settings.cards.map(([title, rows]) => <ConfigCard key={title} title={title} rows={rows} />)}
      </div>
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">{copy.settings.noteTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {copy.settings.noteBody}
        </p>
      </section>
    </Frame>
  );
}

export function AdminAuditWorkspace() {
  const { language } = useDashboardLanguage();
  const copy = systemCopy[language];

  return (
    <Frame
      eyebrow={copy.audit.eyebrow}
      title={copy.audit.title}
      description={copy.audit.description}
      actions={<LinkButton href="/admin/settings">{copy.audit.settings}</LinkButton>}
    >
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-950">{copy.audit.planTitle}</h2>
          <p className="text-sm text-slate-500">{copy.audit.planDescription}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {copy.audit.headers.map((header) => <th key={header} className="px-4 py-2.5">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {copy.audit.rows.map(([area, events]) => (
                <tr key={area} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-semibold text-slate-950">{area}</td>
                  <td className="px-4 py-2.5">{events}</td>
                  <td className="px-4 py-2.5"><Badge tone="amber">{copy.audit.backendNeeded}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">{copy.audit.schemaTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {copy.audit.schemaBody}
        </p>
      </section>
    </Frame>
  );
}

function Frame({
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
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {children}
    </div>
  );
}

function Kpi({ label, value, language = "en" }: { label: string; value: number; language?: DashboardLanguage }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value.toLocaleString(language === "es" ? "es-ES" : "en-US")}</p>
    </div>
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
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{children}</Link>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-500">{text}</td>
    </tr>
  );
}

function ConfigCard({ title, rows }: { title: string; rows: readonly (readonly [string, string])[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="mt-1 text-sm text-slate-500">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
