import {
  createLocalAdminSession,
  localAdminSessionCookie,
} from "@/lib/local-admin-auth";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { localAdminLoginSchema } from "@/lib/validators";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOriginWrite(request);
  if (crossOrigin) return crossOrigin;

  try {
    const parsed = localAdminLoginSchema.safeParse(await request.json());
    if (!parsed.success) return invalidCredentials();

    const session = await createLocalAdminSession(parsed.data.siteSlug, parsed.data.username, parsed.data.password, parsed.data.platform);
    if (!session.ok) {
      if (session.blocked) return Response.json(
        { error: "เข้าสู่ระบบผิดหลายครั้ง กรุณารอ 5 นาทีแล้วลองใหม่" },
        { status: 429, headers: { ...NO_STORE_HEADERS, "retry-after": "300" } },
      );
      if (session.pending) return Response.json({error:"ลงทะเบียนแล้ว กำลังรอผู้ดูแลระบบอนุมัติ", pending:true}, {status:403,headers:NO_STORE_HEADERS});
      if (session.accessStatus) {
        const messages: Record<string,string> = {
          suspended:"หน่วยงานนี้ถูกหยุดใช้งาน กรุณาติดต่อผู้ดูแลส่วนกลาง",
          expired:"เว็บไซต์หมดอายุใช้งานแล้ว กรุณาติดต่อผู้ดูแลส่วนกลาง",
          scheduled:"ยังไม่ถึงวันส่งงาน / วันเริ่มใช้งานที่กำหนด",
          awaiting_start:"รอผู้ดูแลส่วนกลางกำหนดวันส่งงาน / วันเริ่มใช้",
          rejected:"คำขอยังไม่ได้รับอนุมัติ กรุณาติดต่อผู้ดูแลส่วนกลาง",
        };
        return Response.json({error:messages[session.accessStatus]||"หน่วยงานยังไม่เปิดใช้งาน"},{status:403,headers:NO_STORE_HEADERS});
      }
      return invalidCredentials();
    }
    const response = Response.json(
      { ok: true, redirectTo: session.platform ? "/admin" : `/admin/${session.siteId}` },
      { headers: NO_STORE_HEADERS },
    );
    response.headers.append("set-cookie", localAdminSessionCookie(session.token));
    return response;
  } catch (error) {
    console.error("local admin login failed", error);
    return Response.json(
      { error: "ยังไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

function invalidCredentials() {
  return Response.json(
    { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
    { status: 401, headers: NO_STORE_HEADERS },
  );
}
