"use client";
import {useEffect,useState,type FormEvent} from "react";
import {Image as ImageIcon,Video,FileText,FolderOpen,FolderPlus,CloudUpload,Loader2,ExternalLink,Download} from "lucide-react";
import {toast} from "sonner";
import {AiImagePanel} from "@/components/ai-image-panel";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card,CardContent} from "@/components/ui/card";
import {Tabs,TabsList,TabsTrigger} from "@/components/ui/tabs";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";

type Media={id:string;fileName:string;url:string;contentType?:string;altText?:string;sizeBytes?:number;folderId?:string|null};
type Folder={id:string;name:string};
function kind(file:Media){
 if(file.contentType?.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif)$/i.test(file.fileName))return "image";
 if(file.contentType?.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.fileName))return "video";
 return "document";
}
const labels={image:"รูปภาพ",video:"วิดีโอ",document:"เอกสาร"};
function Preview({file,small=false}:{file:Media;small?:boolean}){
 const type=kind(file);
 if(type==="image")return <img src={file.url} alt={file.altText || file.fileName} loading={small?"lazy":"eager"} className={`h-full w-full object-contain ${small?"p-1":""}`} />;
 if(type==="video")return small?<div className="relative h-full w-full"><video src={`${file.url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-contain"/><Video className="absolute bottom-2 right-2 rounded bg-white/90 p-1 text-slate-700"/></div>:<video key={file.id} src={file.url} controls playsInline preload="metadata" className="h-full max-h-[400px] w-full"/>;
 if(!small && (file.contentType==="application/pdf" || /\.pdf$/i.test(file.fileName)))return <iframe src={file.url} title={file.fileName} className="h-full w-full border-0"/>;
 return <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-slate-500"><FileText className={small?"size-9":"size-16"}/><span className="text-sm uppercase">{file.fileName.split(".").pop() || "เอกสาร"}</span>{!small&&<p className="text-center text-base">เปิดหรือดาวน์โหลดเพื่อดูเอกสาร</p>}</div>;
}
export function MediaLibrary({site}:{site:{id:string;isDemo?:boolean}}){
 const [files,setFiles]=useState<Media[]>([]),[folders,setFolders]=useState<Folder[]>([]);
 const [filter,setFilter]=useState("all"),[folder,setFolder]=useState("all");
 const [selected,setSelected]=useState<Media|null>(null),[pending,setPending]=useState<File|null>(null),[pendingUrl,setPendingUrl]=useState("");
 const [uploading,setUploading]=useState(false),[loading,setLoading]=useState(!site.isDemo),[loadError,setLoadError]=useState(false),[reload,setReload]=useState(0);
 const [folderDialog,setFolderDialog]=useState(false),[folderName,setFolderName]=useState(""),[saving,setSaving]=useState(false),[moving,setMoving]=useState<string|null>(null);
 const endpoint=`/api/sites/${site.id}/media`;
 useEffect(()=>{
  let active=true;
  setFiles([]);setFolders([]);setSelected(null);setPending(null);setFolder("all");setFilter("all");setLoadError(false);
  if(site.isDemo){setLoading(false);return;}
  setLoading(true);
  fetch(endpoint).then(async r=>{const data=await r.json();if(!r.ok)throw new Error();if(!active)return;
   const loaded:Media[]=data.files.map((file:Media)=>({...file,url:`/api/media/${file.id}`}));
   setFiles(loaded);setFolders(data.folders);setSelected(loaded.find(file=>kind(file)==="image") || loaded[0] || null);
  }).catch(()=>{if(active)setLoadError(true);}).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[endpoint,site.isDemo,reload]);
 useEffect(()=>{if(!pending){setPendingUrl("");return;}const url=URL.createObjectURL(pending);setPendingUrl(url);return ()=>URL.revokeObjectURL(url);},[pending]);
 const visible=files.filter(file=>(filter==="all" || kind(file)===filter)&&(folder==="all" || (folder==="root"?!file.folderId:file.folderId===folder)));
 const shown=pending&&pendingUrl?{id:"pending",fileName:pending.name,contentType:pending.type,url:pendingUrl}:selected;
 async function changeFolder(action:"create"|"move",file?:Media,destination?:string){
  if(site.isDemo){toast.info("โหมดตัวอย่างไม่บันทึกข้อมูล");return;}
  action==="create"?setSaving(true):setMoving(file!.id);
  try{
   const r=await fetch(endpoint,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action,name:action==="create"?folderName:undefined,fileId:file?.id,folderId:destination==="root"?null:destination})});
   const data=await r.json();if(!r.ok)throw new Error(data.error);
   if(action==="create"){setFolders(current=>[...current,data.result]);setFolder(data.result.id);setSelected(null);setFolderDialog(false);setFolderName("");toast.success("สร้างโฟลเดอร์แล้ว");}
   else{setFiles(current=>current.map(item=>item.id===file!.id?{...item,folderId:data.result.folderId}:item));setSelected(current=>current?.id===file!.id?{...current,folderId:data.result.folderId}:current);toast.success("ย้ายไฟล์แล้ว");}
  }catch(e){toast.error(e instanceof Error?e.message:"บันทึกไม่สำเร็จ");}finally{setSaving(false);setMoving(null);}
 }
 async function upload(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!pending)return;if(site.isDemo){toast.info("โหมดตัวอย่างไม่บันทึกไฟล์");return;}
  if(pending.size>15*1024*1024){toast.error("ไฟล์ต้องมีขนาดไม่เกิน 15 MB");return;}
  const formElement=e.currentTarget;const form=new FormData();form.set("file",pending);if(!["all","root"].includes(folder))form.set("folderId",folder);
  setUploading(true);
  try{const r=await fetch(endpoint,{method:"POST",body:form});const data=await r.json();if(!r.ok||!data.file)throw new Error(data.error || "อัปโหลดไม่สำเร็จ");setFiles(current=>[data.file,...current]);setSelected(data.file);setFilter(kind(data.file));setPending(null);formElement.reset();toast.success("อัปโหลดไฟล์แล้ว");}
  catch(e){toast.error(e instanceof Error?e.message:"อัปโหลดไม่สำเร็จ");}finally{setUploading(false);}
 }
 function chooseFilter(value:string){setFilter(value);setSelected(files.find(file=>(value==="all" || kind(file)===value)&&(folder==="all" || (folder==="root"?!file.folderId:file.folderId===folder))) || null);}
 function chooseFolder(value:string){setFolder(value);setSelected(files.find(file=>(filter==="all" || kind(file)===filter)&&(value==="all" || (value==="root"?!file.folderId:file.folderId===value))) || null);}
 return <div className="space-y-5">
  <div><h2 className="text-2xl font-bold text-slate-900">คลังไฟล์และสื่อ</h2><p className="mt-1 text-base text-slate-600">รูปภาพ วิดีโอ และเอกสารของหน่วยงาน</p></div>
  <AiImagePanel siteId={site.id} isDemo={site.isDemo} onCreated={file=>{setFiles(current=>[file,...current]);setSelected(file);setPending(null);setFilter("image");setFolder("all");}}/>
  <Card><CardContent><form onSubmit={upload} className="flex flex-col gap-4 lg:flex-row lg:items-end"><div className="min-w-0 flex-1 space-y-2"><Label htmlFor="media-file">เลือกไฟล์</Label><Input id="media-file" type="file" required accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.webp,.mp4" className="min-h-11" disabled={uploading} onChange={e=>setPending(e.target.files?.[0] || null)}/></div><Button type="submit" className="min-h-11" disabled={uploading||!pending||loading||loadError}>{uploading?<Loader2 className="animate-spin"/>:<CloudUpload/>}{uploading?"กำลังอัปโหลด…":"อัปโหลด"}</Button></form><p className="mt-3 text-sm text-slate-500">รองรับ PDF, DOCX, XLSX, PPTX, JPG, PNG, WEBP และ MP4 ไม่เกิน 15 MB · แยกประเภทอัตโนมัติ</p><p className="mt-1 text-sm text-slate-600">บันทึกไปที่: {folders.find(item=>item.id===folder)?.name || "ไฟล์ที่ยังไม่จัดโฟลเดอร์"}</p></CardContent></Card>
  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">ไฟล์ของหน่วยงาน</h3><Button variant="outline" disabled={loading||loadError} onClick={()=>setFolderDialog(true)}><FolderPlus/>สร้างโฟลเดอร์</Button></div>
   <div className="grid gap-3 sm:grid-cols-[1fr_240px] sm:items-end">
    <Tabs value={filter} onValueChange={chooseFilter}><TabsList className="grid h-auto min-h-12 w-full grid-cols-4"><TabsTrigger value="all" className="min-h-11 px-1">ทั้งหมด</TabsTrigger><TabsTrigger value="image" className="min-h-11 px-1">รูปภาพ</TabsTrigger><TabsTrigger value="video" className="min-h-11 px-1">วิดีโอ</TabsTrigger><TabsTrigger value="document" className="min-h-11 px-1">เอกสาร</TabsTrigger></TabsList></Tabs>
    <div className="space-y-2"><Label htmlFor="folder-filter">โฟลเดอร์</Label><Select value={folder} onValueChange={chooseFolder}><SelectTrigger id="folder-filter" className="min-h-11 w-full"><FolderOpen/><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">ทุกโฟลเดอร์</SelectItem><SelectItem value="root">ยังไม่จัดโฟลเดอร์</SelectItem>{folders.map(item=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
   </div>
   {folders.length>0&&<div className="flex flex-wrap gap-2">{folders.map(item=><Button key={item.id} variant={folder===item.id?"default":"outline"} className="max-w-full" onClick={()=>chooseFolder(item.id)}><FolderOpen/><span className="truncate">{item.name}</span><span className="text-sm opacity-70">{files.filter(file=>file.folderId===item.id).length}</span></Button>)}</div>}
   {shown&&<div className="overflow-hidden rounded-xl border border-slate-200"><div className="h-[240px] bg-slate-100 sm:h-[360px]"><Preview file={shown}/></div><div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3"><div className="min-w-0"><p className="break-all text-sm font-semibold">{shown.fileName}</p>{pending&&<p className="mt-1 text-sm text-amber-700">ตัวอย่างไฟล์ที่เลือก — ยังไม่ได้อัปโหลด</p>}</div>{!pending&&<div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><a href={shown.url} target="_blank" rel="noreferrer"><ExternalLink/>เปิด{labels[kind(shown)]}</a></Button><Button asChild size="sm" variant="outline"><a href={`${shown.url}?download=1`}><Download/>ดาวน์โหลด</a></Button></div>}</div></div>}
   {loading?<p role="status" className="py-10 text-center text-slate-500">กำลังโหลดไฟล์…</p>:loadError?<div role="alert" className="py-8 text-center"><p>โหลดคลังไฟล์ไม่สำเร็จ</p><Button variant="outline" className="mt-3" onClick={()=>setReload(value=>value+1)}>ลองใหม่</Button></div>:<><p className="text-sm text-slate-500">{visible.length} ไฟล์ · กดภาพย่อเพื่อดูตัวอย่าง</p>{visible.length?<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{visible.map(file=><article key={file.id} className={`min-w-0 overflow-hidden rounded-xl border ${selected?.id===file.id?"border-[#0b5260] ring-2 ring-[#0b5260]/20":"border-slate-200"}`}><button type="button" aria-label={`ดู ${file.fileName}`} aria-pressed={selected?.id===file.id} className="block aspect-[4/3] w-full bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#0b5260]" onClick={()=>{setSelected(file);setPending(null);}}><Preview file={file} small/></button><div className="space-y-2 p-2.5"><p title={file.fileName} className="truncate text-sm font-medium">{file.fileName}</p><p className="text-sm text-slate-500">{labels[kind(file)]}{file.sizeBytes?` · ${(file.sizeBytes/1024/1024).toFixed(1)} MB`:""}</p><Select value={file.folderId || "root"} disabled={moving===file.id} onValueChange={value=>changeFolder("move",file,value)}><SelectTrigger aria-label={`ย้าย ${file.fileName} ไปโฟลเดอร์`} className="min-h-10 w-full text-sm"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="root">ยังไม่จัดโฟลเดอร์</SelectItem>{folders.map(item=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div></article>)}</div>:<div className="rounded-xl border border-dashed py-12 text-center text-slate-500"><ImageIcon className="mx-auto mb-3 size-8"/><p>ยังไม่มีไฟล์ในหมวดหรือโฟลเดอร์นี้</p></div>}</>}
  </div>
  <Dialog open={folderDialog} onOpenChange={setFolderDialog}><DialogContent><DialogHeader><DialogTitle>สร้างโฟลเดอร์</DialogTitle><DialogDescription>ตั้งชื่อเพื่อจัดเก็บงานของหน่วยงาน เช่น ข่าวกิจกรรม หรือเอกสารปี 2569</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e=>{e.preventDefault();void changeFolder("create");}}><div className="space-y-2"><Label htmlFor="folder-name">ชื่อโฟลเดอร์</Label><Input id="folder-name" value={folderName} onChange={e=>setFolderName(e.target.value)} maxLength={100} required autoFocus disabled={saving}/></div><Button type="submit" disabled={saving||!folderName.trim()}>{saving?<Loader2 className="animate-spin"/>:<FolderPlus/>}สร้างโฟลเดอร์</Button></form></DialogContent></Dialog>
 </div>;
}
