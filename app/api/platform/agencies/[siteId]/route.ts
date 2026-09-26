import { getPlatformUser } from "@/lib/platform";
import { runOperation } from "@/db/repository";
import { agencyReviewSchema } from "@/lib/validators";
import { rejectCrossOriginWrite } from "@/lib/request-security";
export async function PATCH(request:Request,{params}:{params:Promise<{siteId:string}>}){
 const rejected=rejectCrossOriginWrite(request);if(rejected)return rejected;
 const user=await getPlatformUser();if(!user)return Response.json({error:"ไม่มีสิทธิ์อนุมัติ"},{status:403});
 try{const parsed=agencyReviewSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message||"ตรวจข้อมูลการอนุมัติ"},{status:400});
 const {siteId}=await params;const p=parsed.data;
 await runOperation("review_agency",{p_site_id:siteId,p_actor_id:user.id,p_status:p.status,p_domain_label:p.domainLabel,p_username:p.username??null,p_password:p.password??null,p_start_on:p.startOn??null});
 return Response.json({ok:true});
 }catch(error){return Response.json({error:error instanceof Error&&error.message.includes("UNIQUE")?"ชื่อผู้ใช้หรือโดเมนนี้ถูกใช้แล้ว":"บันทึกการอนุมัติไม่สำเร็จ"},{status:409});}
}
