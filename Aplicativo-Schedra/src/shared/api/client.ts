const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3333/api").replace(/\/$/, "");

type ApiAuthSession = { token: string; refreshToken?: string };
type RefreshPayload = ApiAuthSession & { user?: unknown; organization?: unknown };
type ApiAuthAdapter = {
  getSession: () => Promise<ApiAuthSession | null>;
  onRefresh: (payload: RefreshPayload, previous: ApiAuthSession) => Promise<void>;
  onExpire: (previous: ApiAuthSession) => Promise<void>;
};

let authAdapter: ApiAuthAdapter | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const configureApiAuth = (adapter: ApiAuthAdapter | null): void => {
  authAdapter = adapter;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...init, headers });

  if (response.status === 401 && headers.has("Authorization") && !path.startsWith("/auth/")) {
    const token = await renewAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      response = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...init, headers });
    }
  }

  const data = await response.json().catch(() => null) as { message?: string } | null;

  if (!response.ok) {
    throw new ApiError(data?.message ?? "Não foi possível concluir a operação.", response.status);
  }

  return data as T;
}

const renewAccessToken = (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const adapter = authAdapter;
    const session = await adapter?.getSession();
    if (!session?.refreshToken) return null;
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!response.ok) {
      await adapter?.onExpire(session);
      return null;
    }
    const payload = await response.json() as RefreshPayload;
    await adapter?.onRefresh(payload, session);
    const current = await adapter?.getSession();
    if (authAdapter !== adapter || current?.token !== payload.token) return null;
    return payload.token;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

export function resolveApiAsset(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL.replace(/\/api$/, "")}${path}`;
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 8000);
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener("abort", abort, { once: true });
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timeout); init.signal?.removeEventListener("abort", abort); }
}

export async function fetchAllPages<T>(path: string, token: string): Promise<T[]> {
  const parameters = new URLSearchParams(path.split("?")[1] ?? "");
  const resource = path.split("?")[0];
  const records: T[] = [];
  let pages = 1;
  for (let page = 1; page <= pages; page++) {
    parameters.set("page", String(page));
    const response = await apiRequest<{ data: T[]; totalPages?: number }>(`${resource}?${parameters}`, { headers: { Authorization: `Bearer ${token}` } });
    pages = response.totalPages ?? 1;
    if (!Number.isInteger(pages) || pages < 0 || pages > 100) throw new ApiError("A consulta excedeu o limite de dados locais.", 502);
    records.push(...response.data);
  }
  return records;
}
