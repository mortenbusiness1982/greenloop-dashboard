const TOKEN_KEY = "greenloop_jwt";

export type DashboardRole = "admin" | "brand_admin" | "partner" | "user";

export type DashboardSession = {
  token: string;
  userId?: string;
  email?: string;
  role: DashboardRole;
  brand_id?: string;
};

let cachedSessionToken: string | null = null;
let cachedSession: DashboardSession | null = null;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  cachedSessionToken = null;
  cachedSession = null;
  window.dispatchEvent(new Event("greenloop-auth-change"));
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  cachedSessionToken = null;
  cachedSession = null;
  window.dispatchEvent(new Event("greenloop-auth-change"));
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isExpiredPayload(payload: Record<string, unknown>) {
  const exp = payload.exp;
  return typeof exp === "number" && exp * 1000 <= Date.now();
}

export function getSession(): DashboardSession | null {
  const token = getToken();
  if (!token) {
    cachedSessionToken = null;
    cachedSession = null;
    return null;
  }

  if (token === cachedSessionToken) {
    return cachedSession;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || isExpiredPayload(payload)) {
    clearToken();
    cachedSession = null;
    return null;
  }

  const role = payload?.role;
  if (role !== "admin" && role !== "brand_admin" && role !== "partner" && role !== "user") {
    cachedSessionToken = token;
    cachedSession = null;
    return null;
  }

  cachedSessionToken = token;
  cachedSession = {
    token,
    role,
    userId: typeof payload.userId === "string" ? payload.userId : undefined,
    email: typeof payload.email === "string" ? payload.email : undefined,
    brand_id: typeof payload.brand_id === "string" ? payload.brand_id : undefined,
  };
  return cachedSession;
}

export function getHomeForRole(role: DashboardRole): string {
  if (role === "admin") return "/admin/overview";
  if (role === "brand_admin") return "/brand/overview";
  if (role === "partner") return "/partner/overview";
  return "/login";
}

export function isRouteAllowedForRole(pathname: string, role: DashboardRole): boolean {
  if (role === "admin") return pathname.startsWith("/admin");
  if (role === "brand_admin") return pathname.startsWith("/brand");
  if (role === "partner") return pathname.startsWith("/partner");
  return false;
}
