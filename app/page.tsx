import type { Metadata } from "next";
import { SmartCityLanding } from "@/components/smart-city-landing";

export const metadata: Metadata = {
  title: "WebLocalGov — เว็บไซต์ อบต. ที่เชื่อมถึงประชาชน",
  description: "ก้าวสู่ Smart City ด้วยเว็บไซต์ อบต. และเทศบาลที่รับเรื่องจากประชาชน ติดตามคำร้อง เผยแพร่ข่าวและเอกสาร พร้อมหลังบ้านสร้างเว็บไซต์ของหน่วยงาน ลงทะเบียนออนไลน์ได้",
  alternates: { canonical: "/" },
  openGraph: {
    title: "WebLocalGov — เมืองที่น่าอยู่ เริ่มจากการรับฟัง",
    description: "เว็บไซต์ท้องถิ่นที่ประชาชนแจ้งเรื่องได้ เจ้าหน้าที่จัดการต่อได้ และติดตามความคืบหน้าได้ในที่เดียว",
    url: "/", type: "website", locale: "th_TH",
  },
};
export default function Home() { return <SmartCityLanding />; }
