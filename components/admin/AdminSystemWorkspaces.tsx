"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

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

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function AdminBinsWorkspace() {
  const router = useRouter();
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
      setError(err instanceof Error ? err.message : "Unable to load bins");
    } finally {
      setLoading(false);
    }
  }, [router, search]);

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
      eyebrow="Bins / Locations"
      title="Recycling Infrastructure"
      description="Inspect user-reported recycling locations, coordinates, city metadata, source, verification signal, and recycling usage."
      error={error}
      actions={
        <>
          <LinkButton href="/admin/maps">Open maps</LinkButton>
          <button onClick={exportBins} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Export bins</button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Bins" value={totals.bins} />
        <Kpi label="Active bins" value={totals.active} />
        <Kpi label="Recycled units" value={totals.units} />
        <Kpi label="Cities" value={totals.cities} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Bin list</h2>
            <p className="text-sm text-slate-500">Current schema supports coordinates, photo reference, creator, and usage-derived status.</p>
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search id, city, user" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5">Coordinates</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Usage</th>
                <th className="px-4 py-2.5">Reporter</th>
                <th className="px-4 py-2.5">Dates</th>
                <th className="px-4 py-2.5">Links</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={7} text="Loading bins..." />
              ) : bins.length === 0 ? (
                <EmptyRow colSpan={7} text="No bins match the current search." />
              ) : (
                bins.map((bin) => (
                  <tr key={bin.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-950">{bin.city || "Unknown city"}</div>
                      <div className="text-xs text-slate-500">{[bin.province, bin.region, bin.country].filter(Boolean).join(", ") || bin.id}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{bin.lat}, {bin.lng}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={bin.verification_status === "active" ? "green" : "amber"}>{bin.verification_status || "unknown"}</Badge>
                      <div className="mt-1 text-xs text-slate-500">{bin.bin_type || "bin"} · {bin.source || "unknown"}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div>{bin.recycling_events_count || 0} events</div>
                      <div className="text-xs text-slate-500">{bin.recycled_units_count || 0} units</div>
                    </td>
                    <td className="px-4 py-2.5">{bin.user_email || bin.user_display_name || bin.user_id || "-"}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs text-slate-500">Created</div>
                      <div>{formatDate(bin.created_at)}</div>
                      <div className="mt-2 text-xs text-slate-500">Last used</div>
                      <div>{formatDate(bin.last_recycling_at)}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      {bin.lat != null && bin.lng != null ? (
                        <a href={`https://www.google.com/maps?q=${bin.lat},${bin.lng}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
                          Open map
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
  return (
    <Frame
      eyebrow="System"
      title="Settings"
      description="Operational configuration inventory for support, legal links, points defaults, app text/config, and feature flags."
      actions={<LinkButton href="/admin/audit">Audit log</LinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ConfigCard title="Support" rows={[["Support email", "Configured in app/API env"], ["Help routing", "Future editable setting"]]} />
        <ConfigCard title="Legal links" rows={[["Terms", "App-side legal route/config"], ["Privacy", "App-side legal route/config"]]} />
        <ConfigCard title="EcoPoints" rows={[["Default recycle points", "Backend checkout logic"], ["Manual adjustment", "Admin Users module"]]} />
        <ConfigCard title="Feature flags" rows={[["Dashboard modules", "Role-based navigation enabled"], ["Future flags", "Needs backend config store"]]} />
        <ConfigCard title="Localization" rows={[["Reward/challenge translation", "API translation service"], ["User language", "App locale setting"]]} />
        <ConfigCard title="Security" rows={[["Role access", "API middleware + CRM shell"], ["User dashboard access", "Blocked for role user"]]} />
      </div>
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Next implementation note</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This page is now a real CRM workspace. To make settings editable, the next backend step is an `admin_settings` table and audited update endpoint.
        </p>
      </section>
    </Frame>
  );
}

export function AdminAuditWorkspace() {
  const plannedRows = [
    ["Reward changes", "Create/edit/archive/toggle rewards"],
    ["Challenge changes", "Create/edit/delete/toggle challenges"],
    ["User support actions", "Manual EcoPoints, avatar reset, role changes"],
    ["Moderation actions", "Approve/reject/bulk review decisions"],
    ["System settings", "Future editable configuration changes"],
  ];

  return (
    <Frame
      eyebrow="System"
      title="Audit Log"
      description="Audit coverage workspace for tracking who changed what, when, and which entity was affected."
      actions={<LinkButton href="/admin/settings">Settings</LinkButton>}
    >
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-950">Audit coverage plan</h2>
          <p className="text-sm text-slate-500">Backend audit persistence is not present yet, so this page documents the required capture points.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Area</th>
                <th className="px-4 py-2.5">Events to capture</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {plannedRows.map(([area, events]) => (
                <tr key={area} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-semibold text-slate-950">{area}</td>
                  <td className="px-4 py-2.5">{events}</td>
                  <td className="px-4 py-2.5"><Badge tone="amber">Backend needed</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Recommended audit schema</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          `admin_audit_log`: id, actor_user_id, action, entity_type, entity_id, before_json, after_json, metadata_json, created_at.
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

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value.toLocaleString()}</p>
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

function ConfigCard({ title, rows }: { title: string; rows: [string, string][] }) {
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
