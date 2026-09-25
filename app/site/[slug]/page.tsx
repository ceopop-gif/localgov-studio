import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { PublicSiteHome } from "@/components/public-site-home";
import { DEMO_CONTENT, DEMO_SITE, type ContentRecord } from "@/lib/models";
import {
  ensureSungNoenSiteForUser,
  getPublicSiteBySlug,
  listPublishedContent,
  SUNG_NOEN_SITE_SLUG,
} from "@/lib/site-repository";

export const dynamic = "force-dynamic";

async function resolveSite(slug: string) {
  if (slug === DEMO_SITE.slug) return DEMO_SITE;
  try {
    const site = await getPublicSiteBySlug(slug);
    if (site || slug !== SUNG_NOEN_SITE_SLUG) return site;

    const user = await getChatGPTUser();
    return user ? await ensureSungNoenSiteForUser(user.id, user.email) : null;
  } catch (error) {
    console.error("public site unavailable", error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
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
    robots: site.status === "published" ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function PublicSitePage({ params }: { params: Promise<{ slug: string }> }) {
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
