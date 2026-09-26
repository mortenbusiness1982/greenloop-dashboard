"use client";

import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, Maximize2, RefreshCw, X, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type EventRow = {
  id: string | number;
  user_id?: string | number | null;
  display_name?: string | null;
  user_display_name?: string | null;
  email?: string | null;
  user_email?: string | null;
  verification_status?: string | null;
  type?: string | null;
  url?: string | null;
  created_at?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  validation_status?: string | null;
  validation_score?: number | null;
  validation_flags?: string[] | null;
};

type ModerationEvent = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  verificationStatus: string;
  bagImageUrl: string | null;
  containerImageUrl: string | null;
  createdAt: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  validationStatus: string | null;
  validationScore: number | null;
  validationFlags: string[];
};

type ScanContext = {
  eventId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  createdAt: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
};

type FilterKey = "pending" | "approved" | "rejected";
type RiskTier = "high" | "review" | "low" | "unknown";

function isLocalFileUrl(url?: string | null) {
  return typeof url === "string" && url.startsWith("file://");
}

function isHttpsUrl(url?: string | null) {
  return typeof url === "string" && url.startsWith("https://");
}

function isAutoApprovable(event: ModerationEvent) {
  return event.validationStatus === "auto_approved";
}

function getRiskTier(event: ModerationEvent): RiskTier {
  if (
    event.validationStatus === "flagged" ||
    event.validationFlags.length > 0 ||
    (event.validationScore !== null && event.validationScore < 50)
  ) {
    return "high";
  }

  if (event.validationStatus === "auto_approved" || (event.validationScore !== null && event.validationScore >= 85)) {
    return "low";
  }

  if (event.validationScore !== null && event.validationScore >= 50 && event.validationScore < 85) {
    return "review";
  }

  return "unknown";
}

function getRiskLabel(tier: RiskTier) {
  if (tier === "high") return "High";
  if (tier === "review") return "Review";
  if (tier === "low") return "Low";
  return "Unknown";
}

function getRiskClasses(tier: RiskTier) {
  if (tier === "high") {
    return {
      badge: "bg-red-100 text-red-700",
      card: "border-l-4 border-l-red-500",
      label: "text-red-700",
      summary: "bg-red-50 text-red-700 border-red-200",
      flag: "bg-red-100 text-red-700",
    };
  }
  if (tier === "review") {
    return {
      badge: "bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]",
      card: "border-l-4 border-l-[var(--gl-amber)]",
      label: "text-[var(--gl-amber-ink)]",
      summary: "bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)] border-[var(--gl-amber)]/30",
      flag: "bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]",
    };
  }
  if (tier === "low") {
    return {
      badge: "bg-[var(--gl-green-soft)] text-[var(--gl-green)]",
      card: "border-l-4 border-l-[var(--gl-green)]",
      label: "text-[var(--gl-green)]",
      summary: "bg-[var(--gl-green-soft)] text-[var(--gl-green)] border-[var(--gl-green)]/25",
      flag: "bg-[var(--gl-green-soft)] text-[var(--gl-green)]",
    };
  }
  return {
    badge: "bg-[var(--gl-card-cream)] text-[var(--gl-ink-soft)]",
    card: "border-l-4 border-l-[var(--gl-hairline)]",
    label: "text-[var(--gl-ink-muted)]",
    summary: "bg-[var(--gl-card-cream)] text-[var(--gl-ink-soft)] border-[var(--gl-hairline)]",
    flag: "bg-[var(--gl-card-cream)] text-[var(--gl-ink-soft)]",
  };
}

function getCreatedAtTime(value: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortEventsByMostRecent(events: ModerationEvent[]) {
  return [...events].sort((a, b) => {
    return getCreatedAtTime(b.createdAt) - getCreatedAtTime(a.createdAt);
  });
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function shortenEventId(id: string) {
  if (id.length <= 8) return id;
  return `${id.slice(0, 8)}...`;
}

function toText(value: string | number | null | undefined, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function toOptionalText(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatScanDate(value: string | null) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatScanUser(context: ScanContext) {
  if (context.userName && context.userEmail) return `${context.userName} · ${context.userEmail}`;
  return context.userName || context.userEmail || "Unknown user";
}

function formatScanLocation(context: ScanContext) {
  const namedLocation = [context.city, context.province, context.country].filter(Boolean).join(", ");
  if (namedLocation) return namedLocation;
  if (context.lat !== null && context.lng !== null) {
    return `${context.lat.toFixed(5)}, ${context.lng.toFixed(5)}`;
  }
  return "Unknown location";
}

function formatScanCoordinates(context: ScanContext) {
  if (context.lat === null || context.lng === null) return "No GPS coordinates";
  return `${context.lat.toFixed(5)}, ${context.lng.toFixed(5)}`;
}

function resolveImageSlot(row: EventRow): "bag" | "container" | null {
  const combined = `${row.type ?? ""} ${row.url ?? ""}`.toLowerCase();

  if (combined.includes("bag")) return "bag";
  if (combined.includes("bin")) return "container";
  if (combined.includes("container")) return "container";

  return null;
}

function groupEvents(rows: EventRow[]): ModerationEvent[] {
  const grouped = new Map<string, ModerationEvent>();

  for (const row of rows) {
    const id = String(row.id);
    const existing = grouped.get(id) ?? {
      id,
      userId: toText(row.user_id),
      userName: toOptionalText(row.display_name, row.user_display_name),
      userEmail: toOptionalText(row.email, row.user_email),
      verificationStatus: toText(row.verification_status),
      bagImageUrl: null,
      containerImageUrl: null,
      createdAt: row.created_at ?? null,
      city: toOptionalText(row.city),
      province: toOptionalText(row.province),
      country: toOptionalText(row.country),
      lat: toNullableNumber(row.lat ?? row.latitude),
      lng: toNullableNumber(row.lng ?? row.longitude),
      validationStatus: row.validation_status ?? null,
      validationScore: row.validation_score ?? null,
      validationFlags: Array.isArray(row.validation_flags) ? row.validation_flags.filter(Boolean) : [],
    };

    if (existing.userId === "—" && row.user_id != null) {
      existing.userId = String(row.user_id);
    }

    existing.userName = existing.userName ?? toOptionalText(row.display_name, row.user_display_name);
    existing.userEmail = existing.userEmail ?? toOptionalText(row.email, row.user_email);

    if (existing.verificationStatus === "—" && row.verification_status) {
      existing.verificationStatus = String(row.verification_status);
    }

    if (!existing.createdAt && row.created_at) {
      existing.createdAt = row.created_at;
    }

    existing.city = existing.city ?? toOptionalText(row.city);
    existing.province = existing.province ?? toOptionalText(row.province);
    existing.country = existing.country ?? toOptionalText(row.country);
    existing.lat = existing.lat ?? toNullableNumber(row.lat ?? row.latitude);
    existing.lng = existing.lng ?? toNullableNumber(row.lng ?? row.longitude);

    if (!existing.validationStatus && row.validation_status) {
      existing.validationStatus = row.validation_status;
    }

    if (existing.validationScore === null && typeof row.validation_score === "number") {
      existing.validationScore = row.validation_score;
    }

    if (existing.validationFlags.length === 0 && Array.isArray(row.validation_flags)) {
      existing.validationFlags = row.validation_flags.filter(Boolean);
    }

    const slot = resolveImageSlot(row);
    if (slot === "bag" && row.url && !existing.bagImageUrl) {
      existing.bagImageUrl = row.url;
    }
    if (slot === "container" && row.url && !existing.containerImageUrl) {
      existing.containerImageUrl = row.url;
    }

    grouped.set(id, existing);
  }

  return [...grouped.values()];
}

async function moderationFetch(path: string, token: string, method = "GET") {
  return apiFetch(path, { token, method });
}

type PhotoPreview = { url: string; label: string; context: ScanContext };

function ImageSlot({ label, imageUrl, alt, context, onOpen }: {
  label: string;
  imageUrl: string | null;
  alt: string;
  context: ScanContext;
  onOpen: (photo: PhotoPreview, trigger: HTMLButtonElement) => void;
}) {
  const { language } = useDashboardLanguage();
  const tr = (en: string, es: string) => language === "es" ? es : en;
  const [failed, setFailed] = useState(false);
  const isLegacyImage = isLocalFileUrl(imageUrl);
  const available = Boolean(imageUrl && !isLegacyImage);
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 text-xs font-medium text-[var(--gl-ink-muted)]">{label}</figcaption>
      {available && !failed ? (
        <button type="button" onClick={(event) => onOpen({ url: imageUrl!, label, context }, event.currentTarget)}
          aria-label={tr("Enlarge", "Ampliar") + " " + label}
          className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md bg-[var(--gl-card-cream)] focus-visible:outline-2 focus-visible:outline-[var(--gl-green)] sm:aspect-[4/3]">
          <Image src={imageUrl!} alt={alt} width={800} height={600} unoptimized onError={() => setFailed(true)} className="h-full w-full object-contain" />
          <span className="absolute bottom-2 right-2 rounded bg-[var(--gl-paper)] p-2 text-[var(--gl-ink)]"><Maximize2 size={18} aria-hidden="true" /></span>
        </button>
      ) : (
        <div role="status" className="flex aspect-[3/4] items-center justify-center rounded-md bg-[var(--gl-card-cream)] p-4 text-center text-sm text-[var(--gl-ink-muted)] sm:aspect-[4/3]">
          {isLegacyImage ? tr("Legacy image (not available)", "Imagen antigua (no disponible)") : failed ? tr("Photo could not be loaded", "No se pudo cargar la foto") : tr("Missing photo", "Foto no disponible")}
        </div>
      )}
      {available ? <a href={imageUrl!} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-9 items-center gap-1 text-xs text-[var(--gl-green)]">
        <ExternalLink size={13} aria-hidden="true" />{tr("Open original", "Abrir original")}
      </a> : null}
    </figure>
  );
}

function PhotoViewer({ photo, onClose }: { photo: PhotoPreview; onClose: () => void }) {
  const { language } = useDashboardLanguage();
  const tr = (en: string, es: string) => language === "es" ? es : en;
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; };
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby="photo-preview-title" onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 m-auto max-h-[100dvh] w-full max-w-6xl border-0 bg-[var(--gl-paper)] p-0 text-[var(--gl-ink)] backdrop:bg-black/70 sm:w-[calc(100%-2rem)] sm:rounded-lg">
      <div className="flex h-[94dvh] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
          <h2 id="photo-preview-title" className="min-w-0 text-base font-semibold">{photo.label}</h2>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" aria-label={tr(zoomed ? "Zoom out" : "Zoom in", zoomed ? "Alejar" : "Acercar")} title={tr(zoomed ? "Zoom out" : "Zoom in", zoomed ? "Alejar" : "Acercar")} aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)} className="p-3">
              {zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
            </button>
            <a href={photo.url} target="_blank" rel="noreferrer" aria-label={tr("Open original", "Abrir original")} title={tr("Open original", "Abrir original")} className="p-3"><ExternalLink size={20} /></a>
            <button type="button" autoFocus onClick={onClose} aria-label={tr("Close photo", "Cerrar foto")} title={tr("Close photo", "Cerrar foto")} className="p-3"><X size={20} /></button>
          </div>
        </header>
        <div tabIndex={0} aria-label={tr("Photo", "Foto")} className="min-h-0 flex-1 overflow-auto overscroll-contain bg-[var(--gl-card-cream)]">
          <div className={zoomed ? "h-[200%] w-[200%]" : "h-full w-full"}>
            <Image src={photo.url} alt={photo.label} width={1600} height={1200} unoptimized className="h-full w-full object-contain" />
          </div>
        </div>
        <footer className="shrink-0 space-y-1 px-3 py-2 text-xs [overflow-wrap:anywhere]">
          <p className="font-medium">{formatScanUser(photo.context)}</p>
          <p className="text-[var(--gl-ink-muted)]">{formatScanDate(photo.context.createdAt)} · {formatScanLocation(photo.context)}</p>
        </footer>
      </div>
    </dialog>
  );
}

export default function ModerationPage() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const tr = (en: string, es: string) => language === "es" ? es : en;
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [mobileReviewOpen, setMobileReviewOpen] = useState(false);
  const [photo, setPhoto] = useState<PhotoPreview | null>(null);
  const [page, setPage] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  const queueScroll = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const photoOpener = useRef<HTMLButtonElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("pending");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  const loadEvents = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setError(null);
      const result = await moderationFetch("/admin/events", token);
      const rows = Array.isArray(result)
        ? (result as EventRow[])
        : Array.isArray((result as { events?: EventRow[] | undefined })?.events)
          ? (((result as { events: EventRow[] }).events) ?? [])
          : [];
      setEvents(groupEvents(rows));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load moderation queue");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    const visibleEvents = events.filter((event) => {
      const status = event.verificationStatus.toLowerCase();
      const hasValidUploadedImage = isHttpsUrl(event.bagImageUrl) || isHttpsUrl(event.containerImageUrl);
      return status === activeFilter && hasValidUploadedImage;
    });
    return sortEventsByMostRecent(visibleEvents);
  }, [activeFilter, events]);

  const pendingRiskSummary = useMemo(() => {
    return filteredEvents.reduce(
      (totals, event) => {
        const tier = getRiskTier(event);
        totals[tier] += 1;
        return totals;
      },
      { high: 0, review: 0, low: 0, unknown: 0 } as Record<RiskTier, number>
    );
  }, [filteredEvents]);

  const autoApprovableEventIds = useMemo(() => {
    if (activeFilter !== "pending") return [];
    return filteredEvents.filter(isAutoApprovable).map((event) => event.id);
  }, [activeFilter, filteredEvents]);

  const pendingVisibleEventIds = useMemo(() => {
    if (activeFilter !== "pending") return [];
    return filteredEvents.map((event) => event.id);
  }, [activeFilter, filteredEvents]);

  const hasEvents = filteredEvents.length > 0;

  useEffect(() => {
    setSelectedEventIds((current) =>
      current.filter((id) => filteredEvents.some((event) => event.id === id))
    );
  }, [filteredEvents]);

  const handleModerationAction = useCallback(async (eventId: string, action: "approve" | "reject") => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setActiveEventId(eventId);
      setActionError(null);
      await moderationFetch(`/admin/events/${eventId}/${action}`, token, "POST");
      setEvents((current) =>
        current.map((event) =>
          event.id === eventId
            ? { ...event, verificationStatus: action === "approve" ? "approved" : "rejected" }
            : event
        )
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Unable to ${action} event`);
    } finally {
      setActiveEventId(null);
    }
  }, [router]);

  async function handleBulkModeration(ids: string[], action: "approve" | "reject") {
    if (ids.length > 1) {
      const confirmed = window.confirm(
        `Are you sure you want to ${action} ${ids.length} recycling events?`
      );
      if (!confirmed) return;
    }

    for (const id of ids) {
      await handleModerationAction(id, action);
    }
    setSelectedEventIds((current) => current.filter((id) => !ids.includes(id)));
  }

  async function handleApproveSelected(ids: string[]) {
    await handleBulkModeration(ids, "approve");
  }

  async function handleRejectSelected(ids: string[]) {
    await handleBulkModeration(ids, "reject");
  }

  function toggleSelectedEvent(eventId: string) {
    setSelectedEventIds((current) =>
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId]
    );
  }

  const reviewedEvent = filteredEvents.find((event) => event.id === reviewId) ?? filteredEvents[0];
  const busy = bulkBusy || !!activeEventId;
  async function runBulk(ids: string[], action: "approve" | "reject") {
    setBulkBusy(true);
    try {
      if (action === "approve") await handleApproveSelected(ids);
      else await handleRejectSelected(ids);
    } finally {
      setBulkBusy(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if (busy || document.querySelector("dialog[open]")) return;
      if (!document.getElementById("scan-review-pane")?.getClientRects().length) return;
      if (activeFilter !== "pending") return;

      const firstVisiblePendingEvent = reviewedEvent;
      if (!firstVisiblePendingEvent) return;

      const key = event.key.toLowerCase();
      if (key === "a") {
        event.preventDefault();
        void handleModerationAction(firstVisiblePendingEvent.id, "approve");
      }

      if (key === "r") {
        event.preventDefault();
        void handleModerationAction(firstVisiblePendingEvent.id, "reject");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, activeFilter, reviewedEvent, handleModerationAction]);

  const filters: { id: FilterKey; label: string }[] = [
    { id: "pending", label: tr("Pending", "Pendientes") },
    { id: "approved", label: tr("Approved", "Aprobados") },
    { id: "rejected", label: tr("Rejected", "Rechazados") },
  ];
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const queueEvents = filteredEvents.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const reviewIndex = reviewedEvent ? filteredEvents.indexOf(reviewedEvent) : -1;
  const context: ScanContext | null = reviewedEvent ? {
    eventId: reviewedEvent.id, userId: reviewedEvent.userId, userName: reviewedEvent.userName,
    userEmail: reviewedEvent.userEmail, createdAt: reviewedEvent.createdAt, city: reviewedEvent.city,
    province: reviewedEvent.province, country: reviewedEvent.country, lat: reviewedEvent.lat, lng: reviewedEvent.lng,
  } : null;
  const commandClass = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
  const riskLabel = (tier: RiskTier) => tr(getRiskLabel(tier), ({ high: "Alto", review: "Revisar", low: "Bajo", unknown: "Desconocido" })[tier]);
  function changeFilter(filter: FilterKey) {
    setActiveFilter(filter);
    setReviewId(null);
    setMobileReviewOpen(false);
    setPage(0);
  }
  function stepReview(next: number) {
    const event = filteredEvents[next];
    if (!event) return;
    setReviewId(event.id);
    setPage(Math.floor(next / pageSize));
  }
  function closeReview() {
    setMobileReviewOpen(false);
    setReviewId(null);
    requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
  }

  if (loading) {
    return <p role="status" className="text-sm text-[var(--gl-ink-muted)]">{tr("Loading moderation queue...", "Cargando cola de moderación...")}</p>;
  }

  return (
    <div className="space-y-3 text-[var(--gl-ink)]">
      <WorkspaceHeader className={(mobileReviewOpen ? "hidden xl:flex " : "flex ") + "items-center justify-between gap-3"}>
        <h1 className="text-2xl font-semibold">{tr("Moderation", "Moderación")}</h1>
        <button type="button" disabled={busy} onClick={() => void loadEvents()} className={commandClass}
          aria-label={tr("Refresh queue", "Actualizar cola")} title={tr("Refresh queue", "Actualizar cola")}><RefreshCw size={18} /></button>
      </WorkspaceHeader>
      <div role="tablist" aria-label={tr("Moderation status", "Estado de moderación")} className={(mobileReviewOpen ? "hidden xl:flex " : "flex ") + "gap-1 border-b border-[var(--gl-hairline)]"}>
        {filters.map((filter, index) => (
          <button type="button" key={filter.id} id={`moderation-tab-${filter.id}`} role="tab" aria-selected={activeFilter === filter.id}
            aria-controls="moderation-workspace" tabIndex={activeFilter === filter.id ? 0 : -1} disabled={busy}
            onClick={() => changeFilter(filter.id)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % filters.length;
              else if (event.key === "ArrowLeft") next = (index + filters.length - 1) % filters.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = filters.length - 1;
              else return;
              event.preventDefault();
              changeFilter(filters[next].id);
              document.getElementById(`moderation-tab-${filters[next].id}`)?.focus();
            }}
            className={"min-h-11 border-b-2 px-3 text-sm font-medium disabled:opacity-50 " + (activeFilter === filter.id ? "border-[var(--gl-green)] text-[var(--gl-green-deep)]" : "border-transparent text-[var(--gl-ink-muted)]")}>
            {filter.label}
          </button>
        ))}
      </div>
      {error || actionError ? <div role="alert" className="rounded-md bg-[var(--gl-coral-soft)] px-4 py-3 text-sm text-[var(--gl-coral-ink)]">{error}{error && actionError ? <br /> : null}{actionError}</div> : null}

      {activeFilter === "pending" ? (
        <div className={(mobileReviewOpen ? "hidden xl:block " : "") + "space-y-2"}>
          <div aria-label={tr("Risk summary", "Resumen de riesgo")} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {(["high", "review", "low", "unknown"] as RiskTier[]).map((tier) => <span key={tier} className={getRiskClasses(tier).label}>{riskLabel(tier)} <strong>{pendingRiskSummary[tier]}</strong></span>)}
            {autoApprovableEventIds.length > 0 ? <span className="text-[var(--gl-ink-muted)]">{autoApprovableEventIds.length} {tr("auto-approvable", "con aprobación automática")}</span> : null}
          </div>
          <details className="text-sm">
            <summary className="w-fit cursor-pointer py-2 text-[var(--gl-ink-soft)]">{tr("Bulk actions", "Acciones en lote")} · {selectedEventIds.length} {tr("selected", "seleccionados")}</summary>
            <div className="flex flex-wrap gap-x-6 gap-y-3 py-2">
              <div><p className="mb-1 text-xs text-[var(--gl-ink-muted)]">{tr("Selected events", "Eventos seleccionados")} ({selectedEventIds.length})</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void runBulk(selectedEventIds, "approve")} disabled={selectedEventIds.length === 0 || busy} className={commandClass + " bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"}><Check size={16} />{tr("Approve selected", "Aprobar seleccionados")}</button>
                  <button type="button" onClick={() => void runBulk(selectedEventIds, "reject")} disabled={selectedEventIds.length === 0 || busy} className={commandClass + " bg-red-50 text-red-700"}><X size={16} />{tr("Reject selected", "Rechazar seleccionados")}</button>
                </div>
              </div>
              <div><p className="mb-1 text-xs text-[var(--gl-ink-muted)]">{tr("Entire pending queue", "Toda la cola pendiente")} ({pendingVisibleEventIds.length})</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void runBulk(pendingVisibleEventIds, "approve")} disabled={!pendingVisibleEventIds.length || busy} className={commandClass + " bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"}><Check size={16} />{tr("Approve all", "Aprobar todos")}</button>
                  <button type="button" onClick={() => void runBulk(pendingVisibleEventIds, "reject")} disabled={!pendingVisibleEventIds.length || busy} className={commandClass + " bg-red-50 text-red-700"}><X size={16} />{tr("Reject all", "Rechazar todos")}</button>
                </div>
              </div>
            </div>
          </details>
        </div>
      ) : null}

      <div id="moderation-workspace" role="tabpanel" aria-labelledby={`moderation-tab-${activeFilter}`} tabIndex={0}>
        {!hasEvents ? <div className="flex flex-wrap items-center gap-3 py-8 text-sm text-[var(--gl-ink-muted)]">
          <p>{tr("No events in this queue.", "No hay eventos en esta cola.")}</p>
          {mobileReviewOpen ? <button type="button" onClick={closeReview} className={commandClass}><ArrowLeft size={16} />{tr("Back to queue", "Volver a la cola")}</button> : null}
        </div> : (
          <div className="grid items-start gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
            <section aria-label={tr("Scan queue", "Cola de escaneos")} className={(mobileReviewOpen ? "hidden xl:block " : "") + "min-w-0"}>
              <div className="mb-1 flex items-center justify-between gap-1 text-xs text-[var(--gl-ink-muted)]">
                <p>{currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, filteredEvents.length)} / {filteredEvents.length}</p>
                <div className="flex">
                  <button type="button" disabled={currentPage === 0 || busy} aria-label={tr("Previous page", "Página anterior")} title={tr("Previous page", "Página anterior")} className={commandClass}
                    onClick={() => { setPage(currentPage - 1); queueScroll.current?.scrollTo({ top: 0 }); }}><ChevronLeft size={16} /></button>
                  <button type="button" disabled={currentPage + 1 >= pageCount || busy} aria-label={tr("Next page", "Página siguiente")} title={tr("Next page", "Página siguiente")} className={commandClass}
                    onClick={() => { setPage(currentPage + 1); queueScroll.current?.scrollTo({ top: 0 }); }}><ChevronRight size={16} /></button>
                </div>
              </div>
              <div ref={queueScroll} tabIndex={0} className="max-h-[max(18rem,calc(100dvh-20rem))] overflow-auto bg-[var(--gl-paper)]">
                {queueEvents.map((event) => (
                  <div key={event.id} className={"flex items-start border-b border-[var(--gl-hairline)] " + (reviewedEvent?.id === event.id ? "bg-[var(--gl-green-soft)]" : "")}>
                    {activeFilter === "pending" ? <label className="flex min-h-11 w-11 shrink-0 items-center justify-center">
                      <input type="checkbox" disabled={busy} checked={selectedEventIds.includes(event.id)} onChange={() => toggleSelectedEvent(event.id)}
                        aria-label={tr("Select event", "Seleccionar evento") + " " + event.id} className="h-4 w-4 accent-[var(--gl-green)]" />
                    </label> : null}
                    <button type="button" disabled={busy} aria-pressed={reviewedEvent?.id === event.id} onClick={(click) => { opener.current = click.currentTarget; setReviewId(event.id); setMobileReviewOpen(true); requestAnimationFrame(() => document.getElementById("scan-review-heading")?.focus({ preventScroll: true })); }}
                      className="min-w-0 flex-1 space-y-1 py-3 pl-3 pr-3 text-left disabled:opacity-50 [overflow-wrap:anywhere]">
                      <p className="text-sm font-medium">{event.userName || event.userEmail || tr("Unknown user", "Usuario desconocido")}</p>
                      <p className="text-xs text-[var(--gl-ink-muted)]">{formatScanDate(event.createdAt)}</p>
                      <div className="flex flex-wrap items-center justify-between gap-1 text-xs"><span>{event.city || event.province || tr("Unknown city", "Ciudad desconocida")}</span>
                        <span className={getRiskClasses(getRiskTier(event)).label}>{riskLabel(getRiskTier(event))}</span></div>
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {reviewedEvent && context ? (
              <section id="scan-review-pane" aria-label={tr("Scan review", "Revisión del escaneo")} className={(mobileReviewOpen ? "" : "hidden xl:block ") + "min-w-0 space-y-3"}>
                <div className="flex items-center justify-between gap-2">
                  <button type="button" disabled={busy} onClick={closeReview} className={commandClass + " xl:hidden"}><ArrowLeft size={17} />{tr("Queue", "Cola")}</button>
                  <p className="text-xs text-[var(--gl-ink-muted)]">{reviewIndex + 1} / {filteredEvents.length}</p>
                  <div className="ml-auto flex">
                    <button type="button" disabled={reviewIndex <= 0 || busy} onClick={() => stepReview(reviewIndex - 1)} aria-label={tr("Previous scan", "Escaneo anterior")} title={tr("Previous scan", "Escaneo anterior")} className={commandClass}><ChevronLeft size={18} /></button>
                    <button type="button" disabled={reviewIndex + 1 >= filteredEvents.length || busy} onClick={() => stepReview(reviewIndex + 1)} aria-label={tr("Next scan", "Siguiente escaneo")} title={tr("Next scan", "Siguiente escaneo")} className={commandClass}><ChevronRight size={18} /></button>
                  </div>
                </div>
                <header className="space-y-1 [overflow-wrap:anywhere]">
                  <h2 id="scan-review-heading" tabIndex={-1} className="text-lg font-semibold outline-none">{reviewedEvent.userName || reviewedEvent.userEmail || tr("Unknown user", "Usuario desconocido")}</h2>
                  <p className="text-sm text-[var(--gl-ink-muted)]">{formatScanDate(context.createdAt)} · {formatScanLocation(context)}</p>
                </header>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={"rounded px-2 py-1 font-medium " + getRiskClasses(getRiskTier(reviewedEvent)).badge}>AI {reviewedEvent.validationScore === null ? "—" : Math.round(reviewedEvent.validationScore)} · {riskLabel(getRiskTier(reviewedEvent))}</span>
                  {isAutoApprovable(reviewedEvent) ? <span className="py-1 text-[var(--gl-green)]">{tr("Auto-approvable", "Aprobación automática")}</span> : null}
                  {reviewedEvent.validationFlags.map((flag) => <span key={flag} className="max-w-full rounded bg-red-50 px-2 py-1 text-red-700 [overflow-wrap:anywhere]">{flag}</span>)}
                </div>
                <div className="bg-[var(--gl-paper)] p-3">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {(["bag", "container"] as const).map((slot) => <div key={slot} id={`photo-panel-${slot}`} className="min-w-0">
                      <ImageSlot key={reviewedEvent.id + slot} label={slot === "bag" ? tr("Bag", "Bolsa") : tr("Container", "Contenedor")}
                        imageUrl={slot === "bag" ? reviewedEvent.bagImageUrl : reviewedEvent.containerImageUrl}
                        alt={tr("Recycling evidence", "Evidencia de reciclaje") + " " + reviewedEvent.id + " " + slot} context={context} onOpen={(next, trigger) => { photoOpener.current = trigger; setPhoto(next); }} />
                    </div>)}
                  </div>
                </div>
                <details open className="text-xs text-[var(--gl-ink-muted)]">
                  <summary className="w-fit cursor-pointer py-2">{tr("Scan details", "Detalles del escaneo")} · {shortenEventId(reviewedEvent.id)}</summary>
                  <dl className="grid gap-2 py-2 sm:grid-cols-2 [overflow-wrap:anywhere]">
                    <div><dt className="font-medium">{tr("User", "Usuario")}</dt><dd>{formatScanUser(context)}</dd></div>
                    <div><dt className="font-medium">GPS</dt><dd>{formatScanCoordinates(context)}</dd></div>
                    <div><dt className="font-medium">{tr("Event ID", "ID del evento")}</dt><dd>{reviewedEvent.id}</dd></div>
                    <div><dt className="font-medium">{tr("Status", "Estado")}</dt><dd>{filters.find((filter) => filter.id === reviewedEvent.verificationStatus)?.label ?? reviewedEvent.verificationStatus}</dd></div>
                  </dl>
                </details>
                <div className="sticky bottom-0 z-10 grid grid-cols-2 gap-2 border-t border-[var(--gl-hairline)] bg-[var(--gl-paper)] py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  <button type="button" disabled={busy} onClick={() => void handleModerationAction(reviewedEvent.id, "approve")} className={commandClass + " bg-[var(--gl-green)] text-white"}><Check size={18} />{tr("Approve", "Aprobar")}</button>
                  <button type="button" disabled={busy} onClick={() => void handleModerationAction(reviewedEvent.id, "reject")} className={commandClass + " border border-red-200 text-red-700"}><X size={18} />{tr("Reject", "Rechazar")}</button>
                </div>
                {busy ? <p role="status" className="text-xs text-[var(--gl-ink-muted)]">{tr("Submitting...", "Enviando...")}</p> : null}
              </section>
            ) : null}
          </div>
        )}
      </div>
      {photo ? <PhotoViewer photo={photo} onClose={() => { setPhoto(null); requestAnimationFrame(() => photoOpener.current?.focus({ preventScroll: true })); }} /> : null}
    </div>
  );
}
