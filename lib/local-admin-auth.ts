import { and, eq, gt, lt } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import {
  auditLogs,
  localAdminSessions,
  siteMembers,
  sites,
} from "@/db/schema";
import { SUNG_NOEN_SITE_ID } from "@/lib/site-repository";

export const LOCAL_ADMIN_COOKIE_NAME = "__Host-localgov_admin_session";
export const LOCAL_ADMIN_USER_ID = "local-admin-demo";
export const LOCAL_ADMIN_EMAIL = "admin@demo.localgov";
export const LOCAL_ADMIN_DISPLAY_NAME = "admin (บัญชีทดลอง)";
export const LOCAL_ADMIN_SESSION_SECONDS = 8 * 60 * 60;

export type LocalAdminIdentity = {
  id: string;
  siteId: string;
  username: string;
};

export async function verifyLocalAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  // Configure these as runtime secrets; do not commit credentials or their digests.
  const expectedUsernameDigest = env.LOCAL_ADMIN_USERNAME_SHA256;
  const expectedPasswordDigest = env.LOCAL_ADMIN_PASSWORD_SHA256;
  if (
    typeof expectedUsernameDigest !== "string" ||
    typeof expectedPasswordDigest !== "string" ||
    !/^[a-f0-9]{64}$/.test(expectedUsernameDigest) ||
    !/^[a-f0-9]{64}$/.test(expectedPasswordDigest)
  ) {
    return false;
  }

  const [usernameDigest, passwordDigest] = await Promise.all([
    sha256Hex(username),
    sha256Hex(password),
  ]);

  return (
    constantTimeEqual(usernameDigest, expectedUsernameDigest) &&
    constantTimeEqual(passwordDigest, expectedPasswordDigest)
  );
}

export async function createLocalAdminSession(): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCAL_ADMIN_SESSION_SECONDS * 1000);
  const token = randomToken();
  const sessionId = await sha256Hex(token);

  const [site] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.id, SUNG_NOEN_SITE_ID))
    .limit(1);
  if (!site) throw new Error("ไม่พบเว็บไซต์เทศบาลสำหรับบัญชีทดลอง");

  await db
    .delete(localAdminSessions)
    .where(lt(localAdminSessions.expiresAt, now.toISOString()));
  await db.batch([
    db
      .insert(siteMembers)
      .values({
        id: "local-admin-demo-sung-noen",
        siteId: SUNG_NOEN_SITE_ID,
        userId: LOCAL_ADMIN_USER_ID,
        email: LOCAL_ADMIN_EMAIL,
        role: "super_admin",
        department: "บัญชีทดลอง",
        active: true,
      })
      .onConflictDoUpdate({
        target: [siteMembers.siteId, siteMembers.userId],
        set: {
          email: LOCAL_ADMIN_EMAIL,
          role: "super_admin",
          department: "บัญชีทดลอง",
          active: true,
        },
      }),
    db.insert(localAdminSessions).values({
      id: sessionId,
      siteId: SUNG_NOEN_SITE_ID,
      userId: LOCAL_ADMIN_USER_ID,
      username: "admin",
      expiresAt: expiresAt.toISOString(),
    }),
    db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      siteId: SUNG_NOEN_SITE_ID,
      actorUserId: LOCAL_ADMIN_USER_ID,
      actorEmail: LOCAL_ADMIN_EMAIL,
      action: "auth.login",
      entityType: "session",
      entityId: sessionId,
      metadata: JSON.stringify({ auth: "local_demo", expiresInHours: 8 }),
    }),
  ]);

  return { token, expiresAt };
}

export async function getLocalAdminIdentity(
  cookieHeader: string | null,
): Promise<LocalAdminIdentity | null> {
  const token = readCookie(cookieHeader, LOCAL_ADMIN_COOKIE_NAME);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

  const sessionId = await sha256Hex(token);
  const [session] = await getDb()
    .select({
      id: localAdminSessions.userId,
      siteId: localAdminSessions.siteId,
      username: localAdminSessions.username,
    })
    .from(localAdminSessions)
    .where(
      and(
        eq(localAdminSessions.id, sessionId),
        gt(localAdminSessions.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1);

  return session ?? null;
}

export async function deleteLocalAdminSession(
  cookieHeader: string | null,
): Promise<void> {
  const token = readCookie(cookieHeader, LOCAL_ADMIN_COOKIE_NAME);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;

  const sessionId = await sha256Hex(token);
  const db = getDb();
  const [session] = await db
    .select({ siteId: localAdminSessions.siteId })
    .from(localAdminSessions)
    .where(eq(localAdminSessions.id, sessionId))
    .limit(1);

  if (!session) return;
  await db.batch([
    db.delete(localAdminSessions).where(eq(localAdminSessions.id, sessionId)),
    db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      siteId: session.siteId,
      actorUserId: LOCAL_ADMIN_USER_ID,
      actorEmail: LOCAL_ADMIN_EMAIL,
      action: "auth.logout",
      entityType: "session",
      entityId: sessionId,
      metadata: JSON.stringify({ auth: "local_demo" }),
    }),
  ]);
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
