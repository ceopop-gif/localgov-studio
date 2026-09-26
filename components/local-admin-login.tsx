"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LocalAdminLogin({
  chatGPTSignInUrl,
  localReturnTo,
  siteSlug,
  siteName,
  platform = false,
}: {
  chatGPTSignInUrl: string;
  localReturnTo: string;
  siteSlug?: string;
  siteName?: string;
  platform?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/local/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteSlug: siteSlug ?? "",
          platform,
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };
      if (!response.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      window.location.assign(data.redirectTo || localReturnTo);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เข้าสู่ระบบไม่สำเร็จ");
      setSubmitting(false);
    }
  }

  return (
    <main className="civic-grid relative flex min-h-svh items-center justify-center overflow-hidden bg-[#edf3f7] px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-[-8rem] size-80 rounded-full bg-[#0b5260]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 size-96 rounded-full bg-[#e4b949]/20 blur-3xl" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="relative overflow-hidden bg-[#0b1f36] px-6 py-8 text-white sm:px-10 sm:py-10 lg:flex lg:min-h-[610px] lg:flex-col lg:justify-between lg:px-12 lg:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(228,185,73,.28),transparent_28%),radial-gradient(circle_at_10%_90%,rgba(46,152,168,.25),transparent_32%)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#e4b949] text-[#10233a] shadow-lg shadow-black/20">
                <Building2 className="size-6" />
              </span>
              <div>
                <p className="text-lg font-black">LocalGov Studio</p>
                <p className="text-sm text-slate-300">ระบบบริหารเว็บไซต์หน่วยงาน</p>
              </div>
            </div>
            <div className="mt-10 max-w-md">
              <Badge className="border border-white/15 bg-white/10 text-white hover:bg-white/10">
                หลังบ้าน อบต. / เทศบาล
              </Badge>
              <h1 className="thai-balance mt-5 text-3xl font-black leading-tight sm:text-4xl">
                {siteName || "เว็บไซต์ของหน่วยงานคุณ"}
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-300">
                จัดการหน้าแรก ข่าว บทความ รูปภาพ เอกสาร ITA/OIT จัดซื้อจัดจ้าง และคำร้องประชาชนจากที่เดียว
              </p>
            </div>
          </div>
          <div className="relative mt-8 hidden items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200 lg:flex">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#e4b949]" />
            บัญชีแยกตามหน่วยงาน ทุกการแก้ไขตรวจสิทธิ์จากระบบ และเซสชันหมดอายุอัตโนมัติภายใน 8 ชั่วโมง
          </div>
        </div>

        <div className="flex items-center px-5 py-8 sm:px-10 sm:py-12 lg:px-14">
          <Card className="w-full border-0 py-0 shadow-none">
            <CardHeader className="px-0">
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-cyan-50 text-[#0b5260]">
                  <LockKeyhole className="size-5" />
                </span>
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  บัญชีหน่วยงาน
                </Badge>
              </div>
              <CardTitle className="mt-5 text-2xl font-black text-slate-950 sm:text-3xl">
                {platform ? "เข้าสู่หลังบ้านใหญ่" : "เข้าสู่ระบบเจ้าหน้าที่"}
              </CardTitle>
              <CardDescription className="text-base leading-7 text-slate-600">
                กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเปิดระบบหลังบ้าน
              </CardDescription>
            </CardHeader>

            <CardContent className="px-0">
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-base font-semibold text-slate-800">
                    ชื่อผู้ใช้
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    required
                    autoFocus
                    className="h-12 border-slate-300 bg-white px-4 text-base"
                    placeholder="กรอกชื่อผู้ใช้"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-semibold text-slate-800">
                    รหัสผ่าน
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="h-12 border-slate-300 bg-white px-4 pr-12 text-base"
                      placeholder="กรอกรหัสผ่าน"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-1.5 top-1.5 text-slate-500 hover:bg-slate-100"
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="border-rose-200 bg-rose-50">
                    <ShieldCheck />
                    <AlertTitle>เข้าสู่ระบบไม่สำเร็จ</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="h-12 w-full bg-[#0b5260] text-base font-bold hover:bg-[#073f49]"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
                  {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบหลังบ้าน"}
                  {!submitting && <ArrowRight />}
                </Button>
              </form>

              {!platform && <p className="mt-5 text-center text-sm">ยังไม่มีบัญชี? <a href="/register" className="font-semibold text-cyan-800 underline">ลงทะเบียนหน่วยงาน</a></p>}
              <div className="mt-6 border-t border-slate-200 pt-5 text-center">
                <a
                  href={chatGPTSignInUrl}
                  target="_top"
                  className="text-sm font-semibold text-[#0b5260] underline-offset-4 hover:underline"
                >
                  ผู้ดูแลระบบกลางเข้าสู่ระบบด้วย ChatGPT
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
