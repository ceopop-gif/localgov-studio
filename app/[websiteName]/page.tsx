import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { runOperation } from "@/db/repository";
import PublicSitePage, { generateMetadata as siteMetadata } from "@/app/site/[slug]/page";
import { isWebsiteName, websitePath, WEBSITE_ORIGIN } from "@/lib/website-url";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ websiteName: string }> };

// Reuse the approved tenant lookup, including suspension and service-term checks.
const resolveWebsite = cache(async (name: string) => {
  if (!isWebsiteName(name)) return null;
  return runOperation<string | null>("resolve_domain", { p_label: name });
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { websiteName } = await params;
  const slug = await resolveWebsite(websiteName);
  if (!slug) return { title: "ไม่พบเว็บไซต์", robots: { index: false, follow: false } };
  const metadata = await siteMetadata({ params: Promise.resolve({ slug }) });
  const url = `${WEBSITE_ORIGIN}${websitePath(websiteName)}`;
  return {
    ...metadata,
    alternates: { ...metadata.alternates, canonical: url },
    ...(metadata.openGraph ? { openGraph: { ...metadata.openGraph, url } } : {}),
  };
}

export default async function WebsitePage({ params }: Props) {
  const { websiteName } = await params;
  const slug = await resolveWebsite(websiteName);
  if (!slug) notFound();
  return <PublicSitePage params={Promise.resolve({ slug })} publicPath={websitePath(websiteName)} />;
}
