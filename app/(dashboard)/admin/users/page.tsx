"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

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
        apiFetch("/admin/users", { token }),
        apiFetch("/admin/brands", { token }),
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
      setActivityFilters(nextFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load user activity");
    } finally {
      setActivityLoading(false);
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

  function onLogout() {
    clearToken();
    router.replace("/login");
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
    return <main className="min-h-screen p-6 text-gray-700">Loading users...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-600">
              Search, export, and inspect registered user activity.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="inline-flex rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to Admin
              </Link>
              <button
                onClick={exportVisibleUsers}
                className="inline-flex rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Export CSV
              </button>
            </div>
          </div>
          <button onClick={onLogout} className="rounded bg-gray-900 px-4 py-2 text-white">
            Logout
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Search users</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by display name, email, or role"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
            />
          </label>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-[980px] w-full border-collapse text-left">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Role</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Wallet</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Rewards</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Recycling Events</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Units</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Last Activity</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => loadUserActivity(user.id)}
                      className={`border-b border-gray-100 align-top transition ${
                        selectedUser?.user.id === user.id ? "bg-emerald-50/50" : "hover:bg-gray-50"
                      }`}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.display_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{user.role}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{user.wallet_points}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{user.redeemed_rewards_count ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{user.recycling_events_count}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{user.recycled_units_count}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(user.last_activity_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.deactivated_at
                              ? "bg-gray-200 text-gray-700"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {user.deactivated_at ? "Deactivated" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              loadUserActivity(user.id);
                            }}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 transition hover:bg-gray-50"
                          >
                            {selectedUser?.user.id === user.id ? "Viewing Activity" : "Review Activity"}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleDeactivate(user.id);
                            }}
                            disabled={activeAction === user.id}
                            className="rounded-md bg-[#2d6a4f] px-3 py-1.5 text-white transition hover:bg-[#24543f] disabled:cursor-not-allowed disabled:opacity-60"
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

          <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">User Activity</h2>
              <p className="mt-1 text-sm text-gray-600">
                Recent scans and recycling activity for the selected user.
              </p>
            </div>

            {activityLoading ? (
              <p className="text-sm text-gray-500">Loading user activity...</p>
            ) : !selectedUser ? (
              <p className="text-sm text-gray-500">Select a user to inspect recent activity.</p>
            ) : (
              <div className="space-y-5">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{selectedUser.user.display_name}</p>
                      <p className="text-sm text-gray-600">{selectedUser.user.email}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        selectedUser.user.deactivated_at
                          ? "bg-gray-200 text-gray-700"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {selectedUser.user.deactivated_at ? "Deactivated" : "Active"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-700">
                    <div>
                      <p className="font-medium text-gray-500">Role</p>
                      <p>{selectedUser.user.role}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Wallet</p>
                      <p>{selectedUser.user.wallet_points} EcoPoints</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Rewards Redeemed</p>
                      <p>{selectedUser.user.redeemed_rewards_count ?? 0}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Joined</p>
                      <p>{formatDateTime(selectedUser.user.created_at)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Last Activity</p>
                      <p>{formatDateTime(selectedUser.user.last_activity_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Edit User
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700">Display Name</span>
                      <input
                        value={editForm.display_name}
                        onChange={(e) =>
                          setEditForm((current) => ({ ...current, display_name: e.target.value }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700">Role</span>
                      <select
                        value={editForm.role}
                        onChange={(e) =>
                          setEditForm((current) => ({ ...current, role: e.target.value }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
                      >
                        <option value="user">user</option>
                        <option value="partner">partner</option>
                        <option value="brand_admin">brand_admin</option>
                        <option value="admin">admin</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700">Brand</span>
                      <select
                        value={editForm.brand_id}
                        onChange={(e) =>
                          setEditForm((current) => ({ ...current, brand_id: e.target.value }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
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
                      className="w-full rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#24543f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Recycle History
                  </h3>
                  <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                          From
                        </span>
                        <input
                          type="date"
                          value={activityFilters.from}
                          onChange={(e) =>
                            setActivityFilters((current) => ({ ...current, from: e.target.value }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                          To
                        </span>
                        <input
                          type="date"
                          value={activityFilters.to}
                          onChange={(e) =>
                            setActivityFilters((current) => ({ ...current, to: e.target.value }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={applyActivityFilters}
                        disabled={!selectedUser || activityLoading}
                        className="rounded-md bg-[#2d6a4f] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#24543f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {activityLoading ? "Loading..." : "Apply Date Filter"}
                      </button>
                      <button
                        type="button"
                        onClick={resetActivityFilters}
                        disabled={!selectedUser || activityLoading}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  {selectedUser.recycling_events.length > 0 ? (
                    <div className="mb-3 grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                        <p className="font-medium text-gray-500">Events</p>
                        <p className="mt-1 text-base font-semibold text-gray-900">
                          {recycleHistorySummary.totalEvents}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                        <p className="font-medium text-gray-500">Units</p>
                        <p className="mt-1 text-base font-semibold text-gray-900">
                          {recycleHistorySummary.totalUnits}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                        <p className="font-medium text-gray-500">EcoPoints</p>
                        <p className="mt-1 text-base font-semibold text-gray-900">
                          {recycleHistorySummary.totalPoints}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    {selectedUser.recycling_events.length === 0 ? (
                      <p className="text-sm text-gray-500">No recycling events yet.</p>
                    ) : (
                      selectedUser.recycling_events.map((event) => (
                        <div key={event.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {event.units} units
                                {event.city || event.province
                                  ? ` · ${[event.city, event.province].filter(Boolean).join(", ")}`
                                  : ""}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Event ID: {event.id}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                User: {selectedUser.user.display_name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">{formatDateTime(event.created_at)}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                Day: {new Date(event.created_at).toLocaleDateString()}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-emerald-700">
                                {event.points_issued} EcoPoints
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                event.verification_status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : event.verification_status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {event.verification_status}
                            </span>
                          </div>
                          {event.items.length > 0 ? (
                            <div className="mt-3 rounded-md bg-gray-50 p-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Recycled Products
                              </p>
                              <div className="space-y-1.5">
                                {event.items.map((item, index) => (
                                  <div
                                    key={`${event.id}-${item.barcode}-${index}`}
                                    className="flex items-start justify-between gap-3 text-xs"
                                  >
                                    <p className="font-medium text-gray-800">{item.product_name}</p>
                                    <p className="text-gray-500">{item.barcode || "—"}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {(event.lat !== null && event.lng !== null) ? (
                            <p className="mt-1 text-xs text-gray-500">
                              {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Recent Scan Events
                  </h3>
                  <div className="space-y-2">
                    {selectedUser.scan_events.length === 0 ? (
                      <p className="text-sm text-gray-500">No scan events yet.</p>
                    ) : (
                      selectedUser.scan_events.map((event) => (
                        <div key={event.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-gray-900">{event.barcode}</p>
                            <p className="text-xs text-gray-500">{formatDateTime(event.created_at)}</p>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">{event.trust_tier}</p>
                          {(event.lat !== null && event.lng !== null) ? (
                            <p className="mt-1 text-xs text-gray-500">
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
    </main>
  );
}
