"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileCheck2,
  Globe2,
  LayoutDashboard,
  Loader2,
  MapPin,
  Palette,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { DEMO_SITE, type SiteRecord } from "@/lib/models";

type UserView = { displayName: string; email: string };

const palettes = [
  { id: "civic", name: "กรมท่า–ทอง", primary: "#0B5260", secondary: "#E4B949" },
  { id: "royal", name: "น้ำเงิน–ฟ้า", primary: "#174A7E", secondary: "#5DB7D6" },
  { id: "forest", name: "เขียว–ทอง", primary: "#286044", secondary: "#D5A62B" },
];

const platformNav = [
  { label: "ภาพรวม", icon: LayoutDashboard, href: "#overview", active: true },
  { label: "เว็บไซต์ทั้งหมด", icon: Globe2, href: "#sites" },
  { label: "แม่แบบเว็บไซต์", icon: Sparkles, href: "#templates" },
  { label: "ประวัติการทำงาน", icon: Activity, href: "#activity" },
];

function CreateSiteDialog({ onCreated }: { onCreated: (site: SiteRecord) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [organizationType, setOrganizationType] = useState("เทศบาลตำบล");
  const [paletteId, setPaletteId] = useState("civic");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const palette = palettes.find((item) => item.id === paletteId) ?? palettes[0];

    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          englishName: form.get("englishName"),
          slug: form.get("slug"),
          organizationType,
          province: form.get("province"),
          district: form.get("district"),
          subdistrict: form.get("subdistrict"),
          primaryColor: palette.primary,
          secondaryColor: palette.secondary,
        }),
      });
      const data = (await response.json()) as { site?: SiteRecord; error?: string };
      if (!response.ok || !data.site) throw new Error(data.error || "สร้างเว็บไซต์ไม่สำเร็จ");
      onCreated(data.site);
      setOpen(false);
      toast.success("สร้างเว็บไซต์เรียบร้อย", {
        description: "ระบบติดตั้งโครงสร้างหน้าบ้านและหลังบ้านให้แล้ว",
      });
      router.push(`/admin/${data.site.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "สร้างเว็บไซต์ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-11 rounded-xl bg-[#0b5260] px-5 text-white shadow-lg shadow-[#0b5260]/15 hover:bg-[#073f49]">
          <Plus /> สร้างเว็บไซต์ใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto border-slate-200 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b bg-slate-50 px-6 py-5 text-left">
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-[#0b5260] text-white">
            <Building2 className="size-5" />
          </div>
          <DialogTitle className="text-xl">สร้างเว็บไซต์หน่วยงานใหม่</DialogTitle>
          <DialogDescription className="leading-6">
            กรอกข้อมูลตั้งต้น ระบบจะสร้างหน้าบ้าน CMS โครงสร้างบริการ และสิทธิ์ผู้ดูแลให้อัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="site-name">ชื่อหน่วยงาน *</Label>
              <Input id="site-name" name="name" required minLength={3} placeholder="เช่น เทศบาลตำบลสูงเนิน" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-type">ประเภทหน่วยงาน *</Label>
              <Select value={organizationType} onValueChange={setOrganizationType}>
                <SelectTrigger id="site-type" className="h-11 w-full">
                  <SelectValue placeholder="เลือกประเภทหน่วยงาน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="องค์การบริหารส่วนตำบล">องค์การบริหารส่วนตำบล</SelectItem>
                  <SelectItem value="เทศบาลตำบล">เทศบาลตำบล</SelectItem>
                  <SelectItem value="เทศบาลเมือง">เทศบาลเมือง</SelectItem>
                  <SelectItem value="เทศบาลนคร">เทศบาลนคร</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-english">ชื่อภาษาอังกฤษ</Label>
              <Input id="site-english" name="englishName" placeholder="Municipality name" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-province">จังหวัด</Label>
              <Input id="site-province" name="province" placeholder="ระบุจังหวัด" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-district">อำเภอ</Label>
              <Input id="site-district" name="district" placeholder="ระบุอำเภอ" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-subdistrict">ตำบล</Label>
              <Input id="site-subdistrict" name="subdistrict" placeholder="ระบุตำบล" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-slug">ชื่อ URL ภาษาอังกฤษ *</Label>
              <div className="flex h-11 items-center rounded-md border border-input bg-white px-3 shadow-xs focus-within:ring-2 focus-within:ring-ring/40">
                <span className="mr-1 shrink-0 text-sm text-slate-500">/site/</span>
                <input
                  id="site-slug"
                  name="slug"
                  required
                  pattern="[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
                  placeholder="sung-noen"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">ชุดสีเว็บไซต์</legend>
            <RadioGroup value={paletteId} onValueChange={setPaletteId} className="grid gap-3 sm:grid-cols-3">
              {palettes.map((palette) => (
                <label
                  key={palette.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    paletteId === palette.id
                      ? "border-[#0b5260] bg-[#0b5260]/5 ring-2 ring-[#0b5260]/10"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <RadioGroupItem value={palette.id} aria-label={palette.name} />
                  <span className="flex -space-x-1">
                    <span className="size-7 rounded-full border-2 border-white" style={{ background: palette.primary }} />
                    <span className="size-7 rounded-full border-2 border-white" style={{ background: palette.secondary }} />
                  </span>
                  <span className="text-sm font-medium">{palette.name}</span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <div className="flex items-center gap-2 font-semibold"><Check className="size-4" /> ติดตั้งพร้อมใช้งาน</div>
            <p className="mt-1.5 leading-6 text-emerald-800">
              ข่าวสาร • E-Service • คำร้องประชาชน • ITA/OIT • จัดซื้อจัดจ้าง • เอกสาร • บุคลากร • SEO • PDPA
            </p>
          </div>

          <DialogFooter className="border-t pt-5">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={submitting} className="bg-[#0b5260] text-white hover:bg-[#073f49]">
              {submitting ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {submitting ? "กำลังสร้าง..." : "สร้างเว็บไซต์และเปิดหลังบ้าน"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SiteCard({ site, template = false }: { site: SiteRecord; template?: boolean }) {
  const statusText = site.status === "published" ? "เผยแพร่แล้ว" : site.status === "template" ? "แม่แบบตัวอย่าง" : "ฉบับร่าง";
  return (
    <Card className="group overflow-hidden border-slate-200 py-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="h-2" style={{ background: `linear-gradient(90deg, ${site.primaryColor}, ${site.secondaryColor})` }} />
      <CardHeader className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white shadow-sm"
              style={{ background: site.primaryColor }}
              aria-hidden="true"
            >
              {site.organizationType.includes("เทศบาล") ? "ท" : "อ"}
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{site.name}</CardTitle>
              <CardDescription className="mt-1 truncate">{site.organizationType} • {site.province || "ยังไม่ระบุจังหวัด"}</CardDescription>
            </div>
          </div>
          <Badge variant={site.status === "published" ? "default" : "outline"} className={site.status === "published" ? "bg-emerald-600" : "bg-slate-50"}>
            {statusText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        {site.isDemo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            ข้อมูลสาธิตเพื่อดูรูปแบบเท่านั้น ต้องตรวจสอบข้อมูลราชการก่อนเผยแพร่
          </div>
        )}
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">ความพร้อมของข้อมูล</span>
            <span className="font-semibold text-slate-800">{site.completeness}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${site.completeness}%`, background: site.primaryColor }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="justify-between rounded-lg">
            <a href={`/site/${site.slug}`}>
              ดูหน้าบ้าน <ExternalLink />
            </a>
          </Button>
          <Button asChild className="justify-between rounded-lg" style={{ backgroundColor: site.primaryColor }}>
            <a href={`/admin/${site.id}`}>
              {template ? "ดูหลังบ้าน" : "จัดการเว็บ"} <ChevronRight />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlatformDashboard({ initialSites, user }: { initialSites: SiteRecord[]; user: UserView }) {
  const [sites, setSites] = useState(initialSites);
  const metrics = useMemo(() => {
    const published = sites.filter((site) => site.status === "published").length;
    const avg = sites.length ? Math.round(sites.reduce((sum, site) => sum + site.completeness, 0) / sites.length) : 0;
    return { published, avg };
  }, [sites]);
  const initials = user.displayName.slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon" className="border-none">
        <SidebarHeader className="border-b border-white/10 p-4">
          <a href="/" className="flex items-center gap-3 overflow-hidden">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e4b949] font-black text-[#10233a]">LG</span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-base font-bold text-white">LocalGov Studio</span>
              <span className="block truncate text-xs text-slate-300">ศูนย์บริหารหลายเว็บไซต์</span>
            </span>
          </a>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400">แพลตฟอร์ม</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {platformNav.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={item.active} tooltip={item.label} className="text-slate-200 data-[active=true]:bg-white/12 data-[active=true]:text-white hover:bg-white/10 hover:text-white">
                      <a href={item.href}><item.icon /><span>{item.label}</span></a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400">ระบบ</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="ตั้งค่าแพลตฟอร์ม" className="text-slate-200 hover:bg-white/10 hover:text-white">
                    <Settings2 /><span>ตั้งค่าแพลตฟอร์ม</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="ช่วยเหลือ" className="text-slate-200 hover:bg-white/10 hover:text-white">
                    <CircleHelp /><span>คู่มือและช่วยเหลือ</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 overflow-hidden rounded-xl bg-white/5 p-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white">{initials}</span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-sm font-medium text-white">{user.displayName}</span>
              <span className="block truncate text-xs text-slate-400">ผู้ดูแลระบบกลาง</span>
            </span>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f3f6fa]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div>
              <p className="text-xs font-medium text-slate-500">ระบบกลาง</p>
              <h1 className="text-base font-bold text-slate-950 sm:text-lg">บริหารเว็บไซต์ท้องถิ่น</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon">
              <a href="#sites" aria-label="ไปยังรายการเว็บไซต์"><Search /></a>
            </Button>
            <Button variant="outline" size="icon" aria-label="การแจ้งเตือน" disabled title="ยังไม่มีการแจ้งเตือน">
              <Bell />
            </Button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8">
          <section id="overview" className="reveal-up overflow-hidden rounded-2xl bg-[#102a43] text-white shadow-xl shadow-slate-900/10">
            <div className="civic-grid grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-center lg:px-9 lg:py-8">
              <div>
                <Badge className="mb-4 border-white/20 bg-white/10 text-white">Multi-site Government CMS</Badge>
                <h2 className="thai-balance text-2xl font-bold leading-tight sm:text-3xl">สร้างและควบคุมหลายเว็บไซต์จากที่เดียว</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                  แต่ละหน่วยงานแยกข้อมูล เจ้าหน้าที่ สิทธิ์ ข่าว คำร้อง และเอกสารออกจากกัน พร้อมหน้าบ้านที่ใช้แม่แบบมาตรฐานเดียวกัน
                </p>
              </div>
              <CreateSiteDialog onCreated={(site) => setSites((current) => [site, ...current])} />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปแพลตฟอร์ม">
            {[
              { label: "เว็บไซต์ทั้งหมด", value: sites.length, note: "ไม่นับแม่แบบตัวอย่าง", icon: Globe2, tone: "bg-cyan-50 text-cyan-700" },
              { label: "เผยแพร่แล้ว", value: metrics.published, note: `${sites.length - metrics.published} เว็บไซต์อยู่ระหว่างจัดทำ`, icon: FileCheck2, tone: "bg-emerald-50 text-emerald-700" },
              { label: "ความพร้อมเฉลี่ย", value: `${metrics.avg}%`, note: "ตรวจข้อมูลจริงก่อนเผยแพร่", icon: ShieldCheck, tone: "bg-amber-50 text-amber-700" },
              { label: "งานรอตรวจ", value: "0", note: "ข่าว เอกสาร และคำร้อง", icon: Clock3, tone: "bg-violet-50 text-violet-700" },
            ].map((metric) => (
              <Card key={metric.label} className="gap-4 border-slate-200 py-5 shadow-sm">
                <CardContent className="flex items-start justify-between px-5">
                  <div>
                    <p className="text-sm text-slate-500">{metric.label}</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{metric.value}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{metric.note}</p>
                  </div>
                  <span className={`flex size-11 items-center justify-center rounded-xl ${metric.tone}`}><metric.icon className="size-5" /></span>
                </CardContent>
              </Card>
            ))}
          </section>

          <section id="sites" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0b5260]">เว็บไซต์ในระบบ</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">จัดการทุกหน่วยงาน</h2>
              </div>
              <CreateSiteDialog onCreated={(site) => setSites((current) => [site, ...current])} />
            </div>

            {sites.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sites.map((site) => <SiteCard key={site.id} site={site} />)}
              </div>
            ) : (
              <Card className="border-dashed border-slate-300 bg-white/70 py-9 text-center shadow-none">
                <CardContent>
                  <Globe2 className="mx-auto size-10 text-slate-400" />
                  <h3 className="mt-4 font-semibold text-slate-900">ยังไม่มีเว็บไซต์ของหน่วยงาน</h3>
                  <p className="mt-2 text-sm text-slate-500">กด “สร้างเว็บไซต์ใหม่” เพื่อเริ่มจากแม่แบบมาตรฐาน</p>
                </CardContent>
              </Card>
            )}
          </section>

          <section id="templates" className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            <div>
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#0b5260]">แม่แบบพร้อมใช้</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">ตัวอย่างเว็บไซต์เทศบาล</h2>
              </div>
              <SiteCard site={DEMO_SITE} template />
            </div>
            <Card className="border-slate-200 bg-[#fff9e7] shadow-sm">
              <CardHeader>
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#e4b949] text-[#10233a]"><Palette /></div>
                <CardTitle className="mt-2 text-lg">แก้ครั้งเดียว ใช้ได้ทั้งระบบ</CardTitle>
                <CardDescription className="leading-6 text-slate-600">
                  เลือกสี โลโก้ เมนู และโมดูลของแต่ละหน่วยงานโดยไม่กระทบเว็บไซต์อื่น
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                {["โครงสร้างตามงาน อปท.", "รองรับมือถือและผู้สูงอายุ", "แยกสิทธิ์ตามกองงาน", "ติดตามคำร้องด้วยเลขรับเรื่อง"].map((item) => (
                  <div key={item} className="flex items-center gap-3"><span className="flex size-6 items-center justify-center rounded-full bg-[#0b5260] text-white"><Check className="size-3.5" /></span>{item}</div>
                ))}
              </CardContent>
            </Card>
          </section>

          <footer className="flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>LocalGov Studio • ระบบเว็บไซต์สำเร็จรูปสำหรับองค์กรปกครองส่วนท้องถิ่น</span>
            <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> ข้อมูลราชการต้องตรวจสอบก่อนเผยแพร่ทุกครั้ง</span>
          </footer>
        </div>
      </SidebarInset>
      <Toaster richColors position="top-center" />
    </SidebarProvider>
  );
}
