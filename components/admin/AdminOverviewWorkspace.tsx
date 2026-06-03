"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Coins,
  Flag,
  Gift,
  MapPin,
  ShieldCheck,
  Store,
  TicketCheck,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type PlatformReport = {
  totals?: {
    totalUnits?: number;
    totalEvents?: number;
    uniqueConsumers?: number;
    ecoPointsIssued?: number;
  };
  geoBreakdown?: { city?: string | null; units?: number; consumers?: number }[];
  events?: PlatformEvent[];
};

type PlatformEvent = {
  created_at?: string;
  product_name?: string;
  barcode?: string;
  units?: number;
  city?: string | null;
  scan_status?: string;
  display_name?: string | null;
  email?: string | null;
  points_issued?: number;
};

type AdminUser = {
  id: string;
  role?: string;
  created_at?: string;
  deactivated_at?: string | null;
};

type Reward = {
  id: string;
  active?: boolean;
  status?: string | null;
  archived_at?: string | null;
};

type Challenge = {
  id: string;
  active?: boolean;
};

type Unlock = {
  id: string;
  unlock_status?: string | null;
};

type Brand = {
  id: string;
};

type Partner = {
  id: string;
  deactivated_at?: string | null;
};

type OverviewState = {
  platform: PlatformReport | null;
  users: AdminUser[];
  rewards: Reward[];
  challenges: Challenge[];
  unlocks: Unlock[];
  brands: Brand[];
  partners: Partner[];
};

const emptyState: OverviewState = {
  platform: null,
  users: [],
  rewards: [],
  challenges: [],
  unlocks: [],
  brands: [],
  partners: [],
};

const moduleLinks = [
  { title: "Users", href: "/admin/users", icon: Users, description: "Support users, roles, avatar resets, and recycling history." },
  { title: "Activity", href: "/admin/activity", icon: Activity, description: "Inspect scans and recycling events with date, city, and user filters." },
  { title: "Rewards", href: "/admin/rewards", icon: Gift, description: "Manage reward engine inventory, placement, status, and archive flow." },
  { title: "Challenges", href: "/admin/challenges", icon: Flag, description: "Create and monitor global, community, and personal challenges." },
  { title: "Moderation", href: "/admin/moderation", icon: ShieldCheck, description: "Review evidence, risk, validation status, and fraud signals." },
  { title: "Reports", href: "/admin/reports", icon: BarChart3, description: "Open platform, brand, user, geo, and export reporting workspaces." },
];

function normalizeList<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
}

function formatNumber(value: number | undefined) {
  return Number(value || 0).toLocaleString();
}

function formatShortDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isActiveReward(reward: Reward) {
  return !reward.archived_at && (reward.active || reward.status === "active");
}

export function AdminOverviewWorkspace() {
  const router = useRouter();
  const [data, setData] = useState<OverviewState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [platform, users, rewards, challenges, unlocks, brands, partners] = await Promise.all([
        apiFetch<PlatformReport>("/admin/reports/platform", { token }),
        apiFetch("/admin/users", { token }),
        apiFetch("/admin/rewards", { token }),
        apiFetch("/admin/challenges", { token }),
        apiFetch("/admin/rewards/unlocks?status=active", { token }),
        apiFetch("/admin/brands", { token }),
        apiFetch("/admin/partners", { token }),
      ]);

      setData({
        platform,
        users: normalizeList<AdminUser>(users, "users"),
        rewards: normalizeList<Reward>(rewards, "rewards"),
        challenges: normalizeList<Challenge>(challenges, "challenges"),
        unlocks: normalizeList<Unlock>(unlocks, "unlocks"),
        brands: normalizeList<Brand>(brands, "brands"),
        partners: normalizeList<Partner>(partners, "partners"),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load admin overview");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const kpis = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const newUsers = data.users.filter((user) => {
      if (!user.created_at) return false;
      const created = new Date(user.created_at).getTime();
      return !Number.isNaN(created) && now - created <= thirtyDaysMs;
    }).length;

    return {
      totalUsers: data.users.length,
      newUsers,
      totalUnits: data.platform?.totals?.totalUnits || 0,
      totalEvents: data.platform?.totals?.totalEvents || 0,
      ecoPoints: data.platform?.totals?.ecoPointsIssued || 0,
      activeRewards: data.rewards.filter(isActiveReward).length,
      activeUnlocks: data.unlocks.length,
      activeChallenges: data.challenges.filter((challenge) => challenge.active).length,
      brands: data.brands.length,
      partners: data.partners.filter((partner) => !partner.deactivated_at).length,
    };
  }, [data]);

  const topCities = [...(data.platform?.geoBreakdown ?? [])]
    .sort((a, b) => Number(b.units || 0) - Number(a.units || 0))
    .slice(0, 5);

  const recentEvents = (data.platform?.events ?? []).slice(0, 8);
  const maxCityUnits = Math.max(...topCities.map((city) => Number(city.units || 0)), 1);

  const kpiCards = [
    { label: "Total Users", value: kpis.totalUsers, icon: Users, accent: "#059669", helper: "Registered accounts" },
    { label: "New Users 30d", value: kpis.newUsers, icon: Users, accent: "#0f766e", helper: "Recent signup volume" },
    { label: "Recycled Units", value: kpis.totalUnits, icon: Activity, accent: "#2563eb", helper: "Validated platform units" },
    { label: "Recycling Events", value: kpis.totalEvents, icon: CheckCircle2, accent: "#7c3aed", helper: "Total event records" },
    { label: "EcoPoints Issued", value: kpis.ecoPoints, icon: Coins, accent: "#d97706", helper: "Reward currency issued" },
    { label: "Active Rewards", value: kpis.activeRewards, icon: Gift, accent: "#db2777", helper: "Live reward offers" },
    { label: "Active Unlocks", value: kpis.activeUnlocks, icon: TicketCheck, accent: "#16a34a", helper: "Open redemptions" },
    { label: "Active Challenges", value: kpis.activeChallenges, icon: Flag, accent: "#ea580c", helper: "Running challenges" },
    { label: "Brands", value: kpis.brands, icon: Store, accent: "#0891b2", helper: "Brand accounts" },
    { label: "Partners", value: kpis.partners, icon: Building2, accent: "#475569", helper: "Active partner locations" },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8f5e6_58%,#e7f3e8_100%)] p-6 shadow-sm md:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Superadmin CRM
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-normal text-slate-950 md:text-5xl">Overview</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Command center for platform health, user support volume, recycling activity, rewards, challenges, and operational shortcuts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/activity" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              Review Activity
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/admin/reports/exports" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
              Export Center
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Platform Volume</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{loading ? "-" : formatNumber(kpis.totalUnits)}</p>
            <p className="mt-1 text-sm text-slate-600">units across {loading ? "-" : formatNumber(kpis.totalEvents)} events</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Network</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{loading ? "-" : formatNumber(kpis.brands + kpis.partners)}</p>
            <p className="mt-1 text-sm text-slate-600">brands and active partners</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reward Motion</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{loading ? "-" : formatNumber(kpis.ecoPoints)}</p>
            <p className="mt-1 text-sm text-slate-600">EcoPoints issued to date</p>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((card) => (
          <Kpi key={card.label} {...card} loading={loading} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recent platform activity</h2>
              <p className="text-sm text-slate-500">Latest recycling events pulled from platform reporting.</p>
            </div>
            <Link href="/admin/activity" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
              Open full activity
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[780px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Units</th>
                  <th className="px-4 py-2.5">City</th>
                  <th className="px-4 py-2.5">Points</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading overview...</td></tr>
                ) : recentEvents.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No recent activity available.</td></tr>
                ) : (
                  recentEvents.map((event, index) => (
                    <tr key={`${event.created_at || "event"}-${index}`} className="border-t border-slate-100 hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium text-slate-900">{formatShortDate(event.created_at)}</div>
                        <div className="text-xs text-slate-500">{formatTime(event.created_at)}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{event.display_name || "Unknown user"}</div>
                        <div className="text-xs text-slate-500">{event.email || "-"}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{event.product_name || "Unknown product"}</div>
                        <div className="text-xs text-slate-500">{event.barcode || "-"}</div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{event.units || 0}</td>
                      <td className="px-4 py-2.5 text-slate-700">{event.city || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-700">{event.points_issued || 0}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={event.scan_status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Top cities</h2>
                <p className="text-sm text-slate-500">By recycled units</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Loading city activity...</p>
              ) : topCities.length === 0 ? (
                <p className="text-sm text-slate-500">No city data available.</p>
              ) : (
                topCities.map((city) => (
                  <div key={city.city || "unknown"} className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-800">{city.city || "Unknown city"}</span>
                      <span className="shrink-0 text-slate-600">{formatNumber(city.units)} units</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(8, (Number(city.units || 0) / maxCityUnits) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Operational modules</h2>
            <div className="mt-4 space-y-3">
              {moduleLinks.map((module) => (
                <Link key={module.href} href={module.href} className="group flex gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-300 hover:bg-emerald-50/50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-emerald-700">
                    <module.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{module.title}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-700" />
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{module.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  const normalized = (status || "-").toLowerCase();
  const positive = ["validated", "approved", "complete", "completed"].includes(normalized);
  const warning = ["pending", "review", "needs_review"].includes(normalized);
  const classes = positive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : warning
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${classes}`}>
      {status || "-"}
    </span>
  );
}

function Kpi({
  label,
  value,
  loading,
  icon: Icon,
  accent,
  helper,
}: {
  label: string;
  value: number;
  loading: boolean;
  icon: LucideIcon;
  accent: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderTopColor: accent, borderTopWidth: 4 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{loading ? "-" : formatNumber(value)}</div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50" style={{ color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{helper}</p>
    </div>
  );
}
