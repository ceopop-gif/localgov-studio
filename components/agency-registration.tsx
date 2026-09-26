"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Building2, MapPin, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DEFAULT_SECTIONS, SERVICE_OPTIONS } from "@/lib/site-template";
import { parseGoogleAddress } from "@/lib/google-address";
const empty = { name: "", organizationType: "องค์การบริหารส่วนตำบล", slug: "", phone: "", email: "", address: "", subdistrict: "", district: "", province: "", postalCode: "", officerName: "", officerPosition: "", officerPhone: "", latitude: "", longitude: "", username:"", password:"", confirmation:"" };
export function AgencyRegistration({ mapsKey }: { mapsKey: string }) {
  const [form, setForm] = useState(empty);
  const [registered, setRegistered] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mapStatus, setMapStatus] = useState(mapsKey ? "กำลังโหลดแผนที่…" : "แผนที่สำหรับดูตำแหน่ง ขณะนี้ระบบเติมที่อยู่อัตโนมัติยังไม่เปิดใช้งาน กรุณากรอกที่อยู่ด้านล่าง");
  const [query, setQuery] = useState("");
  const [iframeQuery, setIframeQuery] = useState("ประเทศไทย");
  const mapElement = useRef<HTMLDivElement>(null);
  const search = useRef<((q: string) => void) | null>(null);
  const locate = useRef<((p: {lat:number;lng:number}) => void) | null>(null);
  useEffect(() => {
    if (!mapsKey) return;
    let disposed = false;
    let requestId = 0;
    let map: any;
    let marker: any;
    const init = () => {
      if (disposed || !mapElement.current) return;
      const maps = (window as any).google.maps;
      map = new maps.Map(mapElement.current, { center: {lat: 13.7563, lng: 100.5018}, zoom: 6, streetViewControl: false, mapTypeControl: false });
      const geocoder = new maps.Geocoder();
      const apply = async (request: any, point?: {lat:number;lng:number}) => {
        const seq = ++requestId;
        setMapStatus("กำลังค้นหาที่อยู่…");
        if (point) { setForm(f => ({...f, latitude: String(point.lat), longitude: String(point.lng), address:"", province:"", district:"", subdistrict:"", postalCode:""})); if (marker) marker.setPosition(point); else { marker = new maps.Marker({map, position:point, draggable:true}); marker.addListener("dragend", (e:any) => apply({location:e.latLng}, e.latLng.toJSON())); } }
        try {
          const response = await geocoder.geocode(request);
          if (disposed || seq !== requestId) return;
          const result = response.results.find((r:any) => r.address_components.some((c:any) => c.types.includes("country") && c.short_name === "TH"));
          if (!result) throw new Error("ไม่พบที่อยู่ในประเทศไทย กรุณาเลือกตำแหน่งใหม่");
          const p = point || result.geometry.location.toJSON();
          if (marker) marker.setPosition(p); else { marker = new maps.Marker({map, position:p, draggable:true}); marker.addListener("dragend", (e:any) => apply({location:e.latLng}, e.latLng.toJSON())); }
          map.panTo(p); if (!point) map.setZoom(17);
          setForm(f => ({...f, ...parseGoogleAddress(result.address_components), address: result.formatted_address, latitude:String(p.lat), longitude:String(p.lng)}));
          setMapStatus("เลือกตำแหน่งแล้ว กรุณาตรวจสอบที่อยู่และเติมช่องที่ยังว่างให้ครบ");
        } catch { if (!disposed && seq === requestId) setMapStatus("ค้นหาที่อยู่ไม่สำเร็จ กรุณาลองใหม่ หรือกรอกที่อยู่ด้วยตนเอง"); }
      };
      map.addListener("click", (e:any) => { if (e.latLng) void apply({location:e.latLng}, e.latLng.toJSON()); });
      search.current = q => { if(q.trim()) void apply({address:q, componentRestrictions:{country:"TH"}}); };
      locate.current = p => { map.setZoom(17); void apply({location:p},p); };
      setMapStatus("ค้นหาสำนักงาน หรือแตะบนแผนที่เพื่อปักหมุด สามารถลากหมุดเพื่อปรับตำแหน่งได้");
    };
    const w = window as any;
    const oldFailure = w.gm_authFailure;
    w.gm_authFailure = () => setMapStatus("ไม่สามารถเชื่อมต่อแผนที่ได้ กรุณากรอกที่อยู่ด้วยตนเอง");
    let script: HTMLScriptElement | undefined;
    if (w.google?.maps) init(); else { script = document.createElement("script"); script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey)}&language=th&region=TH`; script.async = true; script.onload=init; script.onerror=() => setMapStatus("โหลดแผนที่ไม่สำเร็จ กรุณากรอกที่อยู่ด้วยตนเอง"); document.head.appendChild(script); }
    return () => { disposed=true; requestId++; search.current=null; locate.current=null; if(map) w.google.maps.event.clearInstanceListeners(map); if(marker) {w.google.maps.event.clearInstanceListeners(marker);marker.setMap(null);} script?.remove(); w.gm_authFailure=oldFailure; };
  }, [mapsKey]);
  function field(key: keyof typeof empty, title: string, type="text", required=true) {
    return <div className="space-y-2"><Label htmlFor={key}>{title}{required ? " *" : ""}</Label><Input id={key} name={key} type={type} value={form[key]} required={required} autoComplete={type === "password" ? "new-password" : undefined} minLength={type === "password" ? 12 : key === "slug" || key === "username" ? 3 : undefined} maxLength={type === "password" ? 72 : key === "username" ? 40 : key === "address" ? 500 : key === "postalCode" ? 5 : key === "slug" ? 60 : 160} pattern={key === "username" ? "[a-z][a-z0-9._-]{2,39}" : key === "postalCode" ? "[0-9]{5}" : key === "slug" ? "[a-z][a-z0-9]*(?:-[a-z0-9]+)*" : undefined} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} className="h-12 bg-white text-base" /></div>;
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage("");
    if (!consent) {setMessage("กรุณารับรองข้อมูลก่อนดำเนินการ");return;}
    if(form.password!==form.confirmation){setMessage("รหัสผ่านทั้งสองช่องไม่ตรงกัน");return;}
    setBusy(true);
    try {
      const {postalCode,officerName,officerPosition,officerPhone,latitude,longitude,username,password,confirmation,...agency} = form;
      const response = await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({site:{...agency,services:SERVICE_OPTIONS.map(s=>s.id),sections:DEFAULT_SECTIONS,registration:{postalCode,officerName,officerPosition,officerPhone,latitude,longitude,consent:true}},username,password,contactName:officerName,consent:true})});
      const body = await response.json();
      if (!response.ok || !body.site?.id) throw new Error(body.error || "ลงทะเบียนไม่สำเร็จ");
      setForm(f=>({...f,password:"",confirmation:""}));setRegistered(true);setBusy(false);
    } catch(e) {setMessage(e instanceof Error ? e.message : "ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่");setBusy(false);}
  }
  if(registered)return <main className="flex min-h-svh items-center justify-center bg-slate-50 p-5"><section className="max-w-lg rounded-2xl border bg-white p-8"><CheckCircle2 className="size-12 text-emerald-600"/><h1 className="mt-5 text-2xl font-bold">รับคำขอลงทะเบียนแล้ว</h1><p className="mt-4 leading-7 text-slate-600">{form.name} กำลังรอผู้ดูแลส่วนกลางอนุมัติ หลังอนุมัติแล้ว เข้าหลังบ้านด้วย Username และ Password ที่ตั้งไว้ได้ที่ /website</p><Button asChild className="mt-6"><Link href="/website">ไปหน้าเข้าสู่ระบบ</Link></Button></section></main>;
  return <div className="min-h-screen bg-[#f1f4f8] text-slate-800">
    <header className="border-b-4 border-[#b39755] bg-[#18364f] text-white"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5"><Link href="/" className="flex items-center gap-3"><Building2 className="size-8"/><span className="text-lg font-bold">WebLocalGov<span className="block text-sm font-normal text-slate-200">ระบบเว็บไซต์องค์กรปกครองส่วนท้องถิ่น</span></span></Link><Link href="/" className="flex items-center gap-1 text-sm"><ArrowLeft className="size-4"/>หน้าแรก</Link></div></header>
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12"><p className="text-sm font-semibold text-[#786231]">สำหรับเจ้าหน้าที่ผู้รับผิดชอบเว็บไซต์ของหน่วยงาน</p><h1 className="mt-2 text-3xl font-bold leading-snug">แบบฟอร์มลงทะเบียนหน่วยงาน</h1><p className="mt-3 leading-7 text-slate-600">กรอกข้อมูลหน่วยงาน ผู้ประสานงาน และที่ตั้งสำนักงาน พร้อมตั้งบัญชีเจ้าหน้าที่เพื่อส่งคำขออนุมัติ หลังอนุมัติเข้าสู่ระบบที่ /website</p><p className="mt-2 text-sm text-slate-500">ช่องที่มีเครื่องหมาย * จำเป็นต้องกรอก</p>
    <form onSubmit={submit} className="mt-7 space-y-6"><fieldset disabled={busy} className="space-y-6">
    <section className="rounded-lg border bg-white p-5 sm:p-8"><h2 className="mb-6 border-b pb-4 text-xl font-bold text-[#18364f]">1. ข้อมูลหน่วยงาน</h2><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="orgtype">ประเภทหน่วยงาน *</Label><Select value={form.organizationType} onValueChange={v=>setForm(f=>({...f,organizationType:v}))}><SelectTrigger id="orgtype" className="h-12 w-full"><SelectValue/></SelectTrigger><SelectContent>{["องค์การบริหารส่วนตำบล","เทศบาลตำบล","เทศบาลเมือง","เทศบาลนคร"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>{field("name","ชื่อหน่วยงานเต็ม")}{field("phone","โทรศัพท์สำนักงาน","tel")}{field("email","อีเมลหน่วยงาน","email")}<div>{field("slug","ชื่อเว็บไซต์ (ภาษาอังกฤษ)")}<p className="mt-2 text-sm text-slate-500">ใช้อักษรอังกฤษตัวเล็ก ตัวเลข และขีดกลาง อย่างน้อย 3 ตัว เช่น tambon-name</p></div></div></section>
    <section className="rounded-lg border bg-white p-5 sm:p-8"><h2 className="mb-6 border-b pb-4 text-xl font-bold text-[#18364f]">2. เจ้าหน้าที่ผู้ประสานงาน</h2><div className="grid gap-5 sm:grid-cols-2">{field("officerName","ชื่อ–นามสกุล")}{field("officerPosition","ตำแหน่ง / สำนัก / กอง")}{field("officerPhone","โทรศัพท์ผู้ประสานงาน","tel")}</div><p className="mt-4 text-sm text-slate-500">ข้อมูลผู้ประสานงานใช้สำหรับการลงทะเบียน ไม่แสดงบนหน้าเว็บไซต์สาธารณะ</p></section>
    <section className="rounded-lg border bg-white p-5 sm:p-8"><h2 className="mb-5 flex items-center gap-2 border-b pb-4 text-xl font-bold text-[#18364f]"><MapPin className="size-5"/>3. ที่ตั้งสำนักงาน</h2><Label htmlFor="map-search">ค้นหาชื่อสำนักงานหรือสถานที่</Label><div className="mt-2 flex gap-2"><Input id="map-search" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(mapsKey)search.current?.(query);else setIframeQuery(query || "ประเทศไทย");}}} placeholder="ระบุชื่อ อบต. หรือเทศบาล และจังหวัด" className="h-12 min-w-0 text-base"/><Button type="button" className="h-12" onClick={()=>{if(mapsKey) search.current?.(query);else setIframeQuery(query || "ประเทศไทย");}}>ค้นหา</Button></div><p role="status" className="my-3 text-sm leading-6 text-slate-600">{mapStatus}</p>{mapsKey ? <div ref={mapElement} className="h-[360px] w-full rounded-lg border bg-slate-100" aria-label="Google Maps สำหรับปักหมุดสำนักงาน"/> : <iframe title="แผนที่ Google Maps ที่ตั้งสำนักงาน" src={`https://www.google.com/maps?q=${encodeURIComponent(iframeQuery)}&output=embed`} className="h-[360px] w-full rounded-lg border" loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>}
    <Button type="button" variant="outline" className="my-4" onClick={()=>{if(!navigator.geolocation){setMapStatus("อุปกรณ์ไม่รองรับตำแหน่งปัจจุบัน");return;}navigator.geolocation.getCurrentPosition(p=>{const point={lat:p.coords.latitude,lng:p.coords.longitude};if(locate.current)locate.current(point);else{setForm(f=>({...f,latitude:String(point.lat),longitude:String(point.lng)}));setIframeQuery(`${point.lat},${point.lng}`);setMapStatus("บันทึกพิกัดปัจจุบันแล้ว กรุณากรอกและตรวจสอบที่อยู่สำนักงาน");}},()=>setMapStatus("ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาค้นหาสถานที่หรือกรอกที่อยู่"),{timeout:10000});}}>ใช้ตำแหน่งปัจจุบัน</Button>
    <div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2">{field("address","ที่อยู่สำนักงาน / เลขที่ / หมู่ / ถนน")}</div>{field("subdistrict","ตำบล / แขวง")}{field("district","อำเภอ / เขต")}{field("province","จังหวัด")}{field("postalCode","รหัสไปรษณีย์")}</div>{form.latitude && <p className="mt-4 break-all text-sm text-slate-500">พิกัดที่เลือก: {form.latitude}, {form.longitude}</p>}</section>
    <section className="rounded-lg border bg-white p-5 sm:p-8"><h2 className="mb-5 border-b pb-4 text-xl font-bold text-[#18364f]">4. บัญชีเข้าสู่ระบบ</h2><div className="grid gap-5 sm:grid-cols-2">{field("username","Username")}{field("password","Password","password")}{field("confirmation","ยืนยัน Password","password")}</div><p className="mt-4 text-sm leading-6 text-slate-500">Username ใช้ภาษาอังกฤษตัวเล็ก 3–40 ตัวอักษร และ Password อย่างน้อย 12 ตัวอักษร</p></section>
    <div className="rounded-lg border bg-white p-5 sm:p-8"><label className="flex items-start gap-3 text-base leading-7"><Checkbox checked={consent} onCheckedChange={v=>setConsent(v===true)} className="mt-1"/><span>ข้าพเจ้ารับรองว่าข้อมูลถูกต้อง เป็นผู้ได้รับมอบหมายจากหน่วยงาน และรับทราบว่าข้อมูลนี้ใช้เพื่อสร้างเว็บไซต์และติดต่อประสานงาน</span></label><p className="mt-4 text-sm leading-6 text-slate-600">บัญชีจะเข้าใช้งานได้หลังจากผู้ดูแลส่วนกลางอนุมัติแล้ว</p>{message && <p role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">{message}</p>}<Button type="submit" disabled={busy} className="mt-6 min-h-12 w-full bg-[#18364f] text-base hover:bg-[#244d6d] sm:w-auto">{busy ? <Loader2 className="animate-spin"/> : <CheckCircle2/>}{busy ? "กำลังลงทะเบียน…" : "ส่งคำขอลงทะเบียน"}</Button></div>
    </fieldset></form></main></div>;
}
