"use client";
import {useEffect,useState,type FormEvent} from 'react';
import {Building2,Plus,Search,ExternalLink,CheckCircle2,Clock3,LogOut,Loader2,Settings2,CalendarDays,PauseCircle,RotateCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {Card,CardContent} from '@/components/ui/card';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {AgencyRegistrationForm} from '@/components/agency-registration-form';
import type {AgencyRegistration} from '@/lib/platform';
import {MASTER_TEMPLATE_SITE_ID} from '@/lib/template-identity';
import {ACCESS_LABELS,formatServiceDate,twoYearExpiry} from '@/lib/agency-term';
import {toast} from 'sonner';
import {Toaster} from '@/components/ui/sonner';

type ReviewStatus = 'approved'|'rejected'|'suspended';
export function PlatformConsole({initialAgencies,userName,startCreating=false}:{initialAgencies:AgencyRegistration[];userName:string;startCreating?:boolean}){
 const[agencies,setAgencies]=useState(initialAgencies);
 const[query,setQuery]=useState('');const[filter,setFilter]=useState('all');
 const[creating,setCreating]=useState(startCreating);
 const[editing,setEditing]=useState<AgencyRegistration|null>(null);
 const[reviewStatus,setReviewStatus]=useState<ReviewStatus>('approved');
 const[startOn,setStartOn]=useState('');const[busy,setBusy]=useState(false);
 async function refresh(){const res=await fetch('/api/platform/agencies',{cache:'no-store'});const data=await res.json();if(!res.ok)throw new Error(data.error);setAgencies(data.agencies);}
 useEffect(()=>{const timer=window.setInterval(()=>{void refresh().catch(()=>{});},60000);return()=>window.clearInterval(timer);},[]);
 function openReview(agency:AgencyRegistration,status?:ReviewStatus){setEditing(agency);setStartOn(agency.startOn||'');setReviewStatus(status??(agency.approvalStatus==='pending'?'approved':agency.approvalStatus));}
 async function review(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!editing)return;const form=new FormData(e.currentTarget);setBusy(true);
  try{
   const password=String(form.get('password')||'');const username=String(form.get('username')||'').trim();
   const res=await fetch(`/api/platform/agencies/${editing.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:reviewStatus,domainLabel:form.get('domainLabel'),...(startOn?{startOn}:{}),...(username&&username!==editing.username?{username}:{}),...(password?{password}:{})})});
   const body=await res.json();if(!res.ok)throw new Error(body.error);await refresh();setEditing(null);
   toast.success(reviewStatus==='suspended'?'หยุดใช้งานหน่วยงานแล้ว':'บันทึกสถานะและระยะเวลาใช้งานแล้ว');
  }catch(e){toast.error(e instanceof Error?e.message:'บันทึกไม่สำเร็จ');}finally{setBusy(false);}
 }
 async function logout(){await fetch('/api/auth/local/logout',{method:'POST'});window.location.assign('/admin/login');}
 const access=(a:AgencyRegistration)=>a.accessStatus||(a.approvalStatus==='approved'?'awaiting_start':a.approvalStatus);
 const visible=agencies.filter(a=>(filter==='all'||(filter==='approved'?a.approvalStatus==='approved':access(a)===filter))&&`${a.name} ${a.slug} ${a.username} ${a.province}`.toLowerCase().includes(query.toLowerCase()));
 return <main className="min-h-svh bg-slate-50">
  <header className="bg-[#0b1f36] px-4 py-5 text-white sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><a href="/" className="flex items-center gap-3 text-xl font-bold"><Building2 className="size-7 text-amber-300"/> WebLocalGov <span className="hidden text-sm font-normal text-slate-300 sm:inline">หลังบ้านใหญ่</span></a><div className="flex items-center gap-3"><span className="text-sm text-slate-300">{userName}</span><Button variant="ghost" onClick={logout} aria-label="ออกจากระบบ"><LogOut/></Button></div></div></header>
  <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8">
   <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-cyan-800">ศูนย์บริหารหน่วยงาน</p><h1 className="mt-2 text-3xl font-bold">เว็บไซต์ของทุกชุมชน</h1><p className="mt-2 text-slate-600">อนุมัติ หยุดใช้งาน และกำหนดอายุเว็บไซต์ 2 ปีนับจากวันส่งงาน</p></div><Button className="h-11" onClick={()=>setCreating(true)}><Plus/>เพิ่มหน่วยงาน</Button></div>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
    {label:'หน่วยงานทั้งหมด',value:agencies.length,icon:Building2},
    {label:'รออนุมัติ',value:agencies.filter(a=>a.approvalStatus==='pending').length,icon:Clock3},
    {label:'ใช้งานอยู่',value:agencies.filter(a=>access(a)==='active').length,icon:CheckCircle2},
    {label:'หยุดใช้งาน / หมดอายุ',value:agencies.filter(a=>['suspended','expired'].includes(access(a))).length,icon:PauseCircle},
   ].map(x=><Card key={x.label}><CardContent className="flex items-center justify-between"><div><p className="text-sm text-slate-600">{x.label}</p><p className="mt-2 text-3xl font-bold">{x.value}</p></div><x.icon className="size-8 text-cyan-800"/></CardContent></Card>)}</div>
   <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 size-5 text-slate-400"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาหน่วยงาน ชื่อเว็บไซต์ หรือชื่อผู้ใช้" className="h-11 bg-white pl-10"/></div><Select value={filter} onValueChange={setFilter}><SelectTrigger className="h-11 w-full bg-white sm:w-52"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">ทุกสถานะ</SelectItem>{Object.entries(ACCESS_LABELS).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select><Button variant="outline" className="h-11" onClick={()=>{void refresh().catch(()=>toast.error('โหลดรายการไม่สำเร็จ'));}}><RotateCw/>รีเฟรช</Button></div>
   <div className="space-y-4">{visible.map(a=><Card key={a.id} className="py-5"><CardContent className="space-y-4">
    <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-bold">{a.name}</h2>{a.id===MASTER_TEMPLATE_SITE_ID&&<Badge className="bg-cyan-900 text-white">ต้นฉบับเว็บไซต์</Badge>}<Badge variant="outline" className={access(a)==='active'?'bg-emerald-50 text-emerald-800':['suspended','expired','rejected'].includes(access(a))?'bg-rose-50 text-rose-800':'bg-amber-50 text-amber-800'}>{ACCESS_LABELS[access(a)]}</Badge>{a.approvalStatus==='approved'&&access(a)!=='active'&&<Badge variant="outline">อนุมัติแล้ว</Badge>}</div>
    {a.id===MASTER_TEMPLATE_SITE_ID&&<p className="text-sm font-medium text-cyan-900">ใช้สำหรับแก้ไขต้นฉบับเว็บไซต์ของหน่วยงานใหม่</p>}
    <div className="text-sm text-slate-600"><p>{a.contactName} · {a.province} · {a.phone||a.email}</p><p className="mt-2 break-all font-medium text-cyan-900">{a.domainLabel}.weblocalgov.com <span className="font-normal text-slate-500">· {a.domainStatus==='active'?'เชื่อมโดเมนแล้ว':'รอเชื่อมโดเมน'}</span></p><p className="mt-1">Username: {a.username||'ยังไม่ได้ตั้ง'}</p></div>
    <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3"><div><p className="text-xs text-slate-500">วันส่งงาน / วันเริ่มใช้</p><p className="mt-1 font-semibold">{formatServiceDate(a.startOn)}</p></div><div><p className="text-xs text-slate-500">วันหมดอายุ</p><p className="mt-1 font-semibold">{formatServiceDate(a.expiresOn)}</p></div><div><p className="text-xs text-slate-500">ระยะเวลาใช้งาน</p><p className="mt-1 font-semibold">2 ปีนับจากวันส่งงาน</p></div></div>
    <div className="flex flex-wrap gap-2">
     <Button variant="outline" asChild><a href={`/site/${a.slug}`} target="_blank" rel="noreferrer"><ExternalLink/>ดูเว็บ</a></Button>
     <Button variant="outline" asChild><a href={`/admin/${a.id}`}>{a.id===MASTER_TEMPLATE_SITE_ID?'แก้ไขต้นฉบับ':'จัดการเนื้อหา'}</a></Button>
     <Button variant="outline" onClick={()=>openReview(a)}><Settings2/>บัญชี / โดเมน / ระยะเวลา</Button>
     {access(a)!=='active'&&<Button onClick={()=>openReview(a,'approved')}><CheckCircle2/>อนุมัติ</Button>}
     {a.approvalStatus==='approved'&&<Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={()=>openReview(a,'suspended')}><PauseCircle/>หยุดใช้งาน</Button>}
    </div>
   </CardContent></Card>)}{!visible.length&&<div className="rounded-2xl border border-dashed bg-white p-12 text-center text-slate-500">ยังไม่มีหน่วยงานในรายการนี้</div>}</div>
  </div>
  <Dialog open={creating} onOpenChange={setCreating}><DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>เพิ่มหน่วยงาน</DialogTitle><DialogDescription>ตั้งข้อมูลและบัญชีเจ้าหน้าที่ แล้วกำหนดวันส่งงานในรายการหน่วยงานเพื่อเริ่มใช้</DialogDescription></DialogHeader><AgencyRegistrationForm key={String(creating)} central onCreated={()=>{void refresh().catch(()=>toast.error('โหลดรายการไม่สำเร็จ'));}}/></DialogContent></Dialog>
  <Dialog open={!!editing} onOpenChange={open=>!open&&!busy&&setEditing(null)}><DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{reviewStatus==='suspended'?'หยุดใช้งานหน่วยงาน':'อนุมัติและจัดการระยะเวลาใช้งาน'}</DialogTitle><DialogDescription>{editing?.name}</DialogDescription></DialogHeader>
   {editing&&<form key={editing.id} onSubmit={review} className="space-y-5">
    <div className="space-y-2"><Label htmlFor="review-action">สถานะการใช้งาน</Label><Select value={reviewStatus} onValueChange={v=>setReviewStatus(v as ReviewStatus)}><SelectTrigger id="review-action" className="w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="approved">อนุมัติ / เปิดใช้งาน</SelectItem><SelectItem value="suspended">หยุดใช้งาน</SelectItem><SelectItem value="rejected">ไม่อนุมัติ</SelectItem></SelectContent></Select></div>
    <div className="space-y-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4"><p className="flex items-center gap-2 font-semibold text-cyan-950"><CalendarDays className="size-5"/>อายุใช้งาน 2 ปี</p><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="start-on">วันส่งงาน / วันเริ่มใช้{reviewStatus==='approved'?' *':''}</Label><Input id="start-on" name="startOn" type="date" min="1900-01-01" max="9997-12-31" value={startOn} onChange={e=>setStartOn(e.target.value)} required={reviewStatus==='approved'} className="min-w-0 bg-white"/></div><div className="space-y-2"><Label htmlFor="expires-on">วันหมดอายุ (อัตโนมัติ)</Label><Input id="expires-on" type="date" value={twoYearExpiry(startOn)} readOnly className="min-w-0 bg-white"/></div></div><p className="text-xs leading-5 text-cyan-900">เริ่มใช้ในวันส่งงานที่เลือก และหมดอายุเวลา 00:00 น. ของวันที่ครบ 2 ปี ตามเวลาไทย หากกำหนดวันในอนาคต ระบบจะรอจนถึงวันเริ่มใช้</p></div>
    {reviewStatus==='suspended'&&<p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">เมื่อยืนยัน ระบบจะหยุดหน้าเว็บไซต์และบัญชีหน่วยงานทันที เก็บข้อมูลเดิมไว้ และผู้ดูแลใหญ่สามารถกลับมาเปิดใช้งานได้</p>}
    <div className="space-y-2"><Label htmlFor="domain-label">ชื่อโดเมน</Label><div className="flex items-center gap-2"><Input id="domain-label" name="domainLabel" defaultValue={editing.domainLabel} required pattern="[a-z][a-z0-9]*(-[a-z0-9]+)*" minLength={3} maxLength={60} className="min-w-0"/><span className="text-sm">.weblocalgov.com</span></div><p className="text-xs leading-5 text-slate-500">บันทึกชื่อก่อนเชื่อมโดเมน ระหว่างรอใช้ลิงก์ดูเว็บด้านบนได้</p></div>
    <div className="space-y-2"><Label htmlFor="review-username">Username</Label><Input id="review-username" name="username" defaultValue={editing.username||''} placeholder="ตั้งชื่อผู้ใช้" autoComplete="off"/></div>
    <div className="space-y-2"><Label htmlFor="review-password">ตั้งรหัสผ่านใหม่</Label><Input id="review-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} placeholder="เว้นว่างเพื่อใช้รหัสเดิม"/></div>
    <Button disabled={busy} className={`h-11 w-full ${reviewStatus==='suspended'?'bg-rose-700 hover:bg-rose-800':''}`}>{busy?<Loader2 className="animate-spin"/>:reviewStatus==='suspended'?<PauseCircle/>:<CheckCircle2/>}{reviewStatus==='suspended'?'ยืนยันหยุดใช้งาน':'บันทึกและยืนยัน'}</Button>
   </form>}
  </DialogContent></Dialog><Toaster richColors/>
 </main>;
}
