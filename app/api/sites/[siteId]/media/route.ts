import { rows, createRecord, runOperation } from "@/db/repository";
import { env } from "cloudflare:workers";
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

  const files = await rows("media_files", {site_id:`eq.${siteId}`,order:"created_at.desc"});
  const folders = await runOperation("manage_media_folder", {p_site_id:siteId,p_actor_id:user.id,p_actor_email:user.email,p_action:"list"});
  return Response.json({ files, folders });
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
  const folderId = String(form.get("folderId") || "");
  const altText = String(form.get("altText") || "").slice(0, 300);
  if (!(file instanceof File)) return Response.json({ error: "กรุณาเลือกไฟล์" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: "ประเภทไฟล์นี้ไม่รองรับ" }, { status: 415 });
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 15 MB" }, { status: 413 });

  const category = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document";
  if (folderId) {
    const folders = await runOperation<{id:string}[]>("manage_media_folder", {p_site_id:siteId,p_actor_id:user.id,p_actor_email:user.email,p_action:"list"});
    if (!folders.some(folder=>folder.id===folderId)) return Response.json({error:"ไม่พบโฟลเดอร์ในหน่วยงานนี้"},{status:400});
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "upload";
  const id = crypto.randomUUID();
  const key = `sites/${siteId}/${id}-${safeName}`;
  const bucket = getBucket();

  try {
    await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });

    await createRecord("media_files", {
        id,
        siteId,
        objectKey: key,
        fileName: file.name.slice(0, 255),
        contentType: file.type,
        sizeBytes: file.size,
        category,
        ...{folderId: folderId || null},
        altText,
        uploadedBy: user.email,
      }, {
        id: crypto.randomUUID(),
        siteId,
        actorUserId: user.id,
        actorEmail: user.email,
        action: "media.uploaded",
        entityType: "media",
        entityId: id,
        metadata: JSON.stringify({ fileName: file.name, sizeBytes: file.size }),
      });
    return Response.json({ file: { id, fileName: file.name, url: `/api/media/${id}`, contentType:file.type, folderId:folderId || null, sizeBytes:file.size } }, { status: 201 });
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

export async function PATCH(request: Request, {params}: {params:Promise<{siteId:string}>}) {
 const crossOrigin=rejectCrossOriginWrite(request); if(crossOrigin)return crossOrigin;
 const user=await getChatGPTUser(); if(!user)return Response.json({error:"กรุณาเข้าสู่ระบบ"},{status:401});
 const {siteId}=await params;
 if(!await getManagedSite(siteId,user.id))return Response.json({error:"ไม่มีสิทธิ์จัดการเว็บไซต์นี้"},{status:403});
 let body: {action?:string;name?:string;fileId?:string;folderId?:string|null};
 try { body=await request.json(); } catch {return Response.json({error:"ข้อมูลไม่ถูกต้อง"},{status:400});}
 if(!body || !["create","move"].includes(body.action || ""))return Response.json({error:"คำสั่งไม่ถูกต้อง"},{status:400});
 if(body.action==="create" && (typeof body.name!=="string" || !body.name.trim() || body.name.trim().length>100))return Response.json({error:"กรอกชื่อโฟลเดอร์ 1–100 ตัวอักษร"},{status:400});
 if(body.action==="move" && (typeof body.fileId!=="string" || !body.fileId || (body.folderId!=null && typeof body.folderId!=="string")))return Response.json({error:"ข้อมูลไฟล์ไม่ถูกต้อง"},{status:400});
 try {
  const result=await runOperation("manage_media_folder",{p_site_id:siteId,p_actor_id:user.id,p_actor_email:user.email,p_action:body.action,p_folder_id:body.action==="create"?crypto.randomUUID():body.folderId || null,p_name:body.name?.trim() || null,p_file_id:body.fileId || null});
  return Response.json({result});
 }catch(error){return Response.json({error:error instanceof Error && error.message.includes("UNIQUE")?"มีโฟลเดอร์ชื่อนี้แล้ว":"บันทึกไม่สำเร็จ กรุณาตรวจสอบไฟล์และโฟลเดอร์"},{status:400});}
}
