"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type AnyRecord = Record<string, unknown>;

function normalizeList<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? (value as AnyRecord) : {};
}

function formatDate(value?: unknown) {
  if (!value) return "-";
  const text = String(value);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toLocaleString();
}

export function AdminUserDetailWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingChallengeId, setRemovingChallengeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return router.replace("/login");
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch(`/admin/users/${id}/activity`, { token });
      setData(result as AnyRecord);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load user detail");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const user = data?.user && typeof data.user === "object" ? (data.user as AnyRecord) : null;
  const scans = Array.isArray(data?.scan_events) ? (data.scan_events as AnyRecord[]) : [];
  const recycling = Array.isArray(data?.recycling_events) ? (data.recycling_events as AnyRecord[]) : [];
  const activeChallenges = Array.isArray(data?.active_challenges) ? (data.active_challenges as AnyRecord[]) : [];

  async function removeUserFromChallenge(challenge: AnyRecord) {
    const token = getToken();
    if (!token) return router.replace("/login");

    const challengeId = String(challenge.id || "");
    const title = String(challenge.title || "this challenge");
    if (!challengeId) return;

    const confirmed = window.confirm(`Remove this user from "${title}"? Their progress for this challenge will be deleted.`);
    if (!confirmed) return;

    try {
      setRemovingChallengeId(challengeId);
      setError(null);
      await apiFetch(`/admin/users/${id}/challenges/${challengeId}`, {
        token,
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove challenge");
    } finally {
      setRemovingChallengeId(null);
    }
  }

  return (
    <Frame title="User Detail" eyebrow="Users" description="Support workspace for wallet, scan activity, recycling history, location signals, and account metadata." error={error} backHref="/admin/users">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Wallet points" value={Number(user?.wallet_points || 0)} />
        <Kpi label="Scan events" value={scans.length} />
        <Kpi label="Recycling events" value={recycling.length} />
        <Kpi label="Recycled units" value={recycling.reduce((sum: number, event: AnyRecord) => sum + Number(event.units || 0), 0)} />
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? <p className="text-sm text-slate-500">Loading user...</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Email" value={user?.email} />
            <Info label="Display name" value={user?.display_name} />
            <Info label="Role" value={user?.role} />
            <Info label="Brand ID" value={user?.brand_id || "-"} />
            <Info label="Created" value={formatDate(user?.created_at)} />
            <Info label="Status" value={user?.deactivated_at ? "Deactivated" : "Active"} />
          </div>
        )}
      </section>
      <section className="rounded-xl border border-sky-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Active challenges</h2>
          <p className="text-sm text-slate-500">Joined active challenges for this user.</p>
        </div>
        {activeChallenges.length === 0 ? (
          <p className="text-sm text-slate-500">No active joined challenges.</p>
        ) : (
          <div className="space-y-2">
            {activeChallenges.map((challenge) => (
              <div key={String(challenge.user_challenge_id || challenge.id)} className="rounded-lg border border-sky-100 bg-sky-50/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{String(challenge.title || "Untitled challenge")}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {String(challenge.challenge_type || "personal")} · {Number(challenge.progress_count || 0)}/{Number(challenge.required_count || 0) || 1}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUserFromChallenge(challenge)}
                    disabled={removingChallengeId === String(challenge.id)}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingChallengeId === String(challenge.id) ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <SimpleTable title="Recycling history" headers={["Created", "City", "Units", "Points", "Status", "Items"]} rows={recycling.map((event: AnyRecord) => [formatDate(event.created_at), event.city || "-", event.units || 0, event.points_issued || 0, event.verification_status || "-", (Array.isArray(event.items) ? event.items : []).map((item: AnyRecord) => item.product_name).join(", ")])} />
      <SimpleTable title="Recent scans" headers={["Created", "Barcode", "Trust tier", "Coordinates"]} rows={scans.map((scan: AnyRecord) => [formatDate(scan.created_at), scan.barcode || "-", scan.trust_tier || "-", `${scan.lat ?? "-"}, ${scan.lng ?? "-"}`])} />
    </Frame>
  );
}

export function AdminBrandDetailWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const [brands, setBrands] = useState<AnyRecord[]>([]);
  const [products, setProducts] = useState<AnyRecord[]>([]);
  const [users, setUsers] = useState<AnyRecord[]>([]);
  const [rewards, setRewards] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return router.replace("/login");
    setLoading(true);
    setError(null);
    try {
      const [brandResult, productResult, userResult, rewardResult] = await Promise.all([
        apiFetch("/admin/brands", { token }),
        apiFetch(`/admin/products?brandId=${id}`, { token }),
        apiFetch("/admin/users", { token }),
        apiFetch("/admin/rewards", { token }),
      ]);
      setBrands(normalizeList<AnyRecord>(brandResult, "brands"));
      setProducts(normalizeList<AnyRecord>(productResult, "products"));
      setUsers(normalizeList<AnyRecord>(userResult, "users").filter((user) => user.brand_id === id));
      setRewards(normalizeList<AnyRecord>(rewardResult, "rewards").filter((reward) => reward.brand_id === id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load brand detail");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const brand = brands.find((item) => item.id === id);

  return (
    <Frame title={String(brand?.name || "Brand Detail")} eyebrow="Brands" description="Brand customer workspace with assigned products, brand admins, rewards, and report links." error={error} backHref="/admin/brands">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Products" value={products.length} />
        <Kpi label="Brand admins" value={users.length} />
        <Kpi label="Rewards" value={rewards.length} />
        <Kpi label="EcoPoints issued" value={Number(brand?.eco_points_issued || 0)} />
      </div>
      {loading ? <EmptyState text="Loading brand..." /> : null}
      <SimpleTable title="Assigned products" headers={["Product", "Barcode", "Status", "Units"]} rows={products.map((product) => [product.name || "-", product.ean || product.barcode || "-", product.verification_status || "-", product.recycled_units_count || 0])} />
      <SimpleTable title="Brand admins" headers={["User", "Role", "Wallet", "Created"]} rows={users.map((user) => [user.email || user.display_name || user.id, user.role || "-", user.wallet_points || 0, formatDate(user.created_at)])} />
      <SimpleTable title="Brand rewards" headers={["Reward", "Status", "Type", "Partner"]} rows={rewards.map((reward) => [reward.title || "-", reward.status || (reward.active ? "active" : "inactive"), reward.acquisition_mode || "-", reward.partner_name || "-"])} />
    </Frame>
  );
}

export function AdminPartnerDetailWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const [partners, setPartners] = useState<AnyRecord[]>([]);
  const [unlocks, setUnlocks] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return router.replace("/login");
    setLoading(true);
    setError(null);
    try {
      const [partnerResult, unlockResult] = await Promise.all([
        apiFetch("/admin/partners", { token }),
        apiFetch(`/admin/rewards/unlocks?partnerId=${id}`, { token }),
      ]);
      setPartners(normalizeList<AnyRecord>(partnerResult, "partners"));
      setUnlocks(normalizeList<AnyRecord>(unlockResult, "unlocks"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load partner detail");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const partner = partners.find((item) => item.id === id);

  return (
    <Frame title={String(partner?.display_name || partner?.email || "Partner Detail")} eyebrow="Partners" description="Partner fulfillment workspace with unlock history, activity, and operational status." error={error} backHref="/admin/partners">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Fulfilled unlocks" value={Number(partner?.fulfilled_unlocks_count || unlocks.length)} />
        <Kpi label="Loaded unlocks" value={unlocks.length} />
        <Kpi label="Active" value={partner?.deactivated_at ? 0 : 1} />
        <Kpi label="Used" value={unlocks.filter((unlock) => unlock.unlock_status === "used").length} />
      </div>
      {loading ? <EmptyState text="Loading partner..." /> : null}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Email" value={partner?.email || id} />
          <Info label="Status" value={partner?.deactivated_at ? "Inactive" : "Active"} />
          <Info label="Created" value={formatDate(partner?.created_at)} />
          <Info label="Last fulfillment" value={formatDate(partner?.last_fulfillment_at)} />
        </div>
      </section>
      <SimpleTable title="Fulfillment history" headers={["Created", "Reward", "User", "Status", "Promo/token"]} rows={unlocks.map((unlock) => {
        const reward = asRecord(unlock.reward);
        const user = asRecord(unlock.user);
        return [formatDate(unlock.created_at), reward.title || "-", user.email || "-", unlock.unlock_status || "-", unlock.promo_code || unlock.token || "-"];
      })} />
    </Frame>
  );
}

export function AdminRewardDetailWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const [reward, setReward] = useState<AnyRecord | null>(null);
  const [unlocks, setUnlocks] = useState<AnyRecord[]>([]);
  const [promoStats, setPromoStats] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return router.replace("/login");
    setLoading(true);
    setError(null);
    try {
      const rewardsResult = await apiFetch("/admin/rewards", { token });
      const found = normalizeList<AnyRecord>(rewardsResult, "rewards").find((item) => String(item.id) === id) || null;
      setReward(found);
      const [unlockResult, statsResult] = await Promise.all([
        apiFetch(`/admin/rewards/unlocks?search=${encodeURIComponent(String(found?.title || id))}`, { token }),
        apiFetch(`/admin/rewards/${id}/promo-codes/stats`, { token }).catch(() => null),
      ]);
      setUnlocks(normalizeList<AnyRecord>(unlockResult, "unlocks").filter((unlock) => String(unlock.reward_id) === id));
      setPromoStats(asRecord(statsResult).stats ? asRecord(asRecord(statsResult).stats) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reward detail");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Frame title={String(reward?.title || "Reward Detail")} eyebrow="Rewards" description="Reward detail workspace with inventory, unlocks, status, partner, and delivery configuration." error={error} backHref="/admin/rewards">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Unlocks" value={unlocks.length} />
        <Kpi label="Active unlocks" value={unlocks.filter((unlock) => unlock.unlock_status === "active").length} />
        <Kpi label="Used unlocks" value={unlocks.filter((unlock) => unlock.unlock_status === "used").length} />
        <Kpi label="Available codes" value={Number(promoStats?.available || reward?.inventory_available || 0)} />
      </div>
      {loading ? <EmptyState text="Loading reward..." /> : null}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Partner" value={reward?.partner_name} />
          <Info label="Status" value={reward?.status || (reward?.active ? "active" : "inactive")} />
          <Info label="Access" value={reward?.acquisition_mode} />
          <Info label="Delivery" value={`${reward?.redemption_type || "-"} / ${reward?.fulfillment_type || "-"}`} />
          <Info label="Cost" value={reward?.cost_points ?? "-"} />
          <Info label="Brand ID" value={reward?.brand_id || "-"} />
        </div>
      </section>
      <SimpleTable title="Recent unlocks" headers={["Created", "User", "Status", "Code", "Expires"]} rows={unlocks.map((unlock) => {
        const user = asRecord(unlock.user);
        return [formatDate(unlock.created_at), user.email || "-", unlock.unlock_status || "-", unlock.promo_code || "-", formatDate(unlock.expires_at)];
      })} />
    </Frame>
  );
}

export function AdminChallengeDetailWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const [challenge, setChallenge] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return router.replace("/login");
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/admin/challenges", { token });
      setChallenge(normalizeList<AnyRecord>(result, "challenges").find((item) => String(item.id) === id) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load challenge detail");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const type = challenge?.challengeType || challenge?.challenge_type || "personal";
  const target =
    challenge?.targetKind === "material"
      ? challenge?.targetMaterialType
      : challenge?.targetKind === "format"
        ? challenge?.targetFormatType
        : challenge?.targetBrandKey || challenge?.brand_key;

  return (
    <Frame title={String(challenge?.title || "Challenge Detail")} eyebrow="Challenges" description="Challenge detail workspace for target, type, progress, reward, schedule, and status." error={error} backHref="/admin/challenges">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Required" value={Number(challenge?.required_count || 0)} />
        <Kpi label="Shared progress" value={Number(challenge?.sharedProgressCount || challenge?.shared_progress_count || 0)} />
        <Kpi label="Bonus points" value={Number(challenge?.bonus_points || 0)} />
        <Kpi label="Active" value={challenge?.active ? 1 : 0} />
      </div>
      {loading ? <EmptyState text="Loading challenge..." /> : null}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Type" value={type} />
          <Info label="Target" value={target || "-"} />
          <Info label="Completion reward" value={challenge?.completionRewardTitle || challenge?.completion_reward_title || "-"} />
          <Info label="Status" value={challenge?.active ? "active" : "inactive"} />
          <Info label="Starts" value={formatDate(challenge?.starts_at)} />
          <Info label="Ends" value={formatDate(challenge?.ends_at)} />
        </div>
      </section>
    </Frame>
  );
}

function Frame({ title, eyebrow, description, error, backHref, children }: { title: string; eyebrow: string; description: string; error?: string | null; backHref: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">{eyebrow}</p>
          <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
        </div>
        <Link href={backHref} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back</Link>
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

function Info({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{String(value ?? "-")}</p>
    </div>
  );
}

function SimpleTable({ title, headers, rows }: { title: string; headers: string[]; rows: unknown[][] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-2.5">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">No rows available.</td></tr>
            ) : (
              rows.slice(0, 200).map((row, index) => (
                <tr key={index} className="border-t border-slate-100 hover:bg-slate-50/70">
                  {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className="px-4 py-2.5">{String(cell ?? "-")}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">{text}</div>;
}
