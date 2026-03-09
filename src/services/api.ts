import { API_BASE } from "../config/api";

type ApiError = Error & {
  status?: number;
  bodyText?: string;
};

function maskToken(token?: string | null) {
  if (!token) return null;
  return `${token.slice(0, 12)}...`;
}

function getStoredToken() {
  if (typeof window === "undefined") {
    return { token: null as string | null, key: null as string | null };
  }

  const keys = ["token", "greenloop_token", "jwt", "access_token"] as const;
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return { token: value, key };
  }

  return { token: null as string | null, key: null as string | null };
}

async function apiGet(path: string, token: string) {
  console.log("[GreenLoop API] GET", `${API_BASE}${path}`);

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log("[GreenLoop API] status", path, response.status);

  if (!response.ok) {
    const text = await response.text();
    const message =
      response.status === 401
        ? `Unauthorized (401): ${text || "Token missing, invalid, or expired"}`
        : response.status === 403
          ? `Forbidden (403): ${text || "Insufficient role/permissions for endpoint"}`
          : text || `Request failed with status ${response.status}`;
    const error: ApiError = new Error(message);
    error.status = response.status;
    error.bodyText = text;
    throw error;
  }

  const data = await response.json();
  return data;
}

const request = apiGet;

export async function fetchTraceability(token: string) {
  const stored = getStoredToken();
  const resolvedToken = stored.token || token;

  console.log("[GreenLoop Dashboard] traceability token key:", stored.key || "argument");
  console.log("[GreenLoop Dashboard] traceability token exists:", Boolean(resolvedToken));
  console.log("[GreenLoop Dashboard] traceability token preview:", maskToken(resolvedToken));

  if (!resolvedToken) {
    throw new Error("Missing auth token for traceability request");
  }

  try {
    return await request("/brand/reports/traceability", resolvedToken);
  } catch (err) {
    const error = err as ApiError;
    console.error("[GreenLoop Dashboard] traceability request failed", {
      status: error?.status,
      body: error?.bodyText || null,
      message: error?.message,
    });
    throw err;
  }
}

export async function fetchIntegrity(token: string) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);

  const fromDate = from.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);

  return apiGet(`/admin/reports/integrity?from=${fromDate}&to=${toDate}`, token);
}

export async function fetchWallet(token: string) {
  return apiGet("/wallet", token);
}
