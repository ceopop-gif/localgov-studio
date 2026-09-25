import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/site/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: "https://localgov-studio.bbb78987.chatgpt.site/sitemap.xml",
  };
}
