import { env } from "cloudflare:workers";

// Server only: imported by route handlers and repositories, never client components.
export const TABLES = ["sites", "site_members", "content_items", "service_requests", "media_files", "audit_logs", "local_admin_sessions"] as const;
export type LocalGovTable = typeof TABLES[number];
export type RecordData = Record<string, unknown>;
const RPCS = ["create_site", "update_site", "create_content", "update_content", "create_request", "update_request", "create_media", "create_session", "delete_session", "dashboard_stats"] as const;
export type LocalGovRpc = typeof RPCS[number];

function configuration() {
  const baseUrl = typeof env.SUPABASE_URL === "string" ? env.SUPABASE_URL.replace(/\/$/, "") : "";
  const key = env.SUPABASE_SECRET_KEY;
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(baseUrl) || typeof key !== "string" || !key) throw new Error("Supabase server configuration is incomplete");
  return { baseUrl, key };
}

async function request<T>(path: string, method: string, filters: Record<string, string>, body?: unknown, prefer = "return=representation"): Promise<{data:T;count:number}> {
  const { baseUrl, key } = configuration();
  const query = new URLSearchParams(filters).toString();
  const headers: Record<string, string> = { apikey: key, "content-type": "application/json", "accept-profile": "localgov", "content-profile": "localgov", prefer };
  if (!key.startsWith("sb_secret_")) headers.authorization = `Bearer ${key}`;
  const response = await fetch(`${baseUrl}/rest/v1/${path}${query ? `?${query}` : ""}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000), cache: "no-store",
  });
  if (!response.ok) {
    // Never log remote error bodies, credentials, filters or citizen records.
    throw new Error(response.status === 409 ? "UNIQUE conflict" : `Supabase Data API failed (${response.status})`);
  }
  return {data:(response.status === 204 || method === "HEAD" ? [] : await response.json()) as T, count:Number(response.headers.get("content-range")?.split("/")[1] ?? 0)};
}
function tableName(table:LocalGovTable) { if (!TABLES.includes(table)) throw new Error("Unknown application table"); return table; }
export const supabaseRest = {
  async select<T extends RecordData = RecordData>(table: LocalGovTable, filters: Record<string, string> = {}) {
    return (await request<T[]>(tableName(table), "GET", { select: "*", ...filters })).data;
  },
  async insert<T extends RecordData = RecordData>(table: LocalGovTable, rows: RecordData | RecordData[], ignoreDuplicates = false) {
    return (await request<T[]>(tableName(table), "POST", ignoreDuplicates ? {on_conflict:"id"} : {}, rows, `return=representation${ignoreDuplicates ? ",resolution=ignore-duplicates" : ""}`)).data;
  },
  async rpc<T>(name:LocalGovRpc, args:RecordData):Promise<T> {
    if (!RPCS.includes(name)) throw new Error("Unknown application operation");
    return (await request<T>(`rpc/${name}`, "POST", {}, args)).data;
  },
  async count(table:LocalGovTable, filters:Record<string,string>={}) {
    return (await request(tableName(table),"HEAD",{select:"id",...filters},undefined,"count=exact")).count;
  },
};
export async function checkSupabaseConnection() {
  await supabaseRest.select("sites", { select: "id", limit: "1" });
  return { connected: true, provider: "supabase" as const };
}
