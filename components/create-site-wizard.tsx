"use client";
import { useState, type FormEvent } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Loader2,
  ExternalLink,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createSiteSchema } from "@/lib/validators";
import {
  DEFAULT_SECTIONS,
  SECTION_OPTIONS,
  SERVICE_OPTIONS,
  templateOptions,
} from "@/lib/site-template";
import type { SiteRecord } from "@/lib/models";

const palettes = [
  { name: "กรมท่า / ทอง", primary: "#0B5260", secondary: "#E4B949" },
  { name: "น้ำเงิน / ฟ้า", primary: "#174A7E", secondary: "#5DB7D6" },
  { name: "เขียว / ทอง", primary: "#286044", secondary: "#D5A62B" },
];
function initialForm(source?: SiteRecord) {
  return {
    name: "",
    englishName: "",
    slug: "",
    organizationType: "องค์การบริหารส่วนตำบล",
    province: "",
    district: "",
    subdistrict: "",
    address: "",
    phone: "",
    email: "",
    vision: "",
    logoUrl: "",
    primaryColor: source?.primaryColor ?? palettes[0].primary,
    secondaryColor: source?.secondaryColor ?? palettes[0].secondary,
    ...templateOptions(source),
  };
}
export function SiteBlueprint({
  name,
  primary,
  secondary,
  sections = DEFAULT_SECTIONS,
}: {
  name: string;
  primary: string;
  secondary: string;
  sections?: typeof DEFAULT_SECTIONS;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-label="ตัวอย่างโครงสร้างเว็บไซต์"
    >
      <div
        className="flex items-center gap-1.5 border-b bg-slate-50 px-4 py-3"
        aria-hidden="true"
      >
        <span className="size-2 rounded-full bg-slate-300" />
        <span className="size-2 rounded-full bg-slate-300" />
        <span className="size-2 rounded-full bg-slate-300" />
        <span className="ml-2 text-xs text-slate-500">ตัวอย่างหน้าบ้าน</span>
      </div>
      <div className="flex items-center gap-2 border-b p-4">
        <Building2 className="size-6 shrink-0" style={{ color: primary }} />
        <span className="truncate text-sm font-bold">
          {name || "ชื่อหน่วยงานของคุณ"}
        </span>
      </div>
      <div className="px-5 py-7 text-white" style={{ background: primary }}>
        <p className="text-sm opacity-85">บริการประชาชนออนไลน์</p>
        <p className="mt-2 text-xl font-bold">แจ้งเรื่องง่าย ติดตามได้</p>
        <div
          className="mt-4 inline-block rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
          style={{ background: secondary }}
        >
          แจ้งปัญหา / เช็กสถานะ
        </div>
      </div>
      <div className="space-y-2 p-4">
        {SECTION_OPTIONS.filter((x) => sections[x.id]).map((x) => (
          <div
            key={x.id}
            className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm"
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: primary }}
            />
            {x.label}
          </div>
        ))}
      </div>
    </div>
  );
}
export function CreateSiteWizard({
  sites,
  source,
  open,
  onClose,
  onCreated,
}: {
  sites: SiteRecord[];
  source?: SiteRecord;
  open: boolean;
  onClose: () => void;
  onCreated: (site: SiteRecord) => void;
}) {
  const [sourceId, setSourceId] = useState(source?.id ?? "standard");
  const [form, setForm] = useState(() => initialForm(source));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<SiteRecord | null>(null);
  const [slugState, setSlugState] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");
  const selectedSource = sites.find((x) => x.id === sourceId);
  function textField(key: keyof ReturnType<typeof initialForm>, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "slug") setSlugState("idle");
  }
  function chooseSource(id: string) {
    setSourceId(id);
    const site = sites.find((x) => x.id === id);
    setForm((current) => ({
      ...current,
      ...templateOptions(site),
      primaryColor: site?.primaryColor ?? palettes[0].primary,
      secondaryColor: site?.secondaryColor ?? palettes[0].secondary,
    }));
  }
  async function checkSlug() {
    if (!createSiteSchema.shape.slug.safeParse(form.slug).success) {
      setSlugState("taken");
      return false;
    }
    setSlugState("checking");
    try {
      const response = await fetch(
        `/api/sites/availability?${new URLSearchParams({ slug: form.slug })}`,
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setSlugState(body.available ? "available" : "taken");
      return Boolean(body.available);
    } catch {
      setSlugState("error");
      return false;
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step === 0) {
      setStep(1);
      return;
    }
    const payload = {
      ...form,
      ...(sourceId !== "standard" ? { sourceSiteId: sourceId } : {}),
    };
    const valid = createSiteSchema.safeParse(payload);
    if (!valid.success) {
      setError("ตรวจชื่อหน่วยงาน URL อีเมล และรูปแบบข้อมูลอีกครั้ง");
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      if (step === 1) {
        if (await checkSlug()) setStep(2);
        else setError("กรุณาตรวจสอบหรือเปลี่ยนชื่อ URL ก่อนดำเนินการต่อ");
        return;
      }
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(valid.data),
      });
      const body = await response.json();
      if (!response.ok || !body.site)
        throw new Error(body.error || "สร้างเว็บไซต์ไม่สำเร็จ");
      setCreated(body.site);
      onCreated(body.site);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "สร้างเว็บไซต์ไม่สำเร็จ กรุณาลองใหม่",
      );
    } finally {
      setBusy(false);
    }
  }
  const input = (
    key:
      | "name"
      | "englishName"
      | "slug"
      | "province"
      | "district"
      | "subdistrict"
      | "address"
      | "phone"
      | "email"
      | "logoUrl",
    label: string,
    options: {
      required?: boolean;
      placeholder?: string;
      type?: string;
      wide?: boolean;
    } = {},
  ) => (
    <div
      className={`space-y-2 ${options.wide ? "sm:col-span-2" : ""}`}
      key={key}
    >
      <Label htmlFor={`create-${key}`}>
        {label}
        {options.required ? " *" : ""}
      </Label>
      <Input
        id={`create-${key}`}
        value={String(form[key])}
        onChange={(e) =>
          textField(
            key,
            key === "slug" ? e.target.value.toLowerCase() : e.target.value,
          )
        }
        required={options.required}
        placeholder={options.placeholder}
        type={options.type ?? "text"}
        maxLength={
          key === "slug"
            ? 60
            : key === "address"
              ? 500
              : key === "logoUrl"
                ? 600
                : 160
        }
        className="h-11 text-base"
      />
    </div>
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[94svh] overflow-y-auto p-0 sm:max-w-5xl"
        onInteractOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader className="border-b px-5 py-5 sm:px-7">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Layers3 className="size-5 text-[#0b5260]" />
            สร้างเว็บไซต์จากต้นฉบับ
          </DialogTitle>
          <DialogDescription>
            ตั้งค่าเว็บใหม่ แล้วปรับเนื้อหาต่อในหลังบ้านของหน่วยงาน
          </DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="px-6 py-8 sm:px-10">
            <CheckCircle2 className="size-12 text-emerald-600" />
            <h2 className="mt-4 text-2xl font-bold">
              สร้าง {created.name} แล้ว
            </h2>
            <p className="mt-2 leading-7 text-slate-600">
              เว็บไซต์อยู่ในสถานะฉบับร่าง คุณสามารถเพิ่มโลโก้ ข่าว เอกสาร
              และตรวจข้อมูลก่อนกดเผยแพร่
            </p>
            <div className="mt-5 rounded-xl border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">ที่อยู่เว็บไซต์</p>
              <p className="mt-1 break-all font-medium">/site/{created.slug}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="h-11">
                <a href={`/admin/${created.id}`}>
                  เปิดหลังบ้านเว็บใหม่ <ChevronRight />
                </a>
              </Button>
              <Button asChild variant="outline" className="h-11">
                <a
                  href={`/site/${created.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  ดูตัวอย่าง <ExternalLink />
                </a>
              </Button>
              <Button variant="ghost" className="h-11" onClick={onClose}>
                กลับรายการเว็บไซต์
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <ol className="grid grid-cols-3 gap-2 border-b bg-slate-50 px-4 py-4 sm:px-7">
              {["เลือกต้นฉบับ", "ข้อมูลหน่วยงาน", "ตรวจสอบและสร้าง"].map(
                (label, index) => (
                  <li
                    key={label}
                    aria-current={step === index ? "step" : undefined}
                    className={`flex flex-col items-center gap-2 text-center text-sm sm:flex-row sm:text-left ${step === index ? "font-bold text-[#0b5260]" : "text-slate-500"}`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${step >= index ? "bg-[#0b5260] text-white" : "bg-slate-200"}`}
                    >
                      {step > index ? <Check className="size-4" /> : index + 1}
                    </span>
                    {label}
                  </li>
                ),
              )}
            </ol>
            <fieldset
              disabled={busy}
              className="grid gap-7 p-5 disabled:opacity-70 sm:p-7 lg:grid-cols-[1fr_290px]"
            >
              <div className="min-w-0 space-y-6">
                {step === 0 && (
                  <>
                    <div className="space-y-3">
                      <Label htmlFor="source-site">ต้นฉบับเว็บไซต์</Label>
                      <Select value={sourceId} onValueChange={chooseSource}>
                        <SelectTrigger id="source-site" className="h-12 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">
                            ต้นฉบับมาตรฐาน อบต. / เทศบาล
                          </SelectItem>
                          {sites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm leading-6 text-slate-500">
                        ใช้รูปแบบ สี ภาพประกอบ และบริการจากต้นฉบับ
                        ข้อมูลหน่วยงาน ข่าว คำร้อง
                        และบัญชีเจ้าหน้าที่จะเริ่มแยกใหม่
                      </p>
                    </div>
                    <fieldset className="space-y-3">
                      <legend className="text-sm font-semibold">ชุดสี</legend>
                      <RadioGroup
                        value={
                          palettes.find(
                            (x) =>
                              x.primary === form.primaryColor &&
                              x.secondary === form.secondaryColor,
                          )?.name ?? "custom"
                        }
                        onValueChange={(name) => {
                          const palette = palettes.find((x) => x.name === name);
                          if (palette)
                            setForm((current) => ({
                              ...current,
                              primaryColor: palette.primary,
                              secondaryColor: palette.secondary,
                            }));
                        }}
                        className="grid gap-2 sm:grid-cols-3"
                      >
                        {palettes.map((p) => (
                          <label
                            key={p.name}
                            className="flex cursor-pointer items-center gap-2 rounded-xl border p-3"
                          >
                            <RadioGroupItem value={p.name} />
                            <span
                              className="size-4 rounded-full"
                              style={{ background: p.primary }}
                            />
                            <span className="text-sm">{p.name}</span>
                          </label>
                        ))}
                      </RadioGroup>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ["primaryColor", "สีหลัก"],
                          ["secondaryColor", "สีรอง"],
                        ].map(([key, label]) => (
                          <div
                            className="flex items-center gap-2 rounded-xl border px-3 py-2"
                            key={key}
                          >
                            <input
                              id={key}
                              type="color"
                              value={
                                form[key as "primaryColor" | "secondaryColor"]
                              }
                              onChange={(e) =>
                                textField(
                                  key as "primaryColor" | "secondaryColor",
                                  e.target.value,
                                )
                              }
                              className="size-9 cursor-pointer rounded border-0 p-0"
                            />
                            <label htmlFor={key} className="text-sm">
                              {label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset className="space-y-3">
                      <legend className="text-sm font-semibold">
                        ส่วนที่แสดงในหน้าแรก
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {SECTION_OPTIONS.map((item) => (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm"
                          >
                            <Checkbox
                              checked={form.sections[item.id]}
                              onCheckedChange={(value) =>
                                setForm((current) => ({
                                  ...current,
                                  sections: {
                                    ...current.sections,
                                    [item.id]: value === true,
                                  },
                                }))
                              }
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </>
                )}
                {step === 1 && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {input("name", "ชื่อหน่วยงาน", {
                        required: true,
                        wide: true,
                        placeholder: "องค์การบริหารส่วนตำบล...",
                      })}
                      <div className="space-y-2">
                        <Label htmlFor="create-type">ประเภทหน่วยงาน *</Label>
                        <Select
                          value={form.organizationType}
                          onValueChange={(value) =>
                            textField("organizationType", value)
                          }
                        >
                          <SelectTrigger
                            id="create-type"
                            className="h-11 w-full"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "องค์การบริหารส่วนตำบล",
                              "เทศบาลตำบล",
                              "เทศบาลเมือง",
                              "เทศบาลนคร",
                            ].map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {input("englishName", "ชื่อภาษาอังกฤษ")}
                      {input("province", "จังหวัด", { required: true })}
                      {input("district", "อำเภอ", { required: true })}
                      {input("subdistrict", "ตำบล", { required: true })}
                      {input("slug", "ชื่อ URL ภาษาอังกฤษ", {
                        required: true,
                        placeholder: "เช่น tambon-name",
                      })}
                      <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
                        <p className="break-all text-sm text-slate-500">
                          /site/{form.slug || "ชื่อ-url"}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={checkSlug}
                          disabled={slugState === "checking"}
                        >
                          {slugState === "checking" ? (
                            <Loader2 className="animate-spin" />
                          ) : null}
                          ตรวจ URL
                        </Button>
                        <p
                          className={`w-full text-sm ${slugState === "available" ? "text-emerald-700" : "text-rose-700"}`}
                          aria-live="polite"
                        >
                          {slugState === "available"
                            ? "URL นี้พร้อมใช้งาน"
                            : slugState === "taken"
                              ? "URL นี้ถูกใช้แล้วหรือรูปแบบไม่ถูกต้อง"
                              : slugState === "error"
                                ? "ตรวจสอบไม่สำเร็จ กรุณาลองใหม่"
                                : ""}
                        </p>
                      </div>
                      {input("address", "ที่อยู่", { wide: true })}
                      {input("phone", "โทรศัพท์", { type: "tel" })}
                      {input("email", "อีเมล", { type: "email" })}
                      {input("logoUrl", "ลิงก์รูปตราสัญลักษณ์", {
                        wide: true,
                        placeholder: "https://... (เพิ่มภายหลังได้)",
                      })}
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="create-vision">วิสัยทัศน์</Label>
                        <Textarea
                          id="create-vision"
                          value={form.vision}
                          onChange={(e) => textField("vision", e.target.value)}
                          maxLength={1000}
                          rows={3}
                          placeholder="กรอกข้อความที่หน่วยงานรับรอง หรือเว้นไว้เพิ่มภายหลัง"
                        />
                      </div>
                    </div>
                    <fieldset className="space-y-3">
                      <legend className="text-sm font-semibold">
                        บริการที่เปิดรับคำร้อง
                      </legend>
                      <div className="grid grid-cols-2 gap-3">
                        {SERVICE_OPTIONS.map((item) => (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={form.services.includes(item.id)}
                              onCheckedChange={(value) =>
                                setForm((current) => ({
                                  ...current,
                                  services:
                                    value === true
                                      ? [...current.services, item.id]
                                      : current.services.filter(
                                          (id) => id !== item.id,
                                        ),
                                }))
                              }
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </>
                )}
                {step === 2 && (
                  <>
                    <h2 className="text-xl font-bold">ตรวจข้อมูลก่อนสร้าง</h2>
                    <dl className="divide-y rounded-xl border px-4">
                      {[
                        ["ชื่อหน่วยงาน", form.name],
                        ["ประเภท", form.organizationType],
                        [
                          "พื้นที่",
                          `${form.subdistrict} / ${form.district} / ${form.province}`,
                        ],
                        [
                          "ต้นฉบับ",
                          selectedSource?.name ?? "มาตรฐาน อบต. / เทศบาล",
                        ],
                        ["ที่อยู่เว็บ", `/site/${form.slug}`],
                        ["บริการรับคำร้อง", `${form.services.length} บริการ`],
                        [
                          "สถานะเริ่มต้น",
                          "ฉบับร่าง — เฉพาะผู้ดูแลดูตัวอย่างได้",
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="grid gap-1 py-3 sm:grid-cols-[130px_1fr]"
                        >
                          <dt className="text-sm text-slate-500">{label}</dt>
                          <dd className="break-words text-sm font-medium">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="rounded-xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                      บัญชีที่ใช้อยู่จะเป็นเจ้าของเว็บไซต์ใหม่
                      พร้อมหลังบ้านสำหรับแก้หน้าแรก ข่าว เอกสาร และคำร้อง
                      การแก้เว็บใหม่นี้จะไม่เปลี่ยนต้นฉบับ
                    </p>
                  </>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription role="alert">{error}</AlertDescription>
                  </Alert>
                )}
              </div>
              <aside className="hidden space-y-3 lg:block">
                <SiteBlueprint
                  name={form.name}
                  primary={form.primaryColor}
                  secondary={form.secondaryColor}
                  sections={form.sections}
                />
                <p className="text-sm leading-6 text-slate-500">
                  ตัวอย่างโครงสร้าง ข่าวและเอกสารจริงเพิ่มได้หลังสร้างเว็บไซต์
                </p>
              </aside>
            </fieldset>
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-white px-5 py-4 sm:px-7">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setError("");
                  if (step > 0) setStep(step - 1);
                  else onClose();
                }}
              >
                <ChevronLeft />
                {step === 0 ? "ยกเลิก" : "ย้อนกลับ"}
              </Button>
              <Button type="submit" className="min-h-11" disabled={busy}>
                {busy ? (
                  <Loader2 className="animate-spin" />
                ) : step === 2 ? (
                  <Layers3 />
                ) : null}
                {busy
                  ? "กำลังดำเนินการ..."
                  : step === 2
                    ? "สร้างเว็บไซต์ฉบับร่าง"
                    : "ถัดไป"}
                {!busy && step < 2 ? <ChevronRight /> : null}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
