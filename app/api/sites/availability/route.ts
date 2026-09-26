import { getChatGPTUser } from "@/app/chatgpt-auth";
import { rows } from "@/db/repository";
import { createSiteSchema } from "@/lib/validators";
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (user.authSource !== "chatgpt")
    return Response.json(
      { error: "กรุณาใช้บัญชีผู้สร้างเว็บไซต์" },
      { status: 403 },
    );
  const slug = createSiteSchema.shape.slug.safeParse(
    new URL(request.url).searchParams.get("slug"),
  );
  if (!slug.success)
    return Response.json(
      {
        available: false,
        error: "ใช้ภาษาอังกฤษตัวเล็ก ตัวเลข และขีดกลาง 3–60 ตัวอักษร",
      },
      { status: 400 },
    );
  try {
    const found = await rows("sites", {
      slug: `eq.${slug.data}`,
      select: "id",
      limit: "1",
    });
    return Response.json(
      { available: found.length === 0 },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "ตรวจสอบ URL ไม่สำเร็จ กรุณาลองใหม่" },
      { status: 503 },
    );
  }
}
