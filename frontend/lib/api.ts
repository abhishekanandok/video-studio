import useSWR, { mutate, type SWRConfiguration } from "swr";

// the backend on the same machine the page came from: localhost here, 192.168.x.x from another computer on the Wi-Fi
export const API = process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8020/api` : "http://localhost:8020/api");

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: init?.body instanceof FormData ? init.headers : { "content-type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Can't reach the Video Studio backend. Is it running on port 8020?", 0);
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = typeof body.detail === "string" ? body.detail : msg;
    } catch {}
    throw new ApiError(msg, res.status);
  }
  return res.json();
}

export const post = <T = any>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) });

/** Cached, auto-revalidating GET. Pass null to skip. */
export function useApi<T = any>(path: string | null, config?: SWRConfiguration) {
  return useSWR<T>(path, (p: string) => api<T>(p), { revalidateOnFocus: true, keepPreviousData: true, ...config });
}

/** Refresh every cached query, e.g. after a background task finishes. */
export const refreshAll = () => mutate(() => true);

export const letter = (i: number) => String.fromCharCode(65 + i);

export const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);

export function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
