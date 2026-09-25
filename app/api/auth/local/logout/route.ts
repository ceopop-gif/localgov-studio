import {
  deleteLocalAdminSession,
  expiredLocalAdminSessionCookie,
} from "@/lib/local-admin-auth";
import { rejectCrossOriginWrite } from "@/lib/request-security";

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOriginWrite(request);
  if (crossOrigin) return crossOrigin;

  try {
    await deleteLocalAdminSession(request.headers.get("cookie"));
  } catch (error) {
    console.error("local admin logout failed", error);
  }

  const response = Response.json(
    { ok: true },
    { headers: { "cache-control": "no-store" } },
  );
  response.headers.append("set-cookie", expiredLocalAdminSessionCookie());
  return response;
}
