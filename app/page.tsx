import {headers} from "next/headers";
import {cache} from "react";
import {notFound} from "next/navigation";
import {runOperation} from "@/db/repository";
import PublicSitePage, {generateMetadata as siteMetadata} from "@/app/site/[slug]/page";
import type { Metadata } from "next";
import { SmartCityLanding } from "@/components/smart-city-landing";

const landingMetadata: Metadata = {
  title: "WebLocalGov — เว็บไซต์ อบต. ที่เชื่อมถึงประชาชน",
  description: "ก้าวสู่ Smart City ด้วยเว็บไซต์ อบต. และเทศบาลที่รับเรื่องจากประชาชน ติดตามคำร้อง เผยแพร่ข่าวและเอกสาร พร้อมหลังบ้านสร้างเว็บไซต์ของหน่วยงาน ลงทะเบียนออนไลน์ได้",
  alternates: { canonical: "/" },
  openGraph: {
    title: "WebLocalGov — เมืองที่น่าอยู่ เริ่มจากการรับฟัง",
    description: "เว็บไซต์ท้องถิ่นที่ประชาชนแจ้งเรื่องได้ เจ้าหน้าที่จัดการต่อได้ และติดตามความคืบหน้าได้ในที่เดียว",
    url: "/", type: "website", locale: "th_TH",
  },
};
const getTenantSlug=cache(async()=>{
 const host=(await headers()).get("host")?.split(":")[0]?.toLowerCase()||"";
 const match=/^([a-z][a-z0-9-]*)\.weblocalgov\.com$/.exec(host);
 if(!match||match[1]==="www")return undefined;
 return await runOperation<string|null>("resolve_domain",{p_label:match[1]});
});
export const dynamic="force-dynamic";
export async function generateMetadata():Promise<Metadata>{const slug=await getTenantSlug();return slug?siteMetadata({params:Promise.resolve({slug})}):landingMetadata;}
export default async function Home(){const slug=await getTenantSlug();if(slug===null)notFound();return slug?<PublicSitePage params={Promise.resolve({slug})}/>:<SmartCityLanding/>;}
