// Relative "/api/..." only resolves in the browser (Vite's dev proxy, or a
// production deploy that serves the built app from the same Express server
// — see README "Deployment"). The Capacitor Android app's WebView has its
// own internal origin with no such proxy, so a real absolute URL must be
// baked in at build time via VITE_API_URL for that build to reach anything.
const API_BASE = import.meta.env.VITE_API_URL || "";

const TOKEN_KEY = "decoory_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = "GET", body, headers, isForm } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts) => request(path, { method: "POST", body, ...opts }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
};

// Same problem as the /api/* calls above: server-returned media paths like
// "/uploads/xyz.png" are relative, so they need the same absolute-base
// treatment to resolve inside the Capacitor app. Supabase-hosted uploads
// (production) already come back as absolute URLs and pass through untouched.
export function resolveMediaUrl(url) {
  if (!url || /^https?:\/\//.test(url)) return url;
  return `${API_BASE}${url}`;
}

export { ApiError };
