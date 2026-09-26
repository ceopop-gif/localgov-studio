import { rows, createRecord } from "@/db/repository";
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

  const result = await rows("content_items", {site_id:`eq.${siteId}`,order:"updated_at.desc"});
  return Response.json({ content: result });
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

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { galleryUrls, ...contentData } = parsed.data;
    await createRecord("content_items", {
        id,
        siteId,
        ...contentData,
        galleryJson: JSON.stringify(galleryUrls),
        createdBy: user.email,
        publishedAt: parsed.data.status === "published" ? now : null,
        approvedBy: parsed.data.status === "published" ? user.email : "",
      }, {
        id: crypto.randomUUID(),
        siteId,
        actorUserId: user.id,
        actorEmail: user.email,
        action: "content.created",
        entityType: parsed.data.type,
        entityId: id,
        metadata: JSON.stringify({ status: parsed.data.status }),
      });
    const [created] = await rows("content_items", {id:`eq.${id}`,site_id:`eq.${siteId}`,limit:"1"});
    return Response.json({ content: created }, { status: 201 });
  } catch (error) {
    console.error("create content failed", error);
    return Response.json({ error: "บันทึกเนื้อหาไม่สำเร็จ" }, { status: 500 });
  }
}
