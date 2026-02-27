export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

type ApiFetchOptions = {
  token?: string;
  method?: string;
  body?: any;
};

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
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
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const message = json?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return json;
}
