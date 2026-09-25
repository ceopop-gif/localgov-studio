import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, serviceRequests } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getManagedSite } from "@/lib/site-repository";
import { updateRequestSchema } from "@/lib/validators";
import { rejectCrossOriginWrite } from "@/lib/request-security";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string; requestId: string }> },
) {
  const crossOrigin = rejectCrossOriginWrite(request);
  if (crossOrigin) return crossOrigin;
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { siteId, requestId } = await params;
  if (!(await getManagedSite(siteId, user.id))) {
    return Response.json({ error: "ไม่มีสิทธิ์จัดการเว็บไซต์นี้" }, { status: 403 });
  }

  const parsed = updateRequestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "สถานะหรือหน่วยงานไม่ถูกต้อง" }, { status: 400 });

  try {
    const db = getDb();
    await db.batch([
      db
        .update(serviceRequests)
        .set({ ...parsed.data, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(serviceRequests.id, requestId),
            eq(serviceRequests.siteId, siteId),
          ),
        ),
      db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        siteId,
        actorUserId: user.id,
        actorEmail: user.email,
        action: "service_request.updated",
        entityType: "service_request",
        entityId: requestId,
        metadata: JSON.stringify(parsed.data),
      }),
    ]);
    const [updated] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId))
      .limit(1);
    return Response.json({ request: updated });
  } catch (error) {
    console.error("update service request failed", error);
    return Response.json({ error: "อัปเดตคำร้องไม่สำเร็จ" }, { status: 500 });
  }
}
