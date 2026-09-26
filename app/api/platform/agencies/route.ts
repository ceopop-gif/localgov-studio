import { getPlatformUser } from "@/lib/platform";
import { registerAgency } from "@/app/api/register/route";
import { runOperation } from "@/db/repository";
export async function GET(){const user=await getPlatformUser();if(!user)return Response.json({error:"ไม่มีสิทธิ์เข้าหลังบ้านใหญ่"},{status:403});return Response.json({agencies:await runOperation("list_agencies",{p_actor_id:user.id})},{headers:{"cache-control":"no-store"}});}
export async function POST(request:Request){const user=await getPlatformUser();if(!user)return Response.json({error:"ไม่มีสิทธิ์เข้าหลังบ้านใหญ่"},{status:403});return registerAgency(request,user.id);}
