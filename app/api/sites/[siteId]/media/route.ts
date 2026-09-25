import { desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { auditLogs, mediaFiles } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getManagedSite } from "@/lib/site-repository";
import { rejectCrossOriginWrite } from "@/lib/request-security";

type Bucket = {
  put: (key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
  delete: (key: string) => Promise<void>;
};

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
]);

function getBucket(): Bucket {
  const bucket = (env as unknown as { BUCKET?: Bucket }).BUCKET;
  if (!bucket) throw new Error("R2 binding BUCKET is unavailable");
  return bucket;
}

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
  const files = await db
    .select()
    .from(mediaFiles)
    .where(eq(mediaFiles.siteId, siteId))
    .orderBy(desc(mediaFiles.createdAt));
  return Response.json({ files });
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
  if (!(await getManagedSite(siteId, user.id))) {
    return Response.json({ error: "ไม่มีสิทธิ์จัดการเว็บไซต์นี้" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const category = String(form.get("category") || "document").slice(0, 60);
  const altText = String(form.get("altText") || "").slice(0, 300);
  if (!(file instanceof File)) return Response.json({ error: "กรุณาเลือกไฟล์" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: "ประเภทไฟล์นี้ไม่รองรับ" }, { status: 415 });
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 15 MB" }, { status: 413 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "upload";
  const id = crypto.randomUUID();
  const key = `sites/${siteId}/${id}-${safeName}`;
  const bucket = getBucket();

  try {
    await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    const db = getDb();
    await db.batch([
      db.insert(mediaFiles).values({
        id,
        siteId,
        objectKey: key,
        fileName: file.name.slice(0, 255),
        contentType: file.type,
        sizeBytes: file.size,
        category,
        altText,
        uploadedBy: user.email,
      }),
      db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        siteId,
        actorUserId: user.id,
        actorEmail: user.email,
        action: "media.uploaded",
        entityType: "media",
        entityId: id,
        metadata: JSON.stringify({ fileName: file.name, sizeBytes: file.size }),
      }),
    ]);
    return Response.json({ file: { id, fileName: file.name, url: `/api/media/${id}` } }, { status: 201 });
  } catch (error) {
    console.error("media upload failed", error);
    try {
      await bucket.delete(key);
    } catch {
      // The upload may not have completed; cleanup failure is non-fatal here.
    }
    return Response.json({ error: "อัปโหลดไฟล์ไม่สำเร็จ" }, { status: 500 });
  }
}
