import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, contentItems } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getManagedSite } from "@/lib/site-repository";
import { updateContentSchema } from "@/lib/validators";
import { rejectCrossOriginWrite } from "@/lib/request-security";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string; contentId: string }> },
) {
  const crossOrigin = rejectCrossOriginWrite(request);
  if (crossOrigin) return crossOrigin;
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { siteId, contentId } = await params;
  if (!(await getManagedSite(siteId, user.id))) {
    return Response.json({ error: "ไม่มีสิทธิ์จัดการเว็บไซต์นี้" }, { status: 403 });
  }

  const parsed = updateContentSchema.safeParse(await request.json());
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const db = getDb();
    const now = new Date().toISOString();
    const { galleryUrls, ...contentUpdates } = parsed.data;
    const updates = {
      ...contentUpdates,
      ...(galleryUrls ? { galleryJson: JSON.stringify(galleryUrls) } : {}),
      updatedAt: now,
      ...(parsed.data.status === "published"
        ? { publishedAt: now, approvedBy: user.email }
        : {}),
    };
    await db.batch([
      db
        .update(contentItems)
        .set(updates)
        .where(
          and(
            eq(contentItems.id, contentId),
            eq(contentItems.siteId, siteId),
          ),
        ),
      db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        siteId,
        actorUserId: user.id,
        actorEmail: user.email,
        action: "content.updated",
        entityType: "content",
        entityId: contentId,
        metadata: JSON.stringify({ fields: Object.keys(parsed.data) }),
      }),
    ]);
    const [updated] = await db
      .select()
      .from(contentItems)
      .where(
        and(
          eq(contentItems.id, contentId),
          eq(contentItems.siteId, siteId),
        ),
      )
      .limit(1);
    return Response.json({ content: updated });
  } catch (error) {
    console.error("update content failed", error);
    return Response.json({ error: "อัปเดตเนื้อหาไม่สำเร็จ" }, { status: 500 });
  }
}
