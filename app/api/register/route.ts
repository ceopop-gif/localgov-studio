import { agencyRegistrationSchema } from "@/lib/validators";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { rows,runOperation,toDatabase } from "@/db/repository";
import { buildSiteFromTemplate } from "@/lib/site-template";
import { SUNG_NOEN_SITE_ID } from "@/lib/site-repository";
export async function registerAgency(request:Request,actorId:string|null=null) {
 const rejected=rejectCrossOriginWrite(request);if(rejected)return rejected;
 try {
  const parsed=agencyRegistrationSchema.safeParse(await request.json());
  if(!parsed.success)return Response.json({error:"กรุณาตรวจข้อมูลหน่วยงาน ชื่อผู้ใช้ และรหัสผ่านอย่างน้อย 12 ตัวอักษร",fields:parsed.error.flatten().fieldErrors},{status:400});
  if(!actorId){
   const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(request.headers.get("cf-connecting-ip")||"unknown"));
   const key="register:"+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
   if(!await runOperation<boolean>("consume_request_limit",{p_key:key,p_limit:5,p_seconds:3600}))return Response.json({error:"ส่งคำขอหลายครั้ง กรุณาลองใหม่ภายหลัง"},{status:429});
  }
  const [source]=await rows("sites",{id:`eq.${SUNG_NOEN_SITE_ID}`,limit:"1"});
  const {site,username,password,contactName}=parsed.data;
  const {registration,...identity}=site;
  if(registration && [site.address,site.subdistrict,site.district,site.province,site.phone,site.email].some(v=>!v.trim()))return Response.json({error:"กรุณากรอกที่อยู่และช่องทางติดต่อให้ครบ"},{status:400});
  const siteData=buildSiteFromTemplate(identity,source);
  if(registration){const homepage=JSON.parse(siteData.homepageJson);homepage.contact.officeLocation={latitude:registration.latitude,longitude:registration.longitude,postalCode:registration.postalCode};siteData.homepageJson=JSON.stringify(homepage);siteData.address=[site.address,site.address.includes(registration.postalCode)?"":registration.postalCode].filter(Boolean).join(" ");}
  const created=await runOperation<{id:string;name:string;slug:string;approvalStatus:string}>("register_agency",{
   p_data:toDatabase({...siteData,registration,id:crypto.randomUUID()}),p_username:username,p_password:password,p_contact_name:contactName,p_actor_id:actorId,
  });
  return Response.json({site:created},{status:201,headers:{"cache-control":"no-store"}});
 } catch(error){
  const conflict=error instanceof Error&&error.message.includes("UNIQUE");
  return Response.json({error:conflict?"ชื่อผู้ใช้หรือชื่อเว็บไซต์ถูกใช้แล้ว กรุณาเลือกใหม่":"บันทึกคำขอไม่สำเร็จ กรุณาลองอีกครั้ง"},{status:conflict?409:500});
 }
}
export async function POST(request:Request){return registerAgency(request);}
