"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

const MODERATION_API_BASE = "https://greenloop-api.onrender.com";

type EventRow = {
  id: string | number;
  user_id?: string | number | null;
  verification_status?: string | null;
  type?: string | null;
  url?: string | null;
  created_at?: string | null;
  validation_status?: string | null;
  validation_score?: number | null;
  validation_flags?: string[] | null;
};

type ModerationEvent = {
  id: string;
  userId: string;
  verificationStatus: string;
  bagImageUrl: string | null;
  containerImageUrl: string | null;
  createdAt: string | null;
  validationStatus: string | null;
  validationScore: number | null;
  validationFlags: string[];
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

function getRiskWeight(tier: RiskTier) {
  if (tier === "high") return 0;
  if (tier === "review") return 1;
  if (tier === "unknown") return 2;
  return 3;
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
      badge: "bg-amber-100 text-amber-800",
      card: "border-l-4 border-l-amber-400",
      label: "text-amber-700",
      summary: "bg-amber-50 text-amber-800 border-amber-200",
      flag: "bg-amber-100 text-amber-800",
    };
  }
  if (tier === "low") {
    return {
      badge: "bg-emerald-100 text-emerald-700",
      card: "border-l-4 border-l-emerald-500",
      label: "text-emerald-700",
      summary: "bg-emerald-50 text-emerald-700 border-emerald-200",
      flag: "bg-emerald-100 text-emerald-700",
    };
  }
  return {
    badge: "bg-gray-100 text-gray-700",
    card: "border-l-4 border-l-gray-300",
    label: "text-gray-600",
    summary: "bg-gray-50 text-gray-700 border-gray-200",
    flag: "bg-gray-100 text-gray-700",
  };
}

function getCreatedAtTime(value: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortPendingEventsByPriority(events: ModerationEvent[]) {
  return [...events].sort((a, b) => {
    const tierDiff = getRiskWeight(getRiskTier(a)) - getRiskWeight(getRiskTier(b));
    if (tierDiff !== 0) return tierDiff;
    return getCreatedAtTime(b.createdAt) - getCreatedAtTime(a.createdAt);
  });
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function formatUrlPreview(url?: string | null) {
  if (!url) return "No source URL";
  return url;
}

function shortenEventId(id: string) {
  if (id.length <= 8) return id;
  return `${id.slice(0, 8)}...`;
}

function toText(value: string | number | null | undefined, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
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
      verificationStatus: toText(row.verification_status),
      bagImageUrl: null,
      containerImageUrl: null,
      createdAt: row.created_at ?? null,
      validationStatus: row.validation_status ?? null,
      validationScore: row.validation_score ?? null,
      validationFlags: Array.isArray(row.validation_flags) ? row.validation_flags.filter(Boolean) : [],
    };

    if (existing.userId === "—" && row.user_id != null) {
      existing.userId = String(row.user_id);
    }

    if (existing.verificationStatus === "—" && row.verification_status) {
      existing.verificationStatus = String(row.verification_status);
    }

    if (!existing.createdAt && row.created_at) {
      existing.createdAt = row.created_at;
    }

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
  return apiFetch(`${MODERATION_API_BASE}${path}`, { token, method });
}

function ImageSlot({
  label,
  imageUrl,
  alt,
}: {
  label: string;
  imageUrl: string | null;
  alt: string;
}) {
  const isLegacyImage = isLocalFileUrl(imageUrl);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-600">
        {label}
      </div>
      <div className="flex h-40 items-center justify-center p-2">
        {imageUrl && !isLegacyImage ? (
          <img src={imageUrl} alt={alt} className="h-full w-full rounded-md border border-gray-200 object-cover" />
        ) : isLegacyImage ? (
          <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-amber-300 bg-amber-50 text-sm text-amber-700">
            Legacy image (not available)
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md border border-gray-200 bg-gray-100 text-sm text-gray-500">
            Missing
          </div>
        )}
      </div>
      <div className="space-y-1 border-t border-gray-200 px-3 py-2">
        {isLocalFileUrl(imageUrl) ? (
          <p className="text-[11px] text-amber-700">Local mobile file path — not browser accessible</p>
        ) : null}
        <div>
          <p className="text-[11px] font-medium text-gray-500">Source URL</p>
          <p className="mt-0.5 break-all font-mono text-[11px] text-gray-400">{formatUrlPreview(imageUrl)}</p>
        </div>
      </div>
    </div>
  );
}

export default function ModerationPage() {
  const router = useRouter();
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
    return activeFilter === "pending" ? sortPendingEventsByPriority(visibleEvents) : visibleEvents;
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

  async function handleModerationAction(eventId: string, action: "approve" | "reject") {
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
  }

  async function handleBulkModeration(ids: string[], action: "approve" | "reject") {
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if (activeEventId) return;
      if (activeFilter !== "pending") return;

      const firstVisiblePendingEvent = filteredEvents[0];
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
  }, [activeEventId, activeFilter, filteredEvents]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="mb-6">
            <div className="h-10 w-56 rounded bg-gray-200" />
            <div className="mt-3 flex gap-2">
              <div className="h-9 w-24 rounded-full bg-gray-200" />
              <div className="h-9 w-24 rounded-full bg-gray-200" />
              <div className="h-9 w-24 rounded-full bg-gray-200" />
            </div>
          </div>

          <div className="space-y-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="h-40 rounded-lg bg-gray-200" />
                  <div className="h-40 rounded-lg bg-gray-200" />
                </div>
                <div className="mt-3 h-4 w-40 rounded bg-gray-200" />
                <div className="mt-3 flex gap-3">
                  <div className="h-10 w-28 rounded bg-gray-200" />
                  <div className="h-10 w-28 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mb-3 text-sm font-medium text-gray-500 transition hover:text-gray-700"
          >
            ← Back to Admin
          </button>
          <h1 className="text-4xl font-bold text-gray-900">Moderation Queue</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["pending", "approved", "rejected"] as FilterKey[]).map((filter) => {
              const isActive = activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
                    isActive ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-300"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {actionError ? (
          <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{actionError}</div>
        ) : null}

        {activeFilter === "pending" ? (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-600">
                {selectedEventIds.length > 0
                  ? `${selectedEventIds.length} selected`
                  : `${pendingVisibleEventIds.length} pending in view`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleApproveSelected(selectedEventIds)}
                  disabled={selectedEventIds.length === 0 || !!activeEventId}
                  className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Approve Selected{selectedEventIds.length > 0 ? ` (${selectedEventIds.length})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRejectSelected(selectedEventIds)}
                  disabled={selectedEventIds.length === 0 || !!activeEventId}
                  className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject Selected{selectedEventIds.length > 0 ? ` (${selectedEventIds.length})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => void handleApproveSelected(pendingVisibleEventIds)}
                  disabled={pendingVisibleEventIds.length === 0 || !!activeEventId}
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Approve All
                </button>
                <button
                  type="button"
                  onClick={() => void handleRejectSelected(pendingVisibleEventIds)}
                  disabled={pendingVisibleEventIds.length === 0 || !!activeEventId}
                  className="rounded bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject All
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {autoApprovableEventIds.length > 0
                ? `${autoApprovableEventIds.length} events are marked for true auto-approval`
                : "Bulk moderation stays available while you work through the pending queue."}
            </p>
          </div>
        ) : null}

        {activeFilter === "pending" ? (
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              High risk: {pendingRiskSummary.high}
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Review: {pendingRiskSummary.review}
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Low risk: {pendingRiskSummary.low}
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              Unknown: {pendingRiskSummary.unknown}
            </div>
          </div>
        ) : null}

        {!hasEvents ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            No {activeFilter} events.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const isSubmitting = activeEventId === event.id;
              const isSelected = selectedEventIds.includes(event.id);
              const showSelection = activeFilter === "pending";
              const riskTier = getRiskTier(event);
              const riskClasses = getRiskClasses(riskTier);

              return (
                <section
                  key={event.id}
                  className={`relative rounded-xl border bg-white p-3 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md ${riskClasses.card} ${
                    isSelected ? "border-green-300 ring-2 ring-green-100" : "border-gray-200"
                  }`}
                >
                  {showSelection ? (
                    <label className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-gray-600 shadow-sm">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectedEvent(event.id)}
                        className="h-4 w-4 rounded border-gray-300 text-green-700 focus:ring-green-600"
                      />
                      Select
                    </label>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2">
                    <ImageSlot label="Bag" imageUrl={event.bagImageUrl} alt={`Bag evidence for event ${event.id}`} />
                    <ImageSlot
                      label="Container"
                      imageUrl={event.containerImageUrl}
                      alt={`Container evidence for event ${event.id}`}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                      <span>Event: {shortenEventId(event.id)}</span>
                      <span className="capitalize">Status: {event.verificationStatus}</span>
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${riskClasses.badge}`}>
                        AI {event.validationScore === null ? "—" : Math.round(event.validationScore)}
                      </span>
                      <span className={riskClasses.label}>{getRiskLabel(riskTier)}</span>
                      {isAutoApprovable(event) ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">Auto</span>
                      ) : null}
                    </div>
                    {isSubmitting ? <p className="text-xs text-gray-500">Submitting...</p> : null}
                  </div>

                  {event.validationFlags.length > 0 ? (
                    <div className="mt-2">
                      <p className="mb-1 text-xs font-semibold text-gray-700">Flags</p>
                      <div className="flex flex-wrap gap-2">
                        {event.validationFlags.map((flag) => (
                          <span key={`${event.id}-${flag}`} className={`rounded-full px-2 py-0.5 text-xs font-medium ${riskClasses.flag}`}>
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleModerationAction(event.id, "approve")}
                      disabled={isSubmitting}
                      className="rounded bg-green-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModerationAction(event.id, "reject")}
                      disabled={isSubmitting}
                      className="rounded bg-red-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
