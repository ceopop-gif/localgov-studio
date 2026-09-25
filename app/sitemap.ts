import type { MetadataRoute } from "next";
import { listPublishedSites } from "@/lib/site-repository";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const sites = await listPublishedSites();
    return sites.map((site) => ({
      url: `https://localgov-studio.bbb78987.chatgpt.site/site/${site.slug}`,
      lastModified: new Date(site.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error("sitemap unavailable", error);
    return [];
  }
}
