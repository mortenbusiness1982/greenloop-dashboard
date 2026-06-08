"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

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

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addingEcoPoints, setAddingEcoPoints] = useState(false);
  const [ecoPointsToAdd, setEcoPointsToAdd] = useState("");
  const [removingEcoPoints, setRemovingEcoPoints] = useState(false);
  const [ecoPointsToRemove, setEcoPointsToRemove] = useState("");
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
    if (!query) return users;
    return users.filter((user) =>
      [user.display_name, user.email, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [search, users]);

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

  function exportVisibleUsers() {
    const headers = [
      "display_name",
      "email",
      "role",
      "created_at",
      "status",
      "wallet_points",
      "redeemed_rewards_count",
      "recycling_events_count",
      "recycled_units_count",
      "last_activity_at",
      "latest_city",
      "latest_province",
    ];

    const rows = filteredUsers.map((user) => ({
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      status: user.deactivated_at ? "deactivated" : "active",
      wallet_points: user.wallet_points,
      redeemed_rewards_count: user.redeemed_rewards_count ?? 0,
      recycling_events_count: user.recycling_events_count,
      recycled_units_count: user.recycled_units_count,
      last_activity_at: user.last_activity_at ?? "",
      latest_city: user.latest_city ?? "",
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

  if (loading) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-[var(--gl-ink-muted)]">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gl-green)]">
            Admin · Network
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--gl-ink)] md:text-4xl">
            Users
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--gl-ink-muted)]">
            Search, export, and inspect registered user activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/activity"
            className="inline-flex items-center rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm font-medium text-[var(--gl-ink-soft)] transition hover:bg-[var(--gl-card-cream)]"
          >
            Review Total Activity
          </Link>
          <Link
            href="/admin/activity"
            className="inline-flex items-center rounded-md border border-transparent bg-[var(--gl-green-soft)] px-3 py-2 text-sm font-medium text-[var(--gl-green-deep)] transition hover:opacity-90"
          >
            Overall Filters
          </Link>
          <button
            onClick={exportVisibleUsers}
            className="inline-flex items-center rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm font-medium text-[var(--gl-ink-soft)] transition hover:bg-[var(--gl-card-cream)]"
          >
            Export CSV
          </button>
        </div>
      </header>

      {error ? (
        <div role="alert" className="rounded-xl border border-[var(--gl-coral)] bg-[var(--gl-coral-soft)] px-5 py-4 text-sm text-[var(--gl-coral-ink)]">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2.5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">Search users</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by display name, email, or role"
            className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
          />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="overflow-x-auto rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
          <table className="min-w-[980px] w-full border-collapse text-left">
            <thead className="bg-[var(--gl-card-cream)]">
              <tr className="border-b border-[var(--gl-hairline)]">
                <th className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Name</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Email</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Role</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Wallet</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Rewards</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Recycling Events</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Units</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Last Activity</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Status</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-[var(--gl-ink-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-sm text-[var(--gl-ink-muted)]">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => loadUserActivity(user.id)}
                    className={`border-b border-[var(--gl-hairline)] align-top transition ${
                      selectedUser?.user.id === user.id ? "bg-[var(--gl-green-soft)]/40" : "hover:bg-[var(--gl-card-cream)]"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-[var(--gl-ink)]">{user.display_name}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{user.email}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{user.role}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{user.wallet_points}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{user.redeemed_rewards_count ?? 0}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{user.recycling_events_count}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{user.recycled_units_count}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">{formatDateTime(user.last_activity_at)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-[var(--gl-ink-soft)]">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.deactivated_at
                            ? "bg-[var(--gl-hairline)] text-[var(--gl-ink-soft)]"
                            : "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"
                        }`}
                      >
                        {user.deactivated_at ? "Deactivated" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/users/${user.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-md border border-[var(--gl-hairline)] px-3 py-1.5 text-[var(--gl-ink-soft)] transition hover:bg-[var(--gl-card-cream)]"
                        >
                          View Detail
                        </Link>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            loadUserActivity(user.id);
                          }}
                          className="rounded-md border border-[var(--gl-hairline)] px-3 py-1.5 text-[var(--gl-ink-soft)] transition hover:bg-[var(--gl-card-cream)]"
                        >
                          {selectedUser?.user.id === user.id ? "Viewing Activity" : "Review Activity"}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            loadUserActivity(user.id);
                          }}
                          className="rounded-md border border-transparent bg-[var(--gl-green-soft)] px-3 py-1.5 font-medium text-[var(--gl-green-deep)] transition hover:opacity-90"
                        >
                          Add EcoPoints
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            resetAvatarProgress(user);
                          }}
                          disabled={resettingAvatarUserId === user.id}
                          className="rounded-md border border-[var(--gl-amber)]/30 bg-[var(--gl-amber-soft)] px-3 py-1.5 font-medium text-[var(--gl-amber-ink)] transition hover:bg-[var(--gl-amber-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {resettingAvatarUserId === user.id ? "Resetting..." : "Reset Avatar"}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleDeactivate(user.id);
                          }}
                          disabled={activeAction === user.id}
                          className="rounded-md bg-[var(--gl-green)] px-3 py-1.5 text-white transition hover:bg-[var(--gl-green-deep)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {user.deactivated_at ? "Reactivate" : "Deactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <aside className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-[var(--gl-ink)]">User Activity</h2>
            <p className="mt-1 text-sm text-[var(--gl-ink-muted)]">
              Recent scans and recycling activity for the selected user.
            </p>
          </div>

          {activityLoading ? (
            <p className="text-sm text-[var(--gl-ink-muted)]">Loading user activity...</p>
          ) : !selectedUser ? (
            <p className="text-sm text-[var(--gl-ink-muted)]">Select a user to inspect recent activity.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--gl-ink)]">{selectedUser.user.display_name}</p>
                    <p className="text-sm text-[var(--gl-ink-muted)]">{selectedUser.user.email}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selectedUser.user.deactivated_at
                        ? "bg-[var(--gl-hairline)] text-[var(--gl-ink-soft)]"
                        : "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"
                    }`}
                  >
                    {selectedUser.user.deactivated_at ? "Deactivated" : "Active"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[var(--gl-ink-soft)]">
                  <div>
                    <p className="font-medium text-[var(--gl-ink-muted)]">Role</p>
                    <p>{selectedUser.user.role}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--gl-ink-muted)]">Wallet</p>
                    <p>{selectedUser.user.wallet_points} EcoPoints</p>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--gl-ink-muted)]">Rewards Redeemed</p>
                    <p>{selectedUser.user.redeemed_rewards_count ?? 0}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--gl-ink-muted)]">Joined</p>
                    <p>{formatDateTime(selectedUser.user.created_at)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--gl-ink-muted)]">Last Activity</p>
                    <p>{formatDateTime(selectedUser.user.last_activity_at)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--gl-hairline)] p-3.5">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--gl-ink-faint)]">
                  Manage Balance & Avatar
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-[var(--gl-amber)]/30 bg-[var(--gl-amber-soft)]/70 p-3.5">
                  <div className="mb-2.5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--gl-amber-ink)]">
                      Add EcoPoints
                    </h3>
                    <p className="mt-1 text-sm text-[var(--gl-ink-muted)]">
                      Add exactly the EcoPoints amount entered below.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">EcoPoints amount</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={ecoPointsToAdd}
                        onChange={(e) => setEcoPointsToAdd(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={addEcoPoints}
                      disabled={addingEcoPoints || !ecoPointsToAdd}
                      className="w-full rounded-md bg-[var(--gl-green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--gl-green-deep)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingEcoPoints ? "Adding..." : "Add Requested Points"}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-red-200 bg-red-50/70 p-3.5">
                  <div className="mb-2.5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-red-800">
                      Remove EcoPoints
                    </h3>
                    <p className="mt-1 text-sm text-[var(--gl-ink-muted)]">
                      Remove exactly the EcoPoints amount entered below.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">EcoPoints amount</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={ecoPointsToRemove}
                        onChange={(e) => setEcoPointsToRemove(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={removeEcoPoints}
                      disabled={removingEcoPoints || !ecoPointsToRemove}
                      className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removingEcoPoints ? "Removing..." : "Remove Requested Points"}
                    </button>
                  </div>
                </div>
                </div>

                <div className="mt-3 rounded-lg border border-[var(--gl-amber)]/30 bg-[var(--gl-amber-soft)]/70 p-3.5">
                <div className="mb-2.5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--gl-amber-ink)]">
                    Reset Avatar Progress
                  </h3>
                  <p className="mt-1 text-sm text-[var(--gl-ink-muted)]">
                    Return this user to the turtle at 0 avatar progress for testing from scratch.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetAvatarProgress(selectedUser.user)}
                  disabled={resettingAvatarUserId === selectedUser.user.id}
                  className="w-full rounded-md bg-[var(--gl-amber-ink)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--gl-amber-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resettingAvatarUserId === selectedUser.user.id ? "Resetting..." : "Reset to Turtle"}
                </button>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--gl-green)]/25 bg-[var(--gl-green-soft)]/50 p-3.5">
                <div className="mb-2.5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--gl-green-deep)]">
                    Active Challenges
                  </h3>
                  <p className="mt-1 text-sm text-[var(--gl-ink-muted)]">
                    Joined challenges currently active for this user.
                  </p>
                </div>
                {!selectedUser.active_challenges?.length ? (
                  <p className="text-sm text-[var(--gl-ink-muted)]">No active joined challenges.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedUser.active_challenges.map((challenge) => {
                      const progress =
                        challenge.required_count > 0
                          ? Math.min(100, Math.round((challenge.progress_count / challenge.required_count) * 100))
                          : 0;
                      return (
                        <div key={challenge.user_challenge_id} className="rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--gl-ink)]">{challenge.title}</p>
                              <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">
                                {challenge.challenge_type} · joined {formatDateTime(challenge.accepted_at)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeUserFromChallenge(challenge.id, challenge.title)}
                              disabled={removingChallengeId === challenge.id}
                              className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {removingChallengeId === challenge.id ? "Removing..." : "Remove"}
                            </button>
                          </div>
                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-xs text-[var(--gl-ink-muted)]">
                              <span>Progress</span>
                              <span>
                                {challenge.progress_count}/{challenge.required_count || 1}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[var(--gl-green-soft)]">
                              <div className="h-full rounded-full bg-[var(--gl-green)]" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-[var(--gl-hairline)] p-3.5">
                <div className="mb-2.5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">
                    Edit User
                  </h3>
                </div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">Display Name</span>
                    <input
                      value={editForm.display_name}
                      onChange={(e) =>
                        setEditForm((current) => ({ ...current, display_name: e.target.value }))
                      }
                      className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">Role</span>
                    <select
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm((current) => ({ ...current, role: e.target.value }))
                      }
                      className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
                    >
                      <option value="user">user</option>
                      <option value="partner">partner</option>
                      <option value="brand_admin">brand_admin</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[var(--gl-ink-soft)]">Brand</span>
                    <select
                      value={editForm.brand_id}
                      onChange={(e) =>
                        setEditForm((current) => ({ ...current, brand_id: e.target.value }))
                      }
                      className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
                    >
                      <option value="">No brand</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    onClick={saveUserEdits}
                    disabled={savingEdit}
                    className="w-full rounded-md bg-[var(--gl-green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--gl-green-deep)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">
                  Recycle History
                </h3>
                <div className="mb-3 rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">
                        From
                      </span>
                      <input
                        type="date"
                        value={activityFilters.from}
                        onChange={(e) =>
                          setActivityFilters((current) => ({ ...current, from: e.target.value }))
                        }
                        className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">
                        To
                      </span>
                      <input
                        type="date"
                        value={activityFilters.to}
                        onChange={(e) =>
                          setActivityFilters((current) => ({ ...current, to: e.target.value }))
                        }
                        className="w-full rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm text-[var(--gl-ink)] outline-none transition focus:border-[var(--gl-green)] focus:ring-2 focus:ring-[var(--gl-green-ring)]"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={applyActivityFilters}
                      disabled={!selectedUser || activityLoading}
                      className="rounded-md bg-[var(--gl-green)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[var(--gl-green-deep)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {activityLoading ? "Loading..." : "Apply Date Filter"}
                    </button>
                    <button
                      type="button"
                      onClick={resetActivityFilters}
                      disabled={!selectedUser || activityLoading}
                      className="rounded-md border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm font-medium text-[var(--gl-ink-soft)] transition hover:bg-[var(--gl-card-cream)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                {selectedUser.recycling_events.length > 0 ? (
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-3 text-sm">
                      <p className="font-medium text-[var(--gl-ink-muted)]">Events</p>
                      <p className="mt-1 text-base font-semibold text-[var(--gl-ink)]">
                        {recycleHistorySummary.totalEvents}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-3 text-sm">
                      <p className="font-medium text-[var(--gl-ink-muted)]">Units</p>
                      <p className="mt-1 text-base font-semibold text-[var(--gl-ink)]">
                        {recycleHistorySummary.totalUnits}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-3 text-sm">
                      <p className="font-medium text-[var(--gl-ink-muted)]">EcoPoints</p>
                      <p className="mt-1 text-base font-semibold text-[var(--gl-ink)]">
                        {recycleHistorySummary.totalPoints}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  {selectedUser.recycling_events.length === 0 ? (
                    <p className="text-sm text-[var(--gl-ink-muted)]">No recycling events yet.</p>
                  ) : (
                    selectedUser.recycling_events.map((event) => (
                      <div key={event.id} className="rounded-lg border border-[var(--gl-hairline)] p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-[var(--gl-ink)]">
                              {event.units} units
                              {event.city || event.province
                                ? ` · ${[event.city, event.province].filter(Boolean).join(", ")}`
                                : ""}
                            </p>
                            <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">
                              Event ID: {event.id}
                            </p>
                            <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">
                              User: {selectedUser.user.display_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[var(--gl-ink-muted)]">{formatDateTime(event.created_at)}</p>
                            <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">
                              Day: {new Date(event.created_at).toLocaleDateString()}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--gl-amber-ink)]">
                              {event.points_issued} EcoPoints
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              event.verification_status === "approved"
                                ? "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"
                                : event.verification_status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]"
                            }`}
                          >
                            {event.verification_status}
                          </span>
                        </div>
                        {event.items.length > 0 ? (
                          <div className="mt-3 rounded-md bg-[var(--gl-card-cream)] p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">
                              Recycled Products
                            </p>
                            <div className="space-y-1.5">
                              {event.items.map((item, index) => (
                                <div
                                  key={`${event.id}-${item.barcode}-${index}`}
                                  className="flex items-start justify-between gap-3 text-xs"
                                >
                                  <p className="font-medium text-[var(--gl-ink-soft)]">{item.product_name}</p>
                                  <p className="text-[var(--gl-ink-muted)]">{item.barcode || "—"}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {(event.lat !== null && event.lng !== null) ? (
                          <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">
                            {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">
                  Recent Scan Events
                </h3>
                <div className="space-y-2">
                  {selectedUser.scan_events.length === 0 ? (
                    <p className="text-sm text-[var(--gl-ink-muted)]">No scan events yet.</p>
                  ) : (
                    selectedUser.scan_events.map((event) => (
                      <div key={event.id} className="rounded-lg border border-[var(--gl-hairline)] p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-[var(--gl-ink)]">{event.barcode}</p>
                          <p className="text-xs text-[var(--gl-ink-muted)]">{formatDateTime(event.created_at)}</p>
                        </div>
                        <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">{event.trust_tier}</p>
                        {(event.lat !== null && event.lng !== null) ? (
                          <p className="mt-1 text-xs text-[var(--gl-ink-muted)]">
                            {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
