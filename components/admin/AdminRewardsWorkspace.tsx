"use client";

import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowLeft, ChevronRight, ExternalLink, Plus, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, apiUpload } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type Reward = {
  id: string | number;
  title: string;
  description?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  cost_points: number;
  partner_name?: string | null;
  brand_id?: string | number | null;
  category_id?: string | null;
  banner_image_url?: string | null;
  estimated_savings_text?: string | null;
  reward_source?: "affiliate" | "sponsored" | "internal" | "challenge" | "local_partner";
  reward_type?: "catalog_reward" | "challenge_reward";
  unlock_method?: "points" | "challenge" | "sponsored" | "gifted" | "admin_granted";
  redemption_type?: "link_only" | "link_with_code" | "manual_claim";
  affiliate_url?: string | null;
  affiliate_network?: string | null;
  promo_code?: string | null;
  redemption_instructions?: string | null;
  cta_text?: string | null;
  status?: "draft" | "active" | "paused" | "expired" | "archived";
  starts_at?: string | null;
  ends_at?: string | null;
  featured?: boolean;
  priority?: number;
  placement_type?: "hero" | "featured" | "standard" | "sponsored";
  max_total_claims?: number | null;
  max_claims_per_user?: number | null;
  remaining_claims_visible?: boolean;
  unlock_duration_hours?: number | null;
  archived_at?: string | null;
  active: boolean;
  fulfillment_type?: "qr_token" | "promo_code";
  code_mode?: "shared" | "pooled" | null;
  shared_code?: string | null;
  instructions?: string | null;
  expires_in_hours?: number | null;
  acquisition_mode?: "redeem" | "challenge_completion";
  visible_in_wallet_catalog?: boolean;
  available_worldwide?: boolean;
  eligible_country_codes?: string[];
  inventory_total?: number;
  inventory_available?: number;
};

type RewardCategory = {
  id: string;
  key?: string | null;
  label: string;
};

type RewardForm = {
  title: string;
  description: string;
  short_description: string;
  full_description: string;
  cost_points: string;
  partner_name: string;
  brand_id: string;
  category_id: string;
  banner_image_url: string;
  estimated_savings_text: string;
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
  status: "draft" | "active" | "paused" | "expired";
  placement_type: NonNullable<Reward["placement_type"]>;
  featured: boolean;
  priority: string;
  max_total_claims: string;
  max_claims_per_user: string;
  remaining_claims_visible: boolean;
  terms_text: string;
  starts_at: string;
  ends_at: string;
  available_worldwide: boolean;
  eligible_country_codes: string;
};

const emptyForm: RewardForm = {
  title: "",
  description: "",
  short_description: "",
  full_description: "",
  cost_points: "",
  partner_name: "",
  brand_id: "",
  category_id: "",
  banner_image_url: "",
  estimated_savings_text: "",
  reward_source: "internal",
  acquisition_mode: "redeem",
  redemption_type: "link_only",
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
  remaining_claims_visible: false,
  terms_text: "",
  starts_at: "",
  ends_at: "",
  available_worldwide: false,
  eligible_country_codes: "ES",
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
    status: raw.archived_at ? "archived" : raw.status ?? (raw.active === false ? "paused" : "active"),
    placement_type: raw.placement_type ?? "standard",
    fulfillment_type: raw.fulfillment_type ?? "qr_token",
    code_mode: raw.code_mode ?? null,
    instructions: raw.instructions ?? raw.redemption_instructions ?? null,
    expires_in_hours: raw.expires_in_hours ?? raw.unlock_duration_hours ?? 24,
    acquisition_mode: raw.acquisition_mode ?? "redeem",
    visible_in_wallet_catalog: raw.visible_in_wallet_catalog ?? raw.acquisition_mode !== "challenge_completion",
    available_worldwide: raw.available_worldwide ?? raw.acquisition_mode === "challenge_completion",
    eligible_country_codes: Array.isArray(raw.eligible_country_codes) ? raw.eligible_country_codes : ["ES"],
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
  const { language } = useDashboardLanguage();
  const tr = (en: string, es: string) => language === "es" ? es : en;
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const paneTitle = useRef<HTMLHeadingElement>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [categories, setCategories] = useState<RewardCategory[]>([]);
  const [form, setForm] = useState<RewardForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const editorOpen = creating || editingId !== null;
  const selectedReward = rewards.find((reward) => String(reward.id) === selectedId);
  const busy = saving || actionId !== null;
  useEffect(() => {
    if (editorOpen || selectedId) paneTitle.current?.focus({ preventScroll: true });
  }, [editorOpen, selectedId]);
  function backToList() {
    setSelectedId(null);
    requestAnimationFrame(() => document.getElementById(`reward-row-${selectedId}`)?.focus({ preventScroll: true }));
  }

  const loadRewards = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [result, categoryResult] = await Promise.all([
        apiFetch("/admin/rewards", { token }),
        apiFetch("/admin/reward-categories", { token }).catch(() => ({ categories: [] })),
      ]);
      setRewards(normalizeList<Reward>(result, ["rewards", "data"]).map(normalizeReward));
      setCategories(normalizeList<RewardCategory>(categoryResult, ["categories", "data"]));
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
      const matchesStatus = status === "all" || reward.status === status || (status === "archived" && Boolean(reward.archived_at));
      return matchesQuery && matchesStatus;
    });
  }, [query, rewards, status]);

  const kpis = useMemo(
    () => ({
      total: rewards.length,
      active: rewards.filter((reward) => reward.active).length,
      archived: rewards.filter((reward) => reward.archived_at || reward.status === "archived").length,
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
      short_description: reward.short_description || reward.description || "",
      full_description: reward.full_description || reward.description || "",
      cost_points: String(reward.cost_points ?? ""),
      partner_name: reward.partner_name || "",
      brand_id: reward.brand_id == null ? "" : String(reward.brand_id),
      category_id: reward.category_id || "",
      banner_image_url: reward.banner_image_url || "",
      estimated_savings_text: reward.estimated_savings_text || "",
      reward_source: reward.reward_source || "internal",
      acquisition_mode: reward.acquisition_mode || "redeem",
      redemption_type: reward.redemption_type || "manual_claim",
      fulfillment_type: reward.redemption_type === "link_with_code" ? "promo_code" : reward.fulfillment_type || "qr_token",
      code_mode: reward.code_mode || "",
      affiliate_url: reward.affiliate_url || "",
      affiliate_network: reward.affiliate_network || "",
      promo_code: reward.promo_code || "",
      shared_code: reward.shared_code || reward.promo_code || "",
      pooled_codes: "",
      instructions: reward.instructions || reward.redemption_instructions || "",
      cta_text: reward.cta_text || "Unlock Reward",
      status: reward.status === "archived" ? "paused" : reward.status || "active",
      placement_type: reward.placement_type || "standard",
      featured: Boolean(reward.featured),
      priority: String(reward.priority ?? 0),
      max_total_claims: reward.max_total_claims == null ? "" : String(reward.max_total_claims),
      max_claims_per_user: reward.max_claims_per_user == null ? "" : String(reward.max_claims_per_user),
      remaining_claims_visible: Boolean(reward.remaining_claims_visible),
      terms_text: "",
      starts_at: toDateTimeInput(reward.starts_at),
      ends_at: toDateTimeInput(reward.ends_at),
      available_worldwide: Boolean(reward.available_worldwide),
      eligible_country_codes: (reward.eligible_country_codes || ["ES"]).join(", "),
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
      const fulfillmentType = form.redemption_type === "link_with_code" ? "promo_code" : "qr_token";
      const hasPromoCode = form.redemption_type === "link_with_code";
      const payload = {
        title: form.title,
        description: form.short_description || form.description || form.full_description,
        short_description: form.short_description || form.description,
        full_description: form.full_description || form.description,
        cost_points: isChallengeReward ? 0 : Number(form.cost_points || 0),
        partner_name: form.partner_name,
        brand_id: form.brand_id && form.brand_id.length > 10 ? form.brand_id : null,
        category_id: form.category_id || null,
        banner_image_url: form.banner_image_url || null,
        estimated_savings_text: form.estimated_savings_text || null,
        reward_source: form.reward_source,
        reward_type: isChallengeReward ? "challenge_reward" : "catalog_reward",
        unlock_method: isChallengeReward ? "challenge" : "points",
        redemption_type: form.redemption_type,
        affiliate_url: form.affiliate_url || null,
        affiliate_network: form.affiliate_network || null,
        has_promo_code: hasPromoCode,
        promo_code: hasPromoCode ? form.promo_code || form.shared_code || null : null,
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
        remaining_claims_visible: form.remaining_claims_visible,
        fulfillment_type: fulfillmentType,
        code_mode: hasPromoCode ? form.code_mode || "shared" : null,
        shared_code: hasPromoCode && (form.code_mode || "shared") === "shared" ? form.shared_code || form.promo_code || null : null,
        instructions: form.instructions || null,
        acquisition_mode: form.acquisition_mode,
        visible_in_wallet_catalog: !isChallengeReward,
        available_worldwide: isChallengeReward ? true : form.available_worldwide,
        eligible_country_codes: isChallengeReward || form.available_worldwide
          ? []
          : Array.from(new Set(form.eligible_country_codes.split(/[\s,;]+/).map((code) => code.trim().toUpperCase()).filter(Boolean))),
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

      if (rewardId && hasPromoCode && form.code_mode === "pooled" && pooledCodes.length) {
        await apiFetch(`/admin/rewards/${rewardId}/promo-codes`, {
          token,
          method: "POST",
          body: { codes: pooledCodes },
        });
      }

      setForm(emptyForm);
      setEditingId(null);
      setCreating(false);
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

  async function restoreReward(id: string | number) {
    if (!window.confirm("Restore this archived reward? It will become active and can appear in the mobile app if wallet catalog visibility is enabled.")) return;
    const token = getToken();
    if (!token) return router.replace("/login");
    setActionId(`restore-${id}`);
    try {
      await apiFetch(`/admin/rewards/${id}/restore`, { token, method: "PATCH" });
      await loadRewards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to restore reward");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <WorkspaceHeader hidden={editorOpen} className="flex flex-wrap items-center justify-between gap-3">
        <h1 ref={paneTitle} tabIndex={-1} className="text-2xl font-semibold text-[var(--gl-ink)] outline-none">{tr("Rewards", "Recompensas")}</h1>
        {!editorOpen && !selectedReward ? <button type="button" onClick={() => { setCreating(true); setForm(emptyForm); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--gl-green)] px-3 text-sm font-semibold text-white hover:bg-[var(--gl-green-deep)]"><Plus className="h-4 w-4" />{tr("New reward", "Nueva recompensa")}</button> : null}
      </WorkspaceHeader>

      {error ? (
        <div role="alert" className="rounded-xl border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] px-5 py-4 text-sm text-[var(--gl-coral-ink)]">
          {error}
        </div>
      ) : null}

      <div hidden={editorOpen || Boolean(selectedReward)} className="space-y-4">
        <div className="grid grid-cols-2 bg-[var(--gl-paper)] sm:grid-cols-4">
          <Kpi label={tr("Total rewards", "Total recompensas")} value={kpis.total} />
          <Kpi label={tr("Active", "Activas")} value={kpis.active} />
          <Kpi label={tr("Archived", "Archivadas")} value={kpis.archived} />
          <Kpi label={tr("Challenge rewards", "Recompensas de retos")} value={kpis.challenge} />
        </div>
        <nav aria-label={tr("Reward workspace", "Área de recompensas")} className="flex gap-4 border-b border-[var(--gl-hairline)] text-sm">
          <span aria-current="page" className="border-b-2 border-[var(--gl-green)] px-2 py-3 font-medium">{tr("All rewards", "Todas las recompensas")}</span>
          <Link href="/admin/rewards/unlocks" className="px-2 py-3 text-[var(--gl-ink-muted)] hover:text-[var(--gl-green)]">{tr("Unlock history", "Historial de desbloqueos")}</Link>
        </nav>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input aria-label={tr("Search rewards", "Buscar recompensas")} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr("Search title or partner", "Buscar título o partner")} className="min-w-0 flex-1 rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2.5 text-sm" />
          <select aria-label={tr("Reward status", "Estado de recompensa")} value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2.5 text-sm">
            <option value="all">{tr("All statuses", "Todos los estados")}</option>
            <option value="draft">{tr("Draft", "Borrador")}</option>
            <option value="active">{tr("Active", "Activas")}</option>
            <option value="paused">{tr("Paused", "Pausadas")}</option>
            <option value="expired">{tr("Expired", "Caducadas")}</option>
            <option value="archived">{tr("Archived", "Archivadas")}</option>
          </select>
        </div>
        <div role="region" aria-label={tr("Reward list", "Lista de recompensas")} className="max-h-[65dvh] overflow-auto bg-[var(--gl-paper)]">
          {loading ? <p role="status" className="p-6 text-sm">{tr("Loading rewards...", "Cargando recompensas...")}</p> : !filteredRewards.length ? <p className="p-6 text-sm">{tr("No rewards match the current filters.", "Ninguna recompensa coincide con los filtros.")}</p> :
            filteredRewards.map((reward) => <button key={reward.id} id={`reward-row-${reward.id}`} type="button" onClick={() => setSelectedId(String(reward.id))} aria-label={`${tr("Open", "Abrir")} ${reward.title}`} className="flex w-full items-center gap-3 border-b border-[var(--gl-hairline)] px-3 py-3 text-left hover:bg-[var(--gl-card-cream)]">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">{reward.title}</p>
                <p className="mt-1 break-words text-xs text-[var(--gl-ink-muted)]">{reward.partner_name || "-"} · {reward.acquisition_mode === "challenge_completion" ? tr("Challenge reward", "Recompensa de reto") : `${reward.cost_points} EcoPoints`}</p>
              </div>
              <Badge tone={reward.status === "archived" || !reward.active ? "neutral" : "green"}>{reward.status || (reward.active ? "active" : "inactive")}</Badge>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--gl-ink-muted)]" />
            </button>)
          }
        </div>
      </div>
      {!editorOpen && selectedReward ? <section aria-label={tr("Reward details", "Detalles de recompensa")} className="space-y-4">
        <button type="button" disabled={busy} onClick={backToList} className="inline-flex min-h-11 items-center gap-2 text-sm disabled:opacity-50"><ArrowLeft className="h-4 w-4" />{tr("Back to list", "Volver a la lista")}</button>
        <div className="flex flex-col gap-4 sm:flex-row">
          {selectedReward.banner_image_url ? <div className="flex h-32 w-full shrink-0 items-center justify-center bg-white sm:w-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedReward.banner_image_url} alt={selectedReward.title} className="h-full w-full object-contain" />
          </div> : null}
          <div className="min-w-0 space-y-2"><h2 className="break-words text-xl font-semibold">{selectedReward.title}</h2><p className="whitespace-pre-wrap break-words text-sm text-[var(--gl-ink-muted)]">{selectedReward.full_description || selectedReward.description || tr("No description", "Sin descripción")}</p></div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 bg-[var(--gl-paper)] p-4 sm:grid-cols-3">
          {[
            [tr("Partner", "Partner"), selectedReward.partner_name || "-"],
            [tr("Type", "Tipo"), selectedReward.acquisition_mode === "challenge_completion" ? tr("Challenge reward", "Recompensa de reto") : tr("Catalog unlock", "Desbloqueo de catálogo")],
            [tr("Cost", "Coste"), selectedReward.acquisition_mode === "challenge_completion" ? "-" : `${selectedReward.cost_points} EcoPoints`],
            [tr("Delivery", "Entrega"), selectedReward.redemption_type || selectedReward.fulfillment_type],
            [tr("Inventory", "Inventario"), inventoryLabel(selectedReward)],
            [tr("Status", "Estado"), selectedReward.status || (selectedReward.active ? "active" : "inactive")],
          ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-[var(--gl-ink-muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}
        </dl>
        <fieldset disabled={busy || loading} className="flex flex-wrap gap-2 disabled:opacity-60">
          <button type="button" onClick={() => startEdit(selectedReward)} className="min-h-11 rounded-lg bg-[var(--gl-green)] px-4 text-sm font-semibold text-white">{tr("Edit reward", "Editar recompensa")}</button>
          <Link href={`/admin/rewards/${selectedReward.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--gl-hairline)] bg-white px-3 text-sm"><ExternalLink className="h-4 w-4" />{tr("View record", "Ver registro")}</Link>
          {selectedReward.status === "archived" || selectedReward.archived_at ?
            <button type="button" onClick={() => restoreReward(selectedReward.id)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--gl-hairline)] bg-white px-3 text-sm"><RotateCcw className="h-4 w-4" />{tr("Restore", "Restaurar")}</button> : <>
              <button type="button" onClick={() => toggleReward(selectedReward.id)} className="min-h-11 rounded-lg border border-[var(--gl-hairline)] bg-white px-3 text-sm">{selectedReward.active ? tr("Pause", "Pausar") : tr("Activate", "Activar")}</button>
              <button type="button" onClick={() => archiveReward(selectedReward.id)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] px-3 text-sm text-[var(--gl-coral-ink)]"><Archive className="h-4 w-4" />{tr("Archive", "Archivar")}</button>
            </>}
        </fieldset>
      </section> : null}
      {editorOpen ?
        <RewardFormPanel
          form={form}
          setForm={setForm}
          categories={categories}
          editingId={editingId}
          saving={saving}
          onCancel={() => {
            setEditingId(null);
            setForm(emptyForm);
            setCreating(false);
          }}
          onSubmit={handleSubmit}
          onRewardUpdated={loadRewards}
        />
      : null}
    </div>
  );
}

function RewardFormPanel({
  form,
  setForm,
  categories,
  editingId,
  saving,
  onCancel,
  onSubmit,
  onRewardUpdated,
}: {
  form: RewardForm;
  setForm: (updater: (current: RewardForm) => RewardForm) => void;
  categories: RewardCategory[];
  editingId: string | number | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRewardUpdated: () => Promise<void>;
}) {
  const isChallengeReward = form.acquisition_mode === "challenge_completion";
  const isPromo = form.redemption_type === "link_with_code";
  const { language } = useDashboardLanguage();
  const tr = (en: string, es: string) => language === "es" ? es : en;
  const [pane, setPane] = useState("details");
  const invalidFocus = useRef(false);
  const editorTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => { editorTitle.current?.focus({ preventScroll: true }); }, []);
  const panes = [
    ["details", tr("Details", "Detalles")], ["delivery", tr("Delivery", "Entrega")],
    ["limits", tr("Limits", "Límites")], ["visibility", tr("Visibility", "Visibilidad")],
    ["preview", tr("Preview", "Vista previa")],
  ];
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const handleUnlockTypeChange = (value: string) => {
    const redemptionType = value as RewardForm["redemption_type"];
    setForm((current) => ({
      ...current,
      redemption_type: redemptionType,
      fulfillment_type: redemptionType === "link_with_code" ? "promo_code" : "qr_token",
      code_mode: redemptionType === "link_with_code" ? current.code_mode || "shared" : "",
      promo_code: redemptionType === "link_with_code" ? current.promo_code : "",
      shared_code: redemptionType === "link_with_code" ? current.shared_code : "",
      pooled_codes: redemptionType === "link_with_code" ? current.pooled_codes : "",
    }));
  };
  const handleBannerImageUpload = async (file: File | undefined) => {
    if (!file) return;
    const token = getToken();
    if (!token) {
      setImageUploadError("Please log in again before uploading.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setImageUploadError("Please choose an image file.");
      return;
    }

    setUploadingImage(true);
    setImageUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await apiUpload<{ url?: string }>("/uploads/photo", { token, body });
      if (!result.url) {
        throw new Error("Upload did not return an image URL.");
      }
      setForm((current) => ({ ...current, banner_image_url: result.url || "" }));
      if (editingId) {
        await apiFetch(`/admin/rewards/${editingId}`, {
          token,
          method: "PATCH",
          body: { banner_image_url: result.url },
        });
        await onRewardUpdated();
      }
    } catch (err) {
      setImageUploadError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleBannerImageClear = async () => {
    setImageUploadError(null);
    setForm((current) => ({ ...current, banner_image_url: "" }));
    if (!editingId) return;

    const token = getToken();
    if (!token) {
      setImageUploadError("Please log in again before updating.");
      return;
    }

    setUploadingImage(true);
    try {
      await apiFetch(`/admin/rewards/${editingId}`, {
        token,
        method: "PATCH",
        body: { banner_image_url: null },
      });
      await onRewardUpdated();
    } catch (err) {
      setImageUploadError(err instanceof Error ? err.message : "Unable to remove image.");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <form onSubmit={onSubmit} onInvalidCapture={(event) => {
        const target = event.target as HTMLInputElement;
        const hiddenSection = target.closest<HTMLElement>("[data-reward-pane][hidden]");
        if (!hiddenSection) return;
        event.preventDefault();
        if (invalidFocus.current) return;
        invalidFocus.current = true;
        setPane(hiddenSection.dataset.rewardPane || "details");
        requestAnimationFrame(() => { target.focus(); target.reportValidity(); invalidFocus.current = false; });
      }} className="min-w-0 space-y-4">
      <WorkspaceHeader className="flex items-center justify-between gap-3">
        <h1 ref={editorTitle} tabIndex={-1} className="text-2xl font-semibold text-[var(--gl-ink)] outline-none">{editingId ? tr("Edit reward", "Editar recompensa") : tr("Create reward", "Crear recompensa")}</h1>
        <button type="button" disabled={saving || uploadingImage} onClick={onCancel} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--gl-ink-soft)] disabled:opacity-60"><ArrowLeft className="h-4 w-4" />{tr("Back", "Volver")}</button>
      </WorkspaceHeader>
      <div role="tablist" aria-label={tr("Reward editor", "Editor de recompensa")} className="sticky top-16 z-10 grid grid-cols-5 border-b border-[var(--gl-hairline)] bg-[var(--gl-bg-cream)] sm:flex">
        {panes.map(([id, label], index) => <button key={id} type="button" role="tab" id={`reward-tab-${id}`} aria-selected={pane === id} aria-controls="reward-editor-panel" tabIndex={pane === id ? 0 : -1} disabled={saving || uploadingImage} onClick={() => setPane(id)} onKeyDown={(event) => {
          const next = event.key === "Home" ? 0 : event.key === "End" ? panes.length - 1 : event.key === "ArrowRight" ? (index + 1) % panes.length : event.key === "ArrowLeft" ? (index + panes.length - 1) % panes.length : null;
          if (next === null) return;
          event.preventDefault(); setPane(panes[next][0]); document.getElementById(`reward-tab-${panes[next][0]}`)?.focus();
        }} className={`min-h-11 min-w-0 break-words border-b-2 px-1 py-2 text-xs font-medium sm:px-4 sm:text-sm ${pane === id ? "border-[var(--gl-green)] text-[var(--gl-green-deep)]" : "border-transparent text-[var(--gl-ink-muted)]"}`}>{label}</button>)}
      </div>
      <fieldset disabled={saving || uploadingImage} className="min-w-0 space-y-4 disabled:opacity-60">
      <div id="reward-editor-panel" role="tabpanel" aria-labelledby={`reward-tab-${pane}`} className="min-w-0 space-y-5 bg-[var(--gl-paper)] p-4">
        <FormSection title="Basic Info" pane="details" active={pane}>
          <Field label="Title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} required />
          <Field label="Partner name" value={form.partner_name} onChange={(value) => setForm((current) => ({ ...current, partner_name: value }))} required />
          <Textarea label="Short description" value={form.short_description} onChange={(value) => setForm((current) => ({ ...current, short_description: value, description: current.description || value }))} required />
          <Textarea label="Full description" value={form.full_description} onChange={(value) => setForm((current) => ({ ...current, full_description: value, description: current.description || value }))} />
          <Field label="Brand ID" value={form.brand_id} onChange={(value) => setForm((current) => ({ ...current, brand_id: value }))} />
          {categories.length ? (
            <Select label="Category" value={form.category_id} onChange={(value) => setForm((current) => ({ ...current, category_id: value }))}>
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </Select>
          ) : (
            <Field label="Category ID" value={form.category_id} onChange={(value) => setForm((current) => ({ ...current, category_id: value }))} />
          )}
          <ImageUploadField
            label="Banner image"
            imageUrl={form.banner_image_url}
            uploading={uploadingImage}
            error={imageUploadError}
            onUpload={handleBannerImageUpload}
            onClear={handleBannerImageClear}
          />
        </FormSection>

        <FormSection title="Reward Economics" pane="limits" active={pane}>
          {!isChallengeReward ? <Field label="EcoPoints cost" type="number" min="0" value={form.cost_points} onChange={(value) => setForm((current) => ({ ...current, cost_points: value }))} required /> : null}
          <Field label="Estimated savings text" value={form.estimated_savings_text} onChange={(value) => setForm((current) => ({ ...current, estimated_savings_text: value }))} placeholder="Save up to 25%" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Max total claims" type="number" min="0" value={form.max_total_claims} onChange={(value) => setForm((current) => ({ ...current, max_total_claims: value }))} />
            <Field label="Max claims / user" type="number" min="1" value={form.max_claims_per_user} onChange={(value) => setForm((current) => ({ ...current, max_claims_per_user: value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--gl-ink-soft)]">
            <input type="checkbox" checked={form.remaining_claims_visible} onChange={(event) => setForm((current) => ({ ...current, remaining_claims_visible: event.target.checked }))} className="h-4 w-4 rounded border-[var(--gl-hairline-strong)] text-[var(--gl-green)] focus:ring-[var(--gl-green-ring)]" />
            Show remaining unlocks to users
          </label>
        </FormSection>

        <FormSection title="Reward Type" pane="details" active={pane}>
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

        <FormSection title="Unlock Type" pane="delivery" active={pane}>
          <Select label="Unlock type" value={form.redemption_type} onChange={handleUnlockTypeChange}>
            <option value="link_only">Link only</option>
            <option value="link_with_code">Link + Promo Code</option>
            <option value="manual_claim">Manual Claim</option>
          </Select>
        </FormSection>

        {form.redemption_type !== "manual_claim" ? (
          <FormSection title="Affiliate Tracking" pane="delivery" active={pane}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Affiliate URL" value={form.affiliate_url} onChange={(value) => setForm((current) => ({ ...current, affiliate_url: value }))} required />
              <Field label="Affiliate network" value={form.affiliate_network} onChange={(value) => setForm((current) => ({ ...current, affiliate_network: value }))} />
            </div>
          </FormSection>
        ) : null}

        {isPromo ? (
          <FormSection title="Promo Code" pane="delivery" active={pane}>
            <Select label="Code mode" value={form.code_mode} onChange={(value) => setForm((current) => ({ ...current, code_mode: value as RewardForm["code_mode"] }))}>
              <option value="shared">Shared code</option>
              <option value="pooled">Finite code pool</option>
            </Select>
            {form.code_mode === "shared" ? <Field label="Shared code" value={form.shared_code} onChange={(value) => setForm((current) => ({ ...current, shared_code: value, promo_code: value }))} required /> : null}
            {form.code_mode === "pooled" ? <Textarea label={editingId ? "Add promo codes, one per line" : "Promo codes, one per line"} value={form.pooled_codes} onChange={(value) => setForm((current) => ({ ...current, pooled_codes: value }))} required={!editingId} /> : null}
          </FormSection>
        ) : null}

        <FormSection title="User Experience" pane="delivery" active={pane}>
          <Field label="CTA text" value={form.cta_text} onChange={(value) => setForm((current) => ({ ...current, cta_text: value }))} placeholder="Unlock" />
          <Textarea label="Unlock instructions" value={form.instructions} onChange={(value) => setForm((current) => ({ ...current, instructions: value }))} />
          <Textarea label="Terms & conditions" value={form.terms_text} onChange={(value) => setForm((current) => ({ ...current, terms_text: value }))} placeholder="Optional internal note for now; detailed terms page support can be added next." />
        </FormSection>

        <FormSection title="Visibility" pane="visibility" active={pane}>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--gl-ink-soft)]">
            <input type="checkbox" checked={form.available_worldwide} onChange={(event) => setForm((current) => ({ ...current, available_worldwide: event.target.checked }))} className="h-4 w-4 rounded border-[var(--gl-hairline-strong)] text-[var(--gl-green)] focus:ring-[var(--gl-green-ring)]" />
            Available worldwide
          </label>
          {!form.available_worldwide ? (
            <Field label="Eligible countries" value={form.eligible_country_codes} onChange={(value) => setForm((current) => ({ ...current, eligible_country_codes: value }))} placeholder="ES, FR, DE" />
          ) : null}
          <p className="text-xs leading-5 text-[var(--gl-ink-muted)]">Use two-letter country codes. Existing TradeDoubler rewards should remain ES only.</p>
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

        <div hidden={pane !== "preview"}><RewardPreviewCard form={form} /></div>
      </div>
        <button disabled={saving || uploadingImage} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--gl-green)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--gl-green-deep)] disabled:opacity-60">
          <Save className="h-4 w-4" />{saving ? tr("Saving...", "Guardando...") : editingId ? tr("Update reward", "Actualizar recompensa") : tr("Create reward", "Crear recompensa")}
        </button>
      </fieldset>
      </form>
    </div>
  );
}

function RewardPreviewCard({ form }: { form: RewardForm }) {
  const isPromo = form.redemption_type === "link_with_code";
  const hasLink = form.redemption_type !== "manual_claim" && form.affiliate_url.trim().length > 0;
  const code = form.code_mode === "shared" && form.shared_code.trim() ? form.shared_code.trim() : "PROMO-CODE";
  const title = form.title.trim() || "Reward title";
  const imageUrl = form.banner_image_url.trim();
  return (
    <div className="mx-auto w-full max-w-md">
      <p className="text-center text-xs font-semibold text-[var(--gl-ink-muted)]">What users will see after unlock</p>
      <div className="mt-4 bg-[var(--gl-card-cream)] p-4 text-center">
        {imageUrl ? (
          <div className="mx-auto mb-4 flex h-24 max-w-[220px] items-center justify-center overflow-hidden rounded-xl border border-[var(--gl-hairline)] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-full w-full object-contain" />
          </div>
        ) : null}
        <p className="text-lg font-bold text-[var(--gl-ink)]">{isPromo ? "Code Revealed 🎉" : "Reward Unlocked 🎉"}</p>
        <p className="mt-1 break-words text-sm font-semibold text-[var(--gl-ink-soft)]">{title}</p>
        {isPromo ? (
          <div className="mx-auto mt-4 max-w-[240px] rounded-xl border border-[var(--gl-green-soft)] bg-[var(--gl-paper)] px-4 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--gl-ink-muted)]">Promo code</p>
            <p className="mt-1 break-all text-lg font-bold text-[var(--gl-ink)]">{code}</p>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {isPromo ? <span className="rounded-full bg-[var(--gl-green-deep)] px-3 py-1.5 text-xs font-semibold text-white">Copy Code</span> : null}
          {hasLink ? <span className="rounded-full bg-[var(--gl-green)] px-3 py-1.5 text-xs font-semibold text-white">Unlock</span> : null}
          {hasLink ? <span className="rounded-full border border-[var(--gl-hairline-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--gl-green-deep)]">Copy Link</span> : null}
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children, pane, active }: { title: string; children: ReactNode; pane: string; active: string }) {
  return (
    <div hidden={pane !== active} data-reward-pane={pane}>
      <h3 className="mb-3 text-xs font-semibold text-[var(--gl-ink-muted)]">{title}</h3>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2 [&>*]:min-w-0">{children}</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 sm:p-4">
      <p className="text-xs text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--gl-ink)]">{value}</p>
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

function ImageUploadField({
  label,
  imageUrl,
  uploading,
  error,
  onUpload,
  onClear,
}: {
  label: string;
  imageUrl: string;
  uploading: boolean;
  error: string | null;
  onUpload: (file: File | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="lg:col-span-2">
      <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{label}</span>
      <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-3">
        {imageUrl ? (
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--gl-hairline)] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--gl-ink)]">Image uploaded</p>
              <p className="truncate text-xs text-[var(--gl-ink-muted)]">{imageUrl}</p>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-[var(--gl-hairline-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--gl-ink-soft)] hover:border-[var(--gl-green)] hover:text-[var(--gl-green-deep)]"
            >
              Remove
            </button>
          </div>
        ) : null}
        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--gl-hairline-strong)] bg-white px-3 py-4 text-center text-sm font-semibold text-[var(--gl-green-deep)] transition hover:border-[var(--gl-green)] hover:bg-[var(--gl-green-soft)]">
          {uploading ? "Uploading image..." : imageUrl ? "Change image" : "Choose image from computer"}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              onUpload(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}
        <p className="mt-2 text-xs text-[var(--gl-ink-muted)]">Upload a product or reward image. GreenLoop stores it and uses it in the app reward card.</p>
      </div>
    </div>
  );
}

function Textarea({ label, value, onChange, ...props }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{label}</span>
      <textarea {...props} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 w-full rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]" />
    </label>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]">
        {children}
      </select>
    </label>
  );
}
