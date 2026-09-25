import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, contentItems } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getManagedSite } from "@/lib/site-repository";
import { createContentSchema } from "@/lib/validators";
import { rejectCrossOriginWrite } from "@/lib/request-security";

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
    .from(contentItems)
    .where(eq(contentItems.siteId, siteId))
    .orderBy(desc(contentItems.updatedAt));
  return Response.json({ content: rows });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const crossOrigin = rejectCrossOriginWrite(request);
  if (crossOrigin) return crossOrigin;
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { siteId } = await params;

  try {
    if (!(await getManagedSite(siteId, user.id))) {
      return Response.json({ error: "ไม่มีสิทธิ์จัดการเว็บไซต์นี้" }, { status: 403 });
    }
    const parsed = createContentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "กรอกข้อมูลเนื้อหาไม่ครบ", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { galleryUrls, ...contentData } = parsed.data;
    await db.batch([
      db.insert(contentItems).values({
        id,
        siteId,
        ...contentData,
        galleryJson: JSON.stringify(galleryUrls),
        createdBy: user.email,
        publishedAt: parsed.data.status === "published" ? now : null,
        approvedBy: parsed.data.status === "published" ? user.email : "",
      }),
      db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        siteId,
        actorUserId: user.id,
        actorEmail: user.email,
        action: "content.created",
        entityType: parsed.data.type,
        entityId: id,
        metadata: JSON.stringify({ status: parsed.data.status }),
      }),
    ]);
    const [created] = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
    return Response.json({ content: created }, { status: 201 });
  } catch (error) {
    console.error("create content failed", error);
    return Response.json({ error: "บันทึกเนื้อหาไม่สำเร็จ" }, { status: 500 });
  }
}
