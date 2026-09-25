"use client";

import { useId, useState, type ReactNode } from "react";
import {
  Check,
  CloudUpload,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getHomepageConfig,
  homepageConfigSchema,
  type HomepageConfig,
} from "@/lib/homepage-config";
import type { SiteRecord } from "@/lib/models";

type HomepageEditorProps = {
  site: SiteRecord;
  onSave: (homepage: HomepageConfig, topInfo: HomepageTopInfo) => Promise<unknown>;
};

type HomepageTopInfo = Pick<
  SiteRecord,
  "name" | "englishName" | "province" | "district" | "subdistrict" | "phone" | "logoUrl"
>;

const serviceFieldLabels: Record<keyof HomepageConfig["services"]["labels"], string> = {
  lighting: "ไฟส่องสว่าง",
  road: "ถนนชำรุด",
  water: "น้ำประปา",
  waste: "ขยะ",
  complaint: "ร้องเรียนทั่วไป",
  construction: "ขออนุญาตก่อสร้าง",
  tax: "ภาษี",
  welfare: "สวัสดิการ",
};

function TextField({
  label,
  value,
  onChange,
  textarea = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {textarea ? (
        <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 resize-y" />
      ) : (
        <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-11" />
      )}
      {hint && <p className="text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}

function BlockHeader({
  title,
  description,
  visible,
  onVisibleChange,
}: {
  title: string;
  description: string;
  visible?: boolean;
  onVisibleChange?: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start">
      <div>
        <h3 className="font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {typeof visible === "boolean" && onVisibleChange && (
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold">
          <Switch checked={visible} onCheckedChange={onVisibleChange} />
          {visible ? "แสดงอยู่" : "ซ่อนอยู่"}
        </label>
      )}
    </div>
  );
}

function ImageUploadField({
  site,
  label,
  value,
  altText,
  onUrlChange,
  onAltChange,
  recommended,
}: {
  site: SiteRecord;
  label: string;
  value: string;
  altText: string;
  onUrlChange: (value: string) => void;
  onAltChange?: (value: string) => void;
  recommended: string;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (site.isDemo) {
      toast.error("เว็บไซต์ตัวอย่างไม่บันทึกไฟล์ กรุณาเปิดเว็บไซต์จริงของหน่วยงาน");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("category", "homepage");
      body.append("altText", altText);
      const response = await fetch(`/api/sites/${site.id}/media`, { method: "POST", body });
      const data = (await response.json()) as { file?: { url: string }; error?: string };
      if (!response.ok || !data.file) throw new Error(data.error || "อัปโหลดรูปไม่สำเร็จ");
      onUrlChange(data.file.url);
      toast.success("อัปโหลดรูปแล้ว กดบันทึกหน้าแรกเพื่อใช้งาน");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-bold text-slate-900">{label}</p><p className="mt-1 text-xs text-slate-500">แนะนำ {recommended} • JPG, PNG หรือ WEBP ไม่เกิน 15 MB</p></div>
        {value && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><Check /> มีรูปแล้ว</Badge>}
      </div>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          {value ? <img src={value} alt={altText || "ตัวอย่างรูป"} className="size-full object-cover" /> : <ImageIcon className="size-10 text-slate-300" />}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button asChild type="button" variant="outline" disabled={uploading || site.isDemo}>
              <label htmlFor={inputId} className="cursor-pointer">{uploading ? <Loader2 className="animate-spin" /> : <CloudUpload />} {uploading ? "กำลังอัปโหลด..." : value ? "เปลี่ยนรูปใหม่" : "เลือกรูป"}</label>
            </Button>
            {value && <Button type="button" variant="ghost" className="text-rose-700" onClick={() => onUrlChange("")}>นำรูปออก</Button>}
          </div>
          <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          {onAltChange && <TextField label="คำอธิบายรูป (สำหรับผู้ใช้โปรแกรมอ่านหน้าจอ)" value={altText} onChange={onAltChange} />}
        </div>
      </div>
    </div>
  );
}

function EditorCard({ children }: { children: ReactNode }) {
  return <Card className="border-slate-200 shadow-sm"><CardContent className="space-y-5">{children}</CardContent></Card>;
}

export function HomepageEditor({ site, onSave }: HomepageEditorProps) {
  const [homepage, setHomepage] = useState(() => getHomepageConfig(site.homepageJson, site));
  const [topInfo, setTopInfo] = useState<HomepageTopInfo>({
    name: site.name,
    englishName: site.englishName,
    province: site.province,
    district: site.district,
    subdistrict: site.subdistrict,
    phone: site.phone,
    logoUrl: site.logoUrl,
  });
  const [saving, setSaving] = useState(false);

  function updateTopInfo(field: keyof HomepageTopInfo, value: string) {
    setTopInfo((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    const parsed = homepageConfigSchema.safeParse(homepage);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(`กรุณาตรวจข้อมูลให้ครบ: ${first.path.join(".")}`);
      return;
    }
    if (topInfo.name.trim().length < 3) {
      toast.error("กรุณากรอกชื่อหน่วยงานให้ครบ");
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed.data, {
        name: topInfo.name.trim(),
        englishName: topInfo.englishName.trim(),
        province: topInfo.province.trim(),
        district: topInfo.district.trim(),
        subdistrict: topInfo.subdistrict.trim(),
        phone: topInfo.phone.trim(),
        logoUrl: topInfo.logoUrl,
      });
      toast.success("บันทึกข้อมูลส่วนบนและหน้าแรกแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกหน้าแรกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#0b5260]">Homepage builder</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">จัดหน้าแรกทั้งเว็บไซต์</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">แก้ข้อความ เมนู ปุ่ม ชื่อบริการ และรูปภาพได้จากที่เดียว พร้อมเปิด–ปิดส่วนต่าง ๆ โดยไม่ต้องแก้โค้ด</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><a href={`/site/${site.slug}`} target="_blank" rel="noreferrer"><ExternalLink /> ดูหน้าบ้าน</a></Button>
          <Button onClick={save} disabled={saving} className="bg-[#0b5260] hover:bg-[#073f49]">{saving ? <Loader2 className="animate-spin" /> : <Save />}{saving ? "กำลังบันทึก..." : "บันทึกหน้าแรก"}</Button>
        </div>
      </div>

      <Card className="border-cyan-200 bg-gradient-to-r from-cyan-50 to-white shadow-none">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#0b5260] text-white"><LayoutTemplate /></span>
          <div className="flex-1"><p className="font-black text-slate-950">โครงสร้างแบบแยกบล็อก แก้ได้ครบและปลอดภัย</p><p className="mt-1 text-sm leading-6 text-slate-600">การแก้ไขหน้านี้มีผลเฉพาะเว็บไซต์ {site.name} รูปที่อัปโหลดจะเก็บในคลังไฟล์ของหน่วยงาน</p></div>
          <Badge className="w-fit bg-emerald-700"><Eye /> รองรับมือถือ</Badge>
        </CardContent>
      </Card>

      <Tabs defaultValue="top" className="gap-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-slate-200/70 p-1.5">
          <TabsTrigger value="top" className="min-h-10 px-4">ส่วนบนและภาพหลัก</TabsTrigger>
          <TabsTrigger value="services" className="min-h-10 px-4">บริการประชาชน</TabsTrigger>
          <TabsTrigger value="content" className="min-h-10 px-4">ข่าวและชุมชน</TabsTrigger>
          <TabsTrigger value="contact" className="min-h-10 px-4">ติดต่อและท้ายเว็บ</TabsTrigger>
        </TabsList>

        <TabsContent value="top" className="space-y-5">
          <EditorCard>
            <BlockHeader title="ข้อมูลส่วนหัวเว็บไซต์" description="ข้อมูลชุดนี้แสดงเหนือภาพหลัก แก้ชื่อหน่วยงาน พื้นที่ เบอร์โทร และตราสัญลักษณ์ได้จากหน้านี้" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="ชื่อหน่วยงาน *" value={topInfo.name} onChange={(value) => updateTopInfo("name", value)} />
              <TextField label="ชื่อภาษาอังกฤษ" value={topInfo.englishName} onChange={(value) => updateTopInfo("englishName", value)} />
              <TextField label="ตำบล" value={topInfo.subdistrict} onChange={(value) => updateTopInfo("subdistrict", value)} />
              <TextField label="อำเภอ" value={topInfo.district} onChange={(value) => updateTopInfo("district", value)} />
              <TextField label="จังหวัด" value={topInfo.province} onChange={(value) => updateTopInfo("province", value)} />
              <TextField label="เบอร์โทรศัพท์" value={topInfo.phone} onChange={(value) => updateTopInfo("phone", value)} />
            </div>
            <ImageUploadField site={site} label="ตราสัญลักษณ์หน่วยงาน" value={topInfo.logoUrl} altText={`ตราสัญลักษณ์ ${topInfo.name}`} onUrlChange={(value) => updateTopInfo("logoUrl", value)} recommended="ภาพจัตุรัสพื้นหลังโปร่งใส 800 × 800 พิกเซล" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="ข้อความนำหน้าเบอร์โทร" value={homepage.header.phoneLabel} onChange={(value) => setHomepage((current) => ({ ...current, header: { ...current.header, phoneLabel: value } }))} />
              <TextField label="คำอธิบายเมนูบนมือถือ" value={homepage.header.mobileDescription} onChange={(value) => setHomepage((current) => ({ ...current, header: { ...current.header, mobileDescription: value } }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {([
                ["home", "เมนูหน้าหลัก"], ["services", "เมนูบริการ"], ["news", "เมนูข่าว"],
                ["transparency", "เมนูข้อมูลเปิดเผย"], ["about", "เมนูรู้จักเรา"], ["contact", "เมนูติดต่อ"],
              ] as const).map(([key, label]) => <TextField key={key} label={label} value={homepage.header.navigation[key]} onChange={(value) => setHomepage((current) => ({ ...current, header: { ...current.header, navigation: { ...current.header.navigation, [key]: value } } }))} />)}
            </div>
          </EditorCard>

          <EditorCard>
            <BlockHeader title="ภาพและข้อความแบนเนอร์หลัก" description="เปลี่ยนภาพพื้นหลังและแก้ข้อความทุกจุดด้านบนได้ ระบบวางชั้นสีเข้มอัตโนมัติเพื่อให้ข้อความอ่านชัด" />
            <ImageUploadField site={site} label="ภาพพื้นหลังแบนเนอร์" value={homepage.hero.imageUrl} altText={homepage.hero.imageAlt} onUrlChange={(value) => setHomepage((current) => ({ ...current, hero: { ...current.hero, imageUrl: value } }))} onAltChange={(value) => setHomepage((current) => ({ ...current, hero: { ...current.hero, imageAlt: value } }))} recommended="แนวนอน 1920 × 1080 พิกเซล และเว้นพื้นที่ด้านซ้ายสำหรับข้อความ" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="ป้ายข้อความด้านบน" value={homepage.hero.badge} onChange={(value) => setHomepage((current) => ({ ...current, hero: { ...current.hero, badge: value } }))} />
              <TextField label="หัวข้อหลัก" value={homepage.hero.title} onChange={(value) => setHomepage((current) => ({ ...current, hero: { ...current.hero, title: value } }))} />
              <TextField label="ข้อความเน้นสี" value={homepage.hero.highlight} onChange={(value) => setHomepage((current) => ({ ...current, hero: { ...current.hero, highlight: value } }))} />
              <TextField label="ข้อความในช่องค้นหา" value={homepage.hero.searchPlaceholder} onChange={(value) => setHomepage((current) => ({ ...current, hero: { ...current.hero, searchPlaceholder: value } }))} />
              <div className="sm:col-span-2"><TextField label="คำอธิบาย" value={homepage.hero.description} textarea onChange={(value) => setHomepage((current) => ({ ...current, hero: { ...current.hero, description: value } }))} /></div>
              <TextField label="ข้อความปุ่มแจ้งปัญหา" value={homepage.hero.primaryButton} onChange={(value) => setHomepage((current) => ({ ...current, hero: { ...current.hero, primaryButton: value } }))} />
              <TextField label="ข้อความปุ่มติดตามเรื่อง" value={homepage.hero.secondaryButton} onChange={(value) => setHomepage((current) => ({ ...current, hero: { ...current.hero, secondaryButton: value } }))} />
              <TextField label="หัวข้อกล่องรับรอง" value={homepage.hero.trackingTitle} onChange={(value) => setHomepage((current) => ({ ...current, hero: { ...current.hero, trackingTitle: value } }))} />
              <TextField label="คำอธิบายกล่องรับรอง" value={homepage.hero.trackingText} onChange={(value) => setHomepage((current) => ({ ...current, hero: { ...current.hero, trackingText: value } }))} />
            </div>
          </EditorCard>

          <EditorCard>
            <BlockHeader title="ทางลัด 4 ช่อง" description="แก้ชื่อและคำอธิบายใต้แบนเนอร์หลัก แต่ละช่องยังเชื่อมกับการทำงานเดิม" />
            <div className="grid gap-4 lg:grid-cols-2">
              {homepage.quickActions.map((item, index) => <div key={index} className="space-y-3 rounded-xl border border-slate-200 p-4"><p className="text-sm font-black text-slate-700">ทางลัดที่ {index + 1}</p><TextField label="ชื่อ" value={item.title} onChange={(value) => setHomepage((current) => ({ ...current, quickActions: current.quickActions.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: value } : entry) as HomepageConfig["quickActions"] }))} /><TextField label="คำอธิบาย" value={item.text} textarea onChange={(value) => setHomepage((current) => ({ ...current, quickActions: current.quickActions.map((entry, itemIndex) => itemIndex === index ? { ...entry, text: value } : entry) as HomepageConfig["quickActions"] }))} /></div>)}
            </div>
          </EditorCard>
        </TabsContent>

        <TabsContent value="services" className="space-y-5">
          <EditorCard>
            <BlockHeader title="รายการบริการประชาชน" description="แก้หัวข้อและชื่อบริการ ส่วนการเปิด–ปิดบริการรายรายการยังจัดการได้ที่เมนูบริการประชาชน" visible={homepage.services.visible} onVisibleChange={(value) => setHomepage((current) => ({ ...current, services: { ...current.services, visible: value } }))} />
            <ImageUploadField site={site} label="ภาพประกอบหัวข้อบริการ" value={homepage.services.imageUrl} altText={homepage.services.imageAlt} onUrlChange={(value) => setHomepage((current) => ({ ...current, services: { ...current.services, imageUrl: value } }))} onAltChange={(value) => setHomepage((current) => ({ ...current, services: { ...current.services, imageAlt: value } }))} recommended="แนวนอน 1200 × 675 พิกเซล" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="ข้อความนำ" value={homepage.services.eyebrow} onChange={(value) => setHomepage((current) => ({ ...current, services: { ...current.services, eyebrow: value } }))} />
              <TextField label="หัวข้อ" value={homepage.services.title} onChange={(value) => setHomepage((current) => ({ ...current, services: { ...current.services, title: value } }))} />
              <div className="sm:col-span-2"><TextField label="คำอธิบาย" value={homepage.services.description} textarea onChange={(value) => setHomepage((current) => ({ ...current, services: { ...current.services, description: value } }))} /></div>
              <TextField label="ป้ายกำกับ" value={homepage.services.badge} onChange={(value) => setHomepage((current) => ({ ...current, services: { ...current.services, badge: value } }))} />
              <TextField label="ข้อความลิงก์บนการ์ด" value={homepage.services.actionText} onChange={(value) => setHomepage((current) => ({ ...current, services: { ...current.services, actionText: value } }))} />
              <TextField label="ข้อความเมื่อค้นหาไม่พบ" value={homepage.services.emptyText} onChange={(value) => setHomepage((current) => ({ ...current, services: { ...current.services, emptyText: value } }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(homepage.services.labels) as Array<keyof HomepageConfig["services"]["labels"]>).map((key) => <TextField key={key} label={`ชื่อบริการ: ${serviceFieldLabels[key]}`} value={homepage.services.labels[key]} onChange={(value) => setHomepage((current) => ({ ...current, services: { ...current.services, labels: { ...current.services.labels, [key]: value } } }))} />)}
            </div>
          </EditorCard>

          <EditorCard>
            <BlockHeader title="ขั้นตอนการใช้บริการ" description="เปิด–ปิดทั้งบล็อก และแก้รายละเอียดทั้ง 3 ขั้นตอน" visible={homepage.process.visible} onVisibleChange={(value) => setHomepage((current) => ({ ...current, process: { ...current.process, visible: value } }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="ป้ายกำกับ" value={homepage.process.badge} onChange={(value) => setHomepage((current) => ({ ...current, process: { ...current.process, badge: value } }))} />
              <TextField label="หัวข้อ" value={homepage.process.title} onChange={(value) => setHomepage((current) => ({ ...current, process: { ...current.process, title: value } }))} />
              <div className="sm:col-span-2"><TextField label="คำอธิบาย" value={homepage.process.description} textarea onChange={(value) => setHomepage((current) => ({ ...current, process: { ...current.process, description: value } }))} /></div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {homepage.process.steps.map((step, index) => <div key={index} className="space-y-3 rounded-xl border border-slate-200 p-4"><p className="text-sm font-black">ขั้นตอนที่ {index + 1}</p><TextField label="หัวข้อ" value={step.title} onChange={(value) => setHomepage((current) => ({ ...current, process: { ...current.process, steps: current.process.steps.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: value } : entry) as HomepageConfig["process"]["steps"] } }))} /><TextField label="คำอธิบาย" value={step.text} textarea onChange={(value) => setHomepage((current) => ({ ...current, process: { ...current.process, steps: current.process.steps.map((entry, itemIndex) => itemIndex === index ? { ...entry, text: value } : entry) as HomepageConfig["process"]["steps"] } }))} /></div>)}
            </div>
          </EditorCard>
        </TabsContent>

        <TabsContent value="content" className="space-y-5">
          <EditorCard>
            <BlockHeader title="ข่าวและประกาศ" description="แก้หัวข้อ แท็บ และข้อความเมื่อยังไม่มีข่าว" visible={homepage.news.visible} onVisibleChange={(value) => setHomepage((current) => ({ ...current, news: { ...current.news, visible: value } }))} />
            <ImageUploadField site={site} label="ภาพประกอบหัวข้อข่าวชุมชน" value={homepage.news.imageUrl} altText={homepage.news.imageAlt} onUrlChange={(value) => setHomepage((current) => ({ ...current, news: { ...current.news, imageUrl: value } }))} onAltChange={(value) => setHomepage((current) => ({ ...current, news: { ...current.news, imageAlt: value } }))} recommended="แนวนอน 1200 × 675 พิกเซล" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {([
                ["eyebrow", "ข้อความนำ"], ["title", "หัวข้อ"], ["allText", "ลิงก์ดูทั้งหมด"],
                ["newsTab", "ชื่อแท็บข่าว"], ["procurementTab", "ชื่อแท็บจัดซื้อ"], ["transparencyTab", "ชื่อแท็บ ITA"],
                ["newsEmpty", "ข้อความเมื่อไม่มีข่าว"], ["procurementEmpty", "ข้อความเมื่อไม่มีจัดซื้อ"], ["transparencyEmpty", "ข้อความเมื่อไม่มี ITA"],
                ["latestBadge", "ป้ายข่าวรายการล่าสุด"], ["cardFallbackText", "คำอธิบายเมื่อข่าวไม่มีบทคัดย่อ"], ["readMoreText", "ข้อความอ่านต่อ"],
              ] as const).map(([key, label]) => <TextField key={key} label={label} value={homepage.news[key]} onChange={(value) => setHomepage((current) => ({ ...current, news: { ...current.news, [key]: value } }))} />)}
              <div className="sm:col-span-2 lg:col-span-3"><TextField label="คำอธิบาย" value={homepage.news.description} textarea onChange={(value) => setHomepage((current) => ({ ...current, news: { ...current.news, description: value } }))} /></div>
              <div className="sm:col-span-2 lg:col-span-3"><TextField label="คำอธิบายเมื่อยังไม่มีรายการ" value={homepage.news.emptyDescription} textarea onChange={(value) => setHomepage((current) => ({ ...current, news: { ...current.news, emptyDescription: value } }))} /></div>
            </div>
          </EditorCard>

          <EditorCard>
            <BlockHeader title="วิสัยทัศน์และจุดเด่นชุมชน" description="ใส่ภาพพื้นหลัง ข้อความวิสัยทัศน์ และจุดเด่น 3 ข้อ" visible={homepage.about.visible} onVisibleChange={(value) => setHomepage((current) => ({ ...current, about: { ...current.about, visible: value } }))} />
            <ImageUploadField site={site} label="ภาพพื้นหลังส่วนวิสัยทัศน์" value={homepage.about.imageUrl} altText={homepage.about.imageAlt} onUrlChange={(value) => setHomepage((current) => ({ ...current, about: { ...current.about, imageUrl: value } }))} onAltChange={(value) => setHomepage((current) => ({ ...current, about: { ...current.about, imageAlt: value } }))} recommended="แนวนอน 1400 × 900 พิกเซล" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="ป้ายกำกับ" value={homepage.about.badge} onChange={(value) => setHomepage((current) => ({ ...current, about: { ...current.about, badge: value } }))} />
              <TextField label="ข้อความพื้นที่เมื่อไม่มีข้อมูล" value={homepage.about.locationFallback} onChange={(value) => setHomepage((current) => ({ ...current, about: { ...current.about, locationFallback: value } }))} />
              <div className="sm:col-span-2"><TextField label="วิสัยทัศน์" value={homepage.about.visionText} textarea onChange={(value) => setHomepage((current) => ({ ...current, about: { ...current.about, visionText: value } }))} /></div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {homepage.about.values.map((item, index) => <div key={index} className="space-y-3 rounded-xl border border-slate-200 p-4"><p className="text-sm font-black">จุดเด่นที่ {index + 1}</p><TextField label="หัวข้อ" value={item.title} onChange={(value) => setHomepage((current) => ({ ...current, about: { ...current.about, values: current.about.values.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: value } : entry) as HomepageConfig["about"]["values"] } }))} /><TextField label="คำอธิบาย" value={item.text} textarea onChange={(value) => setHomepage((current) => ({ ...current, about: { ...current.about, values: current.about.values.map((entry, itemIndex) => itemIndex === index ? { ...entry, text: value } : entry) as HomepageConfig["about"]["values"] } }))} /></div>)}
            </div>
          </EditorCard>

          <EditorCard>
            <BlockHeader title="ข้อมูลเปิดเผยและความโปร่งใส" description="แก้หัวข้อ คำอธิบาย และชื่อทางลัดเอกสาร 4 รายการ" visible={homepage.transparency.visible} onVisibleChange={(value) => setHomepage((current) => ({ ...current, transparency: { ...current.transparency, visible: value } }))} />
            <ImageUploadField site={site} label="ภาพพื้นหลังส่วนข้อมูลโปร่งใส" value={homepage.transparency.imageUrl} altText={homepage.transparency.imageAlt} onUrlChange={(value) => setHomepage((current) => ({ ...current, transparency: { ...current.transparency, imageUrl: value } }))} onAltChange={(value) => setHomepage((current) => ({ ...current, transparency: { ...current.transparency, imageAlt: value } }))} recommended="แนวนอน 1600 × 900 พิกเซล" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="ป้ายกำกับ" value={homepage.transparency.badge} onChange={(value) => setHomepage((current) => ({ ...current, transparency: { ...current.transparency, badge: value } }))} />
              <TextField label="หัวข้อ" value={homepage.transparency.title} onChange={(value) => setHomepage((current) => ({ ...current, transparency: { ...current.transparency, title: value } }))} />
              <div className="sm:col-span-2"><TextField label="คำอธิบาย" value={homepage.transparency.description} textarea onChange={(value) => setHomepage((current) => ({ ...current, transparency: { ...current.transparency, description: value } }))} /></div>
              {homepage.transparency.items.map((item, index) => <TextField key={index} label={`ชื่อทางลัดที่ ${index + 1}`} value={item} onChange={(value) => setHomepage((current) => ({ ...current, transparency: { ...current.transparency, items: current.transparency.items.map((entry, itemIndex) => itemIndex === index ? value : entry) as HomepageConfig["transparency"]["items"] } }))} />)}
            </div>
          </EditorCard>
        </TabsContent>

        <TabsContent value="contact" className="space-y-5">
          <EditorCard>
            <BlockHeader title="ติดต่อและ Google Maps" description="ระบบสร้างแผนที่จริงจากที่อยู่ในเมนูข้อมูลหน่วยงานอัตโนมัติ และแก้ข้อความประกอบได้ที่นี่" visible={homepage.contact.visible} onVisibleChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, visible: value } }))} />
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><strong>เชื่อมต่อ Google Maps แล้ว</strong><br />หากต้องการเปลี่ยนหมุด ให้แก้ “ที่อยู่” ในเมนูข้อมูลหน่วยงาน ระบบจะอัปเดตแผนที่หน้าบ้านให้ทันที</div>
            <details className="rounded-xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-bold text-slate-700">ภาพสำรองเมื่อยังไม่มีที่อยู่</summary><div className="mt-4"><ImageUploadField site={site} label="ภาพสำรองส่วนแผนที่" value={homepage.contact.imageUrl} altText={homepage.contact.imageAlt} onUrlChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, imageUrl: value } }))} onAltChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, imageAlt: value } }))} recommended="แนวนอน 1400 × 900 พิกเซล" /></div></details>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="หัวข้อแผนที่" value={homepage.contact.mapTitle} onChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, mapTitle: value } }))} />
              <TextField label="ข้อความปุ่มแผนที่" value={homepage.contact.mapButton} onChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, mapButton: value } }))} />
              <div className="sm:col-span-2"><TextField label="คำอธิบายแผนที่" value={homepage.contact.mapDescription} textarea onChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, mapDescription: value } }))} /></div>
              <TextField label="ข้อความนำหน้าข้อมูลติดต่อ" value={homepage.contact.eyebrow} onChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, eyebrow: value } }))} />
              <TextField label="ข้อความปุ่มโทร" value={homepage.contact.callButton} onChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, callButton: value } }))} />
              <TextField label="หัวข้อที่อยู่" value={homepage.contact.addressLabel} onChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, addressLabel: value } }))} />
              <TextField label="หัวข้อเบอร์โทร" value={homepage.contact.phoneLabel} onChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, phoneLabel: value } }))} />
              <TextField label="หัวข้ออีเมล" value={homepage.contact.emailLabel} onChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, emailLabel: value } }))} />
              <TextField label="ข้อความเมื่อข้อมูลยังว่าง" value={homepage.contact.missingValueText} onChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, missingValueText: value } }))} />
              <div className="sm:col-span-2"><TextField label="ข้อความเมื่อยังไม่มีพิกัดแผนที่" value={homepage.contact.mapMissingText} onChange={(value) => setHomepage((current) => ({ ...current, contact: { ...current.contact, mapMissingText: value } }))} /></div>
            </div>
          </EditorCard>

          <EditorCard>
            <BlockHeader title="ท้ายเว็บไซต์" description="แก้คำอธิบายและชื่อลิงก์มาตรฐานด้านล่างสุดของหน้า" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><TextField label="คำอธิบายหน่วยงาน" value={homepage.footer.description} textarea onChange={(value) => setHomepage((current) => ({ ...current, footer: { ...current.footer, description: value } }))} /></div>
              {([
                ["privacyLabel", "ลิงก์นโยบายความเป็นส่วนตัว"], ["cookieLabel", "ลิงก์นโยบายคุกกี้"],
                ["sitemapLabel", "ลิงก์แผนผังเว็บไซต์"], ["staffLabel", "ลิงก์สำหรับเจ้าหน้าที่"],
              ] as const).map(([key, label]) => <TextField key={key} label={label} value={homepage.footer[key]} onChange={(value) => setHomepage((current) => ({ ...current, footer: { ...current.footer, [key]: value } }))} />)}
            </div>
          </EditorCard>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 z-10 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <Button onClick={save} disabled={saving} size="lg" className="bg-[#0b5260] hover:bg-[#073f49]">{saving ? <Loader2 className="animate-spin" /> : <Save />}{saving ? "กำลังบันทึก..." : "บันทึกการแก้ไขทั้งหมด"}</Button>
      </div>
    </div>
  );
}
