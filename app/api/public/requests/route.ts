import { rows, createRecord } from "@/db/repository";
import { DEMO_SITE } from "@/lib/models";
import { createRequestSchema } from "@/lib/validators";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { getSiteAccessStatus } from "@/lib/site-access";

function trackingCode() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const suffix = crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 6)
    .toUpperCase();
  return `LG-${date}-${suffix}`;
}

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOriginWrite(request);
  if (crossOrigin) return crossOrigin;
  try {
    const parsed = createRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        {
          error: "กรอกข้อมูลคำร้องไม่ครบหรือรูปแบบไม่ถูกต้อง",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (parsed.data.siteSlug === DEMO_SITE.slug) {
      return Response.json(
        { trackingCode: `DEMO-${Date.now().toString().slice(-6)}`, demo: true },
        { status: 201 },
      );
    }

    const [site] = await rows("sites", {
      slug: `eq.${parsed.data.siteSlug}`,
      status: "eq.published",
      limit: "1",
    });
    if (!site || await getSiteAccessStatus(site.id) !== "active")
      return Response.json(
        { error: "ไม่พบหน่วยงานที่ต้องการส่งเรื่อง" },
        { status: 404 },
      );

    const id = crypto.randomUUID();
    const code = trackingCode();
    const payload = { ...parsed.data };
    Reflect.deleteProperty(payload, "siteSlug");
    await createRecord(
      "service_requests",
      {
        id,
        siteId: site.id,
        trackingCode: code,
        ...payload,
      },
      {
        id: crypto.randomUUID(),
        siteId: site.id,
        actorUserId: "public",
        actorEmail: "anonymous",
        action: "service_request.created",
        entityType: "service_request",
        entityId: id,
        metadata: JSON.stringify({ requestType: payload.requestType }),
      },
    );
    return Response.json({ trackingCode: code }, { status: 201 });
  } catch (error) {
    console.error("public service request failed", error);
    return Response.json(
      { error: "ส่งคำร้องไม่สำเร็จ กรุณาลองใหม่" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("site")?.trim() ?? "";
  const code = url.searchParams.get("code")?.trim().toUpperCase() ?? "";
  if (!slug || !code)
    return Response.json({ error: "กรุณาระบุเลขรับเรื่อง" }, { status: 400 });

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
    const [site] = await rows("sites", {
      slug: `eq.${slug}`,
      status: "eq.published",
      select: "id",
      limit: "1",
    });
    const [row] = site && await getSiteAccessStatus(site.id) === "active"
      ? await rows("service_requests", {
          site_id: `eq.${site.id}`,
          tracking_code: `eq.${code}`,
          select:
            "tracking_code,request_type,status,assigned_department,created_at,updated_at",
          limit: "1",
        })
      : [];
    if (!row)
      return Response.json({ error: "ไม่พบเลขรับเรื่องนี้" }, { status: 404 });
    return Response.json({ request: row });
  } catch (error) {
    console.error("track service request failed", error);
    return Response.json({ error: "ตรวจสอบสถานะไม่สำเร็จ" }, { status: 500 });
  }
}
