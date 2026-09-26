import {env} from "cloudflare:workers";
export class ImageGenerationError extends Error {
 constructor(public code:string,public status:number,message:string){super(message);}
}
export const IMAGE_MODEL="gpt-image-2.5-flare";
export async function generateAgencyImage(prompt:string,size:string){
 const key=env.OPENAI_API_KEY;if(typeof key!=="string"||!key)throw new ImageGenerationError("not_configured",503,"ผู้ดูแลยังไม่ได้เชื่อมบริการ AI");
 let response:Response;
 try{response=await fetch("https://api.openai.com/v1/images/generations",{
  method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},
  body:JSON.stringify({model:IMAGE_MODEL,prompt:`สร้างภาพประกอบสำหรับเว็บไซต์ท้องถิ่นไทย ภาพนี้ใช้สื่อสารกับชุมชน ไม่ใช่หลักฐานเหตุการณ์จริง ไม่ใส่ตราราชการหรือบุคคลจริงหากไม่ได้ระบุ คำอธิบายภาพ: ${prompt}`,size,quality:"medium",n:1,output_format:"webp",output_compression:85}),
  signal:AbortSignal.timeout(180000),
 });}catch{throw new ImageGenerationError("timeout",504,"การสร้างภาพใช้เวลานาน กรุณาลองใหม่ภายหลัง");}
 if(!response.ok){
  const data=await response.json().catch(()=>({})) as {error?:{code?:string;type?:string}};
  const code=data.error?.code||data.error?.type||"provider_error";
  if(code==="insufficient_quota"||code==="billing_hard_limit_reached")throw new ImageGenerationError("quota",503,"บัญชี AI มีเครดิตไม่พอ กรุณาให้ผู้ดูแลตรวจวงเงิน OpenAI");
  if(response.status===401||response.status===403)throw new ImageGenerationError("access",503,"บัญชี AI ยังไม่สามารถใช้บริการสร้างภาพได้ กรุณาให้ผู้ดูแลตรวจคีย์และสิทธิ์ OpenAI");
  if(response.status===429)throw new ImageGenerationError("rate_limit",429,"AI มีคำขอจำนวนมาก กรุณารอสักครู่");
  if(code.includes("moderation")||code.includes("safety"))throw new ImageGenerationError("prompt_rejected",400,"AI ไม่สามารถสร้างภาพตามคำอธิบายนี้ได้ กรุณาปรับข้อความ");
  throw new ImageGenerationError("provider_error",502,"บริการ AI สร้างภาพไม่สำเร็จ กรุณาลองอีกครั้ง");
 }
 const data=await response.json() as {data?:{b64_json?:string}[];usage?:Record<string,unknown>};
 const base64=data.data?.[0]?.b64_json;
 if(!base64||base64.length>22_000_000)throw new ImageGenerationError("invalid_output",502,"ไม่ได้รับไฟล์ภาพที่ใช้งานได้จาก AI");
 const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
 if(bytes.length<12||String.fromCharCode(...bytes.slice(0,4))!=="RIFF"||String.fromCharCode(...bytes.slice(8,12))!=="WEBP")throw new ImageGenerationError("invalid_output",502,"รูปแบบภาพที่ได้รับไม่ถูกต้อง");
 return {bytes,usage:data.usage??{}};
}
