import { env } from "cloudflare:workers";
import { rows, runOperation, toDatabase } from "@/db/repository";
import { SUNG_NOEN_SITE_ID } from "@/lib/site-repository";

export const LOCAL_ADMIN_COOKIE_NAME = "__Host-localgov_admin_session";
export const LOCAL_ADMIN_USER_ID = "local-admin-demo";
export const LOCAL_ADMIN_EMAIL = "admin@demo.localgov";
export const LOCAL_ADMIN_DISPLAY_NAME = "admin (บัญชีทดลอง)";
export const LOCAL_ADMIN_SESSION_SECONDS = 8 * 60 * 60;

// Credential digests are server secrets; no default credentials in source.
function credentialDigest(key:"LOCAL_ADMIN_USERNAME_SHA256"|"LOCAL_ADMIN_PASSWORD_SHA256"):string {
  const value=env[key];
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value) ? value : "";
}

export type LocalAdminIdentity = {
  id: string;
  siteId: string;
  username: string;
};

export async function verifyLocalAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const [usernameDigest, passwordDigest] = await Promise.all([
    sha256Hex(username),
    sha256Hex(password),
  ]);

  return (
    constantTimeEqual(usernameDigest, credentialDigest("LOCAL_ADMIN_USERNAME_SHA256")) &&
    constantTimeEqual(passwordDigest, credentialDigest("LOCAL_ADMIN_PASSWORD_SHA256"))
  );
}

export async function createLocalAdminSession(): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCAL_ADMIN_SESSION_SECONDS * 1000);
  const token = randomToken();
  const sessionId = await sha256Hex(token);
  await runOperation("create_session", {
    p_data:toDatabase({id:sessionId,siteId:SUNG_NOEN_SITE_ID,userId:LOCAL_ADMIN_USER_ID,username:"admin",expiresAt:expiresAt.toISOString()}),
    p_member:toDatabase({id:"local-admin-demo-sung-noen",siteId:SUNG_NOEN_SITE_ID,userId:LOCAL_ADMIN_USER_ID,email:LOCAL_ADMIN_EMAIL,role:"super_admin",department:"บัญชีทดลอง",active:true}),
    p_audit:toDatabase({id:crypto.randomUUID(),siteId:SUNG_NOEN_SITE_ID,actorUserId:LOCAL_ADMIN_USER_ID,actorEmail:LOCAL_ADMIN_EMAIL,action:"auth.login",entityType:"session",entityId:sessionId,metadata:JSON.stringify({auth:"local_demo",expiresInHours:8})}),
  });

  return { token, expiresAt };
}

export async function getLocalAdminIdentity(
  cookieHeader: string | null,
): Promise<LocalAdminIdentity | null> {
  const token = readCookie(cookieHeader, LOCAL_ADMIN_COOKIE_NAME);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

  const sessionId = await sha256Hex(token);
  const [session] = await rows("local_admin_sessions", {id:`eq.${sessionId}`,expires_at:`gt.${new Date().toISOString()}`,limit:"1"});
  return session ? {id:session.userId,siteId:session.siteId,username:session.username} : null;
}

export async function deleteLocalAdminSession(
  cookieHeader: string | null,
): Promise<void> {
  const token = readCookie(cookieHeader, LOCAL_ADMIN_COOKIE_NAME);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;

  const sessionId = await sha256Hex(token);
  const [session] = await rows("local_admin_sessions", {id:`eq.${sessionId}`,limit:"1"});
  if (!session) return;
  await runOperation("delete_session", {p_id:sessionId,p_audit:toDatabase({
    id:crypto.randomUUID(),siteId:session.siteId,actorUserId:session.userId,actorEmail:LOCAL_ADMIN_EMAIL,
    action:"auth.logout",entityType:"session",entityId:sessionId,metadata:JSON.stringify({auth:"local_demo"}),
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

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
