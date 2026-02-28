"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

type ReportsResponse = {
  totals: {
    totalRedemptions: number;
    activeTokens: number;
    expiredTokens: number;
    redemptionRate: number;
  };
  redemptionsByReward: unknown[];
  redemptionsByPartner: unknown[];
};

type TraceabilityResponse = {
  totalScans: number;
  validatedScans: number;
  ecoPointsIssued: number;
  redemptions: number;
  redemptionRate: number;
  uniqueConsumers?: number;
  avgUnitsPerConsumer?: number;
  perProduct?: {
    product_id: string;
    product_name: string;
    units_recycled: number;
  }[];
  dailyTrend?: {
    date: string;
    units: number;
  }[];
  geoBreakdown?: {
    city: string;
    units: number;
    consumers: number;
  }[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportsResponse | null>(null);
  const [traceData, setTraceData] = useState<TraceabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const [reportsResult, traceResult] = await Promise.all([
          apiFetch("/brand/reports/redemptions", { token }),
          apiFetch(
            `/brand/reports/traceability${fromDate || toDate ? `?from=${fromDate}&to=${toDate}` : ""}`,
            { token }
          ),
        ]);
        setReportData(reportsResult as ReportsResponse);
        setTraceData(traceResult as TraceabilityResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, fromDate, toDate]);

  function onLogout() {
    clearToken();
    router.replace("/login");
  }

  if (loading) {
    return <main className="min-h-screen p-6">Loading analytics...</main>;
  }

  if (error) {
    return (
      <main className="min-h-screen p-6">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        <button onClick={onLogout} className="mt-4 rounded bg-gray-900 px-4 py-2 text-white">
          Logout
        </button>
      </main>
    );
  }

  const totals = reportData?.totals;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Brand Dashboard</h1>
          <button onClick={onLogout} className="rounded bg-gray-900 px-4 py-2 text-white">
            Logout
          </button>
        </div>
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700 font-medium">
            Coca-Cola Málaga Pilot — February 2026
          </p>
        </div>
        <div className="mt-4 flex gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <button
            className="rounded bg-gray-900 px-4 py-2 text-white"
          >
            Apply
          </button>
        </div>

        <section className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Coca-Cola Verified Units Recycled" value={String(traceData?.totalScans ?? 0)} />
          <Card label="Verified Recycling Events" value={String(traceData?.validatedScans ?? 0)} />
          <Card label="Brand-Funded Loyalty Points Issued" value={String(traceData?.ecoPointsIssued ?? 0)} />
          <Card
            label="Engaged Consumers"
            value={String(traceData?.uniqueConsumers ?? 0)}
          />
          <Card
            label="Avg Units per Engaged Consumer"
            value={(traceData?.avgUnitsPerConsumer ?? 0).toFixed(2)}
          />
          <Card
            label="Points Redemption Rate"
            value={`${(((traceData?.redemptionRate ?? 0) * 100).toFixed(2))}%`}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Total Redemptions" value={String(totals?.totalRedemptions ?? 0)} />
          <Card label="Active Tokens" value={String(totals?.activeTokens ?? 0)} />
          <Card label="Expired Tokens" value={String(totals?.expiredTokens ?? 0)} />
          <Card
            label="Redemption Rate"
            value={`${(((totals?.redemptionRate ?? 0) * 100).toFixed(2))}%`}
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-4 shadow">
            <h2 className="text-lg font-medium text-gray-900">Daily Recycling Trend</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={traceData?.dailyTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short"
                      })
                    }
                  />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="units" stroke="#16a34a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow">
            <h2 className="text-lg font-medium text-gray-900">Recycling by Product</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={traceData?.perProduct ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product_name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="units_recycled" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="rounded-lg bg-white p-4 shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Recycling Activity by City
            </h2>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-sm text-gray-600">City</th>
                  <th className="py-2 text-sm text-gray-600">Units Recycled</th>
                  <th className="py-2 text-sm text-gray-600">Engaged Consumers</th>
                </tr>
              </thead>
              <tbody>
                {(traceData?.geoBreakdown ?? []).length === 0 ? (
                  <tr className="border-b">
                    <td colSpan={3} className="py-3 text-gray-500 text-center">
                      No recycling activity recorded for selected date range.
                    </td>
                  </tr>
                ) : (
                  (traceData?.geoBreakdown ?? []).map((row, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 font-medium text-gray-900">{row.city}</td>
                      <td className="py-2 text-gray-900">{row.units}</td>
                      <td className="py-2 text-gray-900">{row.consumers}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-4 shadow">
            <h2 className="text-lg font-medium text-gray-900">Redemptions By Reward</h2>
            <table className="w-full text-left border-collapse mt-3">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-sm text-gray-600">Reward</th>
                  <th className="py-2 text-sm text-gray-600">Redemptions</th>
                </tr>
              </thead>
              <tbody>
                {(reportData?.redemptionsByReward ?? []).map((row: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 text-gray-900">{row.reward_name || row.name || "—"}</td>
                    <td className="py-2 text-gray-900">{row.count || row.redemptions || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-white p-4 shadow">
            <h2 className="text-lg font-medium text-gray-900">Redemptions By Partner</h2>
            <table className="w-full text-left border-collapse mt-3">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-sm text-gray-600">Partner</th>
                  <th className="py-2 text-sm text-gray-600">Redemptions</th>
                </tr>
              </thead>
              <tbody>
                {(reportData?.redemptionsByPartner ?? []).map((row: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 text-gray-900">{row.partner_name || row.name || row.partner || "—"}</td>
                    <td className="py-2 text-gray-900">{row.count || row.redemptions || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
