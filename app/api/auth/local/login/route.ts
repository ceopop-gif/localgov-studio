import {
  createLocalAdminSession,
  localAdminSessionCookie,
  verifyLocalAdminCredentials,
} from "@/lib/local-admin-auth";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { SUNG_NOEN_SITE_ID } from "@/lib/site-repository";
import { localAdminLoginSchema } from "@/lib/validators";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOriginWrite(request);
  if (crossOrigin) return crossOrigin;

  try {
    const parsed = localAdminLoginSchema.safeParse(await request.json());
    if (!parsed.success) return invalidCredentials();

    const valid = await verifyLocalAdminCredentials(
      parsed.data.username,
      parsed.data.password,
    );
    if (!valid) return invalidCredentials();

    const session = await createLocalAdminSession();
    const response = Response.json(
      { ok: true, redirectTo: `/admin/${SUNG_NOEN_SITE_ID}` },
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
