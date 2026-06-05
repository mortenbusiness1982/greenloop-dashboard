"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { DashboardLanguage, useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type UnlockStatus = "active" | "expired" | "used" | "cancelled";

type RewardUnlock = {
  id: string;
  user_id: string;
  reward_id: string;
  token: string;
  promo_code?: string | null;
  fulfillment_type?: string | null;
  instructions?: string | null;
  expires_at?: string | null;
  redeemed_at?: string | null;
  created_at?: string | null;
  unlock_status: UnlockStatus;
  unlock_method?: string | null;
  challenge_id?: string | null;
  challenge_title?: string | null;
  click_count?: number;
  clicked_at?: string | null;
  last_clicked_at?: string | null;
  redeemed_by_partner_user_id?: string | null;
  redeemed_by_partner_email?: string | null;
  reward: {
    title?: string | null;
    partner_name?: string | null;
    redemption_type?: string | null;
    affiliate_url?: string | null;
    affiliate_network?: string | null;
    cta_text?: string | null;
    reward_source?: string | null;
    acquisition_mode?: string | null;
  };
  user: {
    email?: string | null;
    display_name?: string | null;
  };
};

type UnlockAction = {
  next: Exclude<UnlockStatus, "expired">;
  tone: "primary" | "neutral" | "danger";
};

const UNLOCK_ACTIONS: UnlockAction[] = [
  { next: "used", tone: "primary" },
  { next: "active", tone: "neutral" },
  { next: "cancelled", tone: "danger" },
];

const unlocksCopy = {
  en: {
    loadError: "Unable to load reward unlocks",
    updateError: "Unable to update unlock status",
    eyebrow: "Reward Engine",
    title: "Reward Unlocks",
    description: "Support unlocked rewards, lost links/codes, expiration issues, partner fulfillment, and reward usage history.",
    rewardEngine: "Reward Engine",
    exportCsv: "Export CSV",
    kpis: {
      loaded: "Loaded unlocks",
      active: "Active",
      used: "Used",
      expired: "Expired",
      clicks: "Tracked clicks",
    },
    table: {
      title: "All reward unlocks",
      description: "Search by user, reward, token, or promo code. Results are limited to 1,000 rows.",
      search: "Search unlocks",
      allStatuses: "All statuses",
      loading: "Loading reward unlocks...",
      empty: "No unlocks match the current filters.",
      headers: ["Unlock", "User", "Reward / Partner", "Delivery", "Code / Link", "Clicks", "Dates", "Fulfilled By", "Actions"],
      unknownUser: "Unknown user",
      unknownReward: "Unknown reward",
      noPartner: "No partner",
      challenge: "Challenge",
      created: "Created",
      expires: "Expires",
      used: "Used",
    },
    statuses: {
      active: "Active",
      expired: "Expired",
      used: "Used",
      cancelled: "Cancelled",
    },
    actions: {
      used: "Mark used",
      active: "Reactivate",
      cancelled: "Cancel",
    },
  },
  es: {
    loadError: "No se pudieron cargar los desbloqueos de recompensas",
    updateError: "No se pudo actualizar el estado del desbloqueo",
    eyebrow: "Motor de recompensas",
    title: "Desbloqueos de recompensas",
    description: "Soporte para recompensas desbloqueadas, enlaces/códigos perdidos, caducidad, cumplimiento de partners e historial de uso.",
    rewardEngine: "Motor de recompensas",
    exportCsv: "Exportar CSV",
    kpis: {
      loaded: "Desbloqueos cargados",
      active: "Activos",
      used: "Usados",
      expired: "Expirados",
      clicks: "Clics registrados",
    },
    table: {
      title: "Todos los desbloqueos",
      description: "Busca por usuario, recompensa, token o código promocional. Los resultados están limitados a 1.000 filas.",
      search: "Buscar desbloqueos",
      allStatuses: "Todos los estados",
      loading: "Cargando desbloqueos...",
      empty: "Ningún desbloqueo coincide con los filtros actuales.",
      headers: ["Desbloqueo", "Usuario", "Recompensa / Partner", "Entrega", "Código / Enlace", "Clics", "Fechas", "Cumplido por", "Acciones"],
      unknownUser: "Usuario desconocido",
      unknownReward: "Recompensa desconocida",
      noPartner: "Sin partner",
      challenge: "Reto",
      created: "Creado",
      expires: "Expira",
      used: "Usado",
    },
    statuses: {
      active: "Activo",
      expired: "Expirado",
      used: "Usado",
      cancelled: "Cancelado",
    },
    actions: {
      used: "Marcar usado",
      active: "Reactivar",
      cancelled: "Cancelar",
    },
  },
} as const;

const actionToneClasses: Record<UnlockAction["tone"], string> = {
  primary: "bg-[var(--gl-green)] text-white hover:bg-[var(--gl-green-deep)]",
  neutral: "border border-[var(--gl-hairline)] bg-[var(--gl-paper)] text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]",
  danger: "border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] text-[var(--gl-coral-ink)] hover:opacity-90",
};

function formatDateTime(value: string | null | undefined, language: DashboardLanguage = "en") {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language === "es" ? "es-ES" : "en-US");
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function statusClasses(status: UnlockStatus) {
  if (status === "active") return "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]";
  if (status === "used") return "bg-[var(--gl-card-cream)] text-[var(--gl-ink-soft)]";
  if (status === "expired") return "bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]";
  return "bg-[var(--gl-coral-soft)] text-[var(--gl-coral-ink)]";
}

export function AdminRewardUnlocksWorkspace() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const copy = unlocksCopy[language];
  const [unlocks, setUnlocks] = useState<RewardUnlock[]>([]);
  const [status, setStatus] = useState<"" | UnlockStatus>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUnlocks = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const result = await apiFetch(`/admin/rewards/unlocks${params.toString() ? `?${params.toString()}` : ""}`, { token });
      const list = result && typeof result === "object" && Array.isArray((result as { unlocks?: unknown[] }).unlocks)
        ? ((result as { unlocks: RewardUnlock[] }).unlocks)
        : [];
      setUnlocks(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, router, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUnlocks(), 250);
    return () => window.clearTimeout(timer);
  }, [loadUnlocks]);

  const totals = useMemo(
    () => ({
      total: unlocks.length,
      active: unlocks.filter((unlock) => unlock.unlock_status === "active").length,
      used: unlocks.filter((unlock) => unlock.unlock_status === "used").length,
      expired: unlocks.filter((unlock) => unlock.unlock_status === "expired").length,
      clicks: unlocks.reduce((sum, unlock) => sum + Number(unlock.click_count || 0), 0),
    }),
    [unlocks]
  );

  async function updateStatus(id: string, nextStatus: UnlockStatus) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setActionId(`${id}-${nextStatus}`);
    setError(null);
    try {
      await apiFetch(`/admin/rewards/unlocks/${id}`, {
        token,
        method: "PATCH",
        body: { status: nextStatus },
      });
      await loadUnlocks();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.updateError);
    } finally {
      setActionId(null);
    }
  }

  function exportCsv() {
    const headers = [
      "id",
      "status",
      "reward_title",
      "user_email",
      "partner_name",
      "promo_code",
      "token",
      "unlock_method",
      "redemption_type",
      "click_count",
      "created_at",
      "expires_at",
      "redeemed_at",
      "redeemed_by_partner_email",
    ];
    const rows = unlocks.map((unlock) => ({
      id: unlock.id,
      status: unlock.unlock_status,
      reward_title: unlock.reward.title || "",
      user_email: unlock.user.email || "",
      partner_name: unlock.reward.partner_name || "",
      promo_code: unlock.promo_code || "",
      token: unlock.token,
      unlock_method: unlock.unlock_method || "",
      redemption_type: unlock.reward.redemption_type || "",
      click_count: unlock.click_count || 0,
      created_at: unlock.created_at || "",
      expires_at: unlock.expires_at || "",
      redeemed_at: unlock.redeemed_at || "",
      redeemed_by_partner_email: unlock.redeemed_by_partner_email || "",
    }));
    const csv = [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((key) => csvCell(row[key as keyof typeof row])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `greenloop-reward-unlocks-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--gl-green)]">{copy.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--gl-ink)]">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--gl-ink-muted)]">
            {copy.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/rewards" className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">
            {copy.rewardEngine}
          </Link>
          <button onClick={exportCsv} className="rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gl-green-deep)]">
            {copy.exportCsv}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] px-5 py-4 text-sm text-[var(--gl-coral-ink)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        <Kpi label={copy.kpis.loaded} value={totals.total} />
        <Kpi label={copy.kpis.active} value={totals.active} />
        <Kpi label={copy.kpis.used} value={totals.used} />
        <Kpi label={copy.kpis.expired} value={totals.expired} />
        <Kpi label={copy.kpis.clicks} value={totals.clicks} />
      </div>

      <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--gl-hairline)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--gl-ink)]">{copy.table.title}</h2>
            <p className="text-sm text-[var(--gl-ink-muted)]">{copy.table.description}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.table.search}
              className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
            />
            <select value={status} onChange={(event) => setStatus(event.target.value as "" | UnlockStatus)} className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]">
              <option value="">{copy.table.allStatuses}</option>
              <option value="active">{copy.statuses.active}</option>
              <option value="expired">{copy.statuses.expired}</option>
              <option value="used">{copy.statuses.used}</option>
              <option value="cancelled">{copy.statuses.cancelled}</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full text-left text-sm">
            <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
              <tr>
                {copy.table.headers.map((header) => <th key={header} className="px-4 py-2.5">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.table.loading}</td></tr>
              ) : unlocks.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[var(--gl-ink-muted)]">{copy.table.empty}</td></tr>
              ) : (
                unlocks.map((unlock) => (
                  <tr key={unlock.id} className="border-t border-[var(--gl-hairline)] align-top hover:bg-[var(--gl-card-cream)]">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(unlock.unlock_status)}`}>
                        {copy.statuses[unlock.unlock_status]}
                      </span>
                      <div className="mt-2 font-mono text-xs text-[var(--gl-ink-muted)]">{unlock.token}</div>
                      <div className="mt-1 text-xs capitalize text-[var(--gl-ink-muted)]">{unlock.unlock_method || "-"}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-[var(--gl-ink)]">{unlock.user.display_name || unlock.user.email || copy.table.unknownUser}</div>
                      <div className="text-xs text-[var(--gl-ink-muted)]">{unlock.user.email || unlock.user_id}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-[var(--gl-ink)]">{unlock.reward.title || copy.table.unknownReward}</div>
                      <div className="text-xs text-[var(--gl-ink-muted)]">{unlock.reward.partner_name || copy.table.noPartner}</div>
                      {unlock.challenge_title ? <div className="mt-1 text-xs text-[var(--gl-amber-ink)]">{copy.table.challenge}: {unlock.challenge_title}</div> : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="capitalize text-[var(--gl-ink-soft)]">{unlock.reward.redemption_type || "manual_claim"}</div>
                      <div className="text-xs text-[var(--gl-ink-muted)]">{unlock.fulfillment_type || "qr_token"}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-xs text-[var(--gl-ink-soft)]">{unlock.promo_code || "-"}</div>
                      {unlock.reward.affiliate_url ? (
                        <a href={unlock.reward.affiliate_url} target="_blank" rel="noreferrer" className="mt-1 block max-w-[210px] truncate text-xs font-semibold text-[var(--gl-green)] hover:text-[var(--gl-green-deep)]">
                          {unlock.reward.affiliate_url}
                        </a>
                      ) : null}
                      {unlock.instructions ? <div className="mt-1 max-w-[240px] truncate text-xs text-[var(--gl-ink-muted)]">{unlock.instructions}</div> : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-[var(--gl-ink)]">{unlock.click_count || 0}</div>
                      <div className="text-xs text-[var(--gl-ink-muted)]">{formatDateTime(unlock.last_clicked_at, language)}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs text-[var(--gl-ink-muted)]">{copy.table.created}</div>
                      <div className="text-[var(--gl-ink-soft)]">{formatDateTime(unlock.created_at, language)}</div>
                      <div className="mt-2 text-xs text-[var(--gl-ink-muted)]">{copy.table.expires}</div>
                      <div className="text-[var(--gl-ink-soft)]">{formatDateTime(unlock.expires_at, language)}</div>
                      {unlock.redeemed_at ? <div className="mt-2 text-xs text-[var(--gl-ink-muted)]">{copy.table.used} {formatDateTime(unlock.redeemed_at, language)}</div> : null}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--gl-ink-soft)]">{unlock.redeemed_by_partner_email || "-"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-2">
                        {UNLOCK_ACTIONS.filter((action) => action.next !== unlock.unlock_status).map((action) => (
                          <button
                            key={action.next}
                            disabled={actionId === `${unlock.id}-${action.next}`}
                            onClick={() => updateStatus(unlock.id, action.next)}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${actionToneClasses[action.tone]}`}
                          >
                            {copy.actions[action.next]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--gl-ink)]">{value}</p>
    </div>
  );
}
