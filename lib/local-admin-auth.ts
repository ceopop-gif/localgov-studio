import { getSiteAccessStatus } from "@/lib/site-access";
import type { AgencyAccessStatus } from "@/lib/agency-term";
import * as legacy from "@/lib/legacy-local-admin";
import { rows, runOperation, toDatabase } from "@/db/repository";

export const LOCAL_ADMIN_COOKIE_NAME = "__Host-localgov_admin_session";
export const LOCAL_ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export type LocalAdminIdentity = {
  id: string;
  siteId?: string;
  platform?: boolean;
  username: string;
  email: string;
  displayName: string;
};

type LoginResult = { ok: false; blocked?: boolean; pending?: boolean; accessStatus?: AgencyAccessStatus } | { ok: true; siteId?: string; platform?: boolean; expiresAt?: string };
export async function createLocalAdminSession(siteSlug: string, username: string, password: string, platform = false): Promise<{ok:false;blocked?:boolean;pending?:boolean;accessStatus?:AgencyAccessStatus}|{ok:true;token:string;siteId?:string;platform?:boolean;expiresAt?:string}> {
  // Preserve the existing Sung Noen account without granting platform access.
  if (!platform && username === "admin" && (!siteSlug || siteSlug === "sung-noen")) {
    const allowed = await runOperation<boolean>("consume_request_limit", {p_key:"legacy-admin-login",p_limit:20,p_seconds:900});
    if (!allowed) return {ok:false,blocked:true} as const;
    if (await legacy.verifyLocalAdminCredentials(username,password)) {
      const accessStatus = await getSiteAccessStatus("sung-noen-municipality");
      if (accessStatus !== "active") return {ok:false,accessStatus};
      const session = await legacy.createLocalAdminSession();
      return {ok:true,token:session.token,siteId:"sung-noen-municipality",expiresAt:session.expiresAt.toISOString()} as const;
    }
    return {ok:false} as const;
  }
  const token = randomToken();
  const result = await runOperation<LoginResult>(platform ? "login_platform_admin" : "login_site_admin", {
    ...(!platform ? {p_site_slug: siteSlug} : {}), p_username: username, p_password: password,
    p_session_hash: await sha256Hex(token),
  });
  return result.ok ? { ...result, token } : result;
}

export async function getLocalAdminIdentity(cookieHeader: string | null): Promise<LocalAdminIdentity | null> {
  const token = readCookie(cookieHeader, LOCAL_ADMIN_COOKIE_NAME);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const args = { p_session_hash: await sha256Hex(token) };
  const identity=await runOperation<LocalAdminIdentity | null>("resolve_platform_session", args) ?? await runOperation<LocalAdminIdentity | null>("resolve_site_admin_session", args);
  if(identity)return identity;
  const previous=await legacy.getLocalAdminIdentity(cookieHeader);
  if(previous && previous.id===legacy.LOCAL_ADMIN_USER_ID&&previous.siteId==="sung-noen-municipality" && await getSiteAccessStatus(previous.siteId)==="active")return {...previous,email:legacy.LOCAL_ADMIN_EMAIL,displayName:"ผู้ดูแลเทศบาลต้นฉบับ"};
  return null;
}

export async function deleteLocalAdminSession(cookieHeader: string | null): Promise<void> {
  const token = readCookie(cookieHeader, LOCAL_ADMIN_COOKIE_NAME);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  const sessionId = await sha256Hex(token);
  await runOperation("delete_platform_session", {p_session_hash:sessionId});
  const [session] = await rows("local_admin_sessions", {id:`eq.${sessionId}`,limit:"1"});
  if (!session) return;
  await runOperation("delete_session", {p_id:sessionId,p_audit:toDatabase({
    id:crypto.randomUUID(),siteId:session.siteId,actorUserId:session.userId,actorEmail:"",
    action:"auth.logout",entityType:"session",entityId:sessionId,metadata:JSON.stringify({auth:"site_admin"}),
  })});
}

export function localAdminSessionCookie(token: string): string {
  return [
    `${LOCAL_ADMIN_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${LOCAL_ADMIN_SESSION_SECONDS}`,
  ].join("; ");
}

export function expiredLocalAdminSessionCookie(): string {
  return [
    `${LOCAL_ADMIN_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ].join("; ");
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return valueParts.join("=");
  }
  return null;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
