"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, Check, CheckCircle2, ChevronRight, ClipboardList, FileText, Globe2, HeartHandshake, LayoutDashboard, Lightbulb, Menu, MessageSquareText, MonitorSmartphone, Newspaper, Paintbrush, Route, Smartphone, Sprout, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import "@/app/smart-city.css";

const signupHref = "/admin?new=1";
const navigation = [
  { href: "#why", label: "เพื่อชุมชนของเรา" },
  { href: "#features", label: "ระบบทำอะไรได้บ้าง" },
  { href: "#how-it-works", label: "ดูการทำงาน" },
];
const scenarios = [
  { id: "lighting", label: "ไฟถนนดับ", icon: Lightbulb, title: "ทางกลับบ้านที่สว่างขึ้น", detail: "ไฟสาธารณะบริเวณทางเข้าหมู่บ้านไม่ติด ประชาชนแจ้งตำแหน่งให้เจ้าหน้าที่ตรวจสอบได้", department: "กองช่าง", outcome: "ประชาชนตรวจสถานะด้วยเลขรับเรื่อง และเห็นเมื่อเจ้าหน้าที่อัปเดตผล" },
  { id: "road", label: "ถนนชำรุด", icon: Route, title: "ทุกเส้นทาง สำคัญกับชุมชน", detail: "ถนนบริเวณทางไปโรงเรียนชำรุด ระบุจุดเกิดเหตุและรายละเอียดผ่านเว็บไซต์ได้จากมือถือ", department: "กองช่าง", outcome: "เจ้าหน้าที่มีข้อมูลตำแหน่งประกอบการตรวจสอบ และประชาชนกลับมาเช็กความคืบหน้าได้" },
  { id: "waste", label: "ปัญหาขยะ", icon: Trash2, title: "ชุมชนสะอาด เริ่มจากการมีส่วนร่วม", detail: "พบขยะสะสมในพื้นที่ส่วนกลาง แจ้งรายละเอียดและสถานที่ให้หน่วยงานรับเรื่องได้ในที่เดียว", department: "กองสาธารณสุข", outcome: "หน่วยงานจัดการคำร้องตามผู้รับผิดชอบ และอัปเดตสถานะให้ผู้แจ้งติดตาม" },
];
const features = [
  { icon: MessageSquareText, title: "รับเรื่องจากประชาชน", text: "แบบฟอร์มแจ้งปัญหาและยื่นคำร้อง พร้อมข้อมูลติดต่อ รายละเอียด และตำแหน่งเกิดเหตุ", label: "CITIZEN SERVICE" },
  { icon: ClipboardList, title: "ติดตามได้ ไม่หายไปกับคำร้อง", text: "ออกเลขรับเรื่อง ให้ประชาชนตรวจสถานะ และให้เจ้าหน้าที่อัปเดตหน่วยงานที่รับผิดชอบ", label: "REQUEST TRACKING" },
  { icon: Newspaper, title: "ข่าวสารที่เข้าถึงคนในพื้นที่", text: "เผยแพร่ข่าว กิจกรรม และเรื่องราวชุมชน พร้อมภาพประกอบ แกลเลอรี และลิงก์ YouTube", label: "COMMUNITY STORIES" },
  { icon: FileText, title: "ข้อมูลเปิดเผย หาอ่านได้", text: "จัดหมวดข่าวจัดซื้อจัดจ้างและ ITA / OIT แนบเอกสาร PDF ให้ประชาชนดาวน์โหลด", label: "OPEN INFORMATION" },
  { icon: LayoutDashboard, title: "หลังบ้านที่เจ้าหน้าที่ดูแลเอง", text: "จัดการเนื้อหา ดูรายการคำร้อง และปรับสถานะงานผ่านหน้าจอเดียวของหน่วยงาน", label: "STAFF WORKSPACE" },
  { icon: Paintbrush, title: "เว็บไซต์ที่เป็นตัวตนของตำบล", text: "เลือกสี โลโก้ ภาพชุมชน และส่วนที่ต้องการแสดงจากต้นฉบับ พร้อมแยกข้อมูลแต่ละหน่วยงาน", label: "YOUR LOCAL IDENTITY" },
];
function Brand() {
  return <Link href="/" className="sc-brand" aria-label="WebLocalGov หน้าแรก"><span className="sc-brand-mark"><Building2 size={23} /></span><span>Web<span className="sc-brand-accent">LocalGov</span><small>เทคโนโลยีเพื่อท้องถิ่น เพื่อทุกคน</small></span></Link>;
}
export function SmartCityLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const sectionAfterClose = useRef<string | null>(null);
  return (
    <div className="sc-page">
      <a href="#main-content" className="sc-skip">ข้ามไปยังเนื้อหา</a>
      <header className="sc-header"><div className="sc-shell sc-header-inner">
        <Brand />
        <nav className="sc-desktop-nav" aria-label="เมนูหลัก">{navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
        <div className="sc-header-actions"><Link href="/admin" className="sc-login">เข้าสู่ระบบ</Link><Button asChild className="sc-button sc-header-cta"><Link href={signupHref}>ลงทะเบียนหน่วยงาน <ArrowUpRight /></Link></Button></div>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild><Button variant="ghost" size="icon" className="sc-menu-button" aria-label="เปิดเมนู"><Menu /></Button></SheetTrigger>
          <SheetContent className="sc-mobile-panel" showCloseButton={false} onCloseAutoFocus={(event) => {
            const sectionId = sectionAfterClose.current;
            if (!sectionId) return;
            event.preventDefault();
            sectionAfterClose.current = null;
            requestAnimationFrame(() => {
              const section = document.getElementById(sectionId);
              section?.scrollIntoView({ behavior: "instant" });
              if (section) {
                section.setAttribute("tabindex", "-1");
                section.focus({ preventScroll: true });
              }
            });
          }}>
            <SheetHeader><SheetTitle>WebLocalGov</SheetTitle><SheetDescription>เว็บไซต์ที่เชื่อมท้องถิ่นกับประชาชน</SheetDescription></SheetHeader>
            <SheetClose asChild><Button variant="ghost" size="icon" className="absolute right-3 top-3" aria-label="ปิดเมนู"><X /></Button></SheetClose>
            <nav aria-label="เมนูมือถือ" className="sc-mobile-links">{navigation.map(item => <a key={item.href} href={item.href} onClick={(event) => { event.preventDefault(); sectionAfterClose.current = item.href.slice(1); setMenuOpen(false); }}>{item.label}<ChevronRight size={18} /></a>)}<Link href="/admin">เข้าสู่ระบบ<ArrowUpRight size={18} /></Link><Link href={signupHref} className="sc-mobile-signup">ลงทะเบียนหน่วยงาน<ArrowRight size={18} /></Link></nav>
          </SheetContent>
        </Sheet>
      </div></header>
      <main id="main-content">
        <section className="sc-hero sc-shell" aria-labelledby="hero-title">
          <div className="sc-hero-copy"><p className="sc-eyebrow"><Sprout size={17} /> SMART CITY, HUMAN FIRST</p><h1 id="hero-title">เมืองที่น่าอยู่<br />เริ่มจาก<span>การรับฟัง</span></h1><p className="sc-hero-description">เปลี่ยนเว็บไซต์ อบต. และเทศบาล ให้เป็นพื้นที่ที่ประชาชน<span className="sc-nowrap">เข้าถึงบริการ</span> แจ้งปัญหา และติดตามผลได้จริง</p><p className="sc-hero-subcopy">เชื่อมคนในชุมชนกับเจ้าหน้าที่ ด้วยเว็บไซต์ที่พร้อมทำงานไปกับท้องถิ่นของคุณ</p><div className="sc-hero-buttons"><Button asChild className="sc-button sc-button-large"><Link href={signupHref}>ลงทะเบียนสร้างเว็บไซต์ <ArrowUpRight /></Link></Button><a href="#how-it-works" className="sc-text-link">ดูว่าระบบทำงานอย่างไร <ArrowRight size={18} /></a></div><div className="sc-hero-notes"><span><Check size={16} /> สำหรับ อบต. และเทศบาล</span><span><Check size={16} /> รองรับมือถือ</span></div></div>
          <div className="sc-hero-visual"><img src="/graphics/smart-city-community.webp" alt="ภาพประกอบเจ้าหน้าที่ท้องถิ่นและคนหลายวัยพูดคุยกันในชุมชนไทย" width={1536} height={1024} fetchPriority="high" className="sc-hero-image" /><div className="sc-photo-caption"><span className="sc-caption-icon"><HeartHandshake size={24} /></span><div><strong>ใกล้ประชาชนขึ้นอีกนิด</strong><span>เริ่มจากบริการที่เข้าถึงง่าย</span></div></div><div className="sc-visual-tag"><Globe2 size={16} /> CONNECTED COMMUNITY</div></div>
        </section>
        <div className="sc-purpose-strip"><div className="sc-shell"><p>หนึ่งเว็บไซต์ เชื่อมทุกบทบาทในท้องถิ่น</p><div><span><Users /> ประชาชน</span><span><Building2 /> เจ้าหน้าที่ อบต.</span><span><LayoutDashboard /> ผู้บริหารท้องถิ่น</span></div></div></div>
        <section id="why" className="sc-section sc-shell"><div className="sc-section-heading"><div><p className="sc-eyebrow">BEYOND A WEBSITE</p><h2>จากพื้นที่ลงประกาศ<br />สู่พื้นที่<span>ดูแลประชาชน</span></h2></div><p>ข่าวสารยังสำคัญ แต่เมื่อประชาชนต้องการความช่วยเหลือ เว็บไซต์ควรพาเขาไปถึงบริการ และเห็นว่าเรื่องของเขาไปถึงไหนแล้ว</p></div><div className="sc-value-grid">
          <article><span className="sc-value-number">01 / ประชาชน</span><Smartphone /><h3>ใกล้บริการ แม้อยู่ไกลสำนักงาน</h3><p>แจ้งปัญหาจากมือถือ รับเลขติดตาม และอ่านข้อมูลบริการก่อนเดินทางมาที่หน่วยงาน</p></article>
          <article><span className="sc-value-number">02 / เจ้าหน้าที่</span><ClipboardList /><h3>รับเรื่องเป็นระบบ ทำงานต่อได้</h3><p>เห็นรายละเอียดคำร้องและตำแหน่ง ระบุผู้รับผิดชอบ และอัปเดตความคืบหน้าในหลังบ้าน</p></article>
          <article><span className="sc-value-number">03 / ผู้บริหาร</span><HeartHandshake /><h3>เห็นปัญหา เข้าใจความต้องการ</h3><p>ดูภาพรวมคำร้องของหน่วยงาน ทั้งเรื่องใหม่ เรื่องที่กำลังดำเนินการ และเรื่องที่เสร็จแล้ว</p></article>
        </div></section>
        <section id="how-it-works" className="sc-demo-section"><div className="sc-shell sc-demo-layout">
          <div className="sc-demo-copy"><p className="sc-eyebrow">LISTEN. ACT. FOLLOW UP.</p><h2>เมื่อเสียงของประชาชน<br /><span>มีเส้นทางไปต่อ</span></h2><p>การสื่อสารสองทางเริ่มได้จากเรื่องใกล้ตัว ประชาชนส่งเรื่องเข้ามา หน่วยงานรับไปดำเนินการ และอัปเดตสถานะให้กลับมาติดตามได้</p><div className="sc-demo-link"><Link href="/site/sungnoen-demo">เปิดเว็บไซต์ตัวอย่าง <ArrowUpRight size={19} /></Link><small>พื้นที่สาธิต ไม่มีการส่งคำร้องจริง</small></div></div>
          <div className="sc-demo-card"><div className="sc-demo-top"><span><MonitorSmartphone size={19} /> ลองสำรวจเส้นทางบริการ</span><span className="sc-sample-label">ตัวอย่างการทำงาน</span></div><Tabs defaultValue="lighting"><TabsList className="sc-scenario-tabs" aria-label="เลือกตัวอย่างปัญหาชุมชน">{scenarios.map(s => <TabsTrigger key={s.id} value={s.id}><s.icon size={17} />{s.label}</TabsTrigger>)}</TabsList>{scenarios.map(s => <TabsContent key={s.id} value={s.id} className="sc-scenario-content"><h3>{s.title}</h3><p>{s.detail}</p><ol className="sc-service-flow"><li><span className="sc-flow-icon"><MessageSquareText size={19} /></span><div><strong>ประชาชนแจ้งเรื่อง</strong><p>กรอกรายละเอียด ระบุตำแหน่ง และรับเลขรับเรื่อง</p></div></li><li><span className="sc-flow-icon"><Building2 size={19} /></span><div><strong>เจ้าหน้าที่รับไปดำเนินการ</strong><p>ระบุหน่วยงานรับผิดชอบ เช่น {s.department}</p></div></li><li><span className="sc-flow-icon sc-flow-done"><CheckCircle2 size={19} /></span><div><strong>กลับมาติดตามความคืบหน้า</strong><p>{s.outcome}</p></div></li></ol></TabsContent>)}</Tabs></div>
        </div></section>
        <section id="features" className="sc-section sc-shell"><div className="sc-section-heading"><div><p className="sc-eyebrow">ONE PLATFORM. LOCAL POSSIBILITIES.</p><h2>เครื่องมือของท้องถิ่น<br /><span>ครบในเว็บไซต์เดียว</span></h2></div><p>ตั้งแต่หน้าบ้านที่ประชาชนใช้งาน ไปถึงหลังบ้านที่เจ้าหน้าที่ดูแล ทุกส่วนเชื่อมกับงานบริการของหน่วยงาน</p></div><div className="sc-feature-grid">{features.map((f, i) => <article key={f.title} className="sc-feature"><span className={`sc-feature-icon sc-feature-icon-${i % 3}`}><f.icon size={24} /></span><span className="sc-feature-label">{f.label}</span><h3>{f.title}</h3><p>{f.text}</p></article>)}</div></section>
        <section className="sc-community sc-shell"><div className="sc-community-image"><img src="/graphics/smart-city-service.webp" alt="ภาพประกอบเจ้าหน้าที่ช่วยผู้สูงอายุเข้าถึงข้อมูลบริการผ่านแท็บเล็ตในศาลาชุมชน" width={1448} height={1086} loading="lazy" /></div><div className="sc-community-copy"><p className="sc-eyebrow"><Sprout size={17} /> SMART CITY ใกล้ตัวกว่าที่คิด</p><h2>เทคโนโลยีที่ดี<br />ต้องพา<span>ทุกคนไปด้วยกัน</span></h2><p>เมืองอัจฉริยะเริ่มจากบริการเล็ก ๆ ที่ทำให้ชีวิตคนในพื้นที่ง่ายขึ้น ทั้งครอบครัวที่อยากแจ้งปัญหา ผู้สูงอายุที่อยากหาข้อมูล และเจ้าหน้าที่ที่อยากดูแลประชาชนได้ทั่วถึง</p><ul><li><CheckCircle2 /> ใช้งานได้ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์</li><li><CheckCircle2 /> บริการหลักอยู่ใกล้มือ พร้อมข้อมูลติดต่อหน่วยงาน</li><li><CheckCircle2 /> ใช้ภาพและเรื่องราว สะท้อนตัวตนของชุมชน</li></ul><p className="sc-community-statement">ให้เว็บไซต์เป็นอีกหนึ่งประตู<br />ที่ประชาชนเดินเข้ามาหาท้องถิ่นได้</p></div></section>
        <section id="register" className="sc-registration-section"><div className="sc-shell sc-registration-layout"><div><p className="sc-eyebrow">START WITH YOUR COMMUNITY</p><h2>เริ่มต้นเว็บไซต์<br />เพื่อชุมชนของคุณ</h2><p>ลงทะเบียนออนไลน์ แล้วสร้างเว็บไซต์ของหน่วยงานจากต้นฉบับที่เตรียมไว้ ปรับข้อมูลและตรวจทานก่อนเปิดให้ประชาชนใช้งาน</p><Button asChild className="sc-button sc-button-large"><Link href={signupHref}>ลงทะเบียนและสร้างเว็บไซต์ <ArrowUpRight /></Link></Button><span className="sc-registration-note">ใช้บัญชี ChatGPT เพื่อเข้าสู่พื้นที่สร้างเว็บไซต์</span></div><ol className="sc-registration-steps"><li><span>01</span><div><h3>เข้าสู่ระบบและเลือกต้นฉบับ</h3><p>เลือกสีและส่วนบริการให้เหมาะกับหน่วยงาน</p></div></li><li><span>02</span><div><h3>กรอกข้อมูล อบต. หรือเทศบาล</h3><p>ระบุชื่อ ที่อยู่ ช่องทางติดต่อ และชื่อ URL</p></div></li><li><span>03</span><div><h3>ตรวจทาน แล้วพร้อมเผยแพร่</h3><p>เว็บเริ่มเป็นฉบับร่าง เพิ่มเนื้อหาจริงให้ครบก่อนเปิดใช้</p></div></li></ol></div></section>
      </main>
      <footer className="sc-footer sc-shell"><div><Brand /><p>เว็บไซต์ท้องถิ่น ที่เชื่อมถึงประชาชน</p></div><nav aria-label="ลิงก์ท้ายเว็บไซต์"><a href="#features">ความสามารถของระบบ</a><Link href="/site/sungnoen-demo">เว็บไซต์ตัวอย่าง</Link><Link href="/admin">หลังบ้านหน่วยงาน</Link></nav><div className="sc-footer-bottom"><span>WebLocalGov · LocalGov Studio</span><span>ภาพชุมชนใช้เพื่อประกอบแนวคิดบริการ</span></div></footer>
    </div>
  );
}
