import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getSiteAccessStatus } from "@/lib/site-access";
import { PublicSiteHome } from "@/components/public-site-home";
import { DEMO_CONTENT, DEMO_SITE, type ContentRecord } from "@/lib/models";
import {
  ensureSungNoenSiteForUser,
  getPublicSiteBySlug,
  getManagedSite,
  listPublishedContent,
  SUNG_NOEN_SITE_SLUG,
} from "@/lib/site-repository";

export const dynamic = "force-dynamic";

const resolveSite = cache(async (slug: string) => {
  if (slug === DEMO_SITE.slug) return DEMO_SITE;
  try {
    let site = await getPublicSiteBySlug(slug);
    if (site?.status === "published" && await getSiteAccessStatus(site.id) === "active") return site;

    const user = await getChatGPTUser();
    if (!user) return null;
    if (!site && slug === SUNG_NOEN_SITE_SLUG)
      site = await ensureSungNoenSiteForUser(user.id, user.email);
    return site && (await getManagedSite(site.id, user.id)) ? { ...site, status: "draft" as const } : null;
  } catch (error) {
    console.error("public site unavailable", error);
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await resolveSite(slug);
  if (!site) return { title: "ไม่พบเว็บไซต์" };
  return {
    title: site.name,
    description: `เว็บไซต์${site.organizationType} ศูนย์ข้อมูล ข่าวสาร และบริการประชาชนออนไลน์`,
    alternates: { canonical: `/site/${site.slug}` },
    openGraph: {
      type: "website",
      locale: "th_TH",
      url: `/site/${site.slug}`,
      title: site.name,
      description: `ศูนย์ข้อมูล ข่าวสาร และบริการประชาชนออนไลน์ของ${site.organizationType}`,
    },
    robots:
      site.status === "published"
        ? { index: true, follow: true }
        : { index: false, follow: false },
  };
}

export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await resolveSite(slug);
  if (!site) notFound();
  let content: ContentRecord[] = site.isDemo ? DEMO_CONTENT : [];
  if (!site.isDemo) {
    try {
      content = await listPublishedContent(site.id);
    } catch (error) {
      console.error("public content unavailable", error);
    }
  }
  const structuredData = site.isDemo
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "GovernmentOrganization",
        name: site.name,
        url: `https://localgov-studio.bbb78987.chatgpt.site/site/${site.slug}`,
        ...(site.email ? { email: site.email } : {}),
        ...(site.phone ? { telephone: site.phone } : {}),
      };
  return (
    <>
      {!site.isDemo && site.status !== "published" && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-100 px-4 py-3 text-sm text-amber-950">
          <span>
            ตัวอย่างสำหรับผู้ดูแล · เว็บไซต์ยังไม่เปิดให้บริการประชาชน
          </span>
          <a
            href={`/admin/${site.id}`}
            className="font-bold underline underline-offset-4"
          >
            กลับหลังบ้านเพื่อแก้ไข / เผยแพร่
          </a>
        </div>
      )}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <PublicSiteHome site={site} content={content} />
    </>
  );
}
