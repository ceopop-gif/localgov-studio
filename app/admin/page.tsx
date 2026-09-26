import type { Metadata } from "next";
import { getChatGPTUser, chatGPTSignInPath } from "@/app/chatgpt-auth";
import { PlatformDashboard } from "@/components/platform-dashboard";
import { listSitesForUser } from "@/lib/site-repository";
import { Building2, ArrowRight, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteRecord } from "@/lib/models";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ศูนย์สร้างเว็บไซต์ อบต. / เทศบาล",
  robots: { index: false, follow: false },
};
export default async function PlatformAdminPage() {
  const user = await getChatGPTUser();
  if (!user || user.authSource !== "chatgpt")
    return (
      <main className="civic-grid flex min-h-svh items-center justify-center px-4 py-10">
        <section className="w-full max-w-lg rounded-3xl border bg-white p-7 shadow-xl sm:p-10">
          <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#0b5260] text-white">
            <Layers3 className="size-7" />
          </div>
          <p className="text-sm font-bold text-[#0b5260]">LocalGov Studio</p>
          <h1 className="mt-2 text-3xl font-bold leading-snug">
            ศูนย์สร้างเว็บไซต์
            <br />
            อบต. / เทศบาล
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            สร้างเว็บไซต์ใหม่จากต้นฉบับเดียวกัน และดูแลเว็บไซต์ของคุณจากที่เดียว
          </p>
          <Button asChild className="mt-7 h-12 w-full text-base">
            <a href={chatGPTSignInPath("/admin")} target="_top">
              เข้าสู่ระบบส่วนกลางด้วย ChatGPT <ArrowRight />
            </a>
          </Button>
          {user?.authSource === "local" && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              บัญชีเจ้าหน้าที่ที่ใช้อยู่จัดการได้เฉพาะเว็บสูงเนิน
              การสร้างเว็บไซต์ใหม่ใช้บัญชี ChatGPT ของเจ้าของเว็บ
            </p>
          )}
          <a
            href="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-600"
          >
            <Building2 className="size-4" /> เข้าหลังบ้านหน่วยงานเดิม
          </a>
        </section>
      </main>
    );
  let sites: SiteRecord[] = [];
  let error = "";
  try {
    sites = await listSitesForUser(user.id);
  } catch {
    error = "โหลดรายชื่อเว็บไซต์ไม่สำเร็จ กรุณาลองอีกครั้ง";
  }
  return (
    <PlatformDashboard
      initialSites={sites}
      user={{ displayName: user.displayName, email: user.email }}
      loadError={error}
    />
  );
}
