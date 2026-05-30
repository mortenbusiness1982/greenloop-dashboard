"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Reward = {
  id: string | number;
  title: string;
  description?: string | null;
  cost_points: number;
  partner_name?: string | null;
  brand_id?: string | number | null;
  reward_source?: "affiliate" | "sponsored" | "internal" | "challenge" | "local_partner";
  reward_type?: "catalog_reward" | "challenge_reward";
  unlock_method?: "points" | "challenge" | "sponsored" | "gifted" | "admin_granted";
  redemption_type?: "link_only" | "link_with_code" | "manual_claim";
  affiliate_url?: string | null;
  affiliate_network?: string | null;
  promo_code?: string | null;
  redemption_instructions?: string | null;
  cta_text?: string | null;
  status?: "draft" | "active" | "paused" | "expired";
  starts_at?: string | null;
  ends_at?: string | null;
  featured?: boolean;
  priority?: number;
  placement_type?: "hero" | "featured" | "standard" | "sponsored";
  max_total_claims?: number | null;
  max_claims_per_user?: number | null;
  unlock_duration_hours?: number | null;
  active: boolean;
  fulfillment_type?: "qr_token" | "promo_code";
  code_mode?: "shared" | "pooled" | null;
  shared_code?: string | null;
  instructions?: string | null;
  expires_in_hours?: number | null;
  acquisition_mode?: "redeem" | "challenge_completion";
  visible_in_wallet_catalog?: boolean;
  inventory_total?: number;
  inventory_available?: number;
};

type RewardForm = {
  title: string;
  description: string;
  cost_points: string;
  partner_name: string;
  brand_id: string;
  reward_source: NonNullable<Reward["reward_source"]>;
  acquisition_mode: NonNullable<Reward["acquisition_mode"]>;
  redemption_type: NonNullable<Reward["redemption_type"]>;
  fulfillment_type: NonNullable<Reward["fulfillment_type"]>;
  code_mode: "shared" | "pooled" | "";
  affiliate_url: string;
  affiliate_network: string;
  promo_code: string;
  shared_code: string;
  pooled_codes: string;
  instructions: string;
  cta_text: string;
  status: NonNullable<Reward["status"]>;
  placement_type: NonNullable<Reward["placement_type"]>;
  featured: boolean;
  priority: string;
  max_total_claims: string;
  max_claims_per_user: string;
  unlock_duration_hours: string;
  starts_at: string;
  ends_at: string;
};

const emptyForm: RewardForm = {
  title: "",
  description: "",
  cost_points: "",
  partner_name: "",
  brand_id: "",
  reward_source: "internal",
  acquisition_mode: "redeem",
  redemption_type: "manual_claim",
  fulfillment_type: "qr_token",
  code_mode: "",
  affiliate_url: "",
  affiliate_network: "",
  promo_code: "",
  shared_code: "",
  pooled_codes: "",
  instructions: "",
  cta_text: "Unlock Reward",
  status: "active",
  placement_type: "standard",
  featured: false,
  priority: "0",
  max_total_claims: "",
  max_claims_per_user: "",
  unlock_duration_hours: "24",
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

function toDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function dateTimeInputToIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeReward(raw: Reward): Reward {
  return {
    ...raw,
    reward_source: raw.reward_source ?? "internal",
    reward_type: raw.reward_type ?? (raw.acquisition_mode === "challenge_completion" ? "challenge_reward" : "catalog_reward"),
    unlock_method: raw.unlock_method ?? (raw.acquisition_mode === "challenge_completion" ? "challenge" : "points"),
    redemption_type: raw.redemption_type ?? "manual_claim",
    status: raw.status ?? (raw.active === false ? "paused" : "active"),
    placement_type: raw.placement_type ?? "standard",
    fulfillment_type: raw.fulfillment_type ?? "qr_token",
    code_mode: raw.code_mode ?? null,
    instructions: raw.instructions ?? raw.redemption_instructions ?? null,
    expires_in_hours: raw.expires_in_hours ?? raw.unlock_duration_hours ?? 24,
    acquisition_mode: raw.acquisition_mode ?? "redeem",
    visible_in_wallet_catalog: raw.visible_in_wallet_catalog ?? raw.acquisition_mode !== "challenge_completion",
  };
}

function inventoryLabel(reward: Reward) {
  if (reward.fulfillment_type !== "promo_code") return "Unlimited";
  if (reward.code_mode === "shared") return "Shared code";
  const total = Number(reward.inventory_total || 0);
  const available = Number(reward.inventory_available || 0);
  if (!total) return "No codes";
  if (available <= 0) return "Depleted";
  return `${available}/${total} codes`;
}

export function AdminRewardsWorkspace() {
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [form, setForm] = useState<RewardForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch("/admin/rewards", { token });
      setRewards(normalizeList<Reward>(result, ["rewards", "data"]).map(normalizeReward));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load rewards");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadRewards();
  }, [loadRewards]);

  const filteredRewards = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rewards.filter((reward) => {
      const matchesQuery =
        !needle ||
        reward.title.toLowerCase().includes(needle) ||
        String(reward.partner_name || "").toLowerCase().includes(needle);
      const matchesStatus = status === "all" || reward.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, rewards, status]);

  const kpis = useMemo(
    () => ({
      total: rewards.length,
      active: rewards.filter((reward) => reward.active).length,
      challenge: rewards.filter((reward) => reward.acquisition_mode === "challenge_completion").length,
      pooled: rewards.filter((reward) => reward.fulfillment_type === "promo_code" && reward.code_mode === "pooled").length,
    }),
    [rewards]
  );

  function startEdit(reward: Reward) {
    setEditingId(reward.id);
    setForm({
      title: reward.title,
      description: reward.description || "",
      cost_points: String(reward.cost_points ?? ""),
      partner_name: reward.partner_name || "",
      brand_id: reward.brand_id == null ? "" : String(reward.brand_id),
      reward_source: reward.reward_source || "internal",
      acquisition_mode: reward.acquisition_mode || "redeem",
      redemption_type: reward.redemption_type || "manual_claim",
      fulfillment_type: reward.fulfillment_type || "qr_token",
      code_mode: reward.code_mode || "",
      affiliate_url: reward.affiliate_url || "",
      affiliate_network: reward.affiliate_network || "",
      promo_code: reward.promo_code || "",
      shared_code: reward.shared_code || reward.promo_code || "",
      pooled_codes: "",
      instructions: reward.instructions || reward.redemption_instructions || "",
      cta_text: reward.cta_text || "Unlock Reward",
      status: reward.status || "active",
      placement_type: reward.placement_type || "standard",
      featured: Boolean(reward.featured),
      priority: String(reward.priority ?? 0),
      max_total_claims: reward.max_total_claims == null ? "" : String(reward.max_total_claims),
      max_claims_per_user: reward.max_claims_per_user == null ? "" : String(reward.max_claims_per_user),
      unlock_duration_hours: String(reward.unlock_duration_hours ?? reward.expires_in_hours ?? 24),
      starts_at: toDateTimeInput(reward.starts_at),
      ends_at: toDateTimeInput(reward.ends_at),
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const isChallengeReward = form.acquisition_mode === "challenge_completion";
      const payload = {
        title: form.title,
        description: form.description,
        cost_points: isChallengeReward ? 0 : Number(form.cost_points || 0),
        partner_name: form.partner_name,
        brand_id: form.brand_id && form.brand_id.length > 10 ? form.brand_id : null,
        reward_source: form.reward_source,
        reward_type: isChallengeReward ? "challenge_reward" : "catalog_reward",
        unlock_method: isChallengeReward ? "challenge" : "points",
        redemption_type: form.redemption_type,
        affiliate_url: form.affiliate_url || null,
        affiliate_network: form.affiliate_network || null,
        has_promo_code: form.fulfillment_type === "promo_code" || Boolean(form.promo_code),
        promo_code: form.promo_code || form.shared_code || null,
        redemption_instructions: form.instructions || null,
        cta_text: form.cta_text || null,
        status: form.status,
        starts_at: dateTimeInputToIso(form.starts_at),
        ends_at: dateTimeInputToIso(form.ends_at),
        featured: form.featured,
        priority: Number(form.priority || 0),
        placement_type: form.placement_type,
        max_total_claims: form.max_total_claims ? Number(form.max_total_claims) : null,
        max_claims_per_user: form.max_claims_per_user ? Number(form.max_claims_per_user) : null,
        unlock_duration_hours: form.unlock_duration_hours ? Number(form.unlock_duration_hours) : null,
        fulfillment_type: form.fulfillment_type,
        code_mode: form.fulfillment_type === "promo_code" ? form.code_mode || null : null,
        shared_code: form.fulfillment_type === "promo_code" && form.code_mode === "shared" ? form.shared_code || null : null,
        instructions: form.instructions || null,
        expires_in_hours: form.unlock_duration_hours ? Number(form.unlock_duration_hours) : 24,
        acquisition_mode: form.acquisition_mode,
        visible_in_wallet_catalog: !isChallengeReward,
      };

      const saved = await apiFetch<{ id?: string | number; reward?: Reward }>(
        editingId ? `/admin/rewards/${editingId}` : "/admin/rewards",
        { token, method: editingId ? "PATCH" : "POST", body: payload }
      );
      const rewardId = editingId ?? saved.id ?? saved.reward?.id;
      const pooledCodes = form.pooled_codes
        .split(/\r?\n/)
        .map((code) => code.trim())
        .filter(Boolean);

      if (rewardId && form.fulfillment_type === "promo_code" && form.code_mode === "pooled" && pooledCodes.length) {
        await apiFetch(`/admin/rewards/${rewardId}/promo-codes`, {
          token,
          method: "POST",
          body: { codes: pooledCodes },
        });
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadRewards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save reward");
    } finally {
      setSaving(false);
    }
  }

  async function toggleReward(id: string | number) {
    const token = getToken();
    if (!token) return router.replace("/login");
    setActionId(`toggle-${id}`);
    try {
      await apiFetch(`/admin/rewards/${id}/toggle`, { token, method: "PATCH" });
      await loadRewards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to toggle reward");
    } finally {
      setActionId(null);
    }
  }

  async function archiveReward(id: string | number) {
    if (!window.confirm("Archive this reward? Existing history will stay available.")) return;
    const token = getToken();
    if (!token) return router.replace("/login");
    setActionId(`archive-${id}`);
    try {
      await apiFetch(`/admin/rewards/${id}`, { token, method: "DELETE" });
      await loadRewards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive reward");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--gl-green)]">Reward Engine</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--gl-ink)]">Reward Engine</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--gl-ink-muted)]">
            Create catalog unlocks and challenge-only rewards, manage delivery, inventory, placement, and activation.
          </p>
        </div>
        <Link href="/admin/rewards/unlocks" className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">
          View unlocks
        </Link>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] px-5 py-4 text-sm text-[var(--gl-coral-ink)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Total rewards" value={kpis.total} />
        <Kpi label="Active" value={kpis.active} />
        <Kpi label="Challenge rewards" value={kpis.challenge} />
        <Kpi label="Pooled code rewards" value={kpis.pooled} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--gl-hairline)] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--gl-ink)]">All rewards</h2>
              <p className="text-sm text-[var(--gl-ink-muted)]">Archive instead of hard deleting whenever possible.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or partner" className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]" />
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]">
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
                <tr>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Delivery</th>
                  <th className="px-4 py-3">Inventory</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">Loading rewards...</td></tr>
                ) : filteredRewards.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">No rewards match the current filters.</td></tr>
                ) : (
                  filteredRewards.map((reward) => (
                    <tr key={reward.id} className="border-t border-[var(--gl-hairline)] align-top hover:bg-[var(--gl-card-cream)]">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--gl-ink)]">{reward.title}</div>
                        <div className="mt-1 max-w-xs truncate text-xs text-[var(--gl-ink-muted)]">{reward.description || "No description"}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--gl-ink-soft)]">{reward.partner_name || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge>{reward.acquisition_mode === "challenge_completion" ? "Challenge reward" : "Catalog unlock"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--gl-ink-soft)]">{reward.acquisition_mode === "challenge_completion" ? "—" : reward.cost_points}</td>
                      <td className="px-4 py-3 text-[var(--gl-ink-soft)]">{reward.redemption_type || reward.fulfillment_type}</td>
                      <td className="px-4 py-3 text-[var(--gl-ink-soft)]">{inventoryLabel(reward)}</td>
                      <td className="px-4 py-3"><Badge tone={reward.active ? "green" : "neutral"}>{reward.status || (reward.active ? "active" : "inactive")}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link href={`/admin/rewards/${reward.id}`} className="rounded-md border border-[var(--gl-hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">View</Link>
                          <button onClick={() => startEdit(reward)} className="rounded-md border border-[var(--gl-hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">Edit</button>
                          <button onClick={() => toggleReward(reward.id)} disabled={actionId === `toggle-${reward.id}`} className="rounded-md bg-[var(--gl-green)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--gl-green-deep)] disabled:opacity-60">{reward.active ? "Pause" : "Activate"}</button>
                          <button onClick={() => archiveReward(reward.id)} disabled={actionId === `archive-${reward.id}`} className="rounded-md border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--gl-coral-ink)] hover:opacity-90 disabled:opacity-60">Archive</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <RewardFormPanel
          form={form}
          setForm={setForm}
          editingId={editingId}
          saving={saving}
          onCancel={() => {
            setEditingId(null);
            setForm(emptyForm);
          }}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

function RewardFormPanel({
  form,
  setForm,
  editingId,
  saving,
  onCancel,
  onSubmit,
}: {
  form: RewardForm;
  setForm: (updater: (current: RewardForm) => RewardForm) => void;
  editingId: string | number | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isChallengeReward = form.acquisition_mode === "challenge_completion";
  const isPromo = form.fulfillment_type === "promo_code";

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{editingId ? "Edit reward" : "Create reward"}</h2>
          <p className="text-sm text-[var(--gl-ink-muted)]">Reward Engine fields</p>
        </div>
        {editingId ? <button type="button" onClick={onCancel} className="text-sm font-semibold text-[var(--gl-ink-soft)] hover:text-[var(--gl-ink)]">Cancel</button> : null}
      </div>
      <div className="space-y-6">
        <FormSection title="Basic Info">
          <Field label="Title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} required />
          <Textarea label="Description" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} required />
          <Field label="Partner name" value={form.partner_name} onChange={(value) => setForm((current) => ({ ...current, partner_name: value }))} required />
          <Field label="Brand ID" value={form.brand_id} onChange={(value) => setForm((current) => ({ ...current, brand_id: value }))} />
        </FormSection>

        <FormSection title="Reward Economics">
          {!isChallengeReward ? <Field label="EcoPoints cost" type="number" min="0" value={form.cost_points} onChange={(value) => setForm((current) => ({ ...current, cost_points: value }))} required /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Max total claims" type="number" min="0" value={form.max_total_claims} onChange={(value) => setForm((current) => ({ ...current, max_total_claims: value }))} />
            <Field label="Max claims / user" type="number" min="1" value={form.max_claims_per_user} onChange={(value) => setForm((current) => ({ ...current, max_claims_per_user: value }))} />
          </div>
        </FormSection>

        <FormSection title="Reward Type">
          <Select label="Reward type" value={form.acquisition_mode} onChange={(value) => setForm((current) => ({ ...current, acquisition_mode: value as RewardForm["acquisition_mode"], cost_points: value === "challenge_completion" ? "0" : current.cost_points }))}>
            <option value="redeem">Catalog unlock</option>
            <option value="challenge_completion">Challenge reward</option>
          </Select>
          <Select label="Source" value={form.reward_source} onChange={(value) => setForm((current) => ({ ...current, reward_source: value as RewardForm["reward_source"] }))}>
            <option value="internal">Internal</option>
            <option value="affiliate">Affiliate</option>
            <option value="sponsored">Sponsored</option>
            <option value="challenge">Challenge</option>
            <option value="local_partner">Local partner</option>
          </Select>
        </FormSection>

        <FormSection title="Unlock Type">
          <Select label="Redemption type" value={form.redemption_type} onChange={(value) => setForm((current) => ({ ...current, redemption_type: value as RewardForm["redemption_type"] }))}>
            <option value="manual_claim">Manual claim</option>
            <option value="link_only">Link only</option>
            <option value="link_with_code">Link with code</option>
          </Select>
          <Select label="Delivery format" value={form.fulfillment_type} onChange={(value) => setForm((current) => ({ ...current, fulfillment_type: value as RewardForm["fulfillment_type"], code_mode: value === "promo_code" ? current.code_mode || "shared" : "" }))}>
            <option value="qr_token">QR/manual token</option>
            <option value="promo_code">Promo code</option>
          </Select>
          <Field label="Unlock duration hours" type="number" min="1" value={form.unlock_duration_hours} onChange={(value) => setForm((current) => ({ ...current, unlock_duration_hours: value }))} />
        </FormSection>

        {form.redemption_type !== "manual_claim" ? (
          <FormSection title="Affiliate Tracking">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Affiliate URL" value={form.affiliate_url} onChange={(value) => setForm((current) => ({ ...current, affiliate_url: value }))} required />
              <Field label="Affiliate network" value={form.affiliate_network} onChange={(value) => setForm((current) => ({ ...current, affiliate_network: value }))} />
            </div>
          </FormSection>
        ) : null}

        {isPromo ? (
          <FormSection title="Promo Code">
            <Select label="Code mode" value={form.code_mode} onChange={(value) => setForm((current) => ({ ...current, code_mode: value as RewardForm["code_mode"] }))}>
              <option value="shared">Shared code</option>
              <option value="pooled">Finite code pool</option>
            </Select>
            {form.code_mode === "shared" ? <Field label="Shared code" value={form.shared_code} onChange={(value) => setForm((current) => ({ ...current, shared_code: value, promo_code: value }))} required /> : null}
            {form.code_mode === "pooled" ? <Textarea label={editingId ? "Add promo codes, one per line" : "Promo codes, one per line"} value={form.pooled_codes} onChange={(value) => setForm((current) => ({ ...current, pooled_codes: value }))} required={!editingId} /> : null}
          </FormSection>
        ) : null}

        <FormSection title="User Experience">
          <Textarea label="Unlock instructions" value={form.instructions} onChange={(value) => setForm((current) => ({ ...current, instructions: value }))} />
        </FormSection>

        <FormSection title="Visibility">
          <Select label="Status" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value as RewardForm["status"] }))}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Placement" value={form.placement_type} onChange={(value) => setForm((current) => ({ ...current, placement_type: value as RewardForm["placement_type"] }))}>
              <option value="standard">Standard</option>
              <option value="featured">Featured</option>
              <option value="hero">Hero</option>
              <option value="sponsored">Sponsored</option>
            </Select>
            <Field label="Priority" type="number" value={form.priority} onChange={(value) => setForm((current) => ({ ...current, priority: value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--gl-ink-soft)]">
            <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} className="h-4 w-4 rounded border-[var(--gl-hairline-strong)] text-[var(--gl-green)] focus:ring-[var(--gl-green-ring)]" />
            Featured
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starts at" type="datetime-local" value={form.starts_at} onChange={(value) => setForm((current) => ({ ...current, starts_at: value }))} />
            <Field label="Ends at" type="datetime-local" value={form.ends_at} onChange={(value) => setForm((current) => ({ ...current, ends_at: value }))} />
          </div>
        </FormSection>

        <button disabled={saving} className="w-full rounded-lg bg-[var(--gl-green)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--gl-green-deep)] disabled:opacity-60">
          {saving ? "Saving..." : editingId ? "Update reward" : "Create reward"}
        </button>
      </div>
      </form>
      <RewardPreviewCard form={form} />
    </div>
  );
}

function RewardPreviewCard({ form }: { form: RewardForm }) {
  const isPromo = form.fulfillment_type === "promo_code";
  const hasLink = form.redemption_type !== "manual_claim" && form.affiliate_url.trim().length > 0;
  const code = form.code_mode === "shared" && form.shared_code.trim() ? form.shared_code.trim() : "PROMO-CODE";
  const expiry = form.unlock_duration_hours.trim() ? `Expires ${form.unlock_duration_hours.trim()}h after unlock` : null;
  const title = form.title.trim() || "Reward title";
  return (
    <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">What users will see after unlock</p>
      <div className="mt-4 rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-5 text-center">
        <p className="text-lg font-bold text-[var(--gl-ink)]">{isPromo ? "Code Revealed 🎉" : "Reward Unlocked 🎉"}</p>
        <p className="mt-1 text-sm font-semibold text-[var(--gl-ink-soft)]">{title}</p>
        {isPromo ? (
          <div className="mx-auto mt-4 max-w-[240px] rounded-xl border border-[var(--gl-green-soft)] bg-[var(--gl-paper)] px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--gl-ink-muted)]">Promo code</p>
            <p className="mt-1 text-lg font-extrabold tracking-[0.2em] text-[var(--gl-ink)]">{code}</p>
          </div>
        ) : null}
        {expiry ? <p className="mt-3 text-xs font-semibold text-[var(--gl-ink-muted)]">{expiry}</p> : null}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {isPromo ? <span className="rounded-full bg-[var(--gl-green-deep)] px-3 py-1.5 text-xs font-semibold text-white">Copy Code</span> : null}
          {hasLink ? <span className="rounded-full bg-[var(--gl-green)] px-3 py-1.5 text-xs font-semibold text-white">Open Offer</span> : null}
          {hasLink ? <span className="rounded-full border border-[var(--gl-hairline-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--gl-green-deep)]">Copy Link</span> : null}
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between border-b border-[var(--gl-hairline)] pb-2 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{title}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[var(--gl-ink-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? children : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--gl-ink)]">{value}</p>
    </div>
  );
}

function Badge({ children, tone = "soft" }: { children: string; tone?: "soft" | "green" | "neutral" }) {
  const classes =
    tone === "green"
      ? "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"
      : tone === "neutral"
        ? "bg-[var(--gl-card-cream)] text-[var(--gl-ink-soft)]"
        : "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${classes}`}>{children}</span>;
}

function Field({ label, value, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{label}</span>
      <input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]" />
    </label>
  );
}

function Textarea({ label, value, onChange, ...props }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{label}</span>
      <textarea {...props} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 w-full rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]" />
    </label>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]">
        {children}
      </select>
    </label>
  );
}
