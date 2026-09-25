export function rejectCrossOriginWrite(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      return Response.json({ error: "คำขอจากต้นทางนี้ไม่ได้รับอนุญาต" }, { status: 403 });
    }
  } catch {
    return Response.json({ error: "ข้อมูลต้นทางไม่ถูกต้อง" }, { status: 400 });
  }
  return null;
}
