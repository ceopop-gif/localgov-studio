"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Building2,
  Copy,
  ExternalLink,
  FileEdit,
  Globe2,
  Layers3,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import {
  CreateSiteWizard,
  SiteBlueprint,
} from "@/components/create-site-wizard";
import { templateOptions } from "@/lib/site-template";
import type { SiteRecord } from "@/lib/models";

const statusLabels: Record<string, string> = {
  published: "เผยแพร่แล้ว",
  draft: "ฉบับร่าง",
  maintenance: "ปิดปรับปรุง",
};
export function PlatformDashboard({
  initialSites,
  user,
  loadError = "",
}: {
  initialSites: SiteRecord[];
  user: { displayName: string; email: string };
  loadError?: string;
}) {
  const [sites, setSites] = useState(initialSites);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [wizard, setWizard] = useState<{ source?: SiteRecord } | null>(null);
  const visible = sites.filter(
    (site) =>
      (status === "all" || site.status === status) &&
      `${site.name} ${site.slug} ${site.province} ${site.district}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  async function copyUrl(slug: string) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/site/${slug}`,
      );
      toast.success("คัดลอกที่อยู่เว็บไซต์แล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ กรุณาคัดลอกจากแถบที่อยู่ของเว็บไซต์");
    }
  }
  return (
    <SidebarProvider>
      <Sidebar
        className="border-r-0"
        style={
          {
            "--sidebar": "#0b1f36",
            "--sidebar-foreground": "#e2e8f0",
            "--sidebar-accent": "#19334e",
            "--sidebar-accent-foreground": "#ffffff",
            "--sidebar-border": "#244059",
          } as CSSProperties
        }
      >
        <SidebarHeader className="px-5 py-7">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#e4b949] text-[#0b1f36]">
              <Building2 />
            </span>
            <span className="text-lg font-bold text-white">
              LocalGov Studio
              <span className="mt-1 block text-xs font-normal text-slate-300">
                ศูนย์สร้างเว็บไซต์ท้องถิ่น
              </span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-3">
          <p className="px-3 pb-3 text-xs text-slate-400">พื้นที่ทำงานของคุณ</p>
          <SidebarMenu>
            {[
              { label: "ภาพรวม", href: "#overview", icon: LayoutDashboard },
              { label: "เว็บไซต์ของฉัน", href: "#sites", icon: Globe2 },
              { label: "ต้นฉบับเว็บไซต์", href: "#templates", icon: Layers3 },
            ].map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild className="h-11 text-sm">
                  <a href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="mx-2 mt-8 rounded-xl border border-white/15 p-4">
            <ShieldCheck className="mb-3 size-5 text-[#e4b949]" />
            <p className="text-sm font-medium text-white">
              แยกข้อมูลแต่ละหน่วยงาน
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              จัดการเฉพาะเว็บของบัญชีนี้ เว็บใหม่เริ่มเป็นฉบับร่างก่อนเผยแพร่
            </p>
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/10 p-5">
          <p className="truncate text-sm font-medium text-white">
            {user.displayName}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">{user.email}</p>
          <a
            className="mt-4 flex items-center gap-2 text-sm text-slate-300 hover:text-white"
            href="/signout-with-chatgpt?return_to=/admin"
            target="_top"
          >
            <LogOut className="size-4" />
            ออกจากระบบ
          </a>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-[#f3f6fa]">
        <header className="flex h-16 items-center justify-between gap-3 border-b bg-white px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger />
            <span className="h-5 border-l" />
            <span className="truncate text-sm text-slate-500">
              หลังบ้านกลาง /{" "}
              <span className="text-slate-900">เว็บไซต์ท้องถิ่น</span>
            </span>
          </div>
          <Badge variant="outline" className="hidden gap-1.5 sm:flex">
            <ShieldCheck className="size-3.5" />
            ผู้สร้างเว็บไซต์
          </Badge>
        </header>
        <div
          id="overview"
          className="mx-auto w-full max-w-[1440px] space-y-8 p-4 pb-12 sm:p-8 lg:p-10"
        >
          <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 text-sm font-medium text-[#0b5260]">
                LOCAL GOVERNMENT WEBSITE BUILDER
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-[#0b1f36] sm:text-3xl">
                สร้างเว็บท้องถิ่นจากต้นฉบับเดียวกัน
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                เลือกต้นฉบับ ใส่ข้อมูล อบต. แล้วจัดการข่าว บริการ
                และเอกสารผ่านหลังบ้านของแต่ละหน่วยงาน
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setWizard({})}
              className="h-12 shrink-0 rounded-xl bg-[#0b5260] px-5 text-white hover:bg-[#073f49]"
            >
              <Plus />
              สร้างเว็บไซต์ใหม่
            </Button>
          </section>
          {loadError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800"
            >
              <p>{loadError}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                ลองโหลดใหม่
              </Button>
            </div>
          ) : (
            <section
              aria-label="สรุปเว็บไซต์"
              className="grid grid-cols-3 gap-3 sm:gap-5"
            >
              {[
                {
                  label: "เว็บไซต์ทั้งหมด",
                  count: sites.length,
                  icon: Globe2,
                  filter: "all",
                },
                {
                  label: "เผยแพร่แล้ว",
                  count: sites.filter((s) => s.status === "published").length,
                  icon: ShieldCheck,
                  filter: "published",
                },
                {
                  label: "ฉบับร่าง",
                  count: sites.filter((s) => s.status === "draft").length,
                  icon: FileEdit,
                  filter: "draft",
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setStatus(item.filter);
                    document
                      .getElementById("sites")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-2xl border bg-white p-4 text-left hover:border-[#0b5260]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5260] sm:p-5"
                >
                  <item.icon className="mb-3 size-5 text-[#0b5260]" />
                  <p className="text-2xl font-bold text-[#0b1f36] sm:text-3xl">
                    {item.count}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                </button>
              ))}
            </section>
          )}
          <section id="sites" className="scroll-mt-5">
            <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-xl font-bold text-[#0b1f36]">
                  เว็บไซต์ของฉัน
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  จัดการเว็บเดิม หรือใช้รูปแบบเดิมสร้างหน่วยงานใหม่
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative sm:w-72">
                  <Search className="absolute left-3 top-3 size-4 text-slate-400" />
                  <Input
                    aria-label="ค้นหาเว็บไซต์"
                    placeholder="ค้นหาชื่อหน่วยงาน จังหวัด หรือ URL"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-10 bg-white pl-9"
                  />
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger
                    aria-label="กรองสถานะเว็บไซต์"
                    className="h-10 w-full bg-white sm:w-40"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกสถานะ</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {visible.length ? (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {visible.map((site) => (
                  <article
                    key={site.id}
                    className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white"
                  >
                    <div className="relative border-b bg-slate-50 px-5 pb-0 pt-5">
                      <div
                        className="pointer-events-none h-44 overflow-hidden"
                        aria-hidden="true"
                      >
                        <SiteBlueprint
                          name={site.name}
                          primary={site.primaryColor}
                          secondary={site.secondaryColor}
                          sections={templateOptions(site).sections}
                        />
                      </div>
                      <Badge
                        className={`absolute right-4 top-4 border ${site.status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}
                      >
                        {statusLabels[site.status] ?? site.status}
                      </Badge>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg font-bold text-[#0b1f36]">
                        {site.name}
                      </h3>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                        <MapPin className="size-4 shrink-0" />
                        {[site.district, site.province]
                          .filter(Boolean)
                          .join(" · ") || "ยังไม่ได้ระบุพื้นที่"}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                        <span className="truncate text-sm text-slate-600">
                          /site/{site.slug}
                        </span>
                        <button
                          type="button"
                          aria-label={`คัดลอก URL ${site.name}`}
                          onClick={() => copyUrl(site.slug)}
                          className="rounded p-2 hover:bg-slate-200"
                        >
                          <Copy className="size-4" />
                        </button>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <Button
                          asChild
                          className="h-10 bg-[#0b5260] hover:bg-[#073f49]"
                        >
                          <a href={`/admin/${site.id}`}>
                            <FileEdit />
                            จัดการเว็บไซต์
                          </a>
                        </Button>
                        <Button asChild variant="outline" className="h-10">
                          <a
                            href={`/site/${site.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink />
                            {site.status === "published"
                              ? "เปิดเว็บไซต์"
                              : "ดูตัวอย่าง"}
                          </a>
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        className="mt-2 h-10 text-[#0b5260]"
                        onClick={() => setWizard({ source: site })}
                      >
                        <Layers3 />
                        ใช้เป็นต้นฉบับสร้างเว็บใหม่
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : !loadError ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <Globe2 className="mx-auto size-10 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold">
                  {sites.length
                    ? "ไม่พบเว็บไซต์ตามที่ค้นหา"
                    : "เริ่มสร้างเว็บไซต์หน่วยงานแรก"}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
                  {sites.length
                    ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ"
                    : "ใช้ต้นฉบับมาตรฐานแล้วเพิ่มข้อมูลจริงของหน่วยงาน คุณปรับแต่งต่อได้ก่อนเปิดให้ประชาชนเข้าชม"}
                </p>
                <Button
                  className="mt-5"
                  onClick={() => {
                    if (sites.length) {
                      setQuery("");
                      setStatus("all");
                    } else setWizard({});
                  }}
                >
                  {sites.length ? (
                    "ล้างตัวกรอง"
                  ) : (
                    <>
                      <Plus />
                      สร้างเว็บไซต์แรก
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </section>
          <section
            id="templates"
            className="scroll-mt-5 rounded-2xl border bg-white p-5 sm:p-7"
          >
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0b5260]">
                  <Layers3 className="size-5" />
                  ต้นฉบับเว็บไซต์
                </div>
                <h2 className="text-xl font-bold text-[#0b1f36]">
                  มาตรฐานเดียวกัน ปรับให้เป็นของแต่ละ อบต.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  มีหน้าแรก บริการประชาชน ข่าวประชาสัมพันธ์ จัดซื้อจัดจ้าง
                  ข้อมูล ITA และช่องทางติดต่อ พร้อมหลังบ้านแก้ไขเนื้อหา
                  เลือกสีและส่วนที่ต้องการแสดงได้
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  เมื่อปรับเว็บหนึ่งจนพร้อมแล้ว กด “ใช้เป็นต้นฉบับสร้างเว็บใหม่”
                  ที่การ์ดเว็บไซต์ เพื่อใช้สี ภาพประกอบ และรูปแบบบริการต่อได้
                </p>
                <Button
                  variant="outline"
                  className="mt-5 h-11"
                  onClick={() => setWizard({})}
                >
                  ใช้ต้นฉบับมาตรฐาน
                </Button>
              </div>
              <div className="w-full max-w-sm shrink-0">
                <SiteBlueprint
                  name="หน่วยงานของคุณ"
                  primary="#0B5260"
                  secondary="#E4B949"
                />
              </div>
            </div>
          </section>
        </div>
        <footer className="border-t px-6 py-5 text-center text-sm text-slate-500">
          LocalGov Studio · ระบบสร้างและจัดการเว็บไซต์หน่วยงานท้องถิ่น
        </footer>
      </SidebarInset>
      {wizard ? (
        <CreateSiteWizard
          sites={sites}
          source={wizard.source}
          open
          onClose={() => setWizard(null)}
          onCreated={(site) => setSites((current) => [site, ...current])}
        />
      ) : null}
      <Toaster richColors />
    </SidebarProvider>
  );
}
