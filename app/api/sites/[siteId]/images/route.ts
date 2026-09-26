import {env} from "cloudflare:workers";
import {z} from "zod";
import {getChatGPTUser} from "@/app/chatgpt-auth";
import {getManagedSite} from "@/lib/site-repository";
import {createRecord,runOperation} from "@/db/repository";
import {rejectCrossOriginWrite} from "@/lib/request-security";
import {generateAgencyImage,ImageGenerationError,IMAGE_MODEL} from "@/lib/openai-images";
const input=z.object({id:z.string().uuid(),prompt:z.string().trim().min(10).max(2000),size:z.enum(["1536x1024","1024x1024","1024x1536"]).default("1536x1024")}).strict();
type Reservation={created:boolean;id?:string;status:string;mediaId?:string;errorCode?:string};
export async function POST(request:Request,{params}:{params:Promise<{siteId:string}>}){
 const rejected=rejectCrossOriginWrite(request);if(rejected)return rejected;
 const user=await getChatGPTUser();if(!user)return Response.json({error:"กรุณาเข้าสู่ระบบ"},{status:401});
 const {siteId}=await params;if(!await getManagedSite(siteId,user.id))return Response.json({error:"ไม่มีสิทธิ์จัดการเว็บไซต์นี้"},{status:403});
 const parsed=input.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"กรุณาเขียนคำอธิบายภาพ 10–2,000 ตัวอักษร"},{status:400});
 const {id,prompt,size}=parsed.data;const bucket=env.BUCKET as {put:(key:string,data:Uint8Array,options:unknown)=>Promise<unknown>;delete:(key:string)=>Promise<unknown>}|undefined;
 if(!bucket||!env.OPENAI_API_KEY)return Response.json({error:"บริการสร้างภาพยังไม่พร้อมใช้งาน"},{status:503});
 let reserved=false;let stored=false;let persisted=false;const key=`sites/${siteId}/${id}-ai.webp`;
 try{
  const job=await runOperation<Reservation>("reserve_ai_image",{p_id:id,p_site_id:siteId,p_actor_id:user.id,p_prompt:prompt,p_model:IMAGE_MODEL,p_size:size});
  if(!job.created){
   if(job.status==='completed'&&job.mediaId)return Response.json({file:{id:job.mediaId,fileName:"ภาพจาก AI.webp",url:`/api/media/${job.mediaId}`}});
   const message=job.status==='limit'?'วันนี้ใช้ครบ 20 ภาพแล้ว กรุณาลองใหม่วันถัดไป':job.status==='failed'?'คำขอนี้สร้างภาพไม่สำเร็จ กรุณาส่งคำขอใหม่':'กำลังสร้างภาพของหน่วยงานนี้ กรุณารอสักครู่';
   return Response.json({error:message},{status:job.status==='failed'?409:429});
  }
  reserved=true;const image=await generateAgencyImage(prompt,size);await bucket.put(key,image.bytes,{httpMetadata:{contentType:"image/webp"}});stored=true;
  const filename=`ai-${id.slice(0,8)}.webp`;
  await createRecord("media_files",{id,siteId,objectKey:key,fileName:filename,contentType:"image/webp",sizeBytes:image.bytes.length,category:"image",altText:prompt.slice(0,300),uploadedBy:user.email||user.displayName},{id:crypto.randomUUID(),siteId,actorUserId:user.id,actorEmail:user.email,action:"media.ai_generated",entityType:"media",entityId:id,metadata:JSON.stringify({model:IMAGE_MODEL,size,generationId:id})});persisted=true;
  await runOperation("finish_ai_image",{p_id:id,p_site_id:siteId,p_actor_id:user.id,p_media_id:id,p_error:null,p_usage:image.usage});
  return Response.json({file:{id,fileName:filename,url:`/api/media/${id}`,contentType:"image/webp",altText:prompt.slice(0,300)}},{status:201,headers:{"cache-control":"no-store"}});
 }catch(error){
  if(stored&&!persisted)await bucket.delete(key).catch(()=>{});
  if(reserved)await runOperation("finish_ai_image",{p_id:id,p_site_id:siteId,p_actor_id:user.id,p_media_id:persisted?id:null,p_error:error instanceof ImageGenerationError?error.code:"storage_error",p_usage:null}).catch(()=>{});
  return Response.json({error:error instanceof ImageGenerationError?error.message:"บันทึกภาพไม่สำเร็จ กรุณาตรวจคลังสื่อก่อนลองอีกครั้ง"},{status:error instanceof ImageGenerationError?error.status:500});
 }
}
