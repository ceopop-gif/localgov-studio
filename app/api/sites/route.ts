import { buildSiteFromTemplate } from "@/lib/site-template";
import { rows, createRecord } from "@/db/repository";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createSiteSchema } from "@/lib/validators";
import { rejectCrossOriginWrite } from "@/lib/request-security";

function unauthorized() {
  return Response.json(
    { error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
    { status: 401 },
  );
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
    const result = await rows("sites", {
      owner_user_id: `eq.${user.id}`,
      order: "updated_at.desc",
    });
    return Response.json({ sites: result });
  } catch (error) {
    console.error("list sites failed", error);
    return Response.json(
      { error: "ไม่สามารถโหลดเว็บไซต์ได้ในขณะนี้" },
      { status: 500 },
    );
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
        {
          error: "ข้อมูลเว็บไซต์ไม่ครบหรือรูปแบบไม่ถูกต้อง",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const siteId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const logId = crypto.randomUUID();
    const value = parsed.data;
    let source;
    if (value.sourceSiteId) {
      [source] = await rows("sites", {
        id: `eq.${value.sourceSiteId}`,
        owner_user_id: `eq.${user.id}`,
        limit: "1",
      });
      if (!source)
        return Response.json(
          { error: "ไม่มีสิทธิ์ใช้เว็บไซต์นี้เป็นต้นฉบับ" },
          { status: 403 },
        );
    }
    const { sourceSiteId, ...newSite } = value;
    const created = await createRecord(
      "sites",
      {
        ...buildSiteFromTemplate(newSite, source),
        id: siteId,
        ownerUserId: user.id,
      },
      {
        id: logId,
        siteId,
        actorUserId: user.id,
        actorEmail: user.email,
        action: "site.created",
        entityType: "site",
        entityId: siteId,
        metadata: JSON.stringify({
          slug: value.slug,
          template: "local-government-v2",
          sourceSiteId: sourceSiteId ?? null,
        }),
      },
      {
        id: memberId,
        siteId,
        userId: user.id,
        email: user.email,
        role: "super_admin",
        department: "ผู้ดูแลระบบกลาง",
      },
    );

    return Response.json({ site: created }, { status: 201 });
  } catch (error) {
    console.error("create site failed", error);
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("UNIQUE") ||
      message.includes("idx_sites_slug_unique")
    ) {
      return Response.json(
        { error: "ชื่อ URL นี้ถูกใช้แล้ว กรุณาเปลี่ยนชื่อ" },
        { status: 409 },
      );
    }
    return Response.json(
      { error: "สร้างเว็บไซต์ไม่สำเร็จ กรุณาลองใหม่" },
      { status: 500 },
    );
  }
}
