"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { getToken } from "@/lib/auth";

type ChallengeType = "personal" | "global" | "community";
type TargetKind = "brand" | "material" | "format" | "any";
type CertificateRecipientType =
  | "school"
  | "restaurant"
  | "hotel"
  | "company"
  | "sports_club"
  | "municipality"
  | "event"
  | "other";

type Challenge = {
  id: string | number;
  brand_key?: string | null;
  challenge_type?: ChallengeType | null;
  challengeType?: ChallengeType | null;
  target_kind?: TargetKind | null;
  target_brand_key?: string | null;
  target_material_type?: string | null;
  target_format_type?: string | null;
  targetKind?: TargetKind;
  targetBrandKey?: string;
  targetMaterialType?: string;
  targetFormatType?: string;
  title: string;
  description?: string | null;
  required_count: number;
  bonus_points: number;
  shared_progress_count?: number;
  sharedProgressCount?: number;
  completion_reward_id?: string | null;
  completion_reward_title?: string | null;
  completionRewardId?: string | null;
  completionRewardTitle?: string | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  certificate_recipient_name?: string | null;
  certificateRecipientName?: string | null;
  certificate_recipient_type?: CertificateRecipientType | null;
  certificateRecipientType?: CertificateRecipientType | null;
  certificate_enabled?: boolean | null;
  certificateEnabled?: boolean | null;
  certificate_generated_at?: string | null;
  certificateGeneratedAt?: string | null;
};

type CertificateDraft = {
  recipientName: string;
  recipientType: CertificateRecipientType | "";
  enabled: boolean;
};

type CertificatePreview = {
  challenge: {
    id: string | number;
    title: string;
    type: string;
    status: string;
  };
  recipient: {
    name: string | null;
    type: CertificateRecipientType | null;
  };
  metrics: {
    totalRecyclingEvents: number;
    totalProductsRecycled: number;
    estimatedCO2Saved: number;
    uniqueParticipants: number;
    startDate: string | null;
    endDate: string | null;
  };
  generatedAt: string;
};

type CertificateStatusMessage = {
  type: "success" | "error";
  text: string;
};

type ChallengeRequestStatus = "pending" | "approved" | "rejected" | "converted";

type ChallengeRequest = {
  id: string;
  requested_by_user_id?: string | null;
  requestedByUserId?: string | null;
  challenge_name?: string;
  challengeName?: string;
  community_name?: string;
  communityName?: string;
  community_type?: string;
  communityType?: string;
  target_items?: number;
  targetItems?: number;
  start_date?: string | null;
  startDate?: string | null;
  end_date?: string | null;
  endDate?: string | null;
  description?: string | null;
  contact_name?: string | null;
  contactName?: string | null;
  contact_email?: string | null;
  contactEmail?: string | null;
  city?: string | null;
  sponsor_name?: string | null;
  sponsorName?: string | null;
  reward_idea?: string | null;
  rewardIdea?: string | null;
  notes?: string | null;
  status: ChallengeRequestStatus;
  admin_notes?: string | null;
  adminNotes?: string | null;
  approved_challenge_id?: string | null;
  approvedChallengeId?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  requester_email?: string | null;
  requesterEmail?: string | null;
  requester_display_name?: string | null;
  requesterDisplayName?: string | null;
};

type CertificatePdfLanguage = "en" | "es";

type Reward = {
  id: string | number;
  title: string;
  active: boolean;
  fulfillment_type?: "qr_token" | "promo_code";
  acquisition_mode?: "redeem" | "challenge_completion";
};

type Brand = {
  id: string;
  name: string;
};

type ChallengeForm = {
  challengeType: ChallengeType;
  targetKind: TargetKind;
  brand_key: string;
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

const emptyForm: ChallengeForm = {
  challengeType: "personal",
  targetKind: "brand",
  brand_key: "",
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
  const challengeType = raw.challengeType ?? raw.challenge_type ?? "personal";
  return {
    ...raw,
    challenge_type: challengeType,
    challengeType,
    targetKind: raw.targetKind ?? raw.target_kind ?? "brand",
    targetBrandKey: raw.targetBrandKey ?? raw.target_brand_key ?? raw.brand_key ?? "",
    targetMaterialType: raw.targetMaterialType ?? raw.target_material_type ?? "",
    targetFormatType: raw.targetFormatType ?? raw.target_format_type ?? "",
    sharedProgressCount: raw.sharedProgressCount ?? raw.shared_progress_count ?? 0,
    completionRewardId: raw.completionRewardId ?? raw.completion_reward_id ?? null,
    completionRewardTitle: raw.completionRewardTitle ?? raw.completion_reward_title ?? null,
    certificateRecipientName: raw.certificateRecipientName ?? raw.certificate_recipient_name ?? null,
    certificateRecipientType: raw.certificateRecipientType ?? raw.certificate_recipient_type ?? null,
    certificateEnabled: raw.certificateEnabled ?? raw.certificate_enabled ?? false,
    certificateGeneratedAt: raw.certificateGeneratedAt ?? raw.certificate_generated_at ?? null,
  };
}

function normalizeChallengeRequest(raw: ChallengeRequest): ChallengeRequest {
  return {
    ...raw,
    challengeName: raw.challengeName ?? raw.challenge_name ?? "",
    communityName: raw.communityName ?? raw.community_name ?? "",
    communityType: raw.communityType ?? raw.community_type ?? "other",
    targetItems: raw.targetItems ?? raw.target_items ?? 0,
    startDate: raw.startDate ?? raw.start_date ?? null,
    endDate: raw.endDate ?? raw.end_date ?? null,
    contactName: raw.contactName ?? raw.contact_name ?? null,
    contactEmail: raw.contactEmail ?? raw.contact_email ?? null,
    sponsorName: raw.sponsorName ?? raw.sponsor_name ?? null,
    rewardIdea: raw.rewardIdea ?? raw.reward_idea ?? null,
    adminNotes: raw.adminNotes ?? raw.admin_notes ?? null,
    approvedChallengeId: raw.approvedChallengeId ?? raw.approved_challenge_id ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
    requesterEmail: raw.requesterEmail ?? raw.requester_email ?? null,
    requesterDisplayName: raw.requesterDisplayName ?? raw.requester_display_name ?? null,
  };
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function typeTone(type: ChallengeType | undefined | null) {
  if (type === "global") return "bg-blue-100 text-blue-800";
  if (type === "community") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function getVisibilityStatus(challenge: Challenge) {
  if (!challenge.active) {
    return {
      label: "Inactive",
      detail: "Hidden from the app.",
      className: "bg-slate-100 text-slate-700",
    };
  }

  const now = Date.now();
  const startsAt = challenge.starts_at ? new Date(challenge.starts_at).getTime() : null;
  const endsAt = challenge.ends_at ? new Date(challenge.ends_at).getTime() : null;

  if (startsAt && !Number.isNaN(startsAt) && startsAt > now) {
    return {
      label: "Scheduled",
      detail: `Visible from ${formatDateTime(challenge.starts_at)}.`,
      className: "bg-blue-100 text-blue-800",
    };
  }

  if (endsAt && !Number.isNaN(endsAt) && endsAt < now) {
    return {
      label: "Ended",
      detail: "Past end date.",
      className: "bg-slate-100 text-slate-700",
    };
  }

  return {
    label: "Live in app",
    detail: "Visible to matching users now.",
    className: "bg-green-100 text-green-800",
  };
}

function challengeSummary(type: ChallengeType) {
  if (type === "global") {
    return "Global challenges do not require users to join. Matching scans automatically create individual progress for each user.";
  }
  if (type === "community") {
    return "Community challenges use shared progress. Joined users contribute to the same goal and each joined user can receive the completion benefit.";
  }
  return "Personal challenges are joined by a user and progress individually for that user.";
}

const certificateRecipientTypes: { value: CertificateRecipientType; label: string }[] = [
  { value: "school", label: "School" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "company", label: "Company" },
  { value: "sports_club", label: "Sports club" },
  { value: "municipality", label: "Municipality" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

const challengeRequestStatuses: { value: ChallengeRequestStatus; label: string }[] = [
  { value: "pending", label: "Pending review" },
  { value: "rejected", label: "Rejected" },
  { value: "converted", label: "Converted to challenge" },
];

const challengeRequestStatusTone: Record<ChallengeRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  converted: "bg-blue-100 text-blue-800",
};

function getChallengeRequestStatusLabel(status: ChallengeRequestStatus) {
  if (status === "approved") return "Converted to challenge";
  return challengeRequestStatuses.find((item) => item.value === status)?.label || status;
}

function getCertificateDraft(challenge: Challenge): CertificateDraft {
  return {
    recipientName: challenge.certificateRecipientName || "",
    recipientType: challenge.certificateRecipientType || "",
    enabled: Boolean(challenge.certificateEnabled),
  };
}

function getCertificateStatus(challenge: Challenge) {
  if (!challenge.certificateEnabled) return "Disabled";
  if (challenge.certificateGeneratedAt) return "Generated";
  return "Enabled";
}

function getChallengeStage(challenge: Challenge) {
  const now = Date.now();
  const endsAt = challenge.ends_at ? new Date(challenge.ends_at).getTime() : null;
  if (endsAt && !Number.isNaN(endsAt) && endsAt < now) return "Completed";
  return "Ongoing";
}

function formatNumber(value: number | null | undefined, maximumFractionDigits = 0) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits });
}

function safeFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "impact-certificate";
}

export function AdminChallengesWorkspace() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeRequests, setChallengeRequests] = useState<ChallengeRequest[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState<ChallengeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [certificateDrafts, setCertificateDrafts] = useState<Record<string, CertificateDraft>>({});
  const [certificateActionId, setCertificateActionId] = useState<string | null>(null);
  const [certificatePreviews, setCertificatePreviews] = useState<Record<string, CertificatePreview>>({});
  const [certificateMessages, setCertificateMessages] = useState<Record<string, CertificateStatusMessage>>({});
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | ChallengeRequestStatus>("all");
  const [requestAdminNotes, setRequestAdminNotes] = useState<Record<string, string>>({});
  const [requestActionId, setRequestActionId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<CertificateStatusMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [challengeResult, requestResult, rewardResult, brandResult] = await Promise.all([
        apiFetch("/admin/challenges", { token }),
        apiFetch("/admin/challenge-requests", { token }),
        apiFetch("/admin/rewards", { token }),
        apiFetch("/admin/brands", { token }),
      ]);
      const normalizedChallenges = normalizeList<Challenge>(challengeResult, ["challenges", "data"]).map(normalizeChallenge);
      const normalizedRequests = normalizeList<ChallengeRequest>(requestResult, ["requests", "data"]).map(normalizeChallengeRequest);
      setChallenges(normalizedChallenges);
      setChallengeRequests(normalizedRequests);
      setRequestAdminNotes(
        normalizedRequests.reduce<Record<string, string>>((notes, request) => {
          notes[request.id] = request.adminNotes || "";
          return notes;
        }, {})
      );
      setCertificateDrafts(
        normalizedChallenges
          .filter((challenge) => challenge.challengeType === "community")
          .reduce<Record<string, CertificateDraft>>((drafts, challenge) => {
            drafts[String(challenge.id)] = getCertificateDraft(challenge);
            return drafts;
          }, {})
      );
      setRewards(normalizeList<Reward>(rewardResult, ["rewards", "data"]));
      setBrands(normalizeList<Brand>(brandResult, ["brands", "data"]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load challenges");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredChallenges = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return challenges.filter((challenge) => {
      const target = getTargetValue(challenge).toLowerCase();
      const matchesQuery = !needle || challenge.title.toLowerCase().includes(needle) || target.includes(needle);
      const matchesType = typeFilter === "all" || challenge.challengeType === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [challenges, query, typeFilter]);

  const kpis = useMemo(
    () => ({
      total: challenges.length,
      active: challenges.filter((challenge) => challenge.active).length,
      global: challenges.filter((challenge) => challenge.challengeType === "global").length,
      community: challenges.filter((challenge) => challenge.challengeType === "community").length,
    }),
    [challenges]
  );

  const filteredChallengeRequests = useMemo(() => {
    return challengeRequests.filter((request) => requestStatusFilter === "all" || request.status === requestStatusFilter);
  }, [challengeRequests, requestStatusFilter]);

  const requestKpis = useMemo(
    () => ({
      total: challengeRequests.length,
      pending: challengeRequests.filter((request) => request.status === "pending").length,
      rejected: challengeRequests.filter((request) => request.status === "rejected").length,
      converted: challengeRequests.filter((request) => request.status === "converted").length,
    }),
    [challengeRequests]
  );

  const communityChallenges = useMemo(
    () =>
      challenges
        .filter((challenge) => challenge.challengeType === "community")
        .sort((a, b) => {
          const aStage = getChallengeStage(a);
          const bStage = getChallengeStage(b);
          if (aStage !== bStage) return aStage === "Ongoing" ? -1 : 1;
          return new Date(b.ends_at || b.starts_at || 0).getTime() - new Date(a.ends_at || a.starts_at || 0).getTime();
        }),
    [challenges]
  );

  function startEdit(challenge: Challenge) {
    setEditingId(challenge.id);
    setForm({
      challengeType: challenge.challengeType || "personal",
      targetKind: challenge.targetKind || "brand",
      brand_key: challenge.brand_key || challenge.targetBrandKey || "",
      targetBrandKey: challenge.targetBrandKey || challenge.brand_key || "",
      targetMaterialType: challenge.targetMaterialType || "",
      targetFormatType: challenge.targetFormatType || "",
      title: challenge.title,
      description: challenge.description || "",
      required_count: String(challenge.required_count ?? ""),
      bonus_points: String(challenge.bonus_points ?? ""),
      completionRewardId: challenge.completionRewardId || "",
      starts_at: toDateTimeInput(challenge.starts_at),
      ends_at: toDateTimeInput(challenge.ends_at),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const requiredCount = Number(form.required_count);
    const bonusPoints = form.bonus_points ? Number(form.bonus_points) : 0;
    if (!requiredCount || requiredCount < 1) {
      setError("Required count must be at least 1.");
      return;
    }
    if (form.targetKind === "brand" && !(form.targetBrandKey || form.brand_key).trim()) {
      setError("Target brand is required for brand challenges.");
      return;
    }
    if (form.targetKind === "material" && !form.targetMaterialType) {
      setError("Target material is required for material challenges.");
      return;
    }
    if (form.targetKind === "format" && !form.targetFormatType) {
      setError("Target format is required for format challenges.");
      return;
    }
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError("End date must be after start date.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const targetBrand = (form.targetBrandKey || form.brand_key).trim();
      const payload = {
        challengeType: form.challengeType,
        targetKind: form.targetKind,
        ...(form.targetKind === "brand" ? { brand_key: targetBrand, targetBrandKey: targetBrand } : {}),
        ...(form.targetKind === "material" ? { targetMaterialType: form.targetMaterialType } : {}),
        ...(form.targetKind === "format" ? { targetFormatType: form.targetFormatType } : {}),
        title: form.title,
        description: form.description,
        required_count: requiredCount,
        bonus_points: bonusPoints,
        completionRewardId: form.completionRewardId || null,
        starts_at: dateTimeInputToIso(form.starts_at),
        ends_at: dateTimeInputToIso(form.ends_at),
      };
      await apiFetch(editingId ? `/admin/challenges/${editingId}` : "/admin/challenges", {
        token,
        method: editingId ? "PATCH" : "POST",
        body: payload,
      });
      setForm(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save challenge");
    } finally {
      setSaving(false);
    }
  }

  async function toggleChallenge(id: string | number) {
    const token = getToken();
    if (!token) return router.replace("/login");
    setActionId(`toggle-${id}`);
    try {
      await apiFetch(`/admin/challenges/${id}/toggle`, { token, method: "PATCH" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to toggle challenge");
    } finally {
      setActionId(null);
    }
  }

  async function deleteChallenge(id: string | number) {
    if (!window.confirm("Delete this challenge?")) return;
    const token = getToken();
    if (!token) return router.replace("/login");
    setActionId(`delete-${id}`);
    try {
      await apiFetch(`/admin/challenges/${id}`, { token, method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete challenge");
    } finally {
      setActionId(null);
    }
  }

  function updateCertificateDraft(id: string | number, patch: Partial<CertificateDraft>) {
    setCertificateDrafts((current) => {
      const key = String(id);
      const currentDraft = current[key] || {
        recipientName: "",
        recipientType: "",
        enabled: false,
      };
      return {
        ...current,
        [key]: {
          ...currentDraft,
          ...patch,
        },
      };
    });
    setCertificateMessages((current) => {
      const next = { ...current };
      delete next[String(id)];
      return next;
    });
  }

  async function persistCertificateSettings(challenge: Challenge, enabledOverride?: boolean) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return null;
    }
    const id = String(challenge.id);
    const draft = certificateDrafts[id] || getCertificateDraft(challenge);
    const payload = {
      certificateRecipientName: draft.recipientName.trim() || null,
      certificateRecipientType: draft.recipientType || null,
      certificateEnabled: enabledOverride ?? draft.enabled,
    };
    await apiFetch(`/admin/challenges/${challenge.id}`, {
      token,
      method: "PATCH",
      body: payload,
    });
    setCertificateDrafts((current) => ({
      ...current,
      [id]: {
        recipientName: draft.recipientName,
        recipientType: draft.recipientType,
        enabled: payload.certificateEnabled,
      },
    }));
    return { token, draft, payload };
  }

  async function saveCertificateSettings(challenge: Challenge) {
    const id = String(challenge.id);
    setCertificateActionId(`save-${id}`);
    setError(null);
    setCertificateMessages((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    try {
      const saved = await persistCertificateSettings(challenge);
      if (!saved) return;
      setCertificateMessages((current) => ({
        ...current,
        [id]: { type: "success", text: "Certificate settings saved." },
      }));
      await loadData();
    } catch (err) {
      setCertificateMessages((current) => ({
        ...current,
        [id]: { type: "error", text: err instanceof Error ? err.message : "Unable to update certificate settings" },
      }));
    } finally {
      setCertificateActionId(null);
    }
  }

  async function previewCertificate(challenge: Challenge) {
    const id = String(challenge.id);
    setCertificateActionId(`preview-${id}`);
    setError(null);
    setCertificateMessages((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    try {
      const saved = await persistCertificateSettings(challenge, true);
      if (!saved) return;
      const preview = await apiFetch<CertificatePreview>(`/impact/challenges/${challenge.id}/certificate`, { token: saved.token });
      setCertificatePreviews((current) => ({ ...current, [id]: preview }));
      setCertificateMessages((current) => ({
        ...current,
        [id]: { type: "success", text: "Preview loaded using the current recipient settings." },
      }));
    } catch (err) {
      setCertificateMessages((current) => ({
        ...current,
        [id]: { type: "error", text: err instanceof Error ? err.message : "Unable to preview certificate data" },
      }));
    } finally {
      setCertificateActionId(null);
    }
  }

  async function downloadCertificatePdf(challenge: Challenge, language: CertificatePdfLanguage) {
    const id = String(challenge.id);
    const draft = certificateDrafts[id] || getCertificateDraft(challenge);
    const recipientName = draft.recipientName || challenge.certificateRecipientName || "recipient";
    setCertificateActionId(`download-${language}-${id}`);
    setError(null);
    setCertificateMessages((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    try {
      const saved = await persistCertificateSettings(challenge, true);
      if (!saved) return;
      const blob = await apiFetchBlob(`/impact/challenges/${challenge.id}/certificate?format=pdf&lang=${language}`, { token: saved.token });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeFilename(challenge.title)}-${safeFilename(recipientName)}-impact-certificate${language === "es" ? "-es" : ""}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setCertificateMessages((current) => ({
        ...current,
        [id]: { type: "success", text: `${language === "es" ? "Spanish" : "English"} certificate PDF download started.` },
      }));
      await loadData();
    } catch (err) {
      setCertificateMessages((current) => ({
        ...current,
        [id]: { type: "error", text: err instanceof Error ? err.message : "Unable to download certificate PDF" },
      }));
    } finally {
      setCertificateActionId(null);
    }
  }

  async function downloadChallengeActionsXlsx(challenge: Challenge) {
    const id = String(challenge.id);
    const draft = certificateDrafts[id] || getCertificateDraft(challenge);
    const recipientName = draft.recipientName || challenge.certificateRecipientName || "recipient";
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setCertificateActionId(`download-actions-${id}`);
    setError(null);
    setCertificateMessages((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    try {
      const blob = await apiFetchBlob(`/impact/challenges/${challenge.id}/recycling-actions.xlsx`, { token });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeFilename(challenge.title)}-${safeFilename(recipientName)}-recycling-actions.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setCertificateMessages((current) => ({
        ...current,
        [id]: { type: "success", text: "Challenge recycling actions XLSX download started. Approved recycling events only." },
      }));
    } catch (err) {
      setCertificateMessages((current) => ({
        ...current,
        [id]: { type: "error", text: err instanceof Error ? err.message : "Unable to download recycling actions XLSX" },
      }));
    } finally {
      setCertificateActionId(null);
    }
  }

  function updateRequestAdminNotes(id: string, value: string) {
    setRequestAdminNotes((current) => ({ ...current, [id]: value }));
    setRequestMessage(null);
  }

  async function updateChallengeRequest(request: ChallengeRequest, status?: ChallengeRequestStatus) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const actionKey = status ? `${status}-${request.id}` : `notes-${request.id}`;
    setRequestActionId(actionKey);
    setRequestMessage(null);

    try {
      const updated = await apiFetch<{ request?: ChallengeRequest; challenge?: Challenge; emailSent?: boolean }>(`/admin/challenge-requests/${request.id}`, {
        token,
        method: "PATCH",
        body: {
          ...(status ? { status } : {}),
          adminNotes: requestAdminNotes[request.id] || null,
        },
      });
      const normalized = updated.request ? normalizeChallengeRequest(updated.request) : null;
      const normalizedChallenge = updated.challenge ? normalizeChallenge(updated.challenge) : null;
      if (normalized) {
        setChallengeRequests((current) => current.map((item) => (item.id === request.id ? normalized : item)));
        setRequestAdminNotes((current) => ({ ...current, [request.id]: normalized.adminNotes || "" }));
      }
      if (normalizedChallenge) {
        setChallenges((current) => {
          const withoutDuplicate = current.filter((challenge) => String(challenge.id) !== String(normalizedChallenge.id));
          return [normalizedChallenge, ...withoutDuplicate];
        });
        if (normalizedChallenge.challengeType === "community") {
          setCertificateDrafts((current) => ({
            ...current,
            [String(normalizedChallenge.id)]: getCertificateDraft(normalizedChallenge),
          }));
        }
      }
      setRequestMessage({
        type: "success",
        text:
          status === "approved"
            ? `Request approved and published as a live Community challenge${updated.emailSent ? ". Approval email sent." : "."}`
            : status
              ? `Request marked ${getChallengeRequestStatusLabel(status).toLowerCase()}.`
              : "Admin notes saved.",
      });
    } catch (err) {
      setRequestMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to update challenge request",
      });
    } finally {
      setRequestActionId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Superadmin CRM</p>
          <h1 className="text-3xl font-semibold text-slate-950">Challenge Manager</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Manage personal, global, and community challenges with target rules, completion rewards, dates, and activation.
          </p>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Total challenges" value={kpis.total} />
        <Kpi label="Active" value={kpis.active} />
        <Kpi label="Global" value={kpis.global} />
        <Kpi label="Community" value={kpis.community} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Community Challenge Requests</p>
              <h2 className="text-xl font-semibold text-slate-950">Review requested community challenges</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Requests submitted from the app are review-only. Approving a request publishes it as a live Community challenge.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <MiniKpi label="Total" value={requestKpis.total} />
              <MiniKpi label="Pending" value={requestKpis.pending} />
              <MiniKpi label="Rejected" value={requestKpis.rejected} />
              <MiniKpi label="Converted" value={requestKpis.converted} />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <select
              value={requestStatusFilter}
              onChange={(event) => setRequestStatusFilter(event.target.value as "all" | ChallengeRequestStatus)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 sm:w-56"
            >
              <option value="all">All statuses</option>
              {challengeRequestStatuses.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <span className="text-sm text-slate-500">{filteredChallengeRequests.length} request{filteredChallengeRequests.length === 1 ? "" : "s"} shown</span>
          </div>
          {requestMessage ? (
            <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${requestMessage.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
              {requestMessage.text}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading challenge requests...</div>
        ) : filteredChallengeRequests.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No community challenge requests match this filter.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredChallengeRequests.map((request) => (
              <article key={request.id} className="p-4">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-950">{request.challengeName}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${challengeRequestStatusTone[request.status]}`}>
                            {getChallengeRequestStatusLabel(request.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-700">{request.communityName}</p>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{request.description || "No description provided."}</p>
                      </div>
                      <div className="text-sm text-slate-500 md:text-right">
                        <div>Created {formatDateTime(request.createdAt)}</div>
                        <div>Updated {formatDateTime(request.updatedAt)}</div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <CertificateMetric label="Type" value={String(request.communityType || "other").replace(/_/g, " ")} />
                      <CertificateMetric label="Target items" value={formatNumber(Number(request.targetItems || 0))} />
                      <CertificateMetric label="Start" value={formatDateTime(request.startDate)} />
                      <CertificateMetric label="End" value={formatDateTime(request.endDate)} />
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <CertificateMetric label="Contact" value={request.contactName || "-"} />
                      <CertificateMetric label="Email" value={request.contactEmail || "-"} />
                      <CertificateMetric label="City" value={request.city || "-"} />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <CertificateMetric label="Reward idea" value={request.rewardIdea || "-"} />
                      <CertificateMetric label="Requester" value={request.requesterDisplayName || request.requesterEmail || "-"} />
                    </div>

                    {request.notes ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                        <span className="font-semibold text-slate-900">Requester notes: </span>{request.notes}
                      </div>
                    ) : null}

                    {request.approvedChallengeId ? (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
                        Converted to live challenge {request.approvedChallengeId}.
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                        Approving publishes this as a live Community challenge in the app and sends the contact an approval email.
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Admin notes</span>
                      <textarea
                        value={requestAdminNotes[request.id] || ""}
                        onChange={(event) => updateRequestAdminNotes(request.id, event.target.value)}
                        placeholder="Review notes, edits needed, follow-up owner..."
                        className="min-h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                      />
                    </label>
                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={() => updateChallengeRequest(request)}
                        disabled={requestActionId === `notes-${request.id}`}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {requestActionId === `notes-${request.id}` ? "Saving notes..." : "Save admin notes"}
                      </button>
                      {request.status === "converted" ? (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                          Published as a Community challenge
                        </div>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                          {request.status !== "rejected" ? (
                            <button
                              type="button"
                              onClick={() => updateChallengeRequest(request, "approved")}
                              disabled={requestActionId === `approved-${request.id}`}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {requestActionId === `approved-${request.id}` ? "Publishing..." : "Approve + publish challenge"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => updateChallengeRequest(request, request.status === "rejected" ? "pending" : "rejected")}
                            disabled={requestActionId === `${request.status === "rejected" ? "pending" : "rejected"}-${request.id}`}
                            className={request.status === "rejected"
                              ? "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              : "rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"}
                          >
                            {request.status === "rejected"
                              ? requestActionId === `pending-${request.id}` ? "Resetting..." : "Move back to pending"
                              : requestActionId === `rejected-${request.id}` ? "Rejecting..." : "Reject request"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
        <div className="border-b border-[var(--gl-hairline)] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--gl-green)]">Community Challenges</p>
              <h2 className="text-xl font-semibold text-[var(--gl-ink)]">Impact Certificates</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--gl-ink-muted)]">
                Certificates are automatically derived from users who joined the community challenge and recycled during the challenge window.
                Only approved recycling events are counted in the certificate metrics.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] px-3 py-1 text-xs font-semibold text-[var(--gl-ink-soft)]">
              {communityChallenges.length} community challenges
            </span>
          </div>
        </div>

        {communityChallenges.length === 0 ? (
          <div className="p-6 text-sm text-[var(--gl-ink-muted)]">
            No community challenges are available for certificates yet. Create a community challenge to enable certificate controls.
          </div>
        ) : (
          <div className="divide-y divide-[var(--gl-hairline)]">
            {communityChallenges.map((challenge) => {
              const id = String(challenge.id);
              const draft = certificateDrafts[id] || getCertificateDraft(challenge);
              const message = certificateMessages[id];
              const preview = certificatePreviews[id];
              const progress = Number(challenge.sharedProgressCount || 0);
              const required = Number(challenge.required_count || 0);
              const progressPercent = required > 0 ? Math.min(100, Math.round((progress / required) * 100)) : 0;
              const stage = getChallengeStage(challenge);
              const status = getCertificateStatus(challenge);

              return (
                <article key={challenge.id} className="p-4">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="min-w-0 space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-[var(--gl-ink)]">{challenge.title}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stage === "Completed" ? "bg-slate-100 text-slate-700" : "bg-green-100 text-green-800"}`}>
                              {stage}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${challenge.certificateEnabled ? "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]" : "bg-slate-100 text-slate-700"}`}>
                              Certificate {status.toLowerCase()}
                            </span>
                          </div>
                          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--gl-ink-muted)]">
                            {challenge.description || "Community shared-progress challenge."}
                          </p>
                        </div>
                        <div className="text-sm text-[var(--gl-ink-muted)] md:text-right">
                          <div>{formatDateTime(challenge.starts_at)}</div>
                          <div>{formatDateTime(challenge.ends_at)}</div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium text-[var(--gl-ink-soft)]">Shared progress</span>
                          <span className="font-semibold text-[var(--gl-ink)]">
                            {formatNumber(progress)} / {formatNumber(required)} items
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--gl-card-cream)]">
                          <div className="h-2 rounded-full bg-[var(--gl-green)]" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <CertificateMetric label="Recipient" value={challenge.certificateRecipientName || "Not set"} />
                        <CertificateMetric label="Type" value={challenge.certificateRecipientType ? certificateRecipientTypes.find((item) => item.value === challenge.certificateRecipientType)?.label || challenge.certificateRecipientType : "Not set"} />
                        <CertificateMetric label="Generated" value={formatDateTime(challenge.certificateGeneratedAt)} />
                      </div>

                      {preview ? (
                        <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-4">
                          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h4 className="text-sm font-semibold text-[var(--gl-ink)]">Preview certificate data</h4>
                            <span className="text-xs text-[var(--gl-ink-muted)]">Generated {formatDateTime(preview.generatedAt)}</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <CertificateMetric label="Approved events" value={formatNumber(preview.metrics.totalRecyclingEvents)} />
                            <CertificateMetric label="Products recycled" value={formatNumber(preview.metrics.totalProductsRecycled)} />
                            <CertificateMetric label="CO2 saved" value={`${formatNumber(preview.metrics.estimatedCO2Saved, 2)} kg`} />
                            <CertificateMetric label="Participants" value={formatNumber(preview.metrics.uniqueParticipants)} />
                          </div>
                          <p className="mt-3 text-xs leading-5 text-[var(--gl-ink-muted)]">
                            Preview metrics are calculated from approved recycling events only, within {formatDateTime(preview.metrics.startDate)} to {formatDateTime(preview.metrics.endDate)}.
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-4">
                      <div className="space-y-3">
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">Recipient name</span>
                          <input
                            value={draft.recipientName}
                            onChange={(event) => updateCertificateDraft(challenge.id, { recipientName: event.target.value })}
                            placeholder="School, company, event..."
                            className="w-full rounded-lg border border-[var(--gl-hairline-strong)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">Recipient type</span>
                          <select
                            value={draft.recipientType}
                            onChange={(event) => updateCertificateDraft(challenge.id, { recipientType: event.target.value as CertificateRecipientType | "" })}
                            className="w-full rounded-lg border border-[var(--gl-hairline-strong)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
                          >
                            <option value="">Select type</option>
                            {certificateRecipientTypes.map((type) => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-start gap-3 rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-3 text-sm text-[var(--gl-ink-soft)]">
                          <input
                            type="checkbox"
                            checked={draft.enabled}
                            onChange={(event) => updateCertificateDraft(challenge.id, { enabled: event.target.checked })}
                            className="mt-0.5 h-4 w-4 rounded border-[var(--gl-hairline-strong)] text-[var(--gl-green)] focus:ring-[var(--gl-green-ring)]"
                          />
                          <span>
                            <span className="block font-semibold text-[var(--gl-ink)]">Enable certificate</span>
                            Allow preview and PDF download for this community challenge.
                          </span>
                        </label>
                      </div>

                      {message ? (
                        <div
                          role={message.type === "error" ? "alert" : "status"}
                          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                            message.type === "error"
                              ? "border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] text-[var(--gl-coral-ink)]"
                              : "border-[var(--gl-hairline)] bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"
                          }`}
                        >
                          {message.text}
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-2">
                        <button
                          type="button"
                          onClick={() => saveCertificateSettings(challenge)}
                          disabled={certificateActionId === `save-${id}`}
                          className="rounded-lg bg-[var(--gl-green)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--gl-green-deep)] disabled:opacity-60"
                        >
                          {certificateActionId === `save-${id}` ? "Saving..." : "Save certificate settings"}
                        </button>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                          <button
                            type="button"
                            onClick={() => previewCertificate(challenge)}
                            disabled={certificateActionId === `preview-${id}`}
                            className="rounded-lg border border-[var(--gl-hairline-strong)] bg-[var(--gl-paper)] px-3 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-white disabled:opacity-60"
                          >
                            {certificateActionId === `preview-${id}` ? "Saving + loading..." : "Save + preview data"}
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadCertificatePdf(challenge, "en")}
                            disabled={certificateActionId === `download-en-${id}`}
                            className="rounded-lg border border-[var(--gl-hairline-strong)] bg-[var(--gl-paper)] px-3 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-white disabled:opacity-60"
                          >
                            {certificateActionId === `download-en-${id}` ? "Saving + downloading..." : "Save + download PDF EN"}
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadCertificatePdf(challenge, "es")}
                            disabled={certificateActionId === `download-es-${id}`}
                            className="rounded-lg border border-[var(--gl-hairline-strong)] bg-[var(--gl-paper)] px-3 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-white disabled:opacity-60"
                          >
                            {certificateActionId === `download-es-${id}` ? "Guardando + descargando..." : "Save + download PDF ES"}
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadChallengeActionsXlsx(challenge)}
                            disabled={certificateActionId === `download-actions-${id}`}
                            className="rounded-lg border border-[var(--gl-hairline-strong)] bg-[var(--gl-paper)] px-3 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-white disabled:opacity-60"
                          >
                            {certificateActionId === `download-actions-${id}` ? "Downloading actions..." : "Download recycling actions XLSX"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteChallenge(challenge.id)}
                            disabled={actionId === `delete-${id}`}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            {actionId === `delete-${id}` ? "Deleting..." : "Delete community challenge"}
                          </button>
                        </div>
                        <p className="text-xs leading-5 text-[var(--gl-ink-muted)]">
                          The XLSX includes what was recycled, when, where, and by whom. Only approved recycling events are included.
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">All challenges</h2>
              <p className="text-sm text-slate-500">Global is per user; community is shared progress.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or target" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="all">All types</option>
                <option value="personal">Personal</option>
                <option value="global">Global</option>
                <option value="community">Community</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Challenge</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Target</th>
                  <th className="px-4 py-2.5">Required</th>
                  <th className="px-4 py-2.5">Progress</th>
                  <th className="px-4 py-2.5">Bonus</th>
                  <th className="px-4 py-2.5">Reward</th>
                  <th className="px-4 py-2.5">Dates</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Loading challenges...</td></tr>
                ) : filteredChallenges.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">No challenges match the current filters.</td></tr>
                ) : (
                  filteredChallenges.map((challenge) => (
                    <tr key={challenge.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-950">{challenge.title}</div>
                        <div className="mt-1 max-w-xs truncate text-xs text-slate-500">{challenge.description || "No description"}</div>
                      </td>
                      <td className="px-4 py-2.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${typeTone(challenge.challengeType)}`}>{challenge.challengeType}</span></td>
                      <td className="px-4 py-2.5">
                        <div className="capitalize text-slate-500">{challenge.targetKind || "brand"}</div>
                        <div className="font-medium text-slate-800">{getTargetValue(challenge) || "-"}</div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{challenge.required_count}</td>
                      <td className="px-4 py-2.5 text-slate-700">{challenge.challengeType === "community" ? `${Number(challenge.sharedProgressCount || 0)} / ${challenge.required_count}` : "-"}</td>
                      <td className="px-4 py-2.5 text-slate-700">{challenge.challengeType === "community" ? `${challenge.bonus_points} / user` : challenge.bonus_points}</td>
                      <td className="px-4 py-2.5 text-slate-700">{challenge.completionRewardTitle || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-700">
                        <div>{formatDateTime(challenge.starts_at)}</div>
                        <div className="text-xs text-slate-500">{formatDateTime(challenge.ends_at)}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        {(() => {
                          const visibility = getVisibilityStatus(challenge);
                          return (
                            <div className="space-y-1">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${visibility.className}`}>
                                {visibility.label}
                              </span>
                              <div className="max-w-[170px] text-xs leading-5 text-slate-500">{visibility.detail}</div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/challenges/${challenge.id}`} className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">View</Link>
                          <button onClick={() => startEdit(challenge)} className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Edit</button>
                          <button onClick={() => toggleChallenge(challenge.id)} disabled={actionId === `toggle-${challenge.id}`} className="rounded-md bg-emerald-600 px-3 py-1.5 text-white disabled:opacity-60">Toggle</button>
                          <button onClick={() => deleteChallenge(challenge.id)} disabled={actionId === `delete-${challenge.id}`} className="rounded-md bg-red-600 px-3 py-1.5 text-white disabled:opacity-60">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit challenge" : "Create challenge"}</h2>
              <p className="text-sm text-slate-500">Target, timing, progress, and reward</p>
            </div>
            {editingId ? <button type="button" onClick={resetForm} className="text-sm font-semibold text-slate-600 hover:text-slate-950">New challenge</button> : null}
          </div>
          <div className="space-y-4">
            {editingId ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-5 text-amber-900">
                You are editing an existing challenge. Changing the type here converts this challenge and keeps its current title, description, target, dates, and reward. Use New challenge to start with an empty form.
              </div>
            ) : null}
            <Select
              label="Challenge type"
              value={form.challengeType}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  challengeType: value as ChallengeType,
                  bonus_points: value === "community" && (!current.bonus_points || current.bonus_points === "0") ? "50" : current.bonus_points,
                }))
              }
            >
              <option value="personal">Personal</option>
              <option value="global">Global</option>
              <option value="community">Community</option>
            </Select>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs leading-5 text-slate-600">{challengeSummary(form.challengeType)}</div>
            <Select label="Target type" value={form.targetKind} onChange={(value) => setForm((current) => ({ ...current, targetKind: value as TargetKind }))}>
              <option value="any">Any recycled item</option>
              <option value="brand">Brand</option>
              <option value="material">Material</option>
              <option value="format">Format</option>
            </Select>
            {form.targetKind === "brand" ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Target brand</span>
                <input list="admin-challenge-brand-options" value={form.targetBrandKey || form.brand_key} onChange={(event) => setForm((current) => ({ ...current, targetBrandKey: event.target.value, brand_key: event.target.value }))} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15" />
                <datalist id="admin-challenge-brand-options">
                  {brands.map((brand) => <option key={brand.id} value={brand.name} />)}
                </datalist>
              </label>
            ) : null}
            {form.targetKind === "material" ? (
              <Select label="Target material" value={form.targetMaterialType} onChange={(value) => setForm((current) => ({ ...current, targetMaterialType: value }))}>
                <option value="">Select material</option>
                <option value="plastic">plastic</option>
                <option value="aluminium">aluminium</option>
                <option value="glass">glass</option>
                <option value="paper">paper</option>
              </Select>
            ) : null}
            {form.targetKind === "format" ? (
              <Select label="Target format" value={form.targetFormatType} onChange={(value) => setForm((current) => ({ ...current, targetFormatType: value }))}>
                <option value="">Select format</option>
                <option value="bottle">bottle</option>
                <option value="can">can</option>
                <option value="jar">jar</option>
                <option value="carton">carton</option>
              </Select>
            ) : null}
            <Field label="Title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} required />
            <Textarea label="Description" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} required />
            <Select label="Unlock reward on completion" value={form.completionRewardId} onChange={(value) => setForm((current) => ({ ...current, completionRewardId: value }))}>
              <option value="">No completion reward</option>
              <optgroup label="Recommended: Challenge Rewards">
                {rewards.filter((reward) => reward.active && reward.acquisition_mode === "challenge_completion").map((reward) => (
                  <option key={reward.id} value={String(reward.id)}>{reward.title}</option>
                ))}
              </optgroup>
              <optgroup label="Also available: Catalog Unlocks">
                {rewards.filter((reward) => reward.active && reward.acquisition_mode !== "challenge_completion").map((reward) => (
                  <option key={reward.id} value={String(reward.id)}>{reward.title}</option>
                ))}
              </optgroup>
            </Select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={form.challengeType === "community" ? "Shared item target" : "Required count"} type="number" min="1" value={form.required_count} onChange={(value) => setForm((current) => ({ ...current, required_count: value }))} required />
              <Field label={form.challengeType === "community" ? "EcoPoints per joined user" : "Bonus EcoPoints"} type="number" min="0" value={form.bonus_points} onChange={(value) => setForm((current) => ({ ...current, bonus_points: value }))} required={!form.completionRewardId} />
            </div>
            {form.challengeType === "community" ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs leading-5 text-slate-600">
                Put the shared goal here. For a 25,000 item university challenge, enter 25000 in Shared item target. The app shows community progress as recycled items / shared item target.
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Starts at" type="datetime-local" value={form.starts_at} onChange={(value) => setForm((current) => ({ ...current, starts_at: value }))} required />
              <Field label="Ends at" type="datetime-local" value={form.ends_at} onChange={(value) => setForm((current) => ({ ...current, ends_at: value }))} required />
            </div>
            <button disabled={saving} className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {saving ? "Saving..." : editingId ? "Update challenge" : "Create challenge"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getTargetValue(challenge: Challenge) {
  if (challenge.targetKind === "any") return "Any recycled item";
  if (challenge.targetKind === "material") return challenge.targetMaterialType || "";
  if (challenge.targetKind === "format") return challenge.targetFormatType || "";
  return challenge.targetBrandKey || challenge.brand_key || "";
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function CertificateMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[var(--gl-ink)]">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15" />
    </label>
  );
}

function Textarea({ label, value, onChange, ...props }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <textarea {...props} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15" />
    </label>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15">
        {children}
      </select>
    </label>
  );
}
