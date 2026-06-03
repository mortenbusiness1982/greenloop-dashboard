import { clearToken } from "@/lib/auth";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

type ApiFetchOptions = {
  token?: string;
  method?: string;
  body?: unknown;
};

type ApiErrorBody = {
  message?: string;
  error?: string;
};

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function getErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    const apiError = body as ApiErrorBody;
    return apiError.message || apiError.error || fallback;
  }

  return fallback;
}

function clearExpiredSession(status: number, message: string) {
  if (status !== 401) return;
  if (/token expired|invalid token|token not active|unauthorized/i.test(message)) {
    clearToken();
  }
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, method = "GET", body } = options;

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = parseJson(text);

  if (!res.ok) {
    const message = getErrorMessage(json, `Request failed with status ${res.status}`);
    clearExpiredSession(res.status, message);
    throw new Error(message);
  }

  return json as T;
}

export async function apiFetchBlob(path: string, opts: { token: string }): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${opts.token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    const json = parseJson(text);
    const message = getErrorMessage(json, `Request failed with status ${res.status}`);
    clearExpiredSession(res.status, message);
    throw new Error(message);
  }

  return await res.blob();
}

export async function apiUpload<T = unknown>(path: string, opts: { token: string; body: FormData }): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.token}`,
    },
    body: opts.body,
  });

  const text = await res.text();
  const json = parseJson(text);

  if (!res.ok) {
    const message = getErrorMessage(json, `Request failed with status ${res.status}`);
    clearExpiredSession(res.status, message);
    throw new Error(message);
  }

  return json as T;
}
