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
};

type ModerationEvent = {
  id: string;
  userId: string;
  verificationStatus: string;
  bagImageUrl: string | null;
  containerImageUrl: string | null;
};

type FilterKey = "pending" | "approved" | "rejected";

function isLocalFileUrl(url?: string | null) {
  return typeof url === "string" && url.startsWith("file://");
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
    };

    if (existing.userId === "—" && row.user_id != null) {
      existing.userId = String(row.user_id);
    }

    if (existing.verificationStatus === "—" && row.verification_status) {
      existing.verificationStatus = String(row.verification_status);
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
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-600">
        {label}
      </div>
      <div className="flex h-40 items-center justify-center p-2">
        {imageUrl ? (
          <img src={imageUrl} alt={alt} className="h-full w-full rounded-md border border-gray-200 object-cover" />
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
    return events.filter((event) => {
      const status = event.verificationStatus.toLowerCase();
      return status === activeFilter;
    });
  }, [activeFilter, events]);

  const hasEvents = filteredEvents.length > 0;

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

        {!hasEvents ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            No {activeFilter} events.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const isSubmitting = activeEventId === event.id;

              return (
                <section key={event.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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
                    </div>
                    {isSubmitting ? <p className="text-xs text-gray-500">Submitting...</p> : null}
                  </div>

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
