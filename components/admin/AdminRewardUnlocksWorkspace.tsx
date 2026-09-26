"use client";

import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
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
  const tr = (en: string, es: string) => language === "es" ? es : en;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const selected = unlocks.find((unlock) => unlock.id === selectedId);
  const pages = Math.max(1, Math.ceil(unlocks.length / 25));
  const currentPage = Math.min(page, pages);
  const visibleUnlocks = unlocks.slice((currentPage - 1) * 25, currentPage * 25);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listPageScroll = useRef(0);
  useEffect(() => {
    if (selectedId) {
      window.scrollTo({ top: 0 });
      titleRef.current?.focus({ preventScroll: true });
    }
  }, [selectedId]);
  function backToList() {
    setSelectedId(null);
    requestAnimationFrame(() => {
      window.scrollTo({ top: listPageScroll.current });
      document.getElementById(`unlock-row-${selectedId}`)?.focus({ preventScroll: true });
    });
  }
  function turnPage(next: number) {
    setPage(next);
    listRef.current?.scrollTo({ top: 0 });
    listRef.current?.focus({ preventScroll: true });
  }

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
    <div className="min-w-0 space-y-4">
      <WorkspaceHeader className="flex items-center justify-between gap-3">
        <h1 ref={titleRef} tabIndex={-1} className="min-w-0 text-2xl font-semibold text-[var(--gl-ink)] outline-none">{copy.title}</h1>
        {!selected ? <button type="button" onClick={exportCsv} disabled={loading || !unlocks.length} aria-label={copy.exportCsv} title={copy.exportCsv} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--gl-green)] px-3 text-sm font-semibold text-white hover:bg-[var(--gl-green-deep)] disabled:opacity-60">
          <Download aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">{copy.exportCsv}</span>
        </button> : null}
      </WorkspaceHeader>

      {error ? (
        <div role="alert" className="rounded-xl border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] px-5 py-4 text-sm text-[var(--gl-coral-ink)]">
          {error}
        </div>
      ) : null}

      <div hidden={Boolean(selected)} className="space-y-4">
      <div className="grid grid-cols-3 bg-[var(--gl-paper)] sm:grid-cols-5">
        <Kpi label={copy.kpis.loaded} value={totals.total} />
        <Kpi label={copy.kpis.active} value={totals.active} />
        <Kpi label={copy.kpis.used} value={totals.used} />
        <Kpi label={copy.kpis.expired} value={totals.expired} />
        <Kpi label={copy.kpis.clicks} value={totals.clicks} />
      </div>

      <nav aria-label={tr("Reward workspace", "Área de recompensas")} className="flex gap-4 border-b border-[var(--gl-hairline)] text-sm">
        <Link href="/admin/rewards" className="px-2 py-3 text-[var(--gl-ink-muted)] hover:text-[var(--gl-green)]">{tr("All rewards", "Todas las recompensas")}</Link>
        <span aria-current="page" className="border-b-2 border-[var(--gl-green)] px-2 py-3 font-medium">{tr("Unlock history", "Historial de desbloqueos")}</span>
      </nav>
      <section aria-label={copy.table.title} className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); setSelectedId(null); }}
              aria-label={copy.table.search}
              placeholder={copy.table.search}
              className="min-w-0 flex-1 rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2.5 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
            />
            <select aria-label={tr("Unlock status", "Estado del desbloqueo")} value={status} onChange={(event) => { setStatus(event.target.value as "" | UnlockStatus); setPage(1); setSelectedId(null); }} className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2.5 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]">
              <option value="">{copy.table.allStatuses}</option>
              <option value="active">{copy.statuses.active}</option>
              <option value="expired">{copy.statuses.expired}</option>
              <option value="used">{copy.statuses.used}</option>
              <option value="cancelled">{copy.statuses.cancelled}</option>
            </select>
          </div>
        <p className="text-xs text-[var(--gl-ink-muted)]">{tr("Up to 1,000 results · Search user, reward, token or promo code", "Hasta 1.000 resultados · Busca usuario, recompensa, token o código")}</p>
        <div ref={listRef} role="region" aria-label={tr("Unlock list", "Lista de desbloqueos")} tabIndex={0} className="max-h-[60dvh] overflow-auto bg-[var(--gl-paper)] focus-visible:outline-2 focus-visible:outline-[var(--gl-green)]">
          {loading ? <p role="status" className="p-6 text-sm">{copy.table.loading}</p> : !unlocks.length ? <p className="p-6 text-sm">{copy.table.empty}</p> : visibleUnlocks.map((unlock) => (
            <button id={`unlock-row-${unlock.id}`} key={unlock.id} type="button" aria-label={`${tr("Open unlock", "Abrir desbloqueo")} ${unlock.id}`} onClick={() => { listPageScroll.current = window.scrollY; setSelectedId(unlock.id); }} className="flex w-full items-center gap-3 border-b border-[var(--gl-hairline)] px-3 py-3 text-left hover:bg-[var(--gl-card-cream)]">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">{unlock.reward.title || copy.table.unknownReward}</p>
                <p className="mt-1 break-words text-xs text-[var(--gl-ink-muted)]">{unlock.user.display_name || unlock.user.email || copy.table.unknownUser} · {unlock.reward.partner_name || copy.table.noPartner}</p>
                <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">{copy.table.created}: {formatDateTime(unlock.created_at, language)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusClasses(unlock.unlock_status)}`}>{copy.statuses[unlock.unlock_status]}</span>
              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--gl-ink-muted)]" />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-[var(--gl-ink-muted)]">
          <span>{unlocks.length ? (currentPage - 1) * 25 + 1 : 0}–{Math.min(currentPage * 25, unlocks.length)} / {unlocks.length}</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={tr("Previous page", "Página anterior")} title={tr("Previous page", "Página anterior")} disabled={loading || currentPage === 1} onClick={() => turnPage(currentPage - 1)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--gl-hairline)] bg-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span>{currentPage} / {pages}</span>
            <button type="button" aria-label={tr("Next page", "Página siguiente")} title={tr("Next page", "Página siguiente")} disabled={loading || currentPage === pages} onClick={() => turnPage(currentPage + 1)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--gl-hairline)] bg-white disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
      </div>
      {selected ? <section aria-label={tr("Unlock details", "Detalles del desbloqueo")} className="min-w-0 space-y-4">
        <button type="button" onClick={backToList} disabled={Boolean(actionId)} className="inline-flex min-h-11 items-center gap-2 text-sm disabled:opacity-60"><ArrowLeft className="h-4 w-4" />{tr("Back to list", "Volver a la lista")}</button>
        <div className="space-y-2">
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClasses(selected.unlock_status)}`}>{copy.statuses[selected.unlock_status]}</span>
          <h2 className="break-words text-xl font-semibold">{selected.reward.title || copy.table.unknownReward}</h2>
          <p className="break-words text-sm">{selected.user.display_name || selected.user.email || copy.table.unknownUser}</p>
          <p className="break-all text-sm text-[var(--gl-ink-muted)]">{selected.user.email || selected.user_id}</p>
        </div>
        <fieldset disabled={loading || Boolean(actionId)} className="flex flex-wrap gap-2 disabled:opacity-60">
          {UNLOCK_ACTIONS.filter((action) => action.next !== selected.unlock_status).map((action) => <button key={action.next} type="button" onClick={() => updateStatus(selected.id, action.next)} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${actionToneClasses[action.tone]}`}>{copy.actions[action.next]}</button>)}
        </fieldset>
        <div className="space-y-4 bg-[var(--gl-paper)] p-4">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail label={tr("Promo code", "Código promocional")} value={selected.promo_code || "-"} />
            <Detail label="Token" value={selected.token} />
          </dl>
          {selected.reward.affiliate_url ? <div><p className="mb-1 text-xs text-[var(--gl-ink-muted)]">{tr("Reward link", "Enlace de recompensa")}</p><a href={selected.reward.affiliate_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-start gap-2 break-all text-sm text-[var(--gl-green)] underline"><ExternalLink aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />{selected.reward.affiliate_url}</a></div> : null}
          {selected.instructions ? <div><p className="mb-1 text-xs text-[var(--gl-ink-muted)]">{tr("Instructions", "Instrucciones")}</p><p className="whitespace-pre-wrap break-words text-sm">{selected.instructions}</p></div> : null}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 bg-[var(--gl-paper)] p-4 lg:grid-cols-3">
          <Detail label={tr("Partner", "Partner")} value={selected.reward.partner_name || copy.table.noPartner} />
          <Detail label={copy.table.challenge} value={selected.challenge_title || "-"} />
          <Detail label={tr("Unlock method", "Método de desbloqueo")} value={selected.unlock_method || "-"} />
          <Detail label={copy.table.headers[3]} value={`${selected.reward.redemption_type || "manual_claim"} · ${selected.fulfillment_type || "qr_token"}`} />
          <Detail label={copy.table.created} value={formatDateTime(selected.created_at, language)} />
          <Detail label={copy.table.expires} value={formatDateTime(selected.expires_at, language)} />
          <Detail label={copy.table.used} value={formatDateTime(selected.redeemed_at, language)} />
          <Detail label={copy.table.headers[7]} value={selected.redeemed_by_partner_email || "-"} />
          <Detail label={copy.table.headers[5]} value={String(selected.click_count || 0)} />
          <Detail label={tr("Last click", "Último clic")} value={formatDateTime(selected.last_clicked_at, language)} />
        </dl>
      </section> : null}
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

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-[var(--gl-ink-muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-medium [overflow-wrap:anywhere]">{value}</dd></div>;
}
