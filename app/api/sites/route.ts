import { registerAgency } from "@/app/api/register/route";
import { rows } from "@/db/repository";
import { getPlatformUser } from "@/lib/platform";
export async function GET() {
 const user=await getPlatformUser();if(!user)return Response.json({error:"กรุณาเข้าสู่หลังบ้านใหญ่"},{status:401});
 return Response.json({sites:await rows("sites",{order:"updated_at.desc"})},{headers:{"cache-control":"no-store"}});
}
export async function POST(request:Request){const user=await getPlatformUser();if(!user)return Response.json({error:"ไม่มีสิทธิ์สร้างเว็บไซต์จากส่วนกลาง"},{status:403});return registerAgency(request,user.id);}
