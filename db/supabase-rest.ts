import { env } from "cloudflare:workers";

// Server-only Data API adapter. Never import this module into a client component.
const TABLES = ["sites", "site_members", "content_items", "service_requests", "media_files", "audit_logs", "local_admin_sessions"] as const;
export type LocalGovTable = typeof TABLES[number];
type RecordData = Record<string, unknown>;

function configuration() {
  const baseUrl = typeof env.SUPABASE_URL === "string" ? env.SUPABASE_URL.replace(/\/$/, "") : "";
  const key = env.SUPABASE_SECRET_KEY;
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(baseUrl) || typeof key !== "string" || !key) {
    throw new Error("Supabase server configuration is incomplete");
  }
  return { baseUrl, key };
}

async function request<T>(table: LocalGovTable, method: string, filters: Record<string, string>, body?: RecordData | RecordData[]): Promise<T> {
  if (!TABLES.includes(table)) throw new Error("Unknown application table");
  const { baseUrl, key } = configuration();
  const query = new URLSearchParams(filters).toString();
  const headers: Record<string, string> = {
    apikey: key,
    "content-type": "application/json",
    "accept-profile": "localgov",
    "content-profile": "localgov",
    prefer: "return=representation",
  };
  // Modern secret keys authenticate via apikey; legacy service-role JWTs also
  // need the Authorization header. No browser-facing code receives either key.
  if (!key.startsWith("sb_secret_")) headers.authorization = `Bearer ${key}`;
  const response = await fetch(`${baseUrl}/rest/v1/${table}${query ? `?${query}` : ""}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000), cache: "no-store",
  });
  if (!response.ok) {
    // Never put response bodies, keys, query values, or citizen data in errors.
    throw new Error(`Supabase Data API failed (${response.status})`);
  }
  if (response.status === 204) return [] as T;
  return await response.json() as T;
}

export const supabaseRest = {
  select<T extends RecordData>(table: LocalGovTable, filters: Record<string, string> = {}) {
    return request<T[]>(table, "GET", { select: "*", ...filters });
  },
  insert<T extends RecordData>(table: LocalGovTable, rows: RecordData | RecordData[]) {
    return request<T[]>(table, "POST", {}, rows);
  },
  updateById<T extends RecordData>(table: LocalGovTable, id: string, changes: RecordData) {
    if (!id) throw new Error("A row id is required");
    return request<T[]>(table, "PATCH", { id: `eq.${id}` }, changes);
  },
  deleteById(table: LocalGovTable, id: string) {
    if (!id) throw new Error("A row id is required");
    return request<RecordData[]>(table, "DELETE", { id: `eq.${id}` });
  },
};

export async function checkSupabaseConnection() {
  await supabaseRest.select("sites", { select: "id", limit: "1" });
  return { connected: true, provider: "supabase" as const };
}
