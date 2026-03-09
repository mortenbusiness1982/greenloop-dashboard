"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import InfoTooltip from "../components/InfoTooltip";
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

type CampaignsResponse = {
  ok: true;
  campaigns: {
    challengeId: string;
    participants: number;
    completed: number;
    completionRate: number;
    bonusPointsIssued: number;
    avgUnitsPerParticipant: number;
    incrementalUnitsLift: number;
  }[];
};

type BehaviorResponse = {
  brandShareRedeemers: number;
  brandShareNonRedeemers: number;
  brandLift: number;
  relativeLift: number;
  redeemerCount: number;
  nonRedeemerCount: number;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-4 gap-6">
        {children}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportsResponse | null>(null);
  const [traceData, setTraceData] = useState<TraceabilityResponse | null>(null);
  const [campaignData, setCampaignData] = useState<CampaignsResponse | null>(null);
  const [behaviorData, setBehaviorData] = useState<BehaviorResponse | null>(null);
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
        const [reportsResult, traceResult, campaignsResult, behaviorResult] = await Promise.all([
          apiFetch("/brand/reports/redemptions", { token }),
          apiFetch(
            `/brand/reports/traceability${fromDate || toDate ? `?from=${fromDate}&to=${toDate}` : ""}`,
            { token }
          ),
          apiFetch(
            `/brand/reports/campaigns${fromDate || toDate ? `?from=${fromDate}&to=${toDate}` : ""}`,
            { token }
          ),
          apiFetch(
            `/brand/reports/behavior${fromDate || toDate ? `?from=${fromDate}&to=${toDate}` : ""}`,
            { token }
          ),
        ]);
        setReportData(reportsResult as ReportsResponse);
        setTraceData(traceResult as TraceabilityResponse);
        setCampaignData(campaignsResult as CampaignsResponse);
        setBehaviorData(behaviorResult as BehaviorResponse);
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

  async function onDownloadCsv() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const exportPath = `/brand/reports/export${
      fromDate || toDate ? `?from=${fromDate}&to=${toDate}` : ""
    }`;
    const blob = await apiFetchBlob(exportPath, { token });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "greenloop-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
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
  const primaryCampaign = campaignData?.campaigns?.[0];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
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
          <button
            onClick={onDownloadCsv}
            className="rounded bg-gray-900 px-4 py-2 text-white"
          >
            Download CSV
          </button>
        </div>

        <section className="mb-4 mt-12">
          <Section title="Brand Performance Overview">
          <Card
            label="Verified Brand Units Recycled"
            value={String(traceData?.totalScans ?? 0)}
            info="Total verified brand product scans during the selected period."
          />
          <Card
            label="Incentive Investment (EcoPoints)"
            value={String(traceData?.ecoPointsIssued ?? 0)}
            info="Total EcoPoints issued by this brand as incentives during the selected period."
          />
          <Card
            label="Engaged Consumers"
            value={String(traceData?.uniqueConsumers ?? 0)}
            info="Number of unique users who scanned this brand during the selected period."
          />
          <Card
            label="Avg Units per Consumer"
            value={(traceData?.avgUnitsPerConsumer ?? 0).toFixed(2)}
            info="Average number of brand product scans per engaged user."
          />
          </Section>
        </section>

        <section>
          <Section title="Reward Performance">
          <Card
            label="Total Redemptions"
            value={String(totals?.totalRedemptions ?? 0)}
            info="Number of times this brand’s rewards were redeemed during the selected period."
          />
          <Card
            label="Unclaimed Rewards"
            value={String(totals?.activeTokens ?? 0)}
            info="Issued rewards that are still valid but have not yet been redeemed."
          />
          <Card
            label="Expired Rewards"
            value={String(totals?.expiredTokens ?? 0)}
            info="Issued rewards that expired without being redeemed."
          />
          </Section>
        </section>

        <section className="mt-8">
          <Section title="Campaign Impact">
            <Card
              label="Participants"
              value={String(primaryCampaign?.participants ?? 0)}
              info="Users who accepted the brand challenge."
            />
            <Card
              label="Completed"
              value={String(primaryCampaign?.completed ?? 0)}
              info="Users who completed the challenge requirements."
            />
            <Card
              label="Completion Rate"
              value={`${(((primaryCampaign?.completionRate ?? 0) * 100).toFixed(1))}%`}
              info="Percentage of participants who completed the challenge."
            />
            <Card
              label="Bonus Points Issued"
              value={String(primaryCampaign?.bonusPointsIssued ?? 0)}
              info="Total EcoPoints awarded as challenge incentives."
            />
            <Card
              label="Avg Units per Participant"
              value={(primaryCampaign?.avgUnitsPerParticipant ?? 0).toFixed(2)}
              info="Average number of brand scans among challenge participants."
            />
            <Card
              label="Incremental Units Lift"
              value={String(Math.round(primaryCampaign?.incrementalUnitsLift ?? 0))}
              info="Did this campaign actually increase brand scanning? Estimated additional brand units generated by challenge participants compared to baseline."
            />
          </Section>
        </section>

        <section className="mt-8">
          <Section title="Behavior Influence">
            <Card
              label="Brand Share (Redeemers)"
              value={`${(((behaviorData?.brandShareRedeemers ?? 0) * 100).toFixed(1))}%`}
              info="Percentage of total scans by reward redeemers that were this brand."
            />
            <Card
              label="Brand Share (Non-Redeemers)"
              value={`${(((behaviorData?.brandShareNonRedeemers ?? 0) * 100).toFixed(1))}%`}
              info="Baseline percentage of total scans by non-redeemers that were this brand."
            />
            <Card
              label="Absolute Lift"
              value={`${(((behaviorData?.brandLift ?? 0) * 100).toFixed(1))}%`}
              info="Difference in brand scan share between redeemers and baseline users."
            />
            <Card
              label="Relative Lift"
              value={`${(((behaviorData?.relativeLift ?? 0) * 100).toFixed(1))}%`}
              info="Percentage increase or decrease in brand scan share among redeemers compared to baseline."
            />
            <Card
              label="Redeemer Count"
              value={String(behaviorData?.redeemerCount ?? 0)}
              info="Number of users who redeemed this brand’s reward during the selected period."
            />
            <Card
              label="Non-Redeemer Count"
              value={String(behaviorData?.nonRedeemerCount ?? 0)}
              info="Number of users who scanned but did not redeem this brand’s reward during the selected period."
            />
          </Section>
        </section>

        <section className="mt-8">
          <h2 className="mt-12 text-2xl font-bold text-gray-900 tracking-tight text-center">
            Activity & Distribution
            <InfoTooltip text="Where is activity happening? This section shows time trends, product mix, and geographic distribution." />
          </h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
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

function Card({
  label,
  value,
  info,
}: {
  label: string;
  value: string;
  info?: string;
}) {
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="absolute top-0 left-0 h-[3px] w-full rounded-t-xl bg-[#2d6a4f]"></div>
      <div className="flex items-center text-sm font-medium text-gray-500">
        {label}
        {info && (
          <InfoTooltip text={info} />
        )}
      </div>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
