"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  ArrowRight,
  BookOpenCheck,
  Building,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Construction,
  Contrast,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Globe2,
  Landmark,
  Loader2,
  MapPin,
  Menu,
  MessageSquareWarning,
  Phone,
  Route,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundCheck,
  Waves,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getContentImages, getYouTubeEmbedUrl } from "@/lib/content-media";
import { getHomepageConfig } from "@/lib/homepage-config";
import type { ContentRecord, SiteRecord } from "@/lib/models";

const citizenServices = [
  { id: "lighting", label: "แจ้งไฟส่องสว่าง", type: "แจ้งไฟฟ้าสาธารณะ", icon: Zap, color: "#f59e0b" },
  { id: "road", label: "แจ้งถนนชำรุด", type: "แจ้งถนนชำรุด", icon: Route, color: "#ef6c4d" },
  { id: "water", label: "แจ้งน้ำประปา", type: "แจ้งน้ำประปา", icon: Waves, color: "#2d8cc7" },
  { id: "waste", label: "แจ้งขยะ", type: "แจ้งขยะ", icon: Trash2, color: "#31966b" },
  { id: "complaint", label: "ร้องเรียนทั่วไป", type: "แจ้งเรื่องร้องเรียน", icon: MessageSquareWarning, color: "#8b5fbf" },
  { id: "construction", label: "ขออนุญาตก่อสร้าง", type: "ขออนุญาตก่อสร้าง", icon: Construction, color: "#866144" },
  { id: "tax", label: "ตรวจสอบภาษี", type: "ตรวจสอบภาษี", icon: CircleDollarSign, color: "#167e72" },
  { id: "welfare", label: "ลงทะเบียนสวัสดิการ", type: "ลงทะเบียนสวัสดิการ", icon: UserRoundCheck, color: "#c24965" },
];

type CitizenService = (typeof citizenServices)[number];

const statusText: Record<string, string> = {
  received: "รับเรื่องแล้ว",
  checking: "กำลังตรวจสอบ",
  assigned: "ส่งหน่วยงานรับผิดชอบ",
  in_progress: "กำลังดำเนินการ",
  completed: "ดำเนินการเสร็จสิ้น",
  closed: "ปิดเรื่อง",
};

const publicDialogFieldClass = "border-slate-300 bg-white text-base text-slate-950 placeholder:text-slate-500 focus-visible:border-[#0b5260] focus-visible:ring-[#0b5260]/20 md:text-base";
const publicDialogLabelClass = "text-base font-semibold leading-6 text-slate-900";

function RequestDialog({ site, services, initialType, open, onOpenChange }: { site: SiteRecord; services: CitizenService[]; initialType: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [selectedRequestType, setSelectedRequestType] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [location, setLocation] = useState({ latitude: "", longitude: "" });
  const [error, setError] = useState("");

  const requestType = selectedRequestType ?? initialType;
  const locationCoordinates = location.latitude && location.longitude
    ? `${location.latitude},${location.longitude}`
    : "";
  const locationMapUrl = locationCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationCoordinates)}`
    : "";
  const locationEmbedUrl = locationCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(locationCoordinates)}&z=17&output=embed`
    : "";

  function locate() {
    if (!navigator.geolocation) {
      setError("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) });
        setLocating(false);
        setError("");
      },
      () => {
        setLocating(false);
        setError("ไม่สามารถอ่านตำแหน่งได้ กรุณาอนุญาต GPS หรือกรอกที่อยู่");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setError("กรุณายินยอมการใช้ข้อมูลเพื่อดำเนินการคำร้อง");
      return;
    }
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/public/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteSlug: site.slug,
          requestType,
          fullName: form.get("fullName"),
          phone: form.get("phone"),
          email: form.get("email"),
          details: form.get("details"),
          address: form.get("address"),
          ...location,
          consent: true,
        }),
      });
      const data = (await response.json()) as { trackingCode?: string; error?: string };
      if (!response.ok || !data.trackingCode) throw new Error(data.error || "ส่งคำร้องไม่สำเร็จ");
      setTrackingCode(data.trackingCode);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ส่งคำร้องไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  function close(next: boolean) {
    if (!next) {
      setTrackingCode("");
      setError("");
      setConsent(false);
      setSelectedRequestType(null);
      setLocation({ latitude: "", longitude: "" });
      setLocating(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] gap-0 overflow-y-auto overscroll-contain rounded-2xl border-slate-200 bg-white p-0 text-slate-950 shadow-2xl sm:max-w-xl [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:bg-slate-100 [&_[data-slot=dialog-close]]:p-2 [&_[data-slot=dialog-close]]:text-slate-700 [&_[data-slot=dialog-close]]:opacity-100 [&_[data-slot=dialog-close]]:hover:bg-slate-200"
        style={{ colorScheme: "only light" }}
      >
        {trackingCode ? (
          <div className="bg-white px-6 py-10 text-center text-slate-950">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-8" /></span>
            <DialogTitle className="mt-5 text-2xl text-slate-950">รับเรื่องเรียบร้อย</DialogTitle>
            <DialogDescription className="mt-2 text-base leading-7 text-slate-600">เก็บเลขรับเรื่องนี้ไว้เพื่อติดตามสถานะ</DialogDescription>
            <div className="mx-auto mt-5 max-w-sm rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-5">
              <p className="text-xs font-medium text-emerald-700">เลขรับเรื่อง</p>
              <p className="mt-1 break-all text-xl font-black tracking-wide text-emerald-950">{trackingCode}</p>
            </div>
            {site.isDemo && <p className="mt-4 text-xs leading-5 text-amber-700">โหมดตัวอย่าง: ระบบไม่ได้บันทึกข้อมูลส่วนบุคคลที่กรอก</p>}
            <Button className="mt-6 h-11 w-full bg-[#0b5260] text-base text-white hover:bg-[#083f4a]" onClick={() => close(false)}>ปิดหน้าต่าง</Button>
          </div>
        ) : (
          <>
            <DialogHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5 pr-12 text-left shadow-sm">
              <DialogTitle className="text-xl leading-8 text-slate-950">ส่งคำร้องออนไลน์</DialogTitle>
              <DialogDescription className="text-base leading-7 text-slate-600">ระบบจะออกเลขรับเรื่องทันที และใช้ติดตามสถานะได้ตลอดกระบวนการ</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-5 bg-white px-6 py-5 text-slate-950">
              <div className="space-y-2">
                <Label htmlFor="request-type" className={publicDialogLabelClass}>ประเภทเรื่อง *</Label>
                <Select value={requestType} onValueChange={setSelectedRequestType}>
                  <SelectTrigger id="request-type" className={`h-12 w-full ${publicDialogFieldClass}`}><SelectValue /></SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-base text-slate-950" style={{ colorScheme: "only light" }}>
                    {services.map((service) => <SelectItem className="py-2.5 text-base focus:bg-slate-100 focus:text-slate-950" key={service.type} value={service.type}>{service.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="full-name" className={publicDialogLabelClass}>ชื่อ–นามสกุล *</Label><Input id="full-name" name="fullName" autoComplete="name" required minLength={2} className={`h-12 ${publicDialogFieldClass}`} /></div>
                <div className="space-y-2"><Label htmlFor="phone" className={publicDialogLabelClass}>เบอร์โทรศัพท์ *</Label><Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required minLength={8} className={`h-12 ${publicDialogFieldClass}`} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="email" className={publicDialogLabelClass}>อีเมล</Label><Input id="email" name="email" type="email" inputMode="email" autoComplete="email" className={`h-12 ${publicDialogFieldClass}`} /></div>
              <div className="space-y-2"><Label htmlFor="details" className={publicDialogLabelClass}>รายละเอียด *</Label><Textarea id="details" name="details" required minLength={10} className={`min-h-32 ${publicDialogFieldClass}`} placeholder="อธิบายปัญหา จุดสังเกต และข้อมูลที่ช่วยให้เจ้าหน้าที่ดำเนินการได้รวดเร็ว" /></div>
              <div className="space-y-2">
                <Label htmlFor="address" className={publicDialogLabelClass}>สถานที่เกิดเหตุ / ที่อยู่</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="address" name="address" autoComplete="street-address" className={`h-12 flex-1 ${publicDialogFieldClass}`} placeholder="บ้านเลขที่ หมู่ ซอย หรือจุดสังเกต" />
                  <Button type="button" variant="outline" className="h-12 border-slate-300 bg-white text-base text-slate-800 hover:bg-slate-100 hover:text-slate-950" onClick={locate} disabled={locating}>{locating ? <Loader2 className="animate-spin" /> : <MapPin />} {locating ? "กำลังค้นหาตำแหน่ง..." : locationCoordinates ? "อัปเดตตำแหน่ง" : "ใช้ตำแหน่งปัจจุบัน"}</Button>
                </div>
                {locationEmbedUrl && <div className="overflow-hidden rounded-2xl border border-slate-300 bg-slate-50 shadow-sm">
                  <iframe src={locationEmbedUrl} title="ตำแหน่งที่แจ้งบน Google Maps" className="h-52 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
                  <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold text-slate-700"><MapPin className="mr-1.5 inline size-4 text-[#0b5260]" />ตรวจสอบหมุดก่อนส่งคำร้อง</span>
                    <a href={locationMapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 font-bold text-[#0b5260] underline-offset-4 hover:underline">เปิดใน Google Maps <ExternalLink className="size-4" /></a>
                  </div>
                </div>}
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-base leading-7 text-slate-700">
                <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-1 border-slate-400 data-[state=checked]:border-[#0b5260] data-[state=checked]:bg-[#0b5260] data-[state=checked]:text-white" />
                <span>ยินยอมให้หน่วยงานใช้ข้อมูลนี้เพื่อรับเรื่อง ติดต่อกลับ และดำเนินการตามนโยบายคุ้มครองข้อมูลส่วนบุคคล</span>
              </label>
              {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-base leading-6 text-rose-800">{error}</p>}
              <DialogFooter className="border-t border-slate-200 pt-5">
                <Button type="button" variant="outline" className="h-11 border-slate-300 bg-white text-base text-slate-800 hover:bg-slate-100 hover:text-slate-950" onClick={() => close(false)} disabled={submitting}>ยกเลิก</Button>
                <Button type="submit" className="h-11 bg-[#0b5260] text-base text-white hover:bg-[#083f4a]" disabled={submitting}>{submitting ? <Loader2 className="animate-spin" /> : <Send />}{submitting ? "กำลังส่ง..." : "ส่งคำร้อง"}</Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TrackDialog({ site, open, onOpenChange }: { site: SiteRecord; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ trackingCode: string; requestType: string; status: string; assignedDepartment: string; updatedAt: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`/api/public/requests?site=${encodeURIComponent(site.slug)}&code=${encodeURIComponent(code)}`);
      const data = (await response.json()) as { request?: typeof result; error?: string };
      if (!response.ok || !data.request) throw new Error(data.error || "ไม่พบเลขรับเรื่อง");
      setResult(data.request);
    } catch (trackError) {
      setError(trackError instanceof Error ? trackError.message : "ตรวจสอบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] rounded-2xl border-slate-200 bg-white text-slate-950 shadow-2xl sm:max-w-lg [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:bg-slate-100 [&_[data-slot=dialog-close]]:p-2 [&_[data-slot=dialog-close]]:text-slate-700 [&_[data-slot=dialog-close]]:opacity-100 [&_[data-slot=dialog-close]]:hover:bg-slate-200" style={{ colorScheme: "only light" }}>
        <DialogHeader className="pr-8 text-left"><DialogTitle className="text-xl leading-8 text-slate-950">ติดตามสถานะคำร้อง</DialogTitle><DialogDescription className="text-base leading-7 text-slate-600">กรอกเลขรับเรื่องที่ได้รับหลังส่งคำร้อง</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder={site.isDemo ? "ลองกรอก DEMO-123456" : "เช่น LG-260907-A1B2C3"} className={`h-12 ${publicDialogFieldClass}`} /><Button type="submit" className="h-12 bg-[#0b5260] text-base text-white hover:bg-[#083f4a]" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Search />}<span>ตรวจสอบ</span></Button></form>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-emerald-700">เลขรับเรื่อง</p><p className="font-bold text-emerald-950">{result.trackingCode}</p></div><Badge className="bg-emerald-700">{statusText[result.status] || result.status}</Badge></div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-emerald-700">ประเภทเรื่อง</dt><dd className="mt-1 font-medium text-emerald-950">{result.requestType}</dd></div><div><dt className="text-emerald-700">หน่วยงานรับผิดชอบ</dt><dd className="mt-1 font-medium text-emerald-950">{result.assignedDepartment}</dd></div></dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ContentList({ items, emptyText, emptyDescription, latestBadge, fallbackText, readMoreText }: { items: ContentRecord[]; emptyText: string; emptyDescription: string; latestBadge: string; fallbackText: string; readMoreText: string }) {
  if (!items.length) return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-[var(--site-primary)]">
        <FileText className="size-6" />
      </span>
      <p className="mt-4 font-semibold text-slate-800">{emptyText}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{emptyDescription}</p>
    </div>
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.slice(0, 6).map((item, index) => (
        <article key={item.id} className="group flex min-h-36 gap-4 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--site-primary)] hover:shadow-xl">
          <div className="relative flex w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--site-primary)]/8 text-[var(--site-primary)] sm:w-36">
            {item.coverUrl ? (
              <img src={item.coverUrl} alt={`ภาพประกอบ ${item.title}`} className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105" />
            ) : (
              <>
                <span className="absolute -right-5 -top-5 size-20 rounded-full bg-[var(--site-secondary)]/25" />
                <FileText className="relative size-8" />
              </>
            )}
            {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-bold text-white shadow">{latestBadge}</span>}
          </div>
          <div className="min-w-0 flex-1 py-1">
            <Badge variant="outline" className="mb-2 border-[var(--site-primary)]/15 bg-[var(--site-primary)]/5 text-[11px] text-[var(--site-primary)]">{item.category}</Badge>
            <h3 className="line-clamp-2 font-bold leading-6 text-slate-900 group-hover:text-[var(--site-primary)]">{item.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{item.excerpt || fallbackText}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--site-primary)]">{readMoreText} <ChevronRight className="size-3.5" /></span>
              {item.attachmentUrl && <a href={`${item.attachmentUrl}${item.attachmentUrl.includes("?") ? "&" : "?"}download=1`} download aria-label={`ดาวน์โหลด ${item.attachmentName || item.title}`} className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-100"><Download className="size-3.5" /> ดาวน์โหลด PDF</a>}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ArticleShowcase({ items }: { items: ContentRecord[] }) {
  const [selectedArticle, setSelectedArticle] = useState<ContentRecord | null>(null);
  const selectedImages = selectedArticle ? getContentImages(selectedArticle) : [];
  const videoEmbedUrl = selectedArticle ? getYouTubeEmbedUrl(selectedArticle.youtubeUrl) : "";

  if (!items.length) return null;

  return (
    <section id="บทความประชาชน" className="overflow-hidden bg-gradient-to-b from-white via-cyan-50/45 to-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-7 max-w-3xl">
          <p className="text-sm font-black text-[var(--site-primary)]">ความรู้สำหรับประชาชน</p>
          <h2 className="thai-balance mt-1 text-2xl font-black text-slate-950 sm:text-3xl">เรื่องใกล้ตัว รู้ไว้ ใช้บริการง่าย</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">เลื่อนซ้าย–ขวาเพื่อเลือกอ่านเรื่องที่สนใจ แต่ละบทความรองรับภาพประกอบได้สูงสุด 5 ภาพและวิดีโอ YouTube</p>
        </div>

        <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} aria-label="บทความสำหรับประชาชน">
          <CarouselContent className="pb-2">
            {items.map((item) => {
              const coverImage = getContentImages(item)[0];
              return (
                <CarouselItem key={item.id} className="basis-[88%] sm:basis-1/2 lg:basis-1/3">
                  <button
                    type="button"
                    onClick={() => setSelectedArticle(item)}
                    className="group flex h-full w-full flex-col overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-[var(--site-primary)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--site-primary)]/20"
                  >
                    <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[var(--site-primary)]/10">
                      {coverImage ? <img src={coverImage} alt={`ภาพประกอบ ${item.title}`} className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <span className="flex size-full items-center justify-center text-[var(--site-primary)]"><BookOpenCheck className="size-12" /></span>}
                      <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-[var(--site-primary)] shadow-md backdrop-blur">{item.category}</span>
                    </span>
                    <span className="flex flex-1 flex-col p-5">
                      <strong className="thai-balance text-lg font-black leading-7 text-slate-950 group-hover:text-[var(--site-primary)]">{item.title}</strong>
                      <span className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.excerpt}</span>
                      <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-black text-[var(--site-primary)]">อ่านเรื่องนี้ <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
                    </span>
                  </button>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="-top-14 left-auto right-12 size-10 translate-y-0 border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-100" />
          <CarouselNext className="-top-14 right-0 size-10 translate-y-0 border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-100" />
        </Carousel>
        <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500 sm:hidden"><ArrowRight className="size-4" /> ใช้นิ้วปัดเพื่อดูเรื่องถัดไป</p>
      </div>

      <Dialog open={Boolean(selectedArticle)} onOpenChange={(open) => { if (!open) setSelectedArticle(null); }}>
        <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] gap-0 overflow-y-auto rounded-[1.6rem] border-slate-200 bg-white p-0 text-slate-950 shadow-2xl sm:max-w-4xl [&_[data-slot=dialog-close]]:z-30 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:bg-white [&_[data-slot=dialog-close]]:p-2 [&_[data-slot=dialog-close]]:text-slate-800 [&_[data-slot=dialog-close]]:opacity-100 [&_[data-slot=dialog-close]]:shadow-lg">
          {selectedArticle && <>
            {selectedImages.length > 0 && <Carousel opts={{ loop: selectedImages.length > 1 }} className="bg-slate-950">
              <CarouselContent className="ml-0">
                {selectedImages.map((imageUrl, index) => <CarouselItem key={`${imageUrl}-${index}`} className="pl-0"><img src={imageUrl} alt={`ภาพประกอบ ${selectedArticle.title} ภาพที่ ${index + 1}`} className="aspect-[16/9] w-full object-cover" /></CarouselItem>)}
              </CarouselContent>
              {selectedImages.length > 1 && <>
                <CarouselPrevious className="left-3 top-1/2 size-11 -translate-y-1/2 border-white/30 bg-slate-950/55 text-white backdrop-blur hover:bg-slate-950/75 hover:text-white" />
                <CarouselNext className="right-3 top-1/2 size-11 -translate-y-1/2 border-white/30 bg-slate-950/55 text-white backdrop-blur hover:bg-slate-950/75 hover:text-white" />
              </>}
              <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold text-white backdrop-blur">{selectedImages.length} ภาพ</span>
            </Carousel>}
            <article className="px-5 py-6 sm:px-9 sm:py-8">
              <Badge className="bg-[var(--site-primary)] text-white">{selectedArticle.category}</Badge>
              <DialogHeader className="mt-4 pr-8 text-left">
                <DialogTitle className="thai-balance text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{selectedArticle.title}</DialogTitle>
                <DialogDescription className="text-base leading-7 text-slate-600">{selectedArticle.excerpt}</DialogDescription>
              </DialogHeader>
              <div className="mt-6 space-y-5 text-base leading-8 text-slate-700">
                {(selectedArticle.body || selectedArticle.excerpt).split(/\n{2,}/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </div>
              {videoEmbedUrl && <div className="mt-8">
                <h3 className="mb-3 text-lg font-black text-slate-950">วิดีโอประกอบ</h3>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-lg"><iframe src={videoEmbedUrl} title={`วิดีโอประกอบ ${selectedArticle.title}`} className="aspect-video w-full border-0" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
              </div>}
            </article>
          </>}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function PublicSiteHome({ site, content }: { site: SiteRecord; content: ContentRecord[] }) {
  const [query, setQuery] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestType, setRequestType] = useState("แจ้งเรื่องร้องเรียน");
  const [trackOpen, setTrackOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * fontScale}px`;
    return () => { document.documentElement.style.fontSize = ""; };
  }, [fontScale]);

  const homepage = useMemo(
    () => getHomepageConfig(site.homepageJson, site),
    [site],
  );
  const enabledServiceIds = useMemo(() => {
    try {
      const parsed = JSON.parse(site.servicesJson) as unknown;
      return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : citizenServices.map((item) => item.id));
    } catch {
      return new Set(citizenServices.map((item) => item.id));
    }
  }, [site.servicesJson]);
  const availableServices = useMemo(
    () => citizenServices
      .filter((item) => enabledServiceIds.has(item.id))
      .map((item) => ({ ...item, label: homepage.services.labels[item.id as keyof typeof homepage.services.labels] })),
    [enabledServiceIds, homepage],
  );
  const filteredServices = useMemo(() => availableServices.filter((item) => `${item.label} ${item.type}`.includes(query.trim())), [availableServices, query]);
  const filteredContent = useMemo(() => content.filter((item) => `${item.title} ${item.excerpt} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase())), [content, query]);
  const news = filteredContent.filter((item) => ["news", "announcement"].includes(item.type));
  const articles = filteredContent.filter((item) => item.type === "article");
  const procurement = filteredContent.filter((item) => item.type === "procurement");
  const transparency = filteredContent.filter((item) => item.type === "ita");
  const locationText = [site.subdistrict && `ต.${site.subdistrict}`, site.district && `อ.${site.district}`, site.province && `จ.${site.province}`].filter(Boolean).join(" ");
  const primaryPhone = site.phone?.split(",")[0]?.trim() || "";
  const phoneHref = primaryPhone ? `tel:${primaryPhone.replace(/[^0-9+]/g, "")}` : "#ติดต่อเรา";
  const officeMapUrl = site.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`
    : "";
  const officeMapEmbedUrl = site.address
    ? `https://www.google.com/maps?q=${encodeURIComponent(site.address)}&z=16&output=embed`
    : "";

  const navigation = [
    { label: homepage.header.navigation.home, href: "#main-content", visible: true },
    { label: homepage.header.navigation.services, href: "#บริการประชาชน", visible: homepage.services.visible },
    { label: homepage.header.navigation.news, href: "#ข่าวสาร", visible: homepage.news.visible },
    { label: homepage.header.navigation.transparency, href: "#ข้อมูลเปิดเผย", visible: homepage.transparency.visible },
    { label: homepage.header.navigation.about, href: "#รู้จักเรา", visible: homepage.about.visible },
    { label: homepage.header.navigation.contact, href: "#ติดต่อเรา", visible: homepage.contact.visible },
  ].filter((item) => item.visible);

  const quickActions = [
    { ...homepage.quickActions[0], icon: Send, tone: "#e5573f", action: () => openRequest("แจ้งเรื่องร้องเรียน") },
    { ...homepage.quickActions[1], icon: Clock3, tone: "#167e72", action: () => setTrackOpen(true) },
    { ...homepage.quickActions[2], icon: Download, tone: "#2d6ea3", action: () => document.getElementById("ข่าวสาร")?.scrollIntoView({ behavior: "smooth" }) },
    { ...homepage.quickActions[3], icon: Phone, tone: "#7957a8", href: phoneHref },
  ];

  function openRequest(type: string) {
    setRequestType(type);
    setRequestOpen(true);
  }

  return (
    <div
      className={`min-h-screen bg-[#f4f7fa] text-slate-900 ${highContrast ? "public-high-contrast" : ""}`}
      style={{ "--site-primary": site.primaryColor, "--site-secondary": site.secondaryColor } as React.CSSProperties}
    >
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">ข้ามไปยังเนื้อหาหลัก</a>
      <div className="bg-[#10233a] text-white">
        <div className="mx-auto flex min-h-11 max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6">
          <a href={phoneHref} className="flex min-w-0 items-center gap-2 font-medium hover:text-amber-200">
            <Phone className="size-3.5 shrink-0 text-amber-300" />
            <span className="truncate">{primaryPhone ? `${homepage.header.phoneLabel} ${primaryPhone}` : homepage.quickActions[3].text}</span>
          </a>
          <div className="flex shrink-0 items-center gap-1" aria-label="เครื่องมือช่วยการเข้าถึง">
            <Accessibility className="mr-1 size-3.5" />
            <button onClick={() => setFontScale((value) => Math.max(0.9, value - 0.1))} className="hidden rounded px-2 py-1 hover:bg-white/10 sm:block" aria-label="ลดขนาดตัวอักษร">ก−</button>
            <button onClick={() => setFontScale(1)} className="hidden rounded px-2 py-1 hover:bg-white/10 sm:block" aria-label="ขนาดตัวอักษรปกติ">ก</button>
            <button onClick={() => setFontScale((value) => Math.min(1.25, value + 0.1))} className="rounded px-2 py-1 hover:bg-white/10" aria-label="เพิ่มขนาดตัวอักษร">ก+</button>
            <button onClick={() => setHighContrast((value) => !value)} className="rounded p-1.5 hover:bg-white/10" aria-pressed={highContrast} aria-label="สลับโหมดสีตัดกันสูง"><Contrast className="size-3.5" /></button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-[0_8px_30px_rgba(15,35,55,.07)] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center gap-3 px-4 sm:px-6">
          <a href="#main-content" className="flex min-w-0 flex-1 items-center gap-3" aria-label={`หน้าหลัก ${site.name}`}>
            {site.logoUrl ? (
              <img src={site.logoUrl} alt={`ตราสัญลักษณ์ ${site.name}`} className="size-12 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-sm" />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/30 text-white shadow-lg" style={{ background: `linear-gradient(145deg, ${site.primaryColor}, #102a43)` }}><Landmark className="size-6" /></span>
            )}
            <span className="min-w-0"><span className="block truncate text-base font-black text-slate-950 sm:text-lg">{site.name}</span><span className="block truncate text-xs font-medium text-slate-500">{locationText || site.englishName || "ข้อมูลองค์กรรอตรวจสอบ"}</span></span>
          </a>
          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="ghost" onClick={() => setTrackOpen(true)} className="font-semibold text-slate-700"><Clock3 /> {homepage.hero.secondaryButton}</Button>
            <Button onClick={() => openRequest("แจ้งเรื่องร้องเรียน")} className="h-11 rounded-xl px-5 font-bold text-white shadow-lg shadow-slate-900/10" style={{ background: site.primaryColor }}><Send /> {homepage.hero.primaryButton}</Button>
          </div>
          <Sheet>
            <SheetTrigger asChild><Button variant="outline" size="icon" className="size-11 rounded-xl lg:hidden" aria-label="เปิดเมนู"><Menu /></Button></SheetTrigger>
            <SheetContent side="right" className="w-[88%] p-0">
              <SheetHeader className="border-b bg-slate-50 px-5 py-5 text-left"><SheetTitle>{site.name}</SheetTitle><SheetDescription>{homepage.header.mobileDescription}</SheetDescription></SheetHeader>
              <nav className="grid gap-1 p-4">{navigation.map((item) => <a key={item.href} href={item.href} className="flex min-h-12 items-center justify-between rounded-xl px-3 py-3 text-base font-semibold hover:bg-slate-100">{item.label}<ChevronRight className="size-4" /></a>)}</nav>
              <div className="mt-auto grid gap-2 border-t p-4"><Button onClick={() => setTrackOpen(true)} variant="outline" className="h-11">{homepage.hero.secondaryButton}</Button><Button onClick={() => openRequest("แจ้งเรื่องร้องเรียน")} className="h-11">{homepage.hero.primaryButton}</Button></div>
            </SheetContent>
          </Sheet>
        </div>
        <nav className="hidden border-t border-slate-100 lg:block" aria-label="เมนูหลัก">
          <div className="mx-auto flex max-w-7xl items-center gap-8 px-6">{navigation.map((item, index) => <a key={item.href} href={item.href} className={`border-b-2 py-3 text-sm font-semibold transition ${index === 0 ? "border-[var(--site-primary)] text-[var(--site-primary)]" : "border-transparent text-slate-600 hover:border-[var(--site-primary)]/30 hover:text-[var(--site-primary)]"}`}>{item.label}</a>)}</div>
        </nav>
      </header>

      {site.isDemo && <div className="border-b border-amber-300 bg-amber-50"><div className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2.5 text-xs leading-5 text-amber-900 sm:px-6"><Sparkles className="mt-0.5 size-3.5 shrink-0" /><strong>เว็บไซต์ตัวอย่าง:</strong><span>ข้อมูลข่าว ผู้บริหาร ที่อยู่ เบอร์โทร งบประมาณ และโครงการยังไม่ใช่ข้อมูลราชการ ต้องตรวจสอบก่อนเผยแพร่</span></div></div>}

      <main id="main-content">
        <section className="public-hero relative min-h-[570px] overflow-hidden text-white sm:min-h-[640px]">
          {homepage.hero.imageUrl && <img src={homepage.hero.imageUrl} alt={homepage.hero.imageAlt} className="absolute inset-0 size-full object-cover object-[64%_center]" />}
          <div className="absolute inset-0 bg-slate-950/30" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#071c2d]/98 via-[#0b5260]/88 to-[#071c2d]/20" aria-hidden="true" />
          <div className="relative mx-auto flex min-h-[570px] max-w-7xl items-center px-4 pb-20 pt-12 sm:min-h-[640px] sm:px-6 sm:pb-24 sm:pt-16">
            <div className="relative z-10 max-w-2xl">
              <Badge className="border-white/20 bg-white/10 px-3 py-1.5 text-white backdrop-blur">{homepage.hero.badge}</Badge>
              <h1 className="thai-balance mt-5 text-4xl font-black leading-[1.16] sm:text-5xl lg:text-[3.7rem]">{homepage.hero.title}<br /><span className="text-[var(--site-secondary)]">{homepage.hero.highlight}</span></h1>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-100 sm:text-lg">{homepage.hero.description}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => openRequest("แจ้งเรื่องร้องเรียน")} className="h-12 rounded-xl bg-[var(--site-secondary)] px-6 text-base font-black text-[#10233a] shadow-xl hover:bg-[var(--site-secondary)]/90"><Send /> {homepage.hero.primaryButton}</Button>
                <Button onClick={() => setTrackOpen(true)} variant="outline" className="h-12 rounded-xl border-white/30 bg-white/10 px-6 text-base font-bold text-white backdrop-blur hover:bg-white/20 hover:text-white"><Clock3 /> {homepage.hero.secondaryButton}</Button>
              </div>
              <div className="mt-6 flex max-w-xl items-center rounded-2xl bg-white p-2 shadow-2xl shadow-slate-950/20">
                <Search className="ml-2 size-5 shrink-0 text-slate-400" />
                <label htmlFor="citizen-search" className="sr-only">ค้นหาบริการ ข่าว หรือเอกสาร</label>
                <input id="citizen-search" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-slate-900 outline-none" placeholder={homepage.hero.searchPlaceholder} />
              </div>
              <div className="mt-5 flex max-w-lg items-center gap-3 rounded-2xl border border-white/35 bg-white/92 p-3 text-slate-900 shadow-2xl backdrop-blur">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><ShieldCheck className="size-5" /></span>
                <span className="min-w-0"><strong className="block text-sm">{homepage.hero.trackingTitle}</strong><span className="block truncate text-xs text-slate-500">{homepage.hero.trackingText}</span></span>
                <CheckCircle2 className="ml-auto size-5 shrink-0 text-emerald-600" />
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 sm:-mt-10 sm:px-6" aria-label="ทางลัดบริการประชาชน">
          <div className="grid gap-3 rounded-[1.6rem] border border-slate-200 bg-white p-3 shadow-[0_20px_60px_rgba(15,35,55,.12)] sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((item) => "href" in item ? (
              <a key={item.title} href={item.href} className="group flex min-h-24 items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--site-primary)]/20">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition group-hover:scale-105" style={{ background: item.tone }}><item.icon className="size-6" /></span>
                <span className="min-w-0"><strong className="block text-sm font-black text-slate-900">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{item.text}</span></span>
              </a>
            ) : (
              <button key={item.title} onClick={item.action} className="group flex min-h-24 items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--site-primary)]/20">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition group-hover:scale-105" style={{ background: item.tone }}><item.icon className="size-6" /></span>
                <span className="min-w-0"><strong className="block text-sm font-black text-slate-900">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{item.text}</span></span>
              </button>
            ))}
          </div>
        </section>

        {homepage.services.visible && <section id="บริการประชาชน" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-7 grid gap-5 lg:grid-cols-[1fr_340px] lg:items-center"><div><p className="text-sm font-black text-[var(--site-primary)]">{homepage.services.eyebrow}</p><h2 className="thai-balance mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{homepage.services.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{homepage.services.description}</p><span className="mt-4 inline-flex rounded-full bg-[var(--site-primary)]/8 px-4 py-2 text-sm font-bold text-[var(--site-primary)]">{homepage.services.badge}</span></div>{homepage.services.imageUrl && <img src={homepage.services.imageUrl} alt={homepage.services.imageAlt} className="aspect-[16/9] w-full rounded-[1.5rem] border-4 border-white object-cover object-center shadow-xl" />}</div>
          {filteredServices.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
              {filteredServices.map((service) => (
                <button key={service.type} onClick={() => openRequest(service.type)} className="service-tile group relative flex min-h-40 flex-col items-start justify-between overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[var(--service-color)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--site-primary)]/20" style={{ "--service-color": service.color } as React.CSSProperties}>
                  <span className="absolute -right-7 -top-7 size-24 rounded-full bg-[var(--service-color)]/10 transition group-hover:scale-125" aria-hidden="true" />
                  <span className="relative flex size-12 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: service.color }}><service.icon className="size-6" /></span>
                  <span className="relative mt-4 text-base font-black leading-6 text-slate-800">{service.label}</span>
                  <span className="relative mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--service-color)]">{homepage.services.actionText} <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
                </button>
              ))}
            </div>
          ) : <p className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">{homepage.services.emptyText}</p>}
        </section>}

        <ArticleShowcase items={articles} />

        {homepage.process.visible && <section className="border-y border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-amber-50">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[.65fr_1.35fr] lg:items-center">
            <div><Badge className="bg-[var(--site-primary)] text-white">{homepage.process.badge}</Badge><h2 className="mt-3 text-2xl font-black text-slate-950">{homepage.process.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{homepage.process.description}</p></div>
            <ol className="grid gap-3 sm:grid-cols-3">
              {homepage.process.steps.map((step, index) => <li key={index} className="flex gap-3 rounded-2xl border border-white bg-white/85 p-4 shadow-sm"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--site-primary)] text-sm font-black text-white">{index + 1}</span><span><strong className="block text-sm text-slate-900">{step.title}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{step.text}</span></span></li>)}
            </ol>
          </div>
        </section>}

        {homepage.news.visible && <section id="ข่าวสาร" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-7 grid gap-5 lg:grid-cols-[1fr_340px] lg:items-center"><div><p className="text-sm font-black text-[var(--site-primary)]">{homepage.news.eyebrow}</p><h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{homepage.news.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{homepage.news.description}</p><a href="#ข่าวสาร" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--site-primary)]">{homepage.news.allText} <ArrowRight className="size-4" /></a></div>{homepage.news.imageUrl && <img src={homepage.news.imageUrl} alt={homepage.news.imageAlt} className="aspect-[16/9] w-full rounded-[1.5rem] border-4 border-white object-cover object-center shadow-xl" />}</div>
          <Tabs defaultValue="news">
            <TabsList className="mb-5 h-auto w-full justify-start overflow-x-auto rounded-2xl bg-slate-200/70 p-1.5 sm:w-auto">
              <TabsTrigger value="news" className="min-h-10 px-4">{homepage.news.newsTab}</TabsTrigger>
              <TabsTrigger value="procurement" className="min-h-10 px-4">{homepage.news.procurementTab}</TabsTrigger>
              <TabsTrigger value="ita" className="min-h-10 px-4">{homepage.news.transparencyTab}</TabsTrigger>
            </TabsList>
            <TabsContent value="news"><ContentList items={news} emptyText={homepage.news.newsEmpty} emptyDescription={homepage.news.emptyDescription} latestBadge={homepage.news.latestBadge} fallbackText={homepage.news.cardFallbackText} readMoreText={homepage.news.readMoreText} /></TabsContent>
            <TabsContent value="procurement"><ContentList items={procurement} emptyText={homepage.news.procurementEmpty} emptyDescription={homepage.news.emptyDescription} latestBadge={homepage.news.latestBadge} fallbackText={homepage.news.cardFallbackText} readMoreText={homepage.news.readMoreText} /></TabsContent>
            <TabsContent value="ita"><ContentList items={transparency} emptyText={homepage.news.transparencyEmpty} emptyDescription={homepage.news.emptyDescription} latestBadge={homepage.news.latestBadge} fallbackText={homepage.news.cardFallbackText} readMoreText={homepage.news.readMoreText} /></TabsContent>
          </Tabs>
        </section>}

        {homepage.about.visible && <section id="รู้จักเรา" className="overflow-hidden bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.15fr_.85fr] lg:items-stretch">
            <div className="public-vision-card relative overflow-hidden rounded-[2rem] p-7 text-white shadow-xl sm:p-9">
              {homepage.about.imageUrl && <><img src={homepage.about.imageUrl} alt={homepage.about.imageAlt} className="absolute inset-0 size-full object-cover" /><span className="absolute inset-0 bg-[#0b263a]/78" /></>}
              <span className="absolute -right-12 -top-12 size-48 rounded-full border-[28px] border-white/8" aria-hidden="true" />
              <Badge className="relative border-white/20 bg-white/10 text-white">{homepage.about.badge}</Badge>
              <blockquote className="thai-balance relative mt-5 text-xl font-bold leading-9 sm:text-2xl">“{homepage.about.visionText}”</blockquote>
              <p className="relative mt-5 flex items-center gap-2 text-sm text-white/75"><MapPin className="size-4" /> {locationText || homepage.about.locationFallback}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {homepage.about.values.map((item, index) => { const Icon = [Building, UserRoundCheck, Sparkles][index]; return <div key={index} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--site-primary)]/10 text-[var(--site-primary)]"><Icon /></span><span><strong className="block text-base font-black text-slate-900">{item.title}</strong><span className="mt-1 block text-sm leading-6 text-slate-500">{item.text}</span></span></div>; })}
            </div>
          </div>
        </section>}

        {homepage.transparency.visible && <section id="ข้อมูลเปิดเผย" className="public-open-data relative overflow-hidden text-white">
          {homepage.transparency.imageUrl && <img src={homepage.transparency.imageUrl} alt={homepage.transparency.imageAlt} className="absolute inset-0 size-full object-cover object-[60%_center] opacity-45" />}
          <div className="absolute inset-0 bg-gradient-to-r from-[#081d2c]/98 via-[#102d42]/90 to-[#102d42]/72" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:py-16">
            <div><Badge className="border-white/20 bg-white/10 text-white">{homepage.transparency.badge}</Badge><h2 className="thai-balance mt-4 text-2xl font-black leading-tight sm:text-3xl">{homepage.transparency.title}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">{homepage.transparency.description}</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {homepage.transparency.items.map((label, index) => { const Icon = [CalendarDays, FileCheck2, ShieldCheck, BookOpenCheck][index]; return <a key={index} href="#ข่าวสาร" className="group flex min-h-16 items-center justify-between rounded-2xl border border-white/15 bg-white/8 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/14"><span className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-white/10"><Icon className="size-5 text-[var(--site-secondary)]" /></span><span className="text-sm font-bold">{label}</span></span><ExternalLink className="size-4 text-slate-400 transition group-hover:text-white" /></a>; })}
            </div>
          </div>
        </section>}

        {homepage.contact.visible && <section id="ติดต่อเรา" className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:py-16">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            {officeMapEmbedUrl ? <>
              <div className="relative min-h-72 bg-slate-100">
                <iframe src={officeMapEmbedUrl} title={`แผนที่ ${site.name}`} className="absolute inset-0 size-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
                <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-[var(--site-primary)] shadow-lg backdrop-blur"><MapPin className="size-4" /> Google Maps</span>
              </div>
              <div className="p-5 sm:p-6"><h3 className="text-xl font-black text-slate-950">{homepage.contact.mapTitle}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{homepage.contact.mapDescription}</p><a href={officeMapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--site-primary)] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-95"><MapPin className="size-4" /> {homepage.contact.mapButton}<ExternalLink className="size-4" /></a></div>
            </> : <div className="relative flex min-h-72 items-center justify-center overflow-hidden p-8 text-center">
              {homepage.contact.imageUrl && <><img src={homepage.contact.imageUrl} alt={homepage.contact.imageAlt} className="absolute inset-0 size-full object-cover" /><span className="absolute inset-0 bg-white/82 backdrop-blur-[1px]" /></>}
              <div className="relative"><span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-white text-[var(--site-primary)] shadow-xl"><MapPin className="size-8" /></span><h3 className="mt-4 text-xl font-black">{homepage.contact.mapTitle}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">{homepage.contact.mapDescription}</p><p className="mt-4 text-xs font-semibold text-amber-700">{homepage.contact.mapMissingText}</p></div>
            </div>}
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><span className="flex size-13 items-center justify-center rounded-2xl bg-[var(--site-primary)] text-white shadow-lg"><Landmark /></span><p className="mt-5 text-sm font-black text-[var(--site-primary)]">{homepage.contact.eyebrow}</p><h2 className="mt-1 text-xl font-black">{site.name}</h2><dl className="mt-6 space-y-5 text-sm"><div className="flex gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-[var(--site-primary)]" /><div><dt className="font-bold">{homepage.contact.addressLabel}</dt><dd className="mt-1 leading-6 text-slate-600">{site.address || homepage.contact.missingValueText}</dd></div></div><div className="flex gap-3"><Phone className="mt-0.5 size-5 shrink-0 text-[var(--site-primary)]" /><div><dt className="font-bold">{homepage.contact.phoneLabel}</dt><dd className="mt-1 leading-6 text-slate-600">{site.phone || homepage.contact.missingValueText}</dd></div></div><div className="flex gap-3"><Globe2 className="mt-0.5 size-5 shrink-0 text-[var(--site-primary)]" /><div><dt className="font-bold">{homepage.contact.emailLabel}</dt><dd className="mt-1 break-all leading-6 text-slate-600">{site.email || homepage.contact.missingValueText}</dd></div></div></dl>{primaryPhone && <a href={phoneHref} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--site-primary)] font-bold text-[var(--site-primary)] transition hover:bg-[var(--site-primary)] hover:text-white"><Phone className="size-4" /> {homepage.contact.callButton}</a>}</div>
        </section>}
      </main>

      <footer className="border-t border-slate-200 bg-white pb-20 lg:pb-0"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-xs leading-5 text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[var(--site-primary)] text-white"><Landmark className="size-5" /></span><div><strong className="text-sm text-slate-800">{site.name}</strong><p>{homepage.footer.description}</p></div></div><div className="flex flex-wrap gap-x-5 gap-y-2"><a href="#" className="hover:text-[var(--site-primary)]">{homepage.footer.privacyLabel}</a><a href="#" className="hover:text-[var(--site-primary)]">{homepage.footer.cookieLabel}</a><a href="#" className="hover:text-[var(--site-primary)]">{homepage.footer.sitemapLabel}</a><a href={`/admin/${site.id}`} className="hover:text-[var(--site-primary)]">{homepage.footer.staffLabel}</a></div></div></footer>

      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-slate-200 bg-white/96 p-2 shadow-[0_-8px_30px_rgba(15,23,42,.12)] backdrop-blur lg:hidden"><Button variant="outline" className="h-12 rounded-r-none font-bold" onClick={() => setTrackOpen(true)}><Search /> {homepage.hero.secondaryButton}</Button><Button className="h-12 rounded-l-none font-bold text-white" style={{ background: site.primaryColor }} onClick={() => openRequest("แจ้งเรื่องร้องเรียน")}><Send /> {homepage.hero.primaryButton}</Button></div>

      <RequestDialog site={site} services={availableServices} initialType={requestType} open={requestOpen} onOpenChange={setRequestOpen} />
      <TrackDialog site={site} open={trackOpen} onOpenChange={setTrackOpen} />
    </div>
  );
}
