"use client";

import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Download, Filter, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type AdminUser = {
  id: string;
  display_name: string;
  email: string;
  role: string;
  brand_id?: string | null;
  created_at: string;
  deactivated_at?: string | null;
  wallet_points: number;
  scan_events_count: number;
  redeemed_rewards_count?: number;
  recycling_events_count: number;
  recycled_units_count: number;
  last_activity_at?: string | null;
  latest_city?: string | null;
  latest_province?: string | null;
  profile_city?: string | null;
  profile_country?: string | null;
  signup_city?: string | null;
  signup_country?: string | null;
  signup_location_source?: "ip_estimate" | "unavailable" | null;
  signup_location_recorded_at?: string | null;
  app_platform?: string | null;
  appPlatform?: string | null;
  app_version?: string | null;
  appVersion?: string | null;
  app_seen_at?: string | null;
  appSeenAt?: string | null;
  push_platform?: string | null;
  pushPlatform?: string | null;
  push_seen_at?: string | null;
  pushSeenAt?: string | null;
};

type UserActivityResponse = {
  user: AdminUser;
  active_challenges?: {
    user_challenge_id: string;
    id: string;
    title: string;
    challenge_type: string;
    required_count: number;
    bonus_points: number;
    progress_count: number;
    accepted_at: string;
    starts_at?: string | null;
    ends_at?: string | null;
  }[];
  scan_events: {
    id: string;
    barcode: string;
    trust_tier: string;
    created_at: string;
    lat: number | null;
    lng: number | null;
  }[];
  recycling_events: {
    id: string;
    created_at: string;
    city: string | null;
    province: string | null;
    lat: number | null;
    lng: number | null;
    verification_status: string;
    units: number;
    points_issued: number;
    items: {
      barcode: string;
      product_name: string;
    }[];
  }[];
};

type Brand = {
  id: string;
  name: string;
};

type EditUserFormState = {
  display_name: string;
  role: string;
  brand_id: string;
};

type ActivityFiltersState = {
  from: string;
  to: string;
};

type UserTableFiltersState = {
  name: string;
  email: string;
  role: string;
  minWallet: string;
  minRewards: string;
  minRecyclingEvents: string;
  minUnits: string;
  signedUpFrom: string;
  signedUpTo: string;
  lastActivityFrom: string;
  lastActivityTo: string;
  status: string;
};

const emptyUserTableFilters: UserTableFiltersState = {
  name: "",
  email: "",
  role: "",
  minWallet: "",
  minRewards: "",
  minRecyclingEvents: "",
  minUnits: "",
  signedUpFrom: "",
  signedUpTo: "",
  lastActivityFrom: "",
  lastActivityTo: "",
  status: "",
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function isDateOnOrAfter(value: string | null | undefined, dateFilter: string) {
  if (!dateFilter) return true;
  if (!value) return false;
  const valueTime = new Date(value).getTime();
  const filterTime = new Date(`${dateFilter}T00:00:00`).getTime();
  return !Number.isNaN(valueTime) && !Number.isNaN(filterTime) && valueTime >= filterTime;
}

function isDateOnOrBefore(value: string | null | undefined, dateFilter: string) {
  if (!dateFilter) return true;
  if (!value) return false;
  const valueTime = new Date(value).getTime();
  const filterTime = new Date(`${dateFilter}T23:59:59`).getTime();
  return !Number.isNaN(valueTime) && !Number.isNaN(filterTime) && valueTime <= filterTime;
}

function meetsMinimum(value: number | null | undefined, minimum: string) {
  if (!minimum) return true;
  const parsed = Number(minimum);
  if (Number.isNaN(parsed)) return true;
  return Number(value || 0) >= parsed;
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function getUserPlatform(user?: AdminUser | null) {
  return user?.app_platform || user?.appPlatform || user?.push_platform || user?.pushPlatform || null;
}

function getUserAppVersion(user?: AdminUser | null) {
  return user?.app_version || user?.appVersion || null;
}

function getUserPlatformSeenAt(user?: AdminUser | null) {
  return user?.app_seen_at || user?.appSeenAt || user?.push_seen_at || user?.pushSeenAt || null;
}

function formatUserPlatform(user?: AdminUser | null) {
  const platform = getUserPlatform(user)?.toLowerCase();
  if (platform === "ios") return "iOS app";
  if (platform === "android") return "Android app";
  if (platform === "web") return "Web";
  return "Unknown app";
}

function getUserPlatformClasses(user?: AdminUser | null) {
  const platform = getUserPlatform(user)?.toLowerCase();
  if (platform === "ios") return "bg-slate-100 text-slate-700";
  if (platform === "android") return "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]";
  if (platform === "web") return "bg-blue-50 text-blue-700";
  return "bg-[var(--gl-card-cream)] text-[var(--gl-ink-muted)]";
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const tr = (en: string, es: string) => language === "es" ? es : en;
  const signupLocation = (user: AdminUser) => user.signup_location_source === "ip_estimate"
    ? [user.signup_city, user.signup_country].filter(Boolean).join(", ") + tr(" (approximate IP location)", " (ubicación IP aproximada)")
    : user.signup_location_source === "unavailable"
      ? tr("Unavailable at signup", "No disponible al registrarse")
      : tr("Not recorded", "Sin registrar");
  const [paneOpen, setPaneOpen] = useState(false);
  const [userTab, setUserTab] = useState<"overview" | "activity" | "challenges" | "account">("overview");
  const [pointsMode, setPointsMode] = useState<"add" | "remove">("add");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const listScroll = useRef(0);
  const listPaneScroll = useRef(0);
  const opener = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [userTableFilters, setUserTableFilters] = useState<UserTableFiltersState>(emptyUserTableFilters);
  const [selectedUser, setSelectedUser] = useState<UserActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addingEcoPoints, setAddingEcoPoints] = useState(false);
  const [ecoPointsToAdd, setEcoPointsToAdd] = useState("");
  const [removingEcoPoints, setRemovingEcoPoints] = useState(false);
  const [ecoPointsToRemove, setEcoPointsToRemove] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [resettingAvatarUserId, setResettingAvatarUserId] = useState<string | null>(null);
  const [removingChallengeId, setRemovingChallengeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditUserFormState>({
    display_name: "",
    role: "user",
    brand_id: "",
  });
  const [activityFilters, setActivityFilters] = useState<ActivityFiltersState>({
    from: "",
    to: "",
  });
  const recycleHistorySummary = useMemo(() => {
    if (!selectedUser) {
      return {
        totalEvents: 0,
        totalUnits: 0,
        totalPoints: 0,
      };
    }

    return selectedUser.recycling_events.reduce(
      (summary, event) => ({
        totalEvents: summary.totalEvents + 1,
        totalUnits: summary.totalUnits + Number(event.units || 0),
        totalPoints: summary.totalPoints + Number(event.points_issued || 0),
      }),
      {
        totalEvents: 0,
        totalUnits: 0,
        totalPoints: 0,
      }
    );
  }, [selectedUser]);

  const loadUsers = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setError(null);
      const [usersResult, brandsResult] = await Promise.all([
        apiFetch<{ users?: AdminUser[] }>("/admin/users", { token }),
        apiFetch<{ brands?: Brand[] }>("/admin/brands", { token }),
      ]);
      setUsers(Array.isArray(usersResult?.users) ? usersResult.users : []);
      setBrands(Array.isArray(brandsResult?.brands) ? brandsResult.brands : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) =>
      (!query ||
        [user.display_name, user.email, user.role, user.profile_city, user.profile_country, user.signup_city, user.signup_country, formatUserPlatform(user), getUserAppVersion(user)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))) &&
      (!userTableFilters.name.trim() ||
        user.display_name.toLowerCase().includes(userTableFilters.name.trim().toLowerCase())) &&
      (!userTableFilters.email.trim() ||
        user.email.toLowerCase().includes(userTableFilters.email.trim().toLowerCase())) &&
      (!userTableFilters.role || user.role === userTableFilters.role) &&
      meetsMinimum(user.wallet_points, userTableFilters.minWallet) &&
      meetsMinimum(user.redeemed_rewards_count ?? 0, userTableFilters.minRewards) &&
      meetsMinimum(user.recycling_events_count, userTableFilters.minRecyclingEvents) &&
      meetsMinimum(user.recycled_units_count, userTableFilters.minUnits) &&
      isDateOnOrAfter(user.created_at, userTableFilters.signedUpFrom) &&
      isDateOnOrBefore(user.created_at, userTableFilters.signedUpTo) &&
      isDateOnOrAfter(user.last_activity_at, userTableFilters.lastActivityFrom) &&
      isDateOnOrBefore(user.last_activity_at, userTableFilters.lastActivityTo) &&
      (!userTableFilters.status ||
        (userTableFilters.status === "active" && !user.deactivated_at) ||
        (userTableFilters.status === "deactivated" && Boolean(user.deactivated_at)))
    );
  }, [search, userTableFilters, users]);

  const activeUserTableFilterCount = useMemo(
    () => Object.values(userTableFilters).filter((value) => value.trim()).length,
    [userTableFilters]
  );

  function updateUserTableFilter<K extends keyof UserTableFiltersState>(key: K, value: UserTableFiltersState[K]) {
    setUserTableFilters((current) => ({ ...current, [key]: value }));
  }

  async function loadUserActivity(userId: string, filters?: ActivityFiltersState) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setActivityLoading(true);
      setError(null);
      const nextFilters = filters ?? activityFilters;
      const params = new URLSearchParams();
      if (nextFilters.from) params.set("from", nextFilters.from);
      if (nextFilters.to) params.set("to", nextFilters.to);
      const path = `/admin/users/${userId}/activity${params.toString() ? `?${params.toString()}` : ""}`;
      const result = (await apiFetch(path, {
        token,
      })) as UserActivityResponse;
      setSelectedUser(result);
      setEditForm({
        display_name: result.user.display_name || "",
        role: result.user.role || "user",
        brand_id: result.user.brand_id || "",
      });
      setEcoPointsToAdd("");
      setEcoPointsToRemove("");
      setManualPassword("");
      setActivityFilters(nextFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load user activity");
    } finally {
      setActivityLoading(false);
    }
  }

  async function addEcoPoints() {
    if (!selectedUser) return;

    const points = Number(ecoPointsToAdd);
    if (!Number.isInteger(points) || points <= 0) {
      setError("EcoPoints amount must be a positive whole number.");
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setAddingEcoPoints(true);
      setError(null);
      await apiFetch(`/admin/users/${selectedUser.user.id}/ecopoints`, {
        token,
        method: "POST",
        body: { points, action: "add" },
      });
      setEcoPointsToAdd("");
      await loadUsers();
      await loadUserActivity(selectedUser.user.id, activityFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add EcoPoints");
    } finally {
      setAddingEcoPoints(false);
    }
  }

  async function removeEcoPoints() {
    if (!selectedUser) return;

    const points = Number(ecoPointsToRemove);
    if (!Number.isInteger(points) || points <= 0) {
      setError("EcoPoints amount to remove must be a positive whole number.");
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setRemovingEcoPoints(true);
      setError(null);
      await apiFetch(`/admin/users/${selectedUser.user.id}/ecopoints`, {
        token,
        method: "POST",
        body: { points, action: "remove" },
      });
      setEcoPointsToRemove("");
      await loadUsers();
      await loadUserActivity(selectedUser.user.id, activityFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove EcoPoints");
    } finally {
      setRemovingEcoPoints(false);
    }
  }

  async function resetAvatarProgress(user: AdminUser) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const confirmed = window.confirm(
      `Reset avatar progress for ${user.display_name || user.email} back to the turtle at 0 points?`
    );
    if (!confirmed) return;

    try {
      setResettingAvatarUserId(user.id);
      setError(null);
      await apiFetch(`/admin/users/${user.id}/companion/reset`, {
        token,
        method: "POST",
      });
      if (selectedUser?.user.id === user.id) {
        await loadUserActivity(user.id, activityFilters);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset avatar progress");
    } finally {
      setResettingAvatarUserId(null);
    }
  }

  async function removeUserFromChallenge(challengeId: string, challengeTitle: string) {
    if (!selectedUser) return;

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const confirmed = window.confirm(
      `Remove ${selectedUser.user.display_name || selectedUser.user.email} from "${challengeTitle}"? Their progress for this challenge will be deleted.`
    );
    if (!confirmed) return;

    try {
      setRemovingChallengeId(challengeId);
      setError(null);
      await apiFetch(`/admin/users/${selectedUser.user.id}/challenges/${challengeId}`, {
        token,
        method: "DELETE",
      });
      await loadUserActivity(selectedUser.user.id, activityFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove challenge");
    } finally {
      setRemovingChallengeId(null);
    }
  }

  async function toggleDeactivate(userId: string) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setActiveAction(userId);
      setError(null);
      await apiFetch(`/admin/users/${userId}/deactivate`, {
        token,
        method: "PATCH",
      });
      await loadUsers();
      if (selectedUser?.user.id === userId) {
        await loadUserActivity(userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user");
    } finally {
      setActiveAction(null);
    }
  }

  async function saveUserEdits() {
    if (!selectedUser) return;

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setSavingEdit(true);
      setError(null);
      await apiFetch(`/admin/users/${selectedUser.user.id}`, {
        token,
        method: "PATCH",
        body: {
          display_name: editForm.display_name.trim(),
          role: editForm.role,
          brand_id: editForm.brand_id || null,
        },
      });
      await loadUsers();
      await loadUserActivity(selectedUser.user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save user");
    } finally {
      setSavingEdit(false);
    }
  }

  async function changeUserPassword() {
    if (!selectedUser) return;

    if (manualPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const confirmed = window.confirm(
      `Set a new password for ${selectedUser.user.display_name || selectedUser.user.email}?`
    );
    if (!confirmed) return;

    try {
      setSavingPassword(true);
      setError(null);
      await apiFetch(`/admin/users/${selectedUser.user.id}/password`, {
        token,
        method: "PATCH",
        body: { password: manualPassword },
      });
      setManualPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  function exportVisibleUsers() {
    const headers = [
      "display_name",
      "email",
      "role",
      "app_platform",
      "app_version",
      "app_seen_at",
      "created_at",
      "status",
      "wallet_points",
      "redeemed_rewards_count",
      "recycling_events_count",
      "recycled_units_count",
      "last_activity_at",
      "latest_city",
      "latest_province",
      "profile_city",
      "profile_country",
      "signup_city",
      "signup_country",
      "signup_location_source",
      "signup_location_recorded_at",
    ];

    const rows = filteredUsers.map((user) => ({
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      app_platform: formatUserPlatform(user),
      app_version: getUserAppVersion(user) ?? "",
      app_seen_at: getUserPlatformSeenAt(user) ?? "",
      created_at: user.created_at,
      status: user.deactivated_at ? "deactivated" : "active",
      wallet_points: user.wallet_points,
      redeemed_rewards_count: user.redeemed_rewards_count ?? 0,
      recycling_events_count: user.recycling_events_count,
      recycled_units_count: user.recycled_units_count,
      last_activity_at: user.last_activity_at ?? "",
      latest_city: user.latest_city ?? "",
      profile_city: user.profile_city ?? "",
      profile_country: user.profile_country ?? "",
      signup_city: user.signup_city ?? "",
      signup_country: user.signup_country ?? "",
      signup_location_source: user.signup_location_source ?? "",
      signup_location_recorded_at: user.signup_location_recorded_at ?? "",
      latest_province: user.latest_province ?? "",
    }));

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => headers.map((key) => csvCell(row[key as keyof typeof row])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `greenloop-users-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function applyActivityFilters() {
    if (!selectedUser) return;
    void loadUserActivity(selectedUser.user.id, activityFilters);
  }

  function resetActivityFilters() {
    if (!selectedUser) return;
    const resetFilters = { from: "", to: "" };
    setActivityFilters(resetFilters);
    void loadUserActivity(selectedUser.user.id, resetFilters);
  }

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageUsers = filteredUsers.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const busy = activityLoading || savingEdit || addingEcoPoints || removingEcoPoints || savingPassword || Boolean(activeAction || resettingAvatarUserId || removingChallengeId);
  const inputClass = "min-w-0 w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]";
  const commandClass = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
  const userTabs = [
    { id: "overview", label: tr("Overview", "Resumen") },
    { id: "activity", label: tr("Activity", "Actividad") },
    { id: "challenges", label: tr("Challenges", "Retos") },
    { id: "account", label: tr("Account", "Cuenta") },
  ] as const;
  const filterFields: { key: keyof UserTableFiltersState; label: string; type: "text" | "number" | "date" }[] = [
    { key: "name", label: tr("Name", "Nombre"), type: "text" },
    { key: "email", label: tr("Email", "Correo electrónico"), type: "text" },
    { key: "minWallet", label: tr("Min wallet", "Saldo mínimo"), type: "number" },
    { key: "minRewards", label: tr("Min rewards", "Recompensas mínimas"), type: "number" },
    { key: "minRecyclingEvents", label: tr("Min recycling events", "Eventos mínimos"), type: "number" },
    { key: "minUnits", label: tr("Min units", "Unidades mínimas"), type: "number" },
    { key: "signedUpFrom", label: tr("Signed up from", "Registro desde"), type: "date" },
    { key: "signedUpTo", label: tr("Signed up to", "Registro hasta"), type: "date" },
    { key: "lastActivityFrom", label: tr("Last activity from", "Actividad desde"), type: "date" },
    { key: "lastActivityTo", label: tr("Last activity to", "Actividad hasta"), type: "date" },
  ];

  function openUser(userId: string, element: HTMLElement) {
    if (busy) return;
    listScroll.current = window.scrollY;
    listPaneScroll.current = document.getElementById("users-list")?.scrollTop || 0;
    opener.current = element;
    setSelectedUser(null);
    setUserTab("overview");
    setPaneOpen(true);
    void loadUserActivity(userId);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      document.getElementById("user-pane-heading")?.focus();
    });
  }

  function closeUser() {
    if (busy) return;
    setPaneOpen(false);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: listScroll.current });
      document.getElementById("users-list")?.scrollTo({ top: listPaneScroll.current });
      opener.current?.focus({ preventScroll: true });
    });
  }

  function statusLabel(user: AdminUser) {
    return (
      <span className={"inline-flex max-w-full rounded px-1.5 py-0.5 text-xs font-medium " + (user.deactivated_at
        ? "bg-[var(--gl-hairline)] text-[var(--gl-ink-soft)]"
        : "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]")}>
        {user.deactivated_at ? tr("Deactivated", "Desactivado") : tr("Active", "Activo")}
      </span>
    );
  }

  if (loading) {
    return <p role="status" className="text-sm text-[var(--gl-ink-muted)]">{tr("Loading users...", "Cargando usuarios...")}</p>;
  }

  return (
    <div data-user-workspace data-open={paneOpen || undefined} className="min-w-0 space-y-4 text-[var(--gl-ink)]">
      {error ? <div role="alert" className="rounded-md bg-[var(--gl-coral-soft)] px-3 py-2 text-sm text-[var(--gl-coral-ink)]">{error}</div> : null}

      <div data-user-list className="space-y-3">
        <WorkspaceHeader className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">{tr("Users", "Usuarios")}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/activity" className={commandClass + " text-[var(--gl-green)] hover:bg-[var(--gl-green-soft)]"}>
              {tr("Recycling activity", "Actividad de reciclaje")}<ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </Link>
            <button type="button" onClick={exportVisibleUsers} className={commandClass + " bg-[var(--gl-paper)] hover:bg-[var(--gl-green-soft)]"}>
              <Download aria-hidden="true" className="h-4 w-4" />{tr("Export CSV", "Exportar CSV")}
            </button>
          </div>
        </WorkspaceHeader>

        <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_10rem]">
          <label className="col-span-2 block min-w-0 sm:col-span-1">
            <span className="sr-only">{tr("Search users", "Buscar usuarios")}</span>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--gl-ink-muted)]" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }}
                placeholder={tr("Name, email, role or app", "Nombre, correo, rol o app")} className={inputClass + " pl-9"} />
            </div>
          </label>
          <label className="block min-w-0">
            <span className="sr-only">{tr("Role", "Rol")}</span>
            <select value={userTableFilters.role} onChange={(event) => { updateUserTableFilter("role", event.target.value); setPage(0); }} className={inputClass}>
              <option value="">{tr("All roles", "Todos los roles")}</option>
              {["user", "partner", "brand_admin", "organization", "admin"].map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="sr-only">{tr("Status", "Estado")}</span>
            <select value={userTableFilters.status} onChange={(event) => { updateUserTableFilter("status", event.target.value); setPage(0); }} className={inputClass}>
              <option value="">{tr("All statuses", "Todos los estados")}</option>
              <option value="active">{tr("Active", "Activo")}</option>
              <option value="deactivated">{tr("Deactivated", "Desactivado")}</option>
            </select>
          </label>
        </div>

        <details className="group">
          <summary className="flex min-h-10 w-fit cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-[var(--gl-ink-muted)] [&::-webkit-details-marker]:hidden">
            <Filter aria-hidden="true" className="h-3.5 w-3.5" />
            {tr("More filters", "Más filtros")}{activeUserTableFilterCount > 0 ? " (" + activeUserTableFilterCount + ")" : ""}
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 bg-[var(--gl-paper)] p-3 sm:grid-cols-2 xl:grid-cols-5">
            {filterFields.map((field) => <FilterText key={field.key} label={field.label} type={field.type} value={userTableFilters[field.key]}
              onChange={(value) => { updateUserTableFilter(field.key, value); setPage(0); }} />)}
          </div>
        </details>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--gl-ink-muted)]">
          <p role="status">{filteredUsers.length ? currentPage * pageSize + 1 : 0}–{Math.min((currentPage + 1) * pageSize, filteredUsers.length)} / {filteredUsers.length.toLocaleString()} {tr("users", "usuarios")}
            {filteredUsers.length !== users.length ? " · " + users.length.toLocaleString() + " " + tr("total", "en total") : ""}</p>
          {(search || activeUserTableFilterCount > 0) ? <button type="button" onClick={() => { setSearch(""); setUserTableFilters(emptyUserTableFilters); setPage(0); }}
            className="min-h-9 text-sm font-medium text-[var(--gl-green)]">{tr("Reset filters", "Restablecer filtros")}</button> : null}
        </div>

        <section id="users-list" tabIndex={0} aria-label={tr("User list", "Lista de usuarios")} className="max-h-[max(16rem,calc(100dvh-22rem))] overflow-auto">
          <div className="hidden overflow-x-auto bg-[var(--gl-paper)] xl:block">
            <table className="w-full min-w-[880px] table-fixed text-left text-sm">
              <thead className="sticky top-0 bg-[var(--gl-paper)] text-xs text-[var(--gl-ink-muted)]">
                <tr>
                  <th scope="col" className="w-[24%] px-3 py-2">{tr("Name / Email", "Nombre / Correo")}</th>
                  <th scope="col" className="w-[10%] px-2 py-2">{tr("Signed up", "Registro")}</th>
                  <th scope="col" className="w-[9%] px-2 py-2">{tr("Role", "Rol")}</th>
                  <th scope="col" className="w-[7%] px-2 py-2 text-right">{tr("Wallet", "Saldo")}</th>
                  <th scope="col" className="w-[10%] px-2 py-2 text-right">{tr("Rewards", "Recompensas")}</th>
                  <th scope="col" className="w-[8%] px-2 py-2 text-right">{tr("Events", "Eventos")}</th>
                  <th scope="col" className="w-[7%] px-2 py-2 text-right">{tr("Units", "Unidades")}</th>
                  <th scope="col" className="w-[14%] px-3 py-2">{tr("Last activity", "Última actividad")}</th>
                  <th scope="col" className="w-[11%] px-2 py-2">{tr("Status", "Estado")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gl-hairline)]">
                {pageUsers.map((user) => (
                  <tr key={user.id} data-selected={paneOpen && selectedUser?.user.id === user.id || undefined} className="align-top hover:bg-[var(--gl-card-cream)]">
                    <td className="break-words px-3 py-2 [overflow-wrap:anywhere]">
                      <button type="button" onClick={(event) => openUser(user.id, event.currentTarget)}
                        className="block min-h-6 text-left font-semibold text-[var(--gl-green)] underline-offset-2 hover:underline">
                        {user.display_name || user.email}
                      </button>
                      <p title={user.email} className="text-xs text-[var(--gl-ink-muted)]">{user.email}</p>
                      <p className="text-xs text-[var(--gl-ink-muted)]">{tr("Profile city / country", "Ciudad / país del perfil")}: {[user.profile_city, user.profile_country].filter(Boolean).join(", ") || tr("Not recorded", "Sin registrar")}</p>
                      <p className="text-xs text-[var(--gl-ink-muted)]">{tr("Signup city / country", "Ciudad / país de registro")}: {signupLocation(user)}</p>
                      <p className="mt-0.5 text-xs text-[var(--gl-ink-muted)]"><span className={"rounded px-1 " + getUserPlatformClasses(user)}>{formatUserPlatform(user)}</span>{getUserAppVersion(user) ? " · v" + getUserAppVersion(user) : ""}</p>
                    </td>
                    <td className="px-2 py-2 text-xs" title={formatDateTime(user.created_at)}>{formatDate(user.created_at)}</td>
                    <td className="break-words px-2 py-2 text-xs">{user.role}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{user.wallet_points}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{user.redeemed_rewards_count ?? 0}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{user.recycling_events_count}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{user.recycled_units_count}</td>
                    <td className="px-3 py-2 text-xs">{formatDateTime(user.last_activity_at)}</td>
                    <td className="px-2 py-2">{statusLabel(user)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[var(--gl-hairline)] bg-[var(--gl-paper)] xl:hidden">
            {pageUsers.map((user) => (
              <button key={user.id} type="button" onClick={(event) => openUser(user.id, event.currentTarget)}
                className="block w-full space-y-2 px-3 py-3 text-left hover:bg-[var(--gl-card-cream)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                    <p className="text-sm font-semibold text-[var(--gl-green)]">{user.display_name || user.email}</p>
                    <p className="text-xs text-[var(--gl-ink-muted)]">{user.email}</p>
                    <p className="text-xs text-[var(--gl-ink-muted)]">{tr("Profile city / country", "Ciudad / país del perfil")}: {[user.profile_city, user.profile_country].filter(Boolean).join(", ") || tr("Not recorded", "Sin registrar")}</p>
                    <p className="text-xs text-[var(--gl-ink-muted)]">{tr("Signup city / country", "Ciudad / país de registro")}: {signupLocation(user)}</p>
                    <p className="text-xs text-[var(--gl-ink-muted)]">{user.role} · {formatUserPlatform(user)}{getUserAppVersion(user) ? " · v" + getUserAppVersion(user) : ""}</p>
                  </div>
                  <span className="shrink-0">{statusLabel(user)}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-[var(--gl-ink-muted)]">
                  {[[tr("Wallet", "Saldo"), user.wallet_points], [tr("Rewards", "Recompensas"), user.redeemed_rewards_count ?? 0], [tr("Events", "Eventos"), user.recycling_events_count], [tr("Units", "Unidades"), user.recycled_units_count]].map(([label, value]) =>
                    <p key={label}><span className="block">{label}</span><span className="font-semibold tabular-nums text-[var(--gl-ink)]">{value}</span></p>)}
                </div>
                <div className="flex flex-wrap justify-between gap-1 text-xs text-[var(--gl-ink-muted)]">
                  <p>{tr("Signed up", "Registro")}: {formatDate(user.created_at)}</p>
                  <p>{tr("Last activity", "Última actividad")}: {formatDateTime(user.last_activity_at)}</p>
                </div>
              </button>
            ))}
          </div>
          {pageUsers.length === 0 ? <p className="bg-[var(--gl-paper)] px-3 py-6 text-sm text-[var(--gl-ink-muted)]">{tr("No users found.", "No se encontraron usuarios.")}</p> : null}
        </section>

        <nav aria-label={tr("User pages", "Páginas de usuarios")} className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--gl-ink-muted)]">
          <label className="flex items-center gap-2">{tr("Rows", "Filas")}
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} className="rounded-md bg-[var(--gl-paper)] px-2 py-2">
              {[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <button type="button" title={tr("Previous page", "Página anterior")} aria-label={tr("Previous page", "Página anterior")}
              disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className={commandClass}>
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span>{currentPage + 1} / {pageCount}</span>
            <button type="button" title={tr("Next page", "Página siguiente")} aria-label={tr("Next page", "Página siguiente")}
              disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)} className={commandClass}>
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </nav>
      </div>

      <section data-user-detail hidden={!paneOpen} aria-labelledby="user-pane-heading" className="min-w-0 space-y-4"
        onKeyDown={(event) => { if (event.key === "Escape" && !busy) { event.stopPropagation(); closeUser(); } }}>
        <header className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" disabled={busy} onClick={closeUser} className={commandClass + " -ml-3 text-[var(--gl-green)]"}>
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />{tr("Users", "Usuarios")}
            </button>
            {selectedUser ? <div className="flex flex-wrap items-center gap-2">
              {statusLabel(selectedUser.user)}
              <Link href={"/admin/users/" + selectedUser.user.id} className={commandClass + " text-[var(--gl-green)]"}>
                {tr("Record page", "Ficha de usuario")}<ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div> : null}
          </div>
          <div className="min-w-0">
            <h2 id="user-pane-heading" tabIndex={-1} className="break-words text-2xl font-semibold outline-none [overflow-wrap:anywhere]">
              {selectedUser?.user.display_name || selectedUser?.user.email || tr("User", "Usuario")}
            </h2>
            {selectedUser ? <p className="break-words text-sm text-[var(--gl-ink-muted)]">{selectedUser.user.email} · {selectedUser.user.role}</p> : null}
          </div>
        </header>

        {activityLoading ? <p role="status" className="py-4 text-sm text-[var(--gl-ink-muted)]">{tr("Loading user activity...", "Cargando actividad del usuario...")}</p> : null}
        {!activityLoading && !selectedUser ? <p className="text-sm text-[var(--gl-ink-muted)]">{tr("User activity is unavailable.", "La actividad del usuario no está disponible.")}</p> : null}

        {selectedUser ? <>
          <div role="tablist" aria-label={tr("User workspace", "Espacio de usuario")} className="flex overflow-x-auto border-b border-[var(--gl-hairline)]">
            {userTabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={"user-tab-" + tab.id} aria-controls={"user-panel-" + tab.id}
              aria-selected={userTab === tab.id} tabIndex={userTab === tab.id ? 0 : -1}
              onClick={() => setUserTab(tab.id)}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? userTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + userTabs.length) % userTabs.length;
                setUserTab(userTabs[next].id);
                document.getElementById("user-tab-" + userTabs[next].id)?.focus();
              }}
              className={"min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--gl-green)] " + (userTab === tab.id ? "border-[var(--gl-green)] text-[var(--gl-green)]" : "border-transparent text-[var(--gl-ink-muted)]")}>
              {tab.label}
            </button>)}
          </div>

          <fieldset disabled={busy} className="min-w-0">
            <div role="tabpanel" tabIndex={0} id="user-panel-overview" aria-labelledby="user-tab-overview" hidden={userTab !== "overview"} className="space-y-4">
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[[tr("Wallet", "Saldo"), selectedUser.user.wallet_points], [tr("Rewards redeemed", "Recompensas canjeadas"), selectedUser.user.redeemed_rewards_count ?? 0],
                  [tr("Recycling events", "Eventos de reciclaje"), selectedUser.user.recycling_events_count], [tr("Recycled units", "Unidades recicladas"), selectedUser.user.recycled_units_count]].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-[var(--gl-paper)] px-3 py-2">
                    <dt className="text-xs text-[var(--gl-ink-muted)]">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="grid gap-5 xl:grid-cols-2">
                <section className="space-y-3">
                  <h2 className="text-base font-semibold">{tr("User information", "Información del usuario")}</h2>
                  <dl className="grid grid-cols-2 gap-x-5 gap-y-3 bg-[var(--gl-paper)] p-3 text-sm">
                    <div><dt className="text-xs text-[var(--gl-ink-muted)]">{tr("Signed up", "Registro")}</dt><dd>{formatDateTime(selectedUser.user.created_at)}</dd></div>
                    <div><dt className="text-xs text-[var(--gl-ink-muted)]">{tr("Last activity", "Última actividad")}</dt><dd>{formatDateTime(selectedUser.user.last_activity_at)}</dd></div>
                    <div><dt className="text-xs text-[var(--gl-ink-muted)]">App</dt><dd>{formatUserPlatform(selectedUser.user)}{getUserAppVersion(selectedUser.user) ? " · v" + getUserAppVersion(selectedUser.user) : ""}</dd></div>
                    <div><dt className="text-xs text-[var(--gl-ink-muted)]">{tr("App last seen", "Último acceso a la app")}</dt><dd>{formatDateTime(getUserPlatformSeenAt(selectedUser.user))}</dd></div>
                    <div><dt className="text-xs text-[var(--gl-ink-muted)]">{tr("Profile country", "País del perfil")}</dt><dd>{selectedUser.user.profile_country || tr("Not recorded", "Sin registrar")}</dd></div>
                    <div><dt className="text-xs text-[var(--gl-ink-muted)]">{tr("Profile city", "Ciudad del perfil")}</dt><dd>{selectedUser.user.profile_city || tr("Not recorded", "Sin registrar")}</dd></div>
                    <div className="col-span-2"><dt className="text-xs text-[var(--gl-ink-muted)]">{tr("Signup country / city", "País / ciudad de registro")}</dt><dd>{signupLocation(selectedUser.user)}{selectedUser.user.signup_location_recorded_at ? <span className="block text-xs text-[var(--gl-ink-muted)]">{formatDateTime(selectedUser.user.signup_location_recorded_at)}</span> : null}</dd></div>
                    <div className="col-span-2"><dt className="text-xs text-[var(--gl-ink-muted)]">{tr("Latest recycling location", "Última ubicación de reciclaje")}</dt><dd>{[selectedUser.user.latest_city, selectedUser.user.latest_province].filter(Boolean).join(", ") || "—"}</dd></div>
                  </dl>
                </section>
                <section className="space-y-3">
                  <h2 className="text-base font-semibold">EcoPoints</h2>
                  <div className="space-y-3 bg-[var(--gl-paper)] p-3">
                    <div className="flex gap-5">
                      <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                        <input type="radio" name="points-mode" value="add" checked={pointsMode === "add"} onChange={() => setPointsMode("add")} />{tr("Add", "Añadir")}
                      </label>
                      <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                        <input type="radio" name="points-mode" value="remove" checked={pointsMode === "remove"} onChange={() => setPointsMode("remove")} />{tr("Remove", "Retirar")}
                      </label>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="min-w-0 flex-1"><span className="mb-1 block text-xs text-[var(--gl-ink-muted)]">{tr("EcoPoints amount", "Cantidad de EcoPoints")}</span>
                        <input type="number" min="1" step="1" value={pointsMode === "add" ? ecoPointsToAdd : ecoPointsToRemove}
                          onChange={(event) => pointsMode === "add" ? setEcoPointsToAdd(event.target.value) : setEcoPointsToRemove(event.target.value)}
                          className={inputClass} />
                      </label>
                      <button type="button" onClick={pointsMode === "add" ? addEcoPoints : removeEcoPoints}
                        disabled={pointsMode === "add" ? addingEcoPoints || !ecoPointsToAdd : removingEcoPoints || !ecoPointsToRemove}
                        className={commandClass + (pointsMode === "add" ? " bg-[var(--gl-green)] text-white" : " bg-red-600 text-white")}>
                        {addingEcoPoints || removingEcoPoints ? tr("Updating...", "Actualizando...") : pointsMode === "add" ? tr("Add points", "Añadir puntos") : tr("Remove points", "Retirar puntos")}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div role="tabpanel" tabIndex={0} id="user-panel-activity" aria-labelledby="user-tab-activity" hidden={userTab !== "activity"} className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-0"><span className="mb-1 block text-xs text-[var(--gl-ink-muted)]">{tr("From", "Desde")}</span>
                  <input type="date" value={activityFilters.from} onChange={(event) => setActivityFilters((current) => ({ ...current, from: event.target.value }))} className={inputClass} /></label>
                <label className="min-w-0"><span className="mb-1 block text-xs text-[var(--gl-ink-muted)]">{tr("To", "Hasta")}</span>
                  <input type="date" value={activityFilters.to} onChange={(event) => setActivityFilters((current) => ({ ...current, to: event.target.value }))} className={inputClass} /></label>
                <button type="button" onClick={applyActivityFilters} disabled={!selectedUser || activityLoading} className={commandClass + " bg-[var(--gl-green)] text-white"}>{tr("Apply", "Aplicar")}</button>
                <button type="button" onClick={resetActivityFilters} disabled={!selectedUser || activityLoading} className={commandClass + " bg-[var(--gl-paper)]"}>{tr("Reset", "Restablecer")}</button>
              </div>
              {selectedUser.recycling_events.length > 0 ? <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--gl-ink-muted)]">
                <p>{tr("Events", "Eventos")}: <strong className="text-[var(--gl-ink)]">{recycleHistorySummary.totalEvents}</strong></p>
                <p>{tr("Units", "Unidades")}: <strong className="text-[var(--gl-ink)]">{recycleHistorySummary.totalUnits}</strong></p>
                <p>EcoPoints: <strong className="text-[var(--gl-ink)]">{recycleHistorySummary.totalPoints}</strong></p>
              </div> : null}
              <section aria-label={tr("Recycling history", "Historial de reciclaje")} className="divide-y divide-[var(--gl-hairline)] bg-[var(--gl-paper)]">
                {selectedUser.recycling_events.length === 0 ? <p className="p-3 text-sm text-[var(--gl-ink-muted)]">{tr("No recycling events yet.", "Aún no hay eventos de reciclaje.")}</p> : selectedUser.recycling_events.map((event) => (
                  <details key={event.id} className="group px-3 py-2">
                    <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0"><span className="font-semibold">{event.units} {tr("units", "unidades")}</span> · {[event.city, event.province].filter(Boolean).join(", ") || "—"}<span className="block text-xs text-[var(--gl-ink-muted)]">{formatDateTime(event.created_at)}</span></span>
                      <span className="flex items-center gap-2 text-xs"><span>{event.points_issued} EcoPoints</span>
                        <span className={"rounded px-1.5 py-0.5 " + (event.verification_status === "approved" ? "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]" : event.verification_status === "rejected" ? "bg-red-100 text-red-700" : "bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]")}>{event.verification_status}</span>
                        <ChevronDown aria-hidden="true" className="h-4 w-4 group-open:rotate-180" /></span>
                    </summary>
                    <div className="space-y-2 py-2 text-xs [overflow-wrap:anywhere]">
                      <p className="text-[var(--gl-ink-muted)]">Event ID: {event.id}</p>
                      <p className="font-semibold">{tr("Recycled products", "Productos reciclados")}</p>
                      {event.items.map((item, index) => <div key={event.id + "-" + item.barcode + "-" + index} className="flex flex-wrap justify-between gap-2"><p>{item.product_name}</p><p className="text-[var(--gl-ink-muted)]">{item.barcode || "—"}</p></div>)}
                      {event.lat !== null && event.lng !== null ? <p className="text-[var(--gl-ink-muted)]">{event.lat.toFixed(4)}, {event.lng.toFixed(4)}</p> : null}
                    </div>
                  </details>
                ))}
              </section>
              <details className="group bg-[var(--gl-paper)] p-3">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {tr("Recent scan events", "Escaneos recientes")} ({selectedUser.scan_events.length})<ChevronDown aria-hidden="true" className="h-4 w-4 group-open:rotate-180" />
                </summary>
                <div className="divide-y divide-[var(--gl-hairline)]">
                  {selectedUser.scan_events.length === 0 ? <p className="py-2 text-sm text-[var(--gl-ink-muted)]">{tr("No scan events yet.", "Aún no hay escaneos.")}</p> : selectedUser.scan_events.map((event) =>
                    <div key={event.id} className="flex flex-wrap justify-between gap-2 py-2 text-xs">
                      <p>{event.barcode}<span className="block text-[var(--gl-ink-muted)]">{event.trust_tier}</span></p>
                      <div className="text-[var(--gl-ink-muted)]"><p>{formatDateTime(event.created_at)}</p>{event.lat !== null && event.lng !== null ? <p>{event.lat.toFixed(4)}, {event.lng.toFixed(4)}</p> : null}</div>
                    </div>)}
                </div>
              </details>
            </div>

            <div role="tabpanel" tabIndex={0} id="user-panel-challenges" aria-labelledby="user-tab-challenges" hidden={userTab !== "challenges"}>
              {!selectedUser.active_challenges?.length ? <p className="py-3 text-sm text-[var(--gl-ink-muted)]">{tr("No active joined challenges.", "No hay retos activos para este usuario.")}</p> :
                <div className="divide-y divide-[var(--gl-hairline)] bg-[var(--gl-paper)]">
                  {selectedUser.active_challenges.map((challenge) => {
                    const progress = challenge.required_count > 0 ? Math.min(100, Math.round((challenge.progress_count / challenge.required_count) * 100)) : 0;
                    return <article key={challenge.user_challenge_id} className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><h2 className="break-words text-sm font-semibold">{challenge.title}</h2>
                          <p className="text-xs text-[var(--gl-ink-muted)]">{challenge.challenge_type} · {tr("Joined", "Inscrito")}: {formatDateTime(challenge.accepted_at)}</p></div>
                        <button type="button" onClick={() => removeUserFromChallenge(challenge.id, challenge.title)} disabled={removingChallengeId === challenge.id}
                          className={commandClass + " shrink-0 text-red-700 hover:bg-red-50"}>{removingChallengeId === challenge.id ? tr("Removing...", "Retirando...") : tr("Remove", "Retirar")}</button>
                      </div>
                      <p className="text-xs text-[var(--gl-ink-muted)]">{tr("Progress", "Progreso")}: {challenge.progress_count}/{challenge.required_count || 1}</p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--gl-green-soft)]"><div className="h-full bg-[var(--gl-green)]" style={{ width: progress + "%" }} /></div>
                    </article>;
                  })}
                </div>}
            </div>

            <div role="tabpanel" tabIndex={0} id="user-panel-account" aria-labelledby="user-tab-account" hidden={userTab !== "account"} className="grid items-start gap-5 xl:grid-cols-2">
              <section className="space-y-3">
                <h2 className="text-base font-semibold">{tr("Edit user", "Editar usuario")}</h2>
                <div className="space-y-3 bg-[var(--gl-paper)] p-3">
                  <label className="block"><span className="mb-1 block text-xs text-[var(--gl-ink-muted)]">{tr("Display name", "Nombre visible")}</span>
                    <input value={editForm.display_name} onChange={(event) => setEditForm((current) => ({ ...current, display_name: event.target.value }))} className={inputClass} /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block min-w-0"><span className="mb-1 block text-xs text-[var(--gl-ink-muted)]">{tr("Role", "Rol")}</span>
                      <select aria-label={tr("Role", "Rol")} value={editForm.role} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))} className={inputClass}>
                        {["user", "partner", "brand_admin", "organization", "admin"].map((role) => <option key={role} value={role}>{role}</option>)}
                      </select></label>
                    <label className="block min-w-0"><span className="mb-1 block text-xs text-[var(--gl-ink-muted)]">{tr("Brand", "Marca")}</span>
                      <select aria-label={tr("Brand", "Marca")} value={editForm.brand_id} onChange={(event) => setEditForm((current) => ({ ...current, brand_id: event.target.value }))} className={inputClass}>
                        <option value="">{tr("No brand", "Sin marca")}</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                      </select></label>
                  </div>
                  <button type="button" onClick={saveUserEdits} disabled={savingEdit} className={commandClass + " bg-[var(--gl-green)] text-white"}>{savingEdit ? tr("Saving...", "Guardando...") : tr("Save changes", "Guardar cambios")}</button>
                </div>
              </section>
              <section className="space-y-3">
                <h2 className="text-base font-semibold">{tr("Password", "Contraseña")}</h2>
                <div className="space-y-3 bg-[var(--gl-paper)] p-3">
                  <label className="block"><span className="mb-1 block text-xs text-[var(--gl-ink-muted)]">{tr("New password", "Nueva contraseña")}</span>
                    <input type="password" value={manualPassword} onChange={(event) => setManualPassword(event.target.value)} placeholder={tr("Minimum 8 characters", "Mínimo 8 caracteres")}
                      autoComplete="new-password" className={inputClass} /></label>
                  <button type="button" onClick={changeUserPassword} disabled={savingPassword || manualPassword.length < 8} className={commandClass + " bg-[var(--gl-paper)] ring-1 ring-inset ring-[var(--gl-hairline)]"}>
                    {savingPassword ? tr("Saving password...", "Guardando contraseña...") : tr("Set new password", "Establecer contraseña")}</button>
                </div>
              </section>
              <section className="space-y-3">
                <h2 className="text-base font-semibold">{tr("Avatar progress", "Progreso del avatar")}</h2>
                <p className="text-sm text-[var(--gl-ink-muted)]">{tr("Return to the turtle at 0 avatar progress.", "Volver a la tortuga con 0 puntos de progreso.")}</p>
                <button type="button" onClick={() => resetAvatarProgress(selectedUser.user)} disabled={resettingAvatarUserId === selectedUser.user.id}
                  className={commandClass + " bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]"}>{resettingAvatarUserId === selectedUser.user.id ? tr("Resetting...", "Restableciendo...") : tr("Reset to Turtle", "Restablecer a tortuga")}</button>
              </section>
              <section className="space-y-3">
                <h2 className="text-base font-semibold">{tr("Account status", "Estado de la cuenta")}</h2>
                <div>{statusLabel(selectedUser.user)}</div>
                <button type="button" onClick={() => toggleDeactivate(selectedUser.user.id)} disabled={activeAction === selectedUser.user.id}
                  className={commandClass + (selectedUser.user.deactivated_at ? " bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]" : " bg-red-50 text-red-700")}>
                  {activeAction === selectedUser.user.id ? tr("Updating...", "Actualizando...") : selectedUser.user.deactivated_at ? tr("Reactivate", "Reactivar") : tr("Deactivate", "Desactivar")}
                </button>
              </section>
            </div>
          </fieldset>
        </> : null}
      </section>
    </div>
  );
}

function FilterText({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "date";
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">
        {label}
      </span>
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "1" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
      />
    </label>
  );
}
