import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, serviceRequests, sites } from "@/db/schema";
import { DEMO_SITE } from "@/lib/models";
import { createRequestSchema } from "@/lib/validators";
import { rejectCrossOriginWrite } from "@/lib/request-security";

function trackingCode() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `LG-${date}-${suffix}`;
}

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOriginWrite(request);
  if (crossOrigin) return crossOrigin;
  try {
    const parsed = createRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: "กรอกข้อมูลคำร้องไม่ครบหรือรูปแบบไม่ถูกต้อง", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    if (parsed.data.siteSlug === DEMO_SITE.slug) {
      return Response.json(
        { trackingCode: `DEMO-${Date.now().toString().slice(-6)}`, demo: true },
        { status: 201 },
      );
    }

    const db = getDb();
    const [site] = await db
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.slug, parsed.data.siteSlug))
      .limit(1);
    if (!site) return Response.json({ error: "ไม่พบหน่วยงานที่ต้องการส่งเรื่อง" }, { status: 404 });

    const id = crypto.randomUUID();
    const code = trackingCode();
    const { siteSlug: _siteSlug, ...payload } = parsed.data;
    await db.batch([
      db.insert(serviceRequests).values({
        id,
        siteId: site.id,
        trackingCode: code,
        ...payload,
      }),
      db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        siteId: site.id,
        actorUserId: "public",
        actorEmail: "anonymous",
        action: "service_request.created",
        entityType: "service_request",
        entityId: id,
        metadata: JSON.stringify({ requestType: payload.requestType }),
      }),
    ]);
    return Response.json({ trackingCode: code }, { status: 201 });
  } catch (error) {
    console.error("public service request failed", error);
    return Response.json({ error: "ส่งคำร้องไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("site")?.trim() ?? "";
  const code = url.searchParams.get("code")?.trim().toUpperCase() ?? "";
  if (!slug || !code) return Response.json({ error: "กรุณาระบุเลขรับเรื่อง" }, { status: 400 });

  if (slug === DEMO_SITE.slug && code.startsWith("DEMO-")) {
    return Response.json({
      request: {
        trackingCode: code,
        requestType: "คำร้องตัวอย่าง",
        status: "received",
        assignedDepartment: "หน่วยงานตัวอย่าง",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      demo: true,
    });
  }

  try {
    const db = getDb();
    const [row] = await db
      .select({
        trackingCode: serviceRequests.trackingCode,
        requestType: serviceRequests.requestType,
        status: serviceRequests.status,
        assignedDepartment: serviceRequests.assignedDepartment,
        createdAt: serviceRequests.createdAt,
        updatedAt: serviceRequests.updatedAt,
      })
      .from(serviceRequests)
      .innerJoin(sites, eq(serviceRequests.siteId, sites.id))
      .where(and(eq(sites.slug, slug), eq(serviceRequests.trackingCode, code)))
      .limit(1);
    if (!row) return Response.json({ error: "ไม่พบเลขรับเรื่องนี้" }, { status: 404 });
    return Response.json({ request: row });
  } catch (error) {
    console.error("track service request failed", error);
    return Response.json({ error: "ตรวจสอบสถานะไม่สำเร็จ" }, { status: 500 });
  }
}
