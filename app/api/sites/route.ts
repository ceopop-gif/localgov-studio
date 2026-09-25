import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, siteMembers, sites } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createSiteSchema } from "@/lib/validators";
import { rejectCrossOriginWrite } from "@/lib/request-security";

function unauthorized() {
  return Response.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  if (user.authSource === "local") {
    return Response.json(
      { error: "บัญชีทดลองจัดการได้เฉพาะเว็บไซต์เทศบาลที่กำหนด" },
      { status: 403 },
    );
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(sites)
      .where(eq(sites.ownerUserId, user.id))
      .orderBy(desc(sites.updatedAt));
    return Response.json({ sites: rows });
  } catch (error) {
    console.error("list sites failed", error);
    return Response.json({ error: "ไม่สามารถโหลดเว็บไซต์ได้ในขณะนี้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOriginWrite(request);
  if (crossOrigin) return crossOrigin;
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  if (user.authSource === "local") {
    return Response.json(
      { error: "บัญชีทดลองไม่มีสิทธิ์สร้างเว็บไซต์ใหม่" },
      { status: 403 },
    );
  }

  try {
    const parsed = createSiteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: "ข้อมูลเว็บไซต์ไม่ครบหรือรูปแบบไม่ถูกต้อง", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const db = getDb();
    const siteId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const logId = crypto.randomUUID();
    const value = parsed.data;
    const completeness =
      18 +
      (value.province ? 7 : 0) +
      (value.district ? 7 : 0) +
      (value.subdistrict ? 7 : 0) +
      (value.englishName ? 4 : 0);

    await db.batch([
      db.insert(sites).values({
        id: siteId,
        ownerUserId: user.id,
        name: value.name,
        englishName: value.englishName,
        slug: value.slug,
        organizationType: value.organizationType,
        province: value.province,
        district: value.district,
        subdistrict: value.subdistrict,
        primaryColor: value.primaryColor,
        secondaryColor: value.secondaryColor,
        completeness,
      }),
      db.insert(siteMembers).values({
        id: memberId,
        siteId,
        userId: user.id,
        email: user.email,
        role: "super_admin",
        department: "ผู้ดูแลระบบกลาง",
      }),
      db.insert(auditLogs).values({
        id: logId,
        siteId,
        actorUserId: user.id,
        actorEmail: user.email,
        action: "site.created",
        entityType: "site",
        entityId: siteId,
        metadata: JSON.stringify({ slug: value.slug, template: "local-government-v1" }),
      }),
    ]);

    const [created] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
    return Response.json({ site: created }, { status: 201 });
  } catch (error) {
    console.error("create site failed", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE") || message.includes("idx_sites_slug_unique")) {
      return Response.json({ error: "ชื่อ URL นี้ถูกใช้แล้ว กรุณาเปลี่ยนชื่อ" }, { status: 409 });
    }
    return Response.json({ error: "สร้างเว็บไซต์ไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
