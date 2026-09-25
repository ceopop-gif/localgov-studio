"use client";

import type { CSSProperties } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  BookOpenCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  CloudUpload,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderOpen,
  Globe2,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageSquareWarning,
  Palette,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Video,
  Wrench,
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
} from "@/components/ui/sheet";
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { HomepageEditor } from "@/components/homepage-editor";
import { isSupportedYouTubeUrl, parseContentGallery } from "@/lib/content-media";
import type { HomepageConfig } from "@/lib/homepage-config";
import type {
  ContentRecord,
  DashboardStats,
  ServiceRequestRecord,
  SiteRecord,
} from "@/lib/models";

type Section =
  | "dashboard"
  | "homepage"
  | "content"
  | "articles"
  | "requests"
  | "services"
  | "transparency"
  | "procurement"
  | "media"
  | "people"
  | "appearance"
  | "settings";

type UserView = {
  displayName: string;
  email: string;
  authSource: "chatgpt" | "local";
};

const navGroups: { label: string; items: { id: Section; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: "ภาพรวม",
    items: [
      { id: "dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
      { id: "requests", label: "คำร้องประชาชน", icon: MessageSquareWarning },
    ],
  },
  {
    label: "เนื้อหาเว็บไซต์",
    items: [
      { id: "homepage", label: "จัดหน้าแรก", icon: ImageIcon },
      { id: "content", label: "ข่าวและประกาศ", icon: FileText },
      { id: "articles", label: "บทความประชาชน", icon: BookOpenCheck },
      { id: "services", label: "บริการประชาชน", icon: ClipboardCheck },
      { id: "transparency", label: "ITA / OIT", icon: ShieldCheck },
      { id: "procurement", label: "จัดซื้อจัดจ้าง", icon: ClipboardList },
      { id: "media", label: "คลังไฟล์", icon: FolderOpen },
    ],
  },
  {
    label: "การจัดการ",
    items: [
      { id: "people", label: "ผู้ใช้และสิทธิ์", icon: Users },
      { id: "appearance", label: "รูปแบบเว็บไซต์", icon: Palette },
      { id: "settings", label: "ข้อมูลหน่วยงาน", icon: Settings2 },
    ],
  },
];

const contentTypes: Record<string, string> = {
  article: "บทความประชาชน",
  news: "ข่าวประชาสัมพันธ์",
  announcement: "ประกาศ",
  procurement: "จัดซื้อจัดจ้าง",
  ita: "ITA / OIT",
  service: "E-Service",
  project: "โครงการ",
  page: "หน้าเนื้อหา",
};

const statusLabels: Record<string, string> = {
  draft: "ฉบับร่าง",
  review: "รอตรวจ",
  approved: "อนุมัติแล้ว",
  published: "เผยแพร่แล้ว",
  archived: "เก็บถาวร",
  received: "รับเรื่องแล้ว",
  checking: "ตรวจสอบ",
  assigned: "ส่งหน่วยงาน",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  closed: "ปิดเรื่อง",
};

const serviceCatalog = [
  { id: "lighting", name: "แจ้งไฟฟ้าสาธารณะ", department: "กองช่าง" },
  { id: "road", name: "แจ้งถนนชำรุด", department: "กองช่าง" },
  { id: "water", name: "แจ้งน้ำประปา", department: "กองช่าง" },
  { id: "waste", name: "แจ้งขยะ", department: "กองสาธารณสุข" },
  { id: "complaint", name: "ร้องเรียนทั่วไป", department: "สำนักปลัด" },
  { id: "construction", name: "ขออนุญาตก่อสร้าง", department: "กองช่าง" },
  { id: "tax", name: "ตรวจสอบภาษี", department: "กองคลัง" },
  { id: "welfare", name: "ลงทะเบียนสวัสดิการ", department: "งานพัฒนาชุมชน" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "published" || status === "completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "review" || status === "checking" || status === "in_progress"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : status === "approved" || status === "assigned"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-slate-50 text-slate-600 border-slate-200";
  return <Badge variant="outline" className={style}>{statusLabels[status] || status}</Badge>;
}

const contentAssetTypes = new Set(["article", "news", "announcement", "procurement", "ita"]);

async function uploadContentAsset(site: SiteRecord, file: File, category: string, altText = "") {
  const body = new FormData();
  body.append("file", file);
  body.append("category", category);
  body.append("altText", altText);
  const response = await fetch(`/api/sites/${site.id}/media`, { method: "POST", body });
  const data = (await response.json()) as { file?: { id: string; fileName: string; url: string }; error?: string };
  if (!response.ok || !data.file) throw new Error(data.error || "อัปโหลดไฟล์ไม่สำเร็จ");
  return data.file;
}

function getDownloadUrl(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}

function CreateContentDialog({ site, onCreated, initialType = "news" }: { site: SiteRecord; onCreated: (content: ContentRecord) => void; initialType?: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState("draft");
  const [submitting, setSubmitting] = useState(false);
  const [autoDrafted, setAutoDrafted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const fiscalYearValue = String(form.get("fiscalYear") || "").trim();
    const title = String(form.get("title") || "");
    const coverFile = form.get("coverFile");
    const attachmentFile = form.get("attachmentFile");
    const galleryFiles = form.getAll("galleryFiles").filter((value): value is File => value instanceof File && value.size > 0);
    const youtubeUrl = String(form.get("youtubeUrl") || "").trim();

    try {
      if (coverFile instanceof File && coverFile.size && !["image/jpeg", "image/png", "image/webp"].includes(coverFile.type)) {
        throw new Error("ภาพปกต้องเป็นไฟล์ JPG, PNG หรือ WEBP");
      }
      if (attachmentFile instanceof File && attachmentFile.size && attachmentFile.type !== "application/pdf") {
        throw new Error("เอกสารแนบต้องเป็นไฟล์ PDF");
      }
      if (galleryFiles.length > 5) throw new Error("บทความใส่ภาพได้สูงสุด 5 ภาพ");
      if (galleryFiles.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
        throw new Error("ภาพบทความต้องเป็นไฟล์ JPG, PNG หรือ WEBP");
      }
      if (galleryFiles.some((file) => file.size > 15 * 1024 * 1024)) throw new Error("ภาพแต่ละไฟล์ต้องมีขนาดไม่เกิน 15 MB");
      if (type === "article" && !isSupportedYouTubeUrl(youtubeUrl)) throw new Error("ลิงก์ YouTube ไม่ถูกต้อง");

      let coverAsset: Awaited<ReturnType<typeof uploadContentAsset>> | null = null;
      let attachmentAsset: Awaited<ReturnType<typeof uploadContentAsset>> | null = null;
      let galleryAssets: Awaited<ReturnType<typeof uploadContentAsset>>[] = [];
      if (!site.isDemo) {
        if (type === "article") {
          galleryAssets = await Promise.all(galleryFiles.map((file) => uploadContentAsset(site, file, "content-gallery", title)));
        } else {
          [coverAsset, attachmentAsset] = await Promise.all([
            coverFile instanceof File && coverFile.size
              ? uploadContentAsset(site, coverFile, "content-cover", title)
              : Promise.resolve(null),
            attachmentFile instanceof File && attachmentFile.size
              ? uploadContentAsset(site, attachmentFile, "content-pdf", title)
              : Promise.resolve(null),
          ]);
        }
      }
      const galleryUrls = galleryAssets.map((asset) => asset.url);
      const payload = {
        type,
        status,
        title,
        excerpt: form.get("excerpt"),
        body: form.get("body"),
        category: form.get("category") || contentTypes[type],
        fiscalYear: fiscalYearValue ? Number(fiscalYearValue) : null,
        coverUrl: type === "article" ? galleryUrls[0] || "" : coverAsset?.url || "",
        galleryUrls,
        youtubeUrl: type === "article" ? youtubeUrl : "",
        attachmentUrl: attachmentAsset?.url || "",
        attachmentName: attachmentAsset?.fileName || "",
      };

      if (site.isDemo) {
        const now = new Date().toISOString();
        onCreated({
          id: `demo-${Date.now()}`,
          siteId: site.id,
          type,
          title: String(payload.title),
          excerpt: String(payload.excerpt || ""),
          body: String(payload.body || ""),
          category: String(payload.category),
          fiscalYear: payload.fiscalYear,
          status,
          coverUrl: payload.coverUrl,
          galleryJson: JSON.stringify(payload.galleryUrls),
          youtubeUrl: payload.youtubeUrl,
          attachmentUrl: payload.attachmentUrl,
          attachmentName: payload.attachmentName,
          createdBy: "ผู้ดูแลระบบตัวอย่าง",
          approvedBy: "",
          scheduledAt: null,
          publishedAt: status === "published" ? now : null,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const response = await fetch(`/api/sites/${site.id}/content`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as { content?: ContentRecord; error?: string };
        if (!response.ok || !data.content) throw new Error(data.error || "บันทึกเนื้อหาไม่สำเร็จ");
        onCreated(data.content);
      }
      setOpen(false);
      toast.success(status === "published" ? "เผยแพร่เนื้อหาแล้ว" : "บันทึกฉบับร่างแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกเนื้อหาไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  function makeOutline() {
    setAutoDrafted(true);
    toast.info("เปิดโครงข่าวมาตรฐานแล้ว", { description: "กรอกข้อเท็จจริงให้ครบก่อนส่งตรวจ" });
  }

  function changeOpen(next: boolean) {
    if (next) setType(initialType);
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild><Button><Plus /> เพิ่มเนื้อหา</Button></DialogTrigger>
      <DialogContent className="max-h-[94svh] overflow-y-auto p-0 sm:max-w-3xl">
        <DialogHeader className="border-b bg-slate-50 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div><DialogTitle className="text-xl">สร้างเนื้อหาใหม่</DialogTitle><DialogDescription className="mt-1 leading-6">บันทึกเป็นฉบับร่าง ส่งตรวจ หรือเผยแพร่ตามสิทธิ์ของผู้ใช้</DialogDescription></div>
            <Button type="button" variant="outline" size="sm" onClick={makeOutline}><Sparkles /> โครงข่าวอัตโนมัติ</Button>
          </div>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5 px-6 py-5">
          {autoDrafted && <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm leading-6 text-cyan-900"><strong>โครงข่าวแนะนำ:</strong> ใคร • ทำอะไร • ที่ไหน • เมื่อไร • วัตถุประสงค์ • ผลการดำเนินงาน — ตรวจชื่อบุคคล ตำแหน่ง และวันที่จากเอกสารจริงทุกครั้ง</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>ประเภทเนื้อหา *</Label><Select value={type} onValueChange={setType}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(contentTypes).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>สถานะเริ่มต้น *</Label><Select value={status} onValueChange={setStatus}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">ฉบับร่าง</SelectItem><SelectItem value="review">ส่งตรวจ</SelectItem><SelectItem value="published">เผยแพร่ทันที</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label htmlFor="content-title">หัวข้อ *</Label><Input id="content-title" name="title" required minLength={5} className="h-11" placeholder="เขียนหัวข้อที่ประชาชนเข้าใจได้ทันที" /></div>
          <div className="space-y-2"><Label htmlFor="content-excerpt">คำโปรย{type === "article" ? " *" : ""}</Label><Textarea id="content-excerpt" name="excerpt" required={type === "article"} className="min-h-20" placeholder="สรุปสาระสำคัญ 1–2 ประโยค" /></div>
          <div className="space-y-2"><Label htmlFor="content-body">รายละเอียด{type === "article" ? " *" : ""}</Label><Textarea id="content-body" name="body" required={type === "article"} className="min-h-44" placeholder="กรอกเนื้อหา ข้อเท็จจริง ขั้นตอน และช่องทางติดต่อ" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="content-category">หมวดหมู่ *</Label><Input id="content-category" name="category" defaultValue={contentTypes[type]} key={type} className="h-11" /></div><div className="space-y-2"><Label htmlFor="fiscal-year">ปีงบประมาณ (พ.ศ.)</Label><Input id="fiscal-year" name="fiscalYear" inputMode="numeric" placeholder="2569" className="h-11" /></div></div>
          {type === "article" && <div className="grid gap-4 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="article-gallery">ภาพประกอบ 1–5 ภาพ</Label><Input id="article-gallery" name="galleryFiles" type="file" multiple accept="image/jpeg,image/png,image/webp" className="h-11 bg-white pt-1.5" /><p className="text-xs leading-5 text-slate-500">เลือกพร้อมกันได้สูงสุด 5 ภาพ ภาพแรกใช้เป็นภาพปก</p></div>
            <div className="space-y-2"><Label htmlFor="article-youtube">ลิงก์ YouTube</Label><Input id="article-youtube" name="youtubeUrl" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=..." className="h-11 bg-white" /><p className="text-xs leading-5 text-slate-500">รองรับลิงก์ youtube.com และ youtu.be ระบบจะแสดงวิดีโอท้ายบทความ</p></div>
          </div>}
          {type !== "article" && contentAssetTypes.has(type) && <div className="grid gap-4 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="content-cover">ภาพปก 1 ภาพ</Label><Input id="content-cover" name="coverFile" type="file" accept="image/jpeg,image/png,image/webp" className="h-11 bg-white pt-1.5" /><p className="text-xs leading-5 text-slate-500">รองรับ JPG, PNG หรือ WEBP ไม่เกิน 15 MB</p></div>
            <div className="space-y-2"><Label htmlFor="content-pdf">เอกสาร PDF สำหรับดาวน์โหลด</Label><Input id="content-pdf" name="attachmentFile" type="file" accept="application/pdf,.pdf" className="h-11 bg-white pt-1.5" /><p className="text-xs leading-5 text-slate-500">เมื่อเผยแพร่ ประชาชนจะเห็นปุ่มดาวน์โหลดในรายการนี้</p></div>
          </div>}
          <DialogFooter className="border-t pt-5"><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>ยกเลิก</Button><Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="animate-spin" /> : <Check />}{submitting ? "กำลังอัปโหลดและบันทึก..." : "บันทึกเนื้อหา"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ContentAssetsDialog({ site, item, onUpdated }: { site: SiteRecord; item: ContentRecord; onUpdated: (item: ContentRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [excerpt, setExcerpt] = useState(item.excerpt);
  const [body, setBody] = useState(item.body);
  const [category, setCategory] = useState(item.category);
  const [coverUrl, setCoverUrl] = useState(item.coverUrl);
  const [galleryUrls, setGalleryUrls] = useState(() => [...new Set([item.coverUrl, ...parseContentGallery(item.galleryJson)])].filter(Boolean).slice(0, 5));
  const [youtubeUrl, setYoutubeUrl] = useState(item.youtubeUrl || "");
  const [attachmentUrl, setAttachmentUrl] = useState(item.attachmentUrl || "");
  const [attachmentName, setAttachmentName] = useState(item.attachmentName || "");
  const [uploading, setUploading] = useState<"cover" | "gallery" | "pdf" | "">("");
  const [saving, setSaving] = useState(false);

  function changeOpen(next: boolean) {
    if (next) {
      setTitle(item.title);
      setExcerpt(item.excerpt);
      setBody(item.body);
      setCategory(item.category);
      setCoverUrl(item.coverUrl);
      setGalleryUrls([...new Set([item.coverUrl, ...parseContentGallery(item.galleryJson)])].filter(Boolean).slice(0, 5));
      setYoutubeUrl(item.youtubeUrl || "");
      setAttachmentUrl(item.attachmentUrl || "");
      setAttachmentName(item.attachmentName || "");
    }
    setOpen(next);
  }

  async function upload(file: File | undefined, kind: "cover" | "pdf") {
    if (!file) return;
    if (site.isDemo) return toast.info("โหมดตัวอย่างไม่บันทึกไฟล์");
    if (kind === "cover" && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("ภาพปกต้องเป็นไฟล์ JPG, PNG หรือ WEBP");
    if (kind === "pdf" && file.type !== "application/pdf") return toast.error("เอกสารแนบต้องเป็นไฟล์ PDF");
    setUploading(kind);
    try {
      const asset = await uploadContentAsset(site, file, kind === "cover" ? "content-cover" : "content-pdf", item.title);
      if (kind === "cover") setCoverUrl(asset.url);
      else {
        setAttachmentUrl(asset.url);
        setAttachmentName(asset.fileName);
      }
      toast.success(kind === "cover" ? "อัปโหลดภาพปกแล้ว" : "อัปโหลด PDF แล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setUploading("");
    }
  }

  async function uploadGallery(files: File[]) {
    const selectedFiles = files.filter((file) => file.size > 0);
    if (!selectedFiles.length) return;
    if (galleryUrls.length + selectedFiles.length > 5) return toast.error("บทความใส่ภาพได้สูงสุด 5 ภาพ");
    if (selectedFiles.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) return toast.error("ภาพบทความต้องเป็นไฟล์ JPG, PNG หรือ WEBP");
    if (selectedFiles.some((file) => file.size > 15 * 1024 * 1024)) return toast.error("ภาพแต่ละไฟล์ต้องมีขนาดไม่เกิน 15 MB");
    if (site.isDemo) return toast.info("โหมดตัวอย่างไม่บันทึกไฟล์");
    setUploading("gallery");
    try {
      const assets = await Promise.all(selectedFiles.map((file) => uploadContentAsset(site, file, "content-gallery", title)));
      setGalleryUrls((current) => [...current, ...assets.map((asset) => asset.url)].slice(0, 5));
      toast.success(`อัปโหลดภาพแล้ว ${assets.length} ภาพ`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "อัปโหลดภาพไม่สำเร็จ");
    } finally {
      setUploading("");
    }
  }

  async function save() {
    if (title.trim().length < 5) return toast.error("หัวข้อต้องมีอย่างน้อย 5 ตัวอักษร");
    if (!category.trim()) return toast.error("กรุณากรอกหมวดหมู่");
    if (item.type === "article" && !isSupportedYouTubeUrl(youtubeUrl.trim())) return toast.error("ลิงก์ YouTube ไม่ถูกต้อง");
    setSaving(true);
    try {
      const nextCoverUrl = item.type === "article" ? galleryUrls[0] || "" : coverUrl;
      const updatePayload = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        body: body.trim(),
        category: category.trim(),
        coverUrl: nextCoverUrl,
        galleryUrls: item.type === "article" ? galleryUrls : [],
        youtubeUrl: item.type === "article" ? youtubeUrl.trim() : "",
        attachmentUrl,
        attachmentName,
      };
      let updated: ContentRecord;
      if (site.isDemo) {
        updated = { ...item, ...updatePayload, galleryJson: JSON.stringify(updatePayload.galleryUrls), updatedAt: new Date().toISOString() };
      } else {
        const response = await fetch(`/api/sites/${site.id}/content/${item.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        const data = (await response.json()) as { content?: ContentRecord; error?: string };
        if (!response.ok || !data.content) throw new Error(data.error || "บันทึกเนื้อหาและสื่อไม่สำเร็จ");
        updated = data.content;
      }
      onUpdated(updated);
      setOpen(false);
      toast.success("บันทึกเนื้อหาและสื่อแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><ImageIcon /> แก้เนื้อหา</Button></DialogTrigger>
      <DialogContent className="max-h-[94svh] overflow-y-auto p-0 sm:max-w-4xl">
        <DialogHeader className="border-b bg-slate-50 px-6 py-5 pr-12 text-left"><DialogTitle className="text-xl">แก้เนื้อหาและสื่อ</DialogTitle><DialogDescription className="mt-1 leading-6">แก้ข้อความ รูปภาพ และสื่อประกอบจากหน้าเดียว</DialogDescription></DialogHeader>
        <div className="space-y-5 px-6 py-5">
          <section className="grid gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor={`edit-title-${item.id}`}>หัวข้อ *</Label><Input id={`edit-title-${item.id}`} value={title} onChange={(event) => setTitle(event.target.value)} className="h-11" /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor={`edit-excerpt-${item.id}`}>คำโปรย</Label><Textarea id={`edit-excerpt-${item.id}`} value={excerpt} onChange={(event) => setExcerpt(event.target.value)} className="min-h-20" /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor={`edit-body-${item.id}`}>รายละเอียด</Label><Textarea id={`edit-body-${item.id}`} value={body} onChange={(event) => setBody(event.target.value)} className="min-h-52" /></div>
            <div className="space-y-2"><Label htmlFor={`edit-category-${item.id}`}>หมวดหมู่ *</Label><Input id={`edit-category-${item.id}`} value={category} onChange={(event) => setCategory(event.target.value)} className="h-11" /></div>
            <div className="space-y-2"><Label>ประเภทเนื้อหา</Label><Input value={contentTypes[item.type] || item.type} disabled className="h-11 bg-slate-50" /></div>
          </section>

          {item.type === "article" ? <section className="space-y-4 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="font-bold text-slate-950">ภาพประกอบบทความ</h3><p className="mt-1 text-xs leading-5 text-slate-500">เรียงตามลำดับที่แสดง ภาพแรกเป็นภาพปก • สูงสุด 5 ภาพ</p></div><Badge variant="outline" className="border-cyan-300 bg-white text-cyan-800">{galleryUrls.length} / 5 ภาพ</Badge></div>
            {galleryUrls.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{galleryUrls.map((url, index) => <div key={`${url}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><img src={url} alt={`ภาพประกอบที่ ${index + 1}`} className="aspect-[4/3] w-full object-cover" /><span className="absolute left-2 top-2 rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-bold text-white">{index === 0 ? "ภาพปก" : `ภาพ ${index + 1}`}</span><button type="button" onClick={() => setGalleryUrls((current) => current.filter((_, imageIndex) => imageIndex !== index))} className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white text-rose-700 shadow-md hover:bg-rose-50" aria-label={`นำภาพที่ ${index + 1} ออก`}><Trash2 className="size-4" /></button></div>)}</div> : <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-cyan-300 bg-white text-sm text-slate-500"><ImageIcon className="mr-2 size-5" /> ยังไม่มีภาพประกอบ</div>}
            <div className="space-y-2"><Label htmlFor={`gallery-${item.id}`}>เพิ่มภาพ</Label><Input id={`gallery-${item.id}`} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading) || galleryUrls.length >= 5} onChange={(event) => { void uploadGallery(Array.from(event.target.files || [])); event.currentTarget.value = ""; }} className="h-11 bg-white pt-1.5" /><p className="text-xs leading-5 text-slate-500">เลือกพร้อมกันได้หลายภาพ โดยจำนวนรวมต้องไม่เกิน 5 ภาพ</p></div>
            <div className="space-y-2"><Label htmlFor={`youtube-${item.id}`}><Video className="mr-1.5 inline size-4 text-rose-600" />ลิงก์ YouTube</Label><Input id={`youtube-${item.id}`} type="url" inputMode="url" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://youtu.be/..." className="h-11 bg-white" /><p className="text-xs leading-5 text-slate-500">เมื่อบันทึก วิดีโอจะแสดงต่อจากเนื้อหาบทความ</p></div>
          </section> : <div className="grid gap-5 sm:grid-cols-2">
            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div><h3 className="font-bold text-slate-950">ภาพปก 1 ภาพ</h3><p className="mt-1 text-xs leading-5 text-slate-500">JPG, PNG หรือ WEBP ไม่เกิน 15 MB</p></div>
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{coverUrl ? <img src={coverUrl} alt={`ภาพปก ${item.title}`} className="size-full object-cover" /> : <ImageIcon className="size-10 text-slate-300" />}</div>
              <Input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={(event) => { void upload(event.target.files?.[0], "cover"); event.currentTarget.value = ""; }} className="h-11 pt-1.5" />
              {coverUrl && <Button type="button" variant="ghost" size="sm" className="text-rose-700" onClick={() => setCoverUrl("")}><Trash2 /> นำภาพออก</Button>}
            </section>
            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div><h3 className="font-bold text-slate-950">เอกสาร PDF</h3><p className="mt-1 text-xs leading-5 text-slate-500">ประชาชนดาวน์โหลดได้จากหน้าข่าว จัดซื้อจัดจ้าง หรือ ITA/OIT</p></div>
              <div className="flex min-h-28 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><FileText /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">{attachmentUrl ? attachmentName || "เอกสารแนบ.pdf" : "ยังไม่มีเอกสาร"}</strong>{attachmentUrl && <a href={getDownloadUrl(attachmentUrl)} download className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0b5260]"><Download className="size-3.5" /> ทดลองดาวน์โหลด</a>}</span></div>
              <Input type="file" accept="application/pdf,.pdf" disabled={Boolean(uploading)} onChange={(event) => { void upload(event.target.files?.[0], "pdf"); event.currentTarget.value = ""; }} className="h-11 pt-1.5" />
              {attachmentUrl && <Button type="button" variant="ghost" size="sm" className="text-rose-700" onClick={() => { setAttachmentUrl(""); setAttachmentName(""); }}><Trash2 /> นำ PDF ออก</Button>}
            </section>
          </div>}
        </div>
        <DialogFooter className="border-t px-6 py-4"><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving || Boolean(uploading)}>ยกเลิก</Button><Button onClick={save} disabled={saving || Boolean(uploading)}>{saving || uploading ? <Loader2 className="animate-spin" /> : <Check />}{uploading ? "กำลังอัปโหลด..." : saving ? "กำลังบันทึก..." : "บันทึกเนื้อหาและสื่อ"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestSheet({ request, site, onClose, onUpdated }: { request: ServiceRequestRecord | null; site: SiteRecord; onClose: () => void; onUpdated: (item: ServiceRequestRecord) => void }) {
  const [status, setStatus] = useState("received");
  const [department, setDepartment] = useState("สำนักปลัด");
  const [saving, setSaving] = useState(false);
  const requestCoordinates = request?.latitude && request?.longitude
    ? `${request.latitude},${request.longitude}`
    : "";
  const requestMapUrl = requestCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(requestCoordinates)}`
    : "";
  const requestMapEmbedUrl = requestCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(requestCoordinates)}&z=17&output=embed`
    : "";

  useEffect(() => {
    if (request) {
      setStatus(request.status);
      setDepartment(request.assignedDepartment);
    }
  }, [request]);

  async function save() {
    if (!request) return;
    setSaving(true);
    try {
      if (site.isDemo) {
        onUpdated({ ...request, status, assignedDepartment: department, updatedAt: new Date().toISOString() });
      } else {
        const response = await fetch(`/api/sites/${site.id}/requests/${request.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status, assignedDepartment: department }),
        });
        const data = (await response.json()) as { request?: ServiceRequestRecord; error?: string };
        if (!response.ok || !data.request) throw new Error(data.error || "อัปเดตคำร้องไม่สำเร็จ");
        onUpdated(data.request);
      }
      toast.success("อัปเดตสถานะคำร้องแล้ว");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        {request && <>
          <SheetHeader className="border-b bg-slate-50 px-6 py-5 text-left"><SheetTitle className="text-xl">รายละเอียดคำร้อง</SheetTitle><SheetDescription>{request.trackingCode} • รับเรื่อง {formatDate(request.createdAt)}</SheetDescription></SheetHeader>
          <div className="space-y-6 px-6 py-5">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-slate-500">ประเภทเรื่อง</p><h3 className="mt-1 font-bold text-slate-950">{request.requestType}</h3></div><StatusBadge status={request.status} /></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>ข้อมูลส่วนบุคคล:</strong> ใช้เฉพาะเพื่อดำเนินการคำร้อง ห้ามเผยแพร่ในหน้าบ้านหรือส่งต่อโดยไม่จำเป็น</div>
            <dl className="grid gap-4 rounded-xl border border-slate-200 p-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">ผู้แจ้ง</dt><dd className="mt-1 font-medium">{request.fullName}</dd></div><div><dt className="text-slate-500">โทรศัพท์</dt><dd className="mt-1 font-medium">{request.phone}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">สถานที่</dt><dd className="mt-1 font-medium">{request.address || "ไม่ระบุ"}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">รายละเอียด</dt><dd className="mt-1 whitespace-pre-wrap leading-6">{request.details}</dd></div></dl>
            {requestMapEmbedUrl && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <iframe src={requestMapEmbedUrl} title={`ตำแหน่งคำร้อง ${request.trackingCode}`} className="h-60 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
              <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-slate-700"><MapPin className="mr-1.5 inline size-4 text-[#0b5260]" />พิกัดจากผู้แจ้ง</span><a href={requestMapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 font-bold text-[#0b5260] underline-offset-4 hover:underline">เปิดนำทางใน Google Maps <ExternalLink className="size-4" /></a></div>
            </section>}
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>สถานะ</Label><Select value={status} onValueChange={setStatus}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{["received", "checking", "assigned", "in_progress", "completed", "closed"].map((value) => <SelectItem key={value} value={value}>{statusLabels[value]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>หน่วยงานรับผิดชอบ</Label><Select value={department} onValueChange={setDepartment}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{["สำนักปลัด", "กองช่าง", "กองคลัง", "กองการศึกษา", "กองสาธารณสุข", "งานป้องกันฯ"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></div>
            <Button className="w-full" onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{saving ? "กำลังบันทึก..." : "บันทึกและแจ้งสถานะ"}</Button>
          </div>
        </>}
      </SheetContent>
    </Sheet>
  );
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-[#0b5260]">{eyebrow}</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p></div>{action}</div>;
}

function ContentTable({ content, site, onUpdated }: { content: ContentRecord[]; site: SiteRecord; onUpdated: (item: ContentRecord) => void }) {
  async function advance(item: ContentRecord) {
    const nextStatus = item.status === "draft" ? "review" : item.status === "review" ? "approved" : item.status === "approved" ? "published" : "archived";
    try {
      let updated: ContentRecord;
      if (site.isDemo) {
        updated = { ...item, status: nextStatus, updatedAt: new Date().toISOString(), publishedAt: nextStatus === "published" ? new Date().toISOString() : item.publishedAt };
      } else {
        const response = await fetch(`/api/sites/${site.id}/content/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
        const data = (await response.json()) as { content?: ContentRecord; error?: string };
        if (!response.ok || !data.content) throw new Error(data.error || "เปลี่ยนสถานะไม่สำเร็จ");
        updated = data.content;
      }
      onUpdated(updated);
      toast.success(`เปลี่ยนสถานะเป็น “${statusLabels[nextStatus]}” แล้ว`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เปลี่ยนสถานะไม่สำเร็จ");
    }
  }

  if (!content.length) return <Empty className="min-h-72 border border-slate-300 bg-white"><EmptyHeader><EmptyMedia variant="icon"><FileText /></EmptyMedia><EmptyTitle>ยังไม่มีเนื้อหา</EmptyTitle><EmptyDescription>เริ่มสร้างข่าว ประกาศ หรือเอกสารข้อมูลเปิดเผยรายการแรก</EmptyDescription></EmptyHeader></Empty>;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50"><TableRow><TableHead className="pl-4">หัวข้อ</TableHead><TableHead>ประเภท</TableHead><TableHead>สื่อ</TableHead><TableHead>สถานะ</TableHead><TableHead>แก้ไขล่าสุด</TableHead><TableHead className="pr-4 text-right">ดำเนินการ</TableHead></TableRow></TableHeader>
        <TableBody>{content.map((item) => {
          const imageCount = item.type === "article"
            ? [...new Set([item.coverUrl, ...parseContentGallery(item.galleryJson)])].filter(Boolean).slice(0, 5).length
            : item.coverUrl ? 1 : 0;
          const hasMedia = imageCount > 0 || Boolean(item.youtubeUrl) || Boolean(item.attachmentUrl);
          return <TableRow key={item.id}><TableCell className="max-w-md whitespace-normal pl-4"><p className="line-clamp-2 font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.category}</p></TableCell><TableCell>{contentTypes[item.type] || item.type}</TableCell><TableCell><div className="flex flex-wrap gap-1">{imageCount > 0 && <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700"><ImageIcon /> {imageCount} ภาพ</Badge>}{item.youtubeUrl && <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700"><Video /> YouTube</Badge>}{item.attachmentUrl && <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700"><FileText /> PDF</Badge>}{!hasMedia && <span className="text-xs text-slate-400">—</span>}</div></TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell className="text-slate-500">{formatDate(item.updatedAt)}</TableCell><TableCell className="pr-4"><div className="flex justify-end gap-2">{contentAssetTypes.has(item.type) && <ContentAssetsDialog site={site} item={item} onUpdated={onUpdated} />}{item.status !== "archived" && <Button variant="outline" size="sm" onClick={() => advance(item)}>{item.status === "published" ? "เก็บถาวร" : "ขั้นตอนถัดไป"}<ChevronRight /></Button>}</div></TableCell></TableRow>;
        })}</TableBody>
      </Table>
    </div>
  );
}

function MediaPanel({ site }: { site: SiteRecord }) {
  const [files, setFiles] = useState<{ id: string; fileName: string; url: string }[]>([]);
  const [category, setCategory] = useState("document");
  const [uploading, setUploading] = useState(false);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return toast.error("กรุณาเลือกไฟล์");
    if (site.isDemo) return toast.info("โหมดตัวอย่างไม่บันทึกไฟล์", { description: "สร้างเว็บไซต์ใหม่เพื่อทดลองคลังไฟล์จริง" });
    form.set("category", category);
    setUploading(true);
    try {
      const response = await fetch(`/api/sites/${site.id}/media`, { method: "POST", body: form });
      const data = (await response.json()) as { file?: { id: string; fileName: string; url: string }; error?: string };
      if (!response.ok || !data.file) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");
      setFiles((current) => [data.file!, ...current]);
      (event.currentTarget as HTMLFormElement).reset();
      toast.success("อัปโหลดไฟล์แล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  return <div className="space-y-5"><SectionHeading eyebrow="Media Library" title="คลังไฟล์และสื่อ" description="เก็บรูปภาพ วิดีโอ และเอกสารแยกตามเว็บไซต์ พร้อมข้อมูลชื่อ ประเภท ขนาด และผู้เผยแพร่" /><Card className="border-slate-200 shadow-sm"><CardContent><form onSubmit={upload} className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end"><div className="space-y-2"><Label htmlFor="media-file">เลือกไฟล์</Label><Input id="media-file" name="file" type="file" required accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.webp,.mp4" className="h-11 pt-1.5" /></div><div className="space-y-2"><Label>ประเภทไฟล์</Label><Select value={category} onValueChange={setCategory}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="document">เอกสาร</SelectItem><SelectItem value="image">รูปภาพ</SelectItem><SelectItem value="video">วิดีโอ</SelectItem><SelectItem value="form">แบบฟอร์ม</SelectItem></SelectContent></Select></div><Button type="submit" className="h-11" disabled={uploading}>{uploading ? <Loader2 className="animate-spin" /> : <CloudUpload />}{uploading ? "กำลังอัปโหลด..." : "อัปโหลด"}</Button></form><p className="mt-3 text-xs text-slate-500">รองรับ PDF, DOCX, XLSX, PPTX, JPG, PNG, WEBP และ MP4 ขนาดไม่เกิน 15 MB</p></CardContent></Card>{files.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{files.map((file) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#0b5260]"><span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-[#0b5260]"><FileText /></span><span className="min-w-0 flex-1 truncate text-sm font-medium">{file.fileName}</span><ExternalLink className="size-4 text-slate-400" /></a>)}</div> : <Empty className="min-h-64 border border-slate-300 bg-white"><EmptyHeader><EmptyMedia variant="icon"><ImageIcon /></EmptyMedia><EmptyTitle>ยังไม่มีไฟล์</EmptyTitle><EmptyDescription>ไฟล์ที่อัปโหลดจะแสดงที่นี่และนำไปแนบกับข่าวหรือหน้าบริการได้</EmptyDescription></EmptyHeader></Empty>}</div>;
}

export function AdminWorkspace({ initialSite, initialContent, initialRequests, initialStats, user }: { initialSite: SiteRecord; initialContent: ContentRecord[]; initialRequests: ServiceRequestRecord[]; initialStats: DashboardStats; user: UserView }) {
  const [active, setActive] = useState<Section>("dashboard");
  const [site, setSite] = useState(initialSite);
  const [content, setContent] = useState(initialContent);
  const [requests, setRequests] = useState(initialRequests);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestRecord | null>(null);
  const [query, setQuery] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [services, setServices] = useState<string[]>(() => {
    try { return JSON.parse(initialSite.servicesJson) as string[]; } catch { return serviceCatalog.map((item) => item.id); }
  });
  const initials = user.displayName.slice(0, 2).toUpperCase();

  const filteredContent = useMemo(() => content.filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [content, query]);
  const openRequestCount = requests.filter((item) => !["completed", "closed"].includes(item.status)).length;
  const stats = { ...initialStats, content: content.length, drafts: content.filter((item) => item.status === "draft").length, openRequests: openRequestCount, completedRequests: requests.filter((item) => item.status === "completed").length };

  async function patchSite(payload: Record<string, unknown>) {
    if (site.isDemo) {
      const next = { ...site, ...payload } as SiteRecord;
      if (Array.isArray(payload.services)) next.servicesJson = JSON.stringify(payload.services);
      if (payload.homepage) next.homepageJson = JSON.stringify(payload.homepage);
      setSite(next);
      return next;
    }
    const response = await fetch(`/api/sites/${site.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = (await response.json()) as { site?: SiteRecord; error?: string };
    if (!response.ok || !data.site) throw new Error(data.error || "บันทึกไม่สำเร็จ");
    setSite(data.site);
    return data.site;
  }

  async function togglePublish() {
    setPublishing(true);
    try {
      const nextStatus = site.status === "published" ? "draft" : "published";
      await patchSite({ status: nextStatus });
      toast.success(nextStatus === "published" ? "เผยแพร่เว็บไซต์แล้ว" : "เปลี่ยนเว็บไซต์เป็นฉบับร่างแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เปลี่ยนสถานะไม่สำเร็จ");
    } finally { setPublishing(false); }
  }

  async function toggleService(id: string, enabled: boolean) {
    const next = enabled ? [...new Set([...services, id])] : services.filter((item) => item !== id);
    setServices(next);
    try {
      await patchSite({ services: next });
      toast.success("บันทึกบริการแล้ว");
    } catch (error) {
      setServices(services);
      toast.error(error instanceof Error ? error.message : "บันทึกบริการไม่สำเร็จ");
    }
  }

  function updateContent(item: ContentRecord) {
    setContent((current) => current.map((row) => row.id === item.id ? item : row));
  }

  async function signOutLocalAdmin() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/local/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  const sectionTitle = navGroups.flatMap((group) => group.items).find((item) => item.id === active)?.label ?? "แดชบอร์ด";

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-white/10 p-4">
          <a href="/" className="flex items-center gap-3 overflow-hidden"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e4b949] font-black text-[#10233a]">LG</span><span className="min-w-0 group-data-[collapsible=icon]:hidden"><span className="block truncate font-bold text-white">LocalGov Studio</span><span className="block truncate text-xs text-slate-400">หลังบ้านหน่วยงาน</span></span></a>
        </SidebarHeader>
        <SidebarContent>
          <div className="mx-3 mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 group-data-[collapsible=icon]:mx-1 group-data-[collapsible=icon]:p-1.5"><div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white" style={{ background: site.primaryColor }}>{site.organizationType.includes("เทศบาล") ? "ท" : "อ"}</span><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-semibold text-white">{site.name}</p><p className="truncate text-[11px] text-slate-400">{site.status === "published" ? "เผยแพร่แล้ว" : site.status === "template" ? "แม่แบบตัวอย่าง" : "ฉบับร่าง"}</p></div></div></div>
          {navGroups.map((group) => <SidebarGroup key={group.label}><SidebarGroupLabel className="text-slate-400">{group.label}</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{group.items.map((item) => <SidebarMenuItem key={item.id}><SidebarMenuButton tooltip={item.label} isActive={active === item.id} onClick={() => setActive(item.id)} className="text-slate-200 data-[active=true]:bg-white/12 data-[active=true]:text-white hover:bg-white/10 hover:text-white"><item.icon /><span>{item.label}</span></SidebarMenuButton>{item.id === "requests" && openRequestCount > 0 && <SidebarMenuBadge className="bg-rose-500 text-white">{openRequestCount}</SidebarMenuBadge>}</SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup>)}
        </SidebarContent>
        <SidebarFooter className="border-t border-white/10 p-3"><div className="flex items-center gap-2 overflow-hidden rounded-lg p-1.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">{initials}</span><span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><span className="block truncate text-xs font-medium text-white">{user.displayName}</span><span className="block truncate text-[10px] text-slate-400">{user.authSource === "local" ? "Super Admin · ทดลอง" : "Super Admin"}</span></span>{user.authSource === "local" && <Button type="button" variant="ghost" size="icon-sm" disabled={signingOut} onClick={signOutLocalAdmin} aria-label="ออกจากระบบ" title="ออกจากระบบ" className="shrink-0 text-slate-300 hover:bg-white/10 hover:text-white">{signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}</Button>}</div></SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f3f6fa]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><SidebarTrigger /><div className="min-w-0"><p className="truncate text-xs text-slate-500">{site.name}</p><h1 className="truncate font-bold text-slate-950">{sectionTitle}</h1></div></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="แจ้งเตือน" className="relative"><Bell /><span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-rose-500 ring-2 ring-white" /></Button><Button asChild variant="outline" className="hidden sm:inline-flex"><a href={`/site/${site.slug}`}><ExternalLink /> ดูหน้าบ้าน</a></Button><Button onClick={togglePublish} disabled={publishing} className={site.status === "published" ? "bg-slate-700 hover:bg-slate-800" : "bg-[#0b5260] hover:bg-[#073f49]"}>{publishing ? <Loader2 className="animate-spin" /> : <Globe2 />}<span className="hidden sm:inline">{site.status === "published" ? "ยกเลิกเผยแพร่" : "เผยแพร่เว็บ"}</span></Button></div>
        </header>

        {site.isDemo && <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs leading-5 text-amber-900"><strong>โหมดตัวอย่าง:</strong> ทดลองกดและแก้ไขได้ แต่ข้อมูลจะไม่ถูกบันทึกถาวร</div>}

        <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8" style={{ "--site-primary": site.primaryColor, "--site-secondary": site.secondaryColor } as CSSProperties}>
          {active === "dashboard" && <>
            <SectionHeading eyebrow="Site overview" title="ภาพรวมเว็บไซต์" description="ติดตามความพร้อมของข้อมูล งานที่รออนุมัติ และคำร้องประชาชนของหน่วยงานนี้" action={<Button asChild variant="outline"><a href={`/site/${site.slug}`}><ExternalLink /> เปิดหน้าบ้าน</a></Button>} />
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
              { label: "เนื้อหาทั้งหมด", value: stats.content, note: `${stats.drafts} ฉบับร่าง`, icon: FileText, tone: "bg-cyan-50 text-cyan-700" },
              { label: "คำร้องที่เปิดอยู่", value: stats.openRequests, note: "ต้องติดตามและอัปเดต", icon: MessageSquareWarning, tone: "bg-rose-50 text-rose-700" },
              { label: "ดำเนินการเสร็จ", value: stats.completedRequests, note: "คำร้องที่ปิดงานแล้ว", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
              { label: "ความพร้อมข้อมูล", value: `${site.completeness}%`, note: "ก่อนเผยแพร่", icon: ShieldCheck, tone: "bg-amber-50 text-amber-700" },
            ].map((metric) => <Card key={metric.label} className="gap-4 border-slate-200 py-5 shadow-sm"><CardContent className="flex items-start justify-between px-5"><div><p className="text-sm text-slate-500">{metric.label}</p><p className="mt-2 text-3xl font-black text-slate-950">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.note}</p></div><span className={`flex size-11 items-center justify-center rounded-xl ${metric.tone}`}><metric.icon className="size-5" /></span></CardContent></Card>)}</section>
            <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
              <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>ความพร้อมก่อนเผยแพร่</CardTitle><CardDescription>ตรวจข้อมูลสำคัญที่มีโอกาสเปลี่ยนก่อนเปิดให้ประชาชนใช้งาน</CardDescription></CardHeader><CardContent className="space-y-5"><div><div className="mb-2 flex justify-between text-sm"><span>ข้อมูลครบถ้วน</span><strong>{site.completeness}%</strong></div><Progress value={site.completeness} /></div><div className="grid gap-2 sm:grid-cols-2">{[
                { label: "ชื่อหน่วยงาน", ok: Boolean(site.name) }, { label: "จังหวัด / พื้นที่", ok: Boolean(site.province && site.province !== "ต้องตรวจสอบ") }, { label: "ที่อยู่และเบอร์โทร", ok: Boolean(site.address && site.phone && !site.phone.includes("ตรวจสอบ")) }, { label: "ตราสัญลักษณ์", ok: Boolean(site.logoUrl) }, { label: "ข้อมูลผู้บริหาร", ok: false }, { label: "ITA แยกปีงบประมาณ", ok: content.some((item) => item.type === "ita") },
              ].map((item) => <div key={item.label} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${item.ok ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600"}`}>{item.ok ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />} {item.label}</div>)}</div></CardContent></Card>
              <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>ขั้นตอนเผยแพร่ข่าว</CardTitle><CardDescription>ทุกการเปลี่ยนสถานะมีผู้รับผิดชอบและบันทึกประวัติ</CardDescription></CardHeader><CardContent><div className="grid grid-cols-5 gap-1">{[{ label: "ร่าง", icon: FileText }, { label: "ส่งตรวจ", icon: Search }, { label: "หัวหน้าตรวจ", icon: ClipboardCheck }, { label: "อนุมัติ", icon: ShieldCheck }, { label: "เผยแพร่", icon: Globe2 }].map((step, index) => <div key={step.label} className="relative text-center"><span className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#0b5260] text-white"><step.icon className="size-4" /></span><p className="mt-2 text-[11px] font-medium text-slate-600">{step.label}</p>{index < 4 && <span className="absolute left-[65%] top-5 h-px w-[70%] bg-slate-300" />}</div>)}</div><div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><LockKeyhole className="mr-2 inline size-4" />ระบบแยกสิทธิ์ผู้เขียน ผู้ตรวจ และผู้อนุมัติตามบทบาทของแต่ละกองงาน</div></CardContent></Card>
            </section>
            <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>งานล่าสุด</CardTitle><CardDescription>เนื้อหาที่มีการสร้างหรือแก้ไขล่าสุด</CardDescription></CardHeader><CardContent>{content.length ? <div className="space-y-2">{content.slice(0, 4).map((item) => <button key={item.id} onClick={() => setActive(item.type === "article" ? "articles" : "content")} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0b5260]">{item.type === "article" ? <BookOpenCheck className="size-4" /> : <FileText className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{contentTypes[item.type]} • {formatDate(item.updatedAt)}</span></span><StatusBadge status={item.status} /></button>)}</div> : <Empty className="border"><EmptyHeader><EmptyMedia variant="icon"><FileText /></EmptyMedia><EmptyTitle>ยังไม่มีเนื้อหา</EmptyTitle><EmptyDescription>ไปที่เมนูข่าวและประกาศเพื่อเริ่มสร้างเนื้อหา</EmptyDescription></EmptyHeader><EmptyContent><Button onClick={() => setActive("content")}>สร้างเนื้อหาแรก</Button></EmptyContent></Empty>}</CardContent></Card>
          </>}

          {active === "homepage" && <HomepageEditor site={site} onSave={async (homepage: HomepageConfig, topInfo) => patchSite({ homepage, ...topInfo })} />}

          {active === "content" && <><SectionHeading eyebrow="Content management" title="ข่าว ประกาศ และหน้าเนื้อหา" description="สร้าง ตรวจ อนุมัติ และเผยแพร่เนื้อหาโดยเก็บประวัติทุกขั้นตอน" action={<CreateContentDialog site={site} onCreated={(item) => setContent((current) => [item, ...current])} />} /><div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาจากหัวข้อหรือหมวดหมู่" className="h-10 pl-9" /></div><div className="flex gap-2"><Badge variant="outline" className="px-3">ทั้งหมด {content.filter((item) => item.type !== "article").length}</Badge><Badge variant="outline" className="border-amber-200 bg-amber-50 px-3 text-amber-700">ฉบับร่าง {stats.drafts}</Badge></div></div><ContentTable content={filteredContent.filter((item) => item.type !== "article")} site={site} onUpdated={updateContent} /></>}

          {active === "articles" && <><SectionHeading eyebrow="Citizen articles" title="บทความประชาชน" description="สร้างเรื่องอ่านง่ายสำหรับประชาชน พร้อมภาพเลื่อนซ้าย–ขวาได้สูงสุด 5 ภาพ และวิดีโอ YouTube" action={<CreateContentDialog site={site} initialType="article" onCreated={(item) => setContent((current) => [item, ...current])} />} /><div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950"><BookOpenCheck className="mr-2 inline size-4" />บทความที่เผยแพร่แล้วจะแสดงเป็นแถบเลื่อนบนหน้าแรกก่อนส่วน “ง่ายใน 3 ขั้นตอน” โดยอัตโนมัติ</div><ContentTable content={content.filter((item) => item.type === "article")} site={site} onUpdated={updateContent} /></>}

          {active === "requests" && <><SectionHeading eyebrow="Citizen service" title="คำร้องประชาชน" description="รับเรื่อง แยกหน่วยงานรับผิดชอบ อัปเดตสถานะ และรักษาข้อมูลส่วนบุคคลตาม PDPA" />{requests.length ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><Table><TableHeader className="bg-slate-50"><TableRow><TableHead className="pl-4">เลขรับเรื่อง</TableHead><TableHead>ประเภทเรื่อง</TableHead><TableHead>หน่วยงาน</TableHead><TableHead>สถานะ</TableHead><TableHead>วันที่รับ</TableHead><TableHead className="pr-4 text-right">ดูรายละเอียด</TableHead></TableRow></TableHeader><TableBody>{requests.map((item) => <TableRow key={item.id}><TableCell className="pl-4 font-mono text-xs font-semibold">{item.trackingCode}</TableCell><TableCell className="max-w-xs whitespace-normal font-medium">{item.requestType}</TableCell><TableCell>{item.assignedDepartment}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell className="text-slate-500">{formatDate(item.createdAt)}</TableCell><TableCell className="pr-4 text-right"><Button size="sm" variant="outline" onClick={() => setSelectedRequest(item)}>เปิดเรื่อง <ChevronRight /></Button></TableCell></TableRow>)}</TableBody></Table></div> : <Empty className="min-h-80 border border-slate-300 bg-white"><EmptyHeader><EmptyMedia variant="icon"><MessageSquareWarning /></EmptyMedia><EmptyTitle>ยังไม่มีคำร้อง</EmptyTitle><EmptyDescription>คำร้องจากหน้าบ้านจะมีเลขรับเรื่องและแสดงที่นี่โดยอัตโนมัติ</EmptyDescription></EmptyHeader><EmptyContent><Button asChild variant="outline"><a href={`/site/${site.slug}`}><ExternalLink /> เปิดหน้าบ้านเพื่อทดลอง</a></Button></EmptyContent></Empty>}<RequestSheet request={selectedRequest} site={site} onClose={() => setSelectedRequest(null)} onUpdated={(updated) => setRequests((current) => current.map((row) => row.id === updated.id ? updated : row))} /></>}

          {active === "services" && <><SectionHeading eyebrow="Service builder" title="บริการประชาชน" description="เปิด–ปิดบริการของแต่ละเว็บไซต์และกำหนดกองงานที่รับผิดชอบ โดยไม่กระทบหน่วยงานอื่น" /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{serviceCatalog.map((service, index) => { const enabled = services.includes(service.id); return <Card key={service.id} className={`gap-4 border-slate-200 py-5 shadow-sm ${enabled ? "bg-white" : "bg-slate-50 opacity-75"}`}><CardContent className="flex items-center gap-4 px-5"><span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${enabled ? "bg-[#0b5260] text-white" : "bg-slate-200 text-slate-500"}`}><Wrench className="size-5" /></span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{service.name}</p><p className="mt-1 text-xs text-slate-500">{service.department} • ลำดับ {index + 1}</p></div><Switch checked={enabled} onCheckedChange={(checked) => toggleService(service.id, checked)} aria-label={`${enabled ? "ปิด" : "เปิด"}บริการ ${service.name}`} /></CardContent></Card>; })}</div><Card className="border-cyan-200 bg-cyan-50 shadow-none"><CardContent className="flex items-start gap-3 text-sm leading-6 text-cyan-950"><ClipboardCheck className="mt-0.5 size-5 shrink-0" /><div><strong>แม่แบบบริการครบข้อมูล</strong><p className="text-cyan-800">แต่ละบริการรองรับคุณสมบัติ เอกสาร ขั้นตอน ระยะเวลา ค่าธรรมเนียม หน่วยงานรับผิดชอบ แบบฟอร์มออนไลน์ และไฟล์ดาวน์โหลด</p></div></CardContent></Card></>}

          {active === "transparency" && <><SectionHeading eyebrow="Transparency" title="ITA / OIT และข้อมูลเปิดเผย" description="จัดหมวดตามปีงบประมาณ ตรวจความครบถ้วน และเผยแพร่เอกสารที่ประชาชนค้นหาได้" action={<CreateContentDialog site={site} initialType="ita" onCreated={(item) => setContent((current) => [item, ...current])} />} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{ label: "ข้อมูลพื้นฐาน", value: 65 }, { label: "การบริหารงาน", value: 40 }, { label: "การจัดซื้อจัดจ้าง", value: 25 }, { label: "การป้องกันทุจริต", value: 50 }].map((item) => <Card key={item.label} className="gap-4 border-slate-200 py-5 shadow-sm"><CardContent className="px-5"><div className="flex justify-between text-sm"><span className="font-semibold">{item.label}</span><span>{item.value}%</span></div><Progress value={item.value} className="mt-3" /></CardContent></Card>)}</div><ContentTable content={content.filter((item) => item.type === "ita")} site={site} onUpdated={updateContent} /></>}

          {active === "procurement" && <><SectionHeading eyebrow="Procurement" title="จัดซื้อจัดจ้าง" description="รองรับแผน ประกาศ ราคากลาง TOR ผู้ชนะ สัญญา และรายงานผล พร้อมค้นหาตามปีและเลขโครงการ" action={<CreateContentDialog site={site} initialType="procurement" onCreated={(item) => setContent((current) => [item, ...current])} />} /><ContentTable content={content.filter((item) => item.type === "procurement")} site={site} onUpdated={updateContent} /></>}

          {active === "media" && <MediaPanel site={site} />}

          {active === "people" && <><SectionHeading eyebrow="Role-based access" title="ผู้ใช้และสิทธิ์" description="เจ้าหน้าที่แต่ละกองเห็นเฉพาะงานที่เกี่ยวข้อง ส่วนการอนุมัติและการตั้งค่าหลักสงวนไว้สำหรับผู้มีสิทธิ์" action={<Button variant="outline"><Plus /> เพิ่มเจ้าหน้าที่</Button>} /><div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>ผู้ใช้ปัจจุบัน</CardTitle><CardDescription>บัญชีที่มีสิทธิ์เข้าหลังบ้านของเว็บไซต์นี้</CardDescription></CardHeader><CardContent><div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4"><span className="flex size-11 items-center justify-center rounded-xl bg-[#0b5260] font-bold text-white">{initials}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{user.displayName}</p><p className="truncate text-sm text-slate-500">{user.email}</p></div><Badge className="bg-[#0b5260]">Super Admin</Badge></div></CardContent></Card><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>บทบาทมาตรฐาน</CardTitle><CardDescription>สิทธิ์แยกตามภารกิจของหน่วยงาน</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{["ผู้บริหาร", "สำนักปลัด", "กองคลัง", "กองช่าง", "กองการศึกษา", "กองสาธารณสุข", "เจ้าหน้าที่ ITA", "เจ้าหน้าที่จัดซื้อ"].map((role) => <div key={role} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><LockKeyhole className="size-3.5 text-slate-500" />{role}</div>)}</CardContent></Card></div></>}

          {active === "appearance" && <><SectionHeading eyebrow="Design system" title="รูปแบบเว็บไซต์" description="กำหนดอัตลักษณ์ สีหลัก และสีเน้นของหน่วยงาน ระบบจะใช้กับหน้าบ้านทุกขนาดหน้าจอ" /><Card className="border-slate-200 shadow-sm"><CardContent className="grid gap-6 pt-1 lg:grid-cols-[.8fr_1.2fr]"><div className="space-y-5"><div className="space-y-2"><Label htmlFor="primary-color">สีหลัก</Label><div className="flex gap-2"><Input id="primary-color" type="color" value={site.primaryColor} onChange={(e) => setSite((current) => ({ ...current, primaryColor: e.target.value }))} className="h-11 w-16 p-1" /><Input value={site.primaryColor} onChange={(e) => setSite((current) => ({ ...current, primaryColor: e.target.value }))} className="h-11 font-mono uppercase" /></div></div><div className="space-y-2"><Label htmlFor="secondary-color">สีเน้น</Label><div className="flex gap-2"><Input id="secondary-color" type="color" value={site.secondaryColor} onChange={(e) => setSite((current) => ({ ...current, secondaryColor: e.target.value }))} className="h-11 w-16 p-1" /><Input value={site.secondaryColor} onChange={(e) => setSite((current) => ({ ...current, secondaryColor: e.target.value }))} className="h-11 font-mono uppercase" /></div></div><Button onClick={async () => { try { await patchSite({ primaryColor: site.primaryColor, secondaryColor: site.secondaryColor }); toast.success("บันทึกชุดสีแล้ว"); } catch (error) { toast.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ"); } }}><Check /> บันทึกชุดสี</Button></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><div className="p-5 text-white" style={{ background: site.primaryColor }}><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-full bg-white/20 font-black">ท</span><div><p className="font-bold">{site.name}</p><p className="text-xs text-white/70">ตัวอย่างส่วนหัวเว็บไซต์</p></div></div><h3 className="mt-8 text-2xl font-black">บริการประชาชนออนไลน์</h3><button className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-slate-900" style={{ background: site.secondaryColor }}>ยื่นคำร้อง</button></div><div className="grid grid-cols-3 gap-2 p-4">{["ข่าวสาร", "E-Service", "ITA / OIT"].map((label) => <div key={label} className="rounded-lg bg-white p-3 text-center text-xs font-semibold shadow-sm">{label}</div>)}</div></div></CardContent></Card></>}

          {active === "settings" && <><SectionHeading eyebrow="Organization data" title="ข้อมูลหน่วยงาน" description="ข้อมูลนี้ใช้ในส่วนหัว ติดต่อเรา SEO และ Structured Data ของหน้าบ้าน กรุณาตรวจสอบจากแหล่งราชการ" /><Card className="border-slate-200 shadow-sm"><CardContent><form onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await patchSite({ name: form.get("name"), englishName: form.get("englishName"), province: form.get("province"), district: form.get("district"), subdistrict: form.get("subdistrict"), address: form.get("address"), phone: form.get("phone"), email: form.get("email"), vision: form.get("vision") }); toast.success("บันทึกข้อมูลหน่วยงานแล้ว"); } catch (error) { toast.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ"); } }} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="org-name">ชื่อหน่วยงาน *</Label><Input id="org-name" name="name" defaultValue={site.name} required className="h-11" /></div><div className="space-y-2"><Label htmlFor="org-en">ชื่อภาษาอังกฤษ</Label><Input id="org-en" name="englishName" defaultValue={site.englishName} className="h-11" /></div><div className="space-y-2"><Label htmlFor="org-province">จังหวัด</Label><Input id="org-province" name="province" defaultValue={site.province} className="h-11" /></div><div className="space-y-2"><Label htmlFor="org-district">อำเภอ</Label><Input id="org-district" name="district" defaultValue={site.district} className="h-11" /></div><div className="space-y-2"><Label htmlFor="org-subdistrict">ตำบล</Label><Input id="org-subdistrict" name="subdistrict" defaultValue={site.subdistrict} className="h-11" /></div><div className="space-y-2"><Label htmlFor="org-phone">เบอร์โทร</Label><Input id="org-phone" name="phone" defaultValue={site.phone} className="h-11" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="org-email">อีเมล</Label><Input id="org-email" name="email" type="email" defaultValue={site.email} className="h-11" /></div></div><div className="space-y-2"><Label htmlFor="org-address">ที่อยู่และคำค้น Google Maps</Label><Textarea id="org-address" name="address" defaultValue={site.address} className="min-h-24" /><p className="text-xs leading-5 text-slate-500">ระบบจะใช้ข้อความนี้สร้างหมุด Google Maps ที่หน้าติดต่อ ควรกรอกชื่อหน่วยงานและที่อยู่ให้ครบถ้วน</p></div><div className="space-y-2"><Label htmlFor="org-vision">วิสัยทัศน์</Label><Textarea id="org-vision" name="vision" defaultValue={site.vision} className="min-h-24" /></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"><CircleAlert className="mr-2 inline size-4" />ห้ามแต่งชื่อผู้บริหาร เบอร์โทร ที่อยู่ งบประมาณ ข่าว หรือโครงการขึ้นเอง หากไม่ชัดเจนให้ใช้คำว่า “ต้องตรวจสอบ”</div><Button type="submit"><Check /> บันทึกข้อมูลหน่วยงาน</Button></form></CardContent></Card></>}
        </div>
      </SidebarInset>
      <Toaster richColors position="top-center" />
    </SidebarProvider>
  );
}
