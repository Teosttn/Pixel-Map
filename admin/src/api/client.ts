export type ContentCollection = "blog" | "news" | "projects" | "pages";
export type ContentRecord = { collection: ContentCollection; slug: string; path: string; metadata: Record<string, string | boolean | number | string[]>; body: string; version: string };
export type TabMap = { glyph: string; landmark: string; x: number; y: number; color: string; title: string; zhTitle: string; description: string; zhDescription: string };
export type Tab = { id: string; kind: "built-in" | "page" | "external"; label: string; zh: string; href: string; visible: boolean; order: number; map: TabMap };

type ApiBody = { error?: string; code?: string; [key: string]: unknown } | null;

async function apiRequest(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api${path}`, { ...init, credentials: "same-origin", headers });
  const body = await response.json().catch(() => null) as ApiBody;
  return { response, body };
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let result = await apiRequest(path, init);
  if (result.response.status === 403 && result.body?.code === "SESSION_REQUIRED") {
    result = await apiRequest(path, init);
  }
  if (!result.response.ok) throw new Error(result.body?.error || `Request failed with ${result.response.status}`);
  return result.body as T;
}

export function request(method: "POST" | "PUT" | "DELETE", body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}
