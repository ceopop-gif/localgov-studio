import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { serviceRequests } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getManagedSite } from "@/lib/site-repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { siteId } = await params;
  if (!(await getManagedSite(siteId, user.id))) {
    return Response.json({ error: "ไม่มีสิทธิ์จัดการเว็บไซต์นี้" }, { status: 403 });
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.siteId, siteId))
    .orderBy(desc(serviceRequests.createdAt))
    .limit(100);
  return Response.json({ requests: rows });
}
