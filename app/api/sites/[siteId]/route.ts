import { rows, updateRecord } from "@/db/repository";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getManagedSite } from "@/lib/site-repository";
import { updateSiteSchema } from "@/lib/validators";
import { rejectCrossOriginWrite } from "@/lib/request-security";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const crossOrigin = rejectCrossOriginWrite(request);
  if (crossOrigin) return crossOrigin;
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { siteId } = await params;

  try {
    const managedSite = await getManagedSite(siteId, user.id);
    if (!managedSite) return Response.json({ error: "ไม่มีสิทธิ์จัดการเว็บไซต์นี้" }, { status: 403 });

    const parsed = updateSiteSchema.safeParse(await request.json());
    if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
      return Response.json({ error: "ไม่มีข้อมูลที่แก้ไขได้" }, { status: 400 });
    }

    const { services, homepage, ...siteFields } = parsed.data;
    const changes = {
      ...siteFields,
      ...(services ? { servicesJson: JSON.stringify(services) } : {}),
      ...(homepage ? { homepageJson: JSON.stringify(homepage) } : {}),
      updatedAt: new Date().toISOString(),
    };
    await updateRecord("sites", siteId, siteId, changes, {
        id: crypto.randomUUID(),
        siteId,
        actorUserId: user.id,
        actorEmail: user.email,
        action: "site.updated",
        entityType: "site",
        entityId: siteId,
        metadata: JSON.stringify({ fields: Object.keys(parsed.data) }),
      });

    const [updated] = await rows("sites", {id:`eq.${siteId}`,limit:"1"});
    return Response.json({ site: updated });
  } catch (error) {
    console.error("update site failed", error);
    return Response.json({ error: "บันทึกข้อมูลเว็บไซต์ไม่สำเร็จ" }, { status: 500 });
  }
}
