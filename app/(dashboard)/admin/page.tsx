"use client";

import {
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import InfoTooltip from "@/components/InfoTooltip";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AdminRecyclingHeatmap = dynamic(
  () => import("@/components/AdminRecyclingHeatmap"),
  { ssr: false }
);

type Reward = {
  id: string | number;
  title: string;
  description?: string | null;
  cost_points: number;
  partner_name: string;
  brand_id: string | number | null;
  active: boolean;
  fulfillment_type?: 'qr_token' | 'promo_code';
  code_mode?: 'shared' | 'pooled' | null;
  shared_code?: string | null;
  instructions?: string | null;
  expires_in_hours?: number | null;
  acquisition_mode?: 'redeem' | 'challenge_completion';
  visible_in_wallet_catalog?: boolean;
  inventory_total?: number;
  inventory_available?: number;
  inventory_assigned?: number;
  inventory_consumed?: number;
  inventory_revoked?: number;
};

type Challenge = {
  id: string | number;
  brand_key: string;
  target_kind?: "brand" | "material" | "format" | null;
  target_brand_key?: string | null;
  target_material_type?: string | null;
  target_format_type?: string | null;
  targetKind?: "brand" | "material" | "format";
  targetBrandKey?: string;
  targetMaterialType?: string;
  targetFormatType?: string;
  title: string;
  description?: string | null;
  required_count: number;
  bonus_points: number;
  completion_reward_id?: string | null;
  completion_reward_title?: string | null;
  completionRewardId?: string | null;
  completionRewardTitle?: string | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
};

type RewardFormState = {
  title: string;
  description: string;
  cost_points: string;
  partner_name: string;
  brand_id: string;
  fulfillment_type: 'qr_token' | 'promo_code';
  code_mode: 'shared' | 'pooled' | '';
  shared_code: string;
  instructions: string;
  expires_in_hours: string;
  pooled_codes: string;
  acquisition_mode: 'redeem' | 'challenge_completion';
};

type ChallengeFormState = {
  brand_key: string;
  targetKind: "brand" | "material" | "format";
  targetBrandKey: string;
  targetMaterialType: string;
  targetFormatType: string;
  title: string;
  description: string;
  required_count: string;
  bonus_points: string;
  completionRewardId: string;
  starts_at: string;
  ends_at: string;
};

type PlatformReportEvent = {
  id?: string | number;
  event_id?: string | number;
  user_id?: string | number;
  bin_id?: string | number;
  created_at?: string;
  product_name?: string;
  name?: string;
  barcode?: string;
  ean?: string;
  units?: number;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  scan_status?: string;
  status?: string;
};

type PlatformReportResponse = {
  totals?: {
    totalUnits?: number;
    totalEvents?: number;
    uniqueConsumers?: number;
    ecoPointsIssued?: number;
  };
  dailyTrend?: { date: string; units?: number }[];
  perProduct?: { product_name?: string; units_recycled?: number }[];
  geoBreakdown?: { city?: string; units?: number; consumers?: number }[];
  events?: PlatformReportEvent[];
};

const emptyRewardForm: RewardFormState = {
  title: "",
  description: "",
  cost_points: "",
  partner_name: "",
  brand_id: "",
  fulfillment_type: 'qr_token',
  code_mode: '',
  shared_code: '',
  instructions: '',
  expires_in_hours: '24',
  pooled_codes: '',
  acquisition_mode: 'redeem',
};

const emptyChallengeForm: ChallengeFormState = {
  brand_key: "",
  targetKind: "brand",
  targetBrandKey: "",
  targetMaterialType: "",
  targetFormatType: "",
  title: "",
  description: "",
  required_count: "",
  bonus_points: "",
  completionRewardId: "",
  starts_at: "",
  ends_at: "",
};

function normalizeList<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    for (const key of keys) {
      const nested = (value as Record<string, unknown>)[key];
      if (Array.isArray(nested)) return nested as T[];
    }
  }
  return [];
}

function normalizeChallenge(raw: Challenge): Challenge {
  return {
    ...raw,
    targetKind: raw.targetKind ?? raw.target_kind ?? undefined,
    targetBrandKey: raw.targetBrandKey ?? raw.target_brand_key ?? undefined,
    targetMaterialType: raw.targetMaterialType ?? raw.target_material_type ?? undefined,
    targetFormatType: raw.targetFormatType ?? raw.target_format_type ?? undefined,
    completionRewardId: raw.completionRewardId ?? raw.completion_reward_id ?? undefined,
    completionRewardTitle: raw.completionRewardTitle ?? raw.completion_reward_title ?? undefined,
  };
}

function normalizeReward(raw: Reward): Reward {
  return {
    ...raw,
    fulfillment_type: raw.fulfillment_type ?? 'qr_token',
    code_mode: raw.code_mode ?? null,
    shared_code: raw.shared_code ?? null,
    instructions: raw.instructions ?? null,
    expires_in_hours: raw.expires_in_hours ?? 24,
    acquisition_mode: raw.acquisition_mode ?? 'redeem',
    visible_in_wallet_catalog: raw.visible_in_wallet_catalog ?? true,
  };
}

function toDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function AnalyticsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">{title}</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}

function AnalyticsCard({
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
      <div className="absolute left-0 top-0 h-[3px] w-full rounded-t-xl bg-[#2d6a4f]" />
      <div className="flex items-center text-sm font-medium text-gray-500">
        {label}
        {info ? <InfoTooltip text={info} /> : null}
      </div>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function InputField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
      />
    </label>
  );
}

function TextareaField({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <textarea
        {...props}
        className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
      />
    </label>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"reward" | "challenge" | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardForm, setRewardForm] = useState<RewardFormState>(emptyRewardForm);
  const [editingRewardId, setEditingRewardId] = useState<string | number | null>(null);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeForm, setChallengeForm] = useState<ChallengeFormState>(emptyChallengeForm);
  const [editingChallengeId, setEditingChallengeId] = useState<string | number | null>(null);
  const [platformReport, setPlatformReport] = useState<PlatformReportResponse | null>(null);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setError(null);
      const [rewardsResult, challengesResult, platformResult] = await Promise.all([
        apiFetch("/admin/rewards", { token }),
        apiFetch("/admin/challenges", { token }),
        apiFetch("/admin/reports/platform", { token }),
      ]);

      console.log("RAW REWARDS RESPONSE", rewardsResult);
      console.log("RAW CHALLENGES RESPONSE", challengesResult);
      console.log("RAW PLATFORM RESPONSE", platformResult);

      const normalizedRewards = normalizeList<Reward>(rewardsResult, ["rewards", "data"]).map(normalizeReward);
      const normalizedChallenges = normalizeList<Challenge>(challengesResult, ["challenges", "data"]).map(normalizeChallenge);

      console.log("NORMALIZED REWARDS", normalizedRewards);
      console.log("NORMALIZED CHALLENGES", normalizedChallenges);

      setRewards(normalizedRewards);
      setChallenges(normalizedChallenges);
      console.log(
        "ADMIN platformReport.events sample",
        ((platformResult ?? null) as PlatformReportResponse | null)?.events?.slice(0, 5)
      );
      setPlatformReport((platformResult ?? null) as PlatformReportResponse | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    console.log("UPDATED REWARDS", rewards);
  }, [rewards]);

  useEffect(() => {
    console.log("UPDATED CHALLENGES", challenges);
  }, [challenges]);

  function onLogout() {
    clearToken();
    router.replace("/login");
  }

  function resetRewardForm() {
    setRewardForm(emptyRewardForm);
    setEditingRewardId(null);
  }

  function resetChallengeForm() {
    setChallengeForm(emptyChallengeForm);
    setEditingChallengeId(null);
  }

  async function handleRewardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setSubmitting("reward");
      setError(null);
      const payload = {
        title: rewardForm.title,
        description: rewardForm.description,
        cost_points: rewardForm.acquisition_mode === 'challenge_completion' ? 0 : Number(rewardForm.cost_points),
        partner_name: rewardForm.partner_name,
        brand_id:
          rewardForm.brand_id && rewardForm.brand_id.length > 10 ? rewardForm.brand_id : null,
        fulfillment_type: rewardForm.fulfillment_type,
        code_mode: rewardForm.fulfillment_type === 'promo_code' ? rewardForm.code_mode || null : null,
        shared_code:
          rewardForm.fulfillment_type === 'promo_code' && rewardForm.code_mode === 'shared'
            ? rewardForm.shared_code || null
            : null,
        instructions: rewardForm.instructions || null,
        expires_in_hours: rewardForm.expires_in_hours ? Number(rewardForm.expires_in_hours) : 24,
        acquisition_mode: rewardForm.acquisition_mode,
        visible_in_wallet_catalog: rewardForm.acquisition_mode === 'redeem',
      };

      const savedReward = await apiFetch(
        editingRewardId ? `/admin/rewards/${editingRewardId}` : "/admin/rewards",
        {
          token,
          method: editingRewardId ? "PATCH" : "POST",
          body: payload,
        }
      );

      const rewardIdForCodes = editingRewardId ?? savedReward?.id;
      const pooledCodes = rewardForm.pooled_codes
        .split(/\r?\n/)
        .map((code) => code.trim())
        .filter(Boolean);

      if (
        rewardForm.fulfillment_type === 'promo_code' &&
        rewardForm.code_mode === 'pooled' &&
        rewardIdForCodes &&
        pooledCodes.length > 0
      ) {
        await apiFetch(`/admin/rewards/${rewardIdForCodes}/promo-codes`, {
          token,
          method: 'POST',
          body: { codes: pooledCodes },
        });
      }

      resetRewardForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save reward");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleChallengeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setSubmitting("challenge");
      setError(null);
      const payload = {
        ...(challengeForm.targetKind === "brand"
          ? {
              brand_key: challengeForm.targetBrandKey || challengeForm.brand_key || undefined,
              targetBrandKey: challengeForm.targetBrandKey || challengeForm.brand_key || undefined,
            }
          : {}),
        ...(challengeForm.targetKind === "material"
          ? { targetMaterialType: challengeForm.targetMaterialType || undefined }
          : {}),
        ...(challengeForm.targetKind === "format"
          ? { targetFormatType: challengeForm.targetFormatType || undefined }
          : {}),
        targetKind: challengeForm.targetKind,
        title: challengeForm.title,
        description: challengeForm.description,
        required_count: Number(challengeForm.required_count),
        bonus_points: Number(challengeForm.bonus_points),
        completionRewardId: challengeForm.completionRewardId || null,
        starts_at: challengeForm.starts_at ? new Date(challengeForm.starts_at).toISOString() : null,
        ends_at: challengeForm.ends_at ? new Date(challengeForm.ends_at).toISOString() : null,
      };

      await apiFetch(
        editingChallengeId ? `/admin/challenges/${editingChallengeId}` : "/admin/challenges",
        {
          token,
          method: editingChallengeId ? "PATCH" : "POST",
          body: payload,
        }
      );

      resetChallengeForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save challenge");
    } finally {
      setSubmitting(null);
    }
  }

  async function toggleReward(id: string | number) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setActiveAction(`reward-toggle-${id}`);
      setError(null);
      await apiFetch(`/admin/rewards/${id}/toggle`, { token, method: "PATCH" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to toggle reward");
    } finally {
      setActiveAction(null);
    }
  }

  async function handleDeleteReward(id: string | number) {
    if (!id) {
      console.error("Invalid delete ID", id);
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!confirm("Delete this reward?")) return;

    try {
      console.log("DELETE CLICKED", id);
      setActiveAction(`reward-delete-${id}`);
      setError(null);
      const res = await apiFetch(`/admin/rewards/${id}`, {
        token,
        method: "DELETE",
      });

      console.log("DELETE RESPONSE", res);

      if (!res || res.error) {
        console.error("DELETE FAILED", res);
        throw new Error(res?.error || "Delete failed");
      }

      console.log("RELOADING DATA");
      const updated = await apiFetch("/admin/rewards", { token });
      const normalizedRewards = (normalizeList(updated, ["rewards", "data"]) as Reward[]).map(normalizeReward);
      setRewards(normalizedRewards);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete reward");
    } finally {
      setActiveAction(null);
    }
  }

  async function toggleChallenge(id: string | number) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setActiveAction(`challenge-toggle-${id}`);
      setError(null);
      await apiFetch(`/admin/challenges/${id}/toggle`, { token, method: "PATCH" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to toggle challenge");
    } finally {
      setActiveAction(null);
    }
  }

  async function handleDeleteChallenge(id: string | number) {
    if (!id) {
      console.error("Invalid delete ID", id);
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!confirm("Delete this challenge?")) return;

    try {
      console.log("DELETE CLICKED", id);
      setActiveAction(`challenge-delete-${id}`);
      setError(null);
      const res = await apiFetch(`/admin/challenges/${id}`, {
        token,
        method: "DELETE",
      });

      console.log("DELETE RESPONSE", res);

      if (!res || res.error) {
        console.error("DELETE FAILED", res);
        throw new Error(res?.error || "Delete failed");
      }

      console.log("RELOADING DATA");
      const updated = await apiFetch("/admin/challenges", { token });
      const normalizedChallenges = (normalizeList(updated, ["challenges", "data"]) as Challenge[]).map(normalizeChallenge);
      setChallenges(normalizedChallenges);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete challenge");
    } finally {
      setActiveAction(null);
    }
  }

  function startRewardEdit(reward: Reward) {
    setEditingRewardId(reward.id);
    setRewardForm({
      title: reward.title ?? "",
      description: reward.description ?? "",
      cost_points: String(reward.cost_points ?? ""),
      partner_name: reward.partner_name ?? "",
      brand_id: reward.brand_id == null ? "" : String(reward.brand_id),
      fulfillment_type: reward.fulfillment_type ?? 'qr_token',
      code_mode: reward.code_mode ?? '',
      shared_code: reward.shared_code ?? '',
      instructions: reward.instructions ?? '',
      expires_in_hours: reward.expires_in_hours == null ? '24' : String(reward.expires_in_hours),
      pooled_codes: '',
      acquisition_mode: reward.acquisition_mode ?? 'redeem',
    });
  }

  function startChallengeEdit(challenge: Challenge) {
    setEditingChallengeId(challenge.id);
    setChallengeForm({
      brand_key: challenge.brand_key ?? "",
      targetKind: challenge.targetKind || "brand",
      targetBrandKey: challenge.targetBrandKey || challenge.brand_key || "",
      targetMaterialType: challenge.targetMaterialType || "",
      targetFormatType: challenge.targetFormatType || "",
      title: challenge.title ?? "",
      description: challenge.description ?? "",
      required_count: String(challenge.required_count ?? ""),
      bonus_points: String(challenge.bonus_points ?? ""),
      completionRewardId: challenge.completionRewardId ?? "",
      starts_at: toDateTimeInput(challenge.starts_at),
      ends_at: toDateTimeInput(challenge.ends_at),
    });
  }

  const totalRecycledUnits = platformReport?.totals?.totalUnits ?? 0;
  const totalRecyclingEvents = platformReport?.totals?.totalEvents ?? 0;
  const uniqueRecyclers = platformReport?.totals?.uniqueConsumers ?? 0;
  const ecoPointsIssued = platformReport?.totals?.ecoPointsIssued ?? 0;

  const topRecycledProducts = platformReport?.perProduct ?? [];
  const topRecyclingCities = platformReport?.geoBreakdown ?? [];
  const dailyTrend = (platformReport?.dailyTrend ?? []).map((item) => {
    const date = new Date(item.date);

    return {
      dateRaw: item.date,
      dateLabel: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      units: Number(item.units ?? 0),
    };
  });
  const platformEvents = platformReport?.events ?? [];
  const totals = platformReport?.totals;
  const topProducts = platformReport?.perProduct?.slice(0, 5) ?? [];

  async function handleExportSummaryCSV() {
    try {
      const totals = platformReport?.totals;
      const perProduct = platformReport?.perProduct ?? [];
      const geoBreakdown = platformReport?.geoBreakdown ?? [];
      const trend = platformReport?.dailyTrend ?? [];
      const rows = [
        ["GreenLoop Platform Recycling Report"],
        [],
        ["Metric", "Value"],
        ["Total Recycled Units", totals?.totalUnits ?? 0],
        ["Total Recycling Events", totals?.totalEvents ?? 0],
        ["Unique Recyclers", totals?.uniqueConsumers ?? 0],
        ["EcoPoints Issued", totals?.ecoPointsIssued ?? 0],
        [],
        ["Top Recycling Cities"],
        ["City", "Units Recycled", "Unique Recyclers"],
        ...geoBreakdown.map((city) => [city.city, city.units, city.consumers]),
        [],
        ["Top Recycling Products"],
        ["Product", "Units Recycled"],
        ...perProduct.map((product) => [product.product_name, product.units_recycled]),
        [],
        ["Daily Recycling Trend"],
        ["Date", "Units"],
        ...trend.map((day) => [new Date(day.date).toISOString().split("T")[0], day.units]),
      ];

      const csv = rows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `greenloop-platform-summary-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export summary CSV failed", err);
    }
  }

  async function handleExportEventsCSV() {
    try {
      function csvCell(value: unknown) {
        const s = String(value ?? "");
        return `"${s.replace(/"/g, '""')}"`;
      }

      const headers = [
        "created_at",
        "product_name",
        "barcode",
        "units",
        "city",
        "lat",
        "lng",
        "scan_status",
        "user_id",
        "bin_id",
        "event_id",
      ];
      const rows = platformEvents.map((event) => ({
        created_at: event.created_at ?? "",
        product_name: event.product_name ?? "",
        barcode: event.barcode ?? "",
        units: event.units ?? 0,
        city: event.city ?? "",
        lat: event.lat ?? "",
        lng: event.lng ?? "",
        scan_status: event.scan_status ?? "",
        user_id: event.user_id ?? "",
        bin_id: event.bin_id ?? "",
        event_id: event.event_id ?? "",
      }));

      const csv = [
        headers.map(csvCell).join(","),
        ...rows.map((row) => headers.map((key) => csvCell(row[key as keyof typeof row])).join(",")),
      ].join("\n");
      console.log("ADMIN raw CSV first 3 rows", rows.slice(0, 3));
      console.log("ADMIN raw CSV string preview", csv.split("\n").slice(0, 4));
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `greenloop-platform-events-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export events CSV failed", err);
    }
  }

  if (loading) {
    return <main className="min-h-screen p-6 text-gray-700">Loading admin dashboard...</main>;
  }

  console.log("RENDER REWARDS LENGTH", rewards.length);
  console.log("RENDER CHALLENGES LENGTH", challenges.length);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Manage rewards and challenges.</p>
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/moderation"
                  className="inline-flex rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Open Moderation Queue
                </Link>
                <Link
                  href="/admin/users"
                  className="inline-flex rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Open Users
                </Link>
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="rounded bg-gray-900 px-4 py-2 text-white">
            Logout
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        <div className="space-y-12">
          <SectionCard
            title="Rewards Manager"
            description="Create, update, and activate reward offers available in the network."
          >
            <div className="grid grid-cols-[4fr_1fr] gap-8">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-[900px] w-full border-collapse text-left">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Title</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Partner</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Cost</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Access</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Fulfillment</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Code Mode</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Inventory</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">In Redeem</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Brand ID</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Active</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-6 text-center text-sm text-gray-500">
                          No rewards found.
                        </td>
                      </tr>
                    ) : (
                      rewards.map((reward) => (
                        <tr key={reward.id} className="border-b border-gray-100 align-top">
                          <td className="px-4 py-3 text-sm text-gray-900">{reward.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{reward.partner_name || "—"}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{reward.cost_points}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{reward.acquisition_mode === 'challenge_completion' ? 'Challenge completion only' : 'Redeem with EcoPoints'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {reward.fulfillment_type === 'promo_code' ? 'Promo Code' : 'QR Token'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {reward.fulfillment_type === 'promo_code' ? reward.code_mode || '—' : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {reward.fulfillment_type !== 'promo_code'
                              ? 'Unlimited'
                              : reward.code_mode === 'shared'
                                ? 'Shared'
                                : reward.inventory_total
                                  ? reward.inventory_available && reward.inventory_available > 0
                                    ? `${reward.inventory_available}/${reward.inventory_total} available`
                                    : `Depleted (${reward.inventory_total})`
                                  : 'No codes uploaded'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {reward.visible_in_wallet_catalog ? 'Yes' : 'Hidden'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {reward.brand_id == null ? "—" : reward.brand_id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                reward.active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {reward.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => startRewardEdit(reward)}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 transition hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => toggleReward(reward.id)}
                                disabled={activeAction === `reward-toggle-${reward.id}`}
                                className="rounded-md bg-[#2d6a4f] px-3 py-1.5 text-white transition hover:bg-[#24543f] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Toggle active
                              </button>
                              <button
                                onClick={() => handleDeleteReward(reward.id)}
                                disabled={activeAction === `reward-delete-${reward.id}`}
                                className="ml-2 rounded bg-red-600 px-3 py-1 text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <form onSubmit={handleRewardSubmit} className="max-w-md rounded-lg border border-gray-200 bg-gray-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingRewardId ? "Edit Reward" : "Create Reward"}
                  </h3>
                  {editingRewardId ? (
                    <button
                      type="button"
                      onClick={resetRewardForm}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
                <div className="space-y-4">
                  <InputField
                    label="Title"
                    value={rewardForm.title}
                    onChange={(e) => setRewardForm((current) => ({ ...current, title: e.target.value }))}
                    required
                  />
                  <TextareaField
                    label="Description"
                    value={rewardForm.description}
                    onChange={(e) =>
                      setRewardForm((current) => ({ ...current, description: e.target.value }))
                    }
                    required
                  />
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">How users get this reward</span>
                    <select
                      value={rewardForm.acquisition_mode}
                      onChange={(e) =>
                        setRewardForm((current) => ({
                          ...current,
                          acquisition_mode: e.target.value as 'redeem' | 'challenge_completion',
                          cost_points: e.target.value === 'challenge_completion' ? '0' : current.cost_points || '',
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
                    >
                      <option value="redeem">Redeem with EcoPoints</option>
                      <option value="challenge_completion">Challenge completion only</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">Challenge-only rewards stay hidden from the Redeem screen and are only issued when a linked challenge is completed.</p>
                  </label>
                  <InputField
                    label={rewardForm.acquisition_mode === 'challenge_completion' ? 'EcoPoints Cost (not used for challenge-only rewards)' : 'EcoPoints Cost'}
                    type="number"
                    min="0"
                    value={rewardForm.cost_points}
                    onChange={(e) =>
                      setRewardForm((current) => ({ ...current, cost_points: e.target.value }))
                    }
                    required={rewardForm.acquisition_mode === 'redeem'}
                    disabled={rewardForm.acquisition_mode === 'challenge_completion'}
                  />
                  <InputField
                    label="Partner Name"
                    value={rewardForm.partner_name}
                    onChange={(e) =>
                      setRewardForm((current) => ({ ...current, partner_name: e.target.value }))
                    }
                    required
                  />
                  <InputField
                    label="Brand ID"
                    value={rewardForm.brand_id}
                    onChange={(e) => setRewardForm((current) => ({ ...current, brand_id: e.target.value }))}
                  />
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Fulfillment Type</span>
                    <select
                      value={rewardForm.fulfillment_type}
                      onChange={(e) =>
                        setRewardForm((current) => ({
                          ...current,
                          fulfillment_type: e.target.value as 'qr_token' | 'promo_code',
                          code_mode: e.target.value === 'promo_code' ? current.code_mode || 'shared' : '',
                          shared_code: e.target.value === 'promo_code' ? current.shared_code : '',
                          pooled_codes: e.target.value === 'promo_code' ? current.pooled_codes : '',
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
                    >
                      <option value="qr_token">QR Token</option>
                      <option value="promo_code">Promo Code</option>
                    </select>
                  </label>
                  {rewardForm.fulfillment_type === 'promo_code' ? (
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700">Code Mode</span>
                      <select
                        value={rewardForm.code_mode}
                        onChange={(e) =>
                          setRewardForm((current) => ({
                            ...current,
                            code_mode: e.target.value as 'shared' | 'pooled' | '',
                            shared_code: e.target.value === 'shared' ? current.shared_code : '',
                            pooled_codes: e.target.value === 'pooled' ? current.pooled_codes : '',
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
                      >
                        <option value="">Select mode</option>
                        <option value="shared">Shared Code</option>
                        <option value="pooled">Finite Code Pool</option>
                      </select>
                    </label>
                  ) : null}
                  {rewardForm.fulfillment_type === 'promo_code' && rewardForm.code_mode === 'shared' ? (
                    <InputField
                      label="Shared Code"
                      value={rewardForm.shared_code}
                      onChange={(e) => setRewardForm((current) => ({ ...current, shared_code: e.target.value }))}
                      required
                    />
                  ) : null}
                  {rewardForm.fulfillment_type === 'promo_code' && rewardForm.code_mode === 'pooled' ? (
                    <TextareaField
                      label={editingRewardId ? 'Add Promo Codes (one per line)' : 'Promo Codes (one per line)'}
                      value={rewardForm.pooled_codes}
                      onChange={(e) => setRewardForm((current) => ({ ...current, pooled_codes: e.target.value }))}
                      required={!editingRewardId}
                    />
                  ) : null}
                  <TextareaField
                    label="Instructions"
                    value={rewardForm.instructions}
                    onChange={(e) => setRewardForm((current) => ({ ...current, instructions: e.target.value }))}
                  />
                  <InputField
                    label="Expires In Hours"
                    type="number"
                    min="1"
                    value={rewardForm.expires_in_hours}
                    onChange={(e) => setRewardForm((current) => ({ ...current, expires_in_hours: e.target.value }))}
                    required={rewardForm.fulfillment_type === 'qr_token'}
                  />
                  <button
                    type="submit"
                    disabled={submitting === "reward"}
                    className="w-full rounded-md bg-[#2d6a4f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24543f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting === "reward"
                      ? "Saving..."
                      : editingRewardId
                        ? "Update Reward"
                        : "Create Reward"}
                  </button>
                </div>
              </form>
            </div>
          </SectionCard>

          <SectionCard
            title="Challenge Manager"
            description="Create lifecycle-based challenges and control whether they are live."
          >
            <div className="grid grid-cols-[4fr_1fr] gap-8">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-[900px] w-full border-collapse text-left">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Title</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Target Type</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Target Value</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Required</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Bonus</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Completion Reward</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Starts</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Ends</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Active</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challenges.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-6 text-center text-sm text-gray-500">
                          No challenges found.
                        </td>
                      </tr>
                    ) : (
                      challenges.map((challenge) => (
                        <tr key={challenge.id} className="border-b border-gray-100 align-top">
                          <td className="px-4 py-3 text-sm text-gray-900">{challenge.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 flex items-center gap-2">
                            {challenge.targetKind === "material" ? (
                              <>
                                <span>♻️</span>
                                <span>Material</span>
                              </>
                            ) : challenge.targetKind === "format" ? (
                              <>
                                <span>📦</span>
                                <span>Format</span>
                              </>
                            ) : (
                              <>
                                <span>🏢</span>
                                <span>Brand</span>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {(
                              challenge.targetKind === "material"
                                ? challenge.targetMaterialType || "—"
                                : challenge.targetKind === "format"
                                  ? challenge.targetFormatType || "—"
                                  : challenge.targetBrandKey || challenge.brand_key || "—"
                            ).replace(/(^\p{L}|\s\p{L})/gu, (char) => char.toUpperCase())}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{challenge.required_count}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{challenge.bonus_points}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{challenge.completionRewardTitle || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDateTime(challenge.starts_at)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDateTime(challenge.ends_at)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                challenge.active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {challenge.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => startChallengeEdit(challenge)}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 transition hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => toggleChallenge(challenge.id)}
                                disabled={activeAction === `challenge-toggle-${challenge.id}`}
                                className="rounded-md bg-[#2d6a4f] px-3 py-1.5 text-white transition hover:bg-[#24543f] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Toggle active
                              </button>
                              <button
                                onClick={() => handleDeleteChallenge(challenge.id)}
                                disabled={activeAction === `challenge-delete-${challenge.id}`}
                                className="ml-2 rounded bg-red-600 px-3 py-1 text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <form
                onSubmit={handleChallengeSubmit}
                className="max-w-md rounded-lg border border-gray-200 bg-gray-50 p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingChallengeId ? "Edit Challenge" : "Create Challenge"}
                  </h3>
                  {editingChallengeId ? (
                    <button
                      type="button"
                      onClick={resetChallengeForm}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
                <div className="space-y-4">
                  {challengeForm.targetKind === "brand" ? (
                    <InputField
                      label="Brand Key"
                      value={challengeForm.brand_key}
                      onChange={(e) =>
                        setChallengeForm((current) => ({ ...current, brand_key: e.target.value }))
                      }
                      required={challengeForm.targetKind === "brand"}
                    />
                  ) : null}
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Target Type</span>
                    <select
                      value={challengeForm.targetKind}
                      onChange={(e) =>
                        setChallengeForm((current) => ({
                          ...current,
                          targetKind: e.target.value as "brand" | "material" | "format",
                          brand_key: e.target.value === "brand" ? current.brand_key : "",
                          targetMaterialType:
                            e.target.value === "material" ? current.targetMaterialType : "",
                          targetFormatType:
                            e.target.value === "format" ? current.targetFormatType : "",
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
                    >
                      <option value="brand">brand</option>
                      <option value="material">material</option>
                      <option value="format">format</option>
                    </select>
                  </label>
                  {challengeForm.targetKind === "brand" ? (
                    <InputField
                      label="Target Brand Key"
                      value={challengeForm.targetBrandKey}
                      onChange={(e) =>
                        setChallengeForm((current) => ({ ...current, targetBrandKey: e.target.value }))
                      }
                    />
                  ) : null}
                  {challengeForm.targetKind === "material" ? (
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700">
                        Target Material Type
                      </span>
                      <select
                        value={challengeForm.targetMaterialType}
                        onChange={(e) =>
                          setChallengeForm((current) => ({
                            ...current,
                            targetMaterialType: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
                      >
                        <option value="">Select material</option>
                        <option value="plastic">plastic</option>
                        <option value="aluminium">aluminium</option>
                        <option value="glass">glass</option>
                        <option value="paper">paper</option>
                      </select>
                    </label>
                  ) : null}
                  {challengeForm.targetKind === "format" ? (
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700">
                        Target Format Type
                      </span>
                      <select
                        value={challengeForm.targetFormatType}
                        onChange={(e) =>
                          setChallengeForm((current) => ({
                            ...current,
                            targetFormatType: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
                      >
                        <option value="">Select format</option>
                        <option value="bottle">bottle</option>
                        <option value="can">can</option>
                        <option value="jar">jar</option>
                        <option value="carton">carton</option>
                      </select>
                    </label>
                  ) : null}
                  <p className="text-xs text-gray-500">
                    Target fields are now used when saving challenges. Brand challenges remain backward-compatible with the legacy brand key.
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Completion Reward</span>
                    <select
                      value={challengeForm.completionRewardId}
                      onChange={(e) =>
                        setChallengeForm((current) => ({
                          ...current,
                          completionRewardId: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
                    >
                      <option value="">No completion reward</option>
                      {rewards.filter((reward) => reward.active).map((reward) => (
                        <option key={reward.id} value={String(reward.id)}>
                          {reward.title} · {reward.fulfillment_type === 'promo_code' ? 'Promo Code' : 'QR Reward'}{reward.acquisition_mode === 'challenge_completion' ? ' · Challenge Only' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <InputField
                    label="Title"
                    value={challengeForm.title}
                    onChange={(e) => setChallengeForm((current) => ({ ...current, title: e.target.value }))}
                    required
                  />
                  <TextareaField
                    label="Description"
                    value={challengeForm.description}
                    onChange={(e) =>
                      setChallengeForm((current) => ({ ...current, description: e.target.value }))
                    }
                    required
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField
                      label="Required Count"
                      type="number"
                      min="0"
                      value={challengeForm.required_count}
                      onChange={(e) =>
                        setChallengeForm((current) => ({
                          ...current,
                          required_count: e.target.value,
                        }))
                      }
                      required
                    />
                    <InputField
                      label="Bonus Points"
                      type="number"
                      min="0"
                      value={challengeForm.bonus_points}
                      onChange={(e) =>
                        setChallengeForm((current) => ({ ...current, bonus_points: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField
                      label="Starts At"
                      type="datetime-local"
                      value={challengeForm.starts_at}
                      onChange={(e) =>
                        setChallengeForm((current) => ({ ...current, starts_at: e.target.value }))
                      }
                      required
                    />
                    <InputField
                      label="Ends At"
                      type="datetime-local"
                      value={challengeForm.ends_at}
                      onChange={(e) =>
                        setChallengeForm((current) => ({ ...current, ends_at: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting === "challenge"}
                    className="w-full rounded-md bg-[#2d6a4f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24543f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting === "challenge"
                      ? "Saving..."
                      : editingChallengeId
                        ? "Update Challenge"
                        : "Create Challenge"}
                  </button>
                </div>
              </form>
            </div>
          </SectionCard>

          <SectionCard
            title="Platform Recycling Analytics"
            description="Network-wide recycling performance across all platform activity."
          >
            <div className="mb-8 flex flex-wrap gap-3">
              <button
                onClick={handleExportSummaryCSV}
                className="rounded-md bg-[#2d6a4f] px-4 py-2 text-sm text-white transition hover:bg-[#24543f]"
              >
                Export Summary CSV
              </button>
              <button
                onClick={handleExportEventsCSV}
                className="rounded-md bg-[#2d6a4f] px-4 py-2 text-sm text-white transition hover:bg-[#24543f]"
              >
                Export Raw Events CSV
              </button>
            </div>

            <AnalyticsSection title="Platform Recycling Analytics">
              <AnalyticsCard
                label="Total Recycled Units"
                value={totalRecycledUnits.toLocaleString()}
                info="Total number of recycled units recorded across the platform."
              />
              <AnalyticsCard
                label="Total Recycling Events"
                value={totalRecyclingEvents.toLocaleString()}
                info="Total recycling event records captured across the platform."
              />
              <AnalyticsCard
                label="Unique Recyclers"
                value={uniqueRecyclers.toLocaleString()}
                info="Distinct recyclers who generated recycling activity."
              />
              <AnalyticsCard
                label="EcoPoints Issued"
                value={ecoPointsIssued.toLocaleString()}
                info="Total EcoPoints granted for recycling activity platform-wide."
              />
            </AnalyticsSection>

            <div className="mb-8">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Málaga Pilot</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Live recycling activity from the Málaga pilot program.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <AnalyticsCard
                  label="Total Units Recycled"
                  value={String(totals?.totalUnits ?? 0)}
                />
                <div className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm xl:col-span-2">
                  <div className="absolute left-0 top-0 h-[3px] w-full rounded-t-xl bg-[#2d6a4f]" />
                  <h4 className="text-sm font-medium text-gray-500">Daily Recycling Trend</h4>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dateLabel" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="units" stroke="#2d6a4f" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="absolute left-0 top-0 h-[3px] w-full rounded-t-xl bg-[#2d6a4f]" />
                  <h4 className="text-sm font-medium text-gray-500">Top Recycled Products</h4>
                  <div className="mt-4 space-y-3">
                    {!topProducts || topProducts.length === 0 ? (
                      <p className="text-sm text-gray-500">No recycling activity recorded.</p>
                    ) : (
                      (topProducts || []).map((product, index) => (
                        <div
                          key={`${product.product_name ?? "product"}-${index}`}
                          className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm last:border-b-0 last:pb-0"
                        >
                          <span className="text-gray-900">{product.product_name ?? "Unknown product"}</span>
                          <span className="font-semibold text-gray-900">
                            {product.units_recycled ?? 0}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Global Recycling Activity Map</h3>
              <AdminRecyclingHeatmap events={platformEvents} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-4 shadow">
                <h3 className="text-lg font-medium text-gray-900">Daily Recycling Trend</h3>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dateLabel" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="units" stroke="#2d6a4f" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-lg bg-white p-4 shadow">
                <h3 className="text-lg font-medium text-gray-900">Top Recycled Products</h3>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topRecycledProducts}>
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

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg bg-white p-4 shadow">
                <h3 className="mb-4 text-lg font-medium text-gray-900">Top Recycling Cities</h3>
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-sm text-gray-600">City</th>
                      <th className="py-2 text-sm text-gray-600">Units Recycled</th>
                      <th className="py-2 text-sm text-gray-600">Unique Recyclers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRecyclingCities.length === 0 ? (
                      <tr className="border-b">
                        <td colSpan={3} className="py-3 text-center text-gray-500">
                          No recycling activity recorded.
                        </td>
                      </tr>
                    ) : (
                      topRecyclingCities.map((row, index) => (
                        <tr key={`${row.city}-${index}`} className="border-b">
                          <td className="py-2 font-medium text-gray-900">{row.city}</td>
                          <td className="py-2 text-gray-900">{row.units}</td>
                          <td className="py-2 text-gray-900">{row.consumers}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg bg-white p-4 shadow">
                <h3 className="mb-4 text-lg font-medium text-gray-900">Top Recycling Products</h3>
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-sm text-gray-600">Product</th>
                      <th className="py-2 text-sm text-gray-600">Units Recycled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRecycledProducts.length === 0 ? (
                      <tr className="border-b">
                        <td colSpan={2} className="py-3 text-center text-gray-500">
                          No recycling activity recorded.
                        </td>
                      </tr>
                    ) : (
                      topRecycledProducts.map((row, index) => (
                        <tr key={`${row.product_name}-${index}`} className="border-b">
                          <td className="py-2 font-medium text-gray-900">{row.product_name}</td>
                          <td className="py-2 text-gray-900">{row.units_recycled}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
