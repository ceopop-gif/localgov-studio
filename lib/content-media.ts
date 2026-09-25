export function parseContentGallery(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim())
      .slice(0, 5);
  } catch {
    return [];
  }
}

export function getContentImages(item: { coverUrl?: string; galleryJson?: string }): string[] {
  return [...new Set([item.coverUrl || "", ...parseContentGallery(item.galleryJson)])]
    .filter(Boolean)
    .slice(0, 5);
}

export function getYouTubeVideoId(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId = "";
    if (host === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
      else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/")[2] || "";
    }
    return /^[A-Za-z0-9_-]{6,20}$/.test(videoId) ? videoId : "";
  } catch {
    return "";
  }
}

export function isSupportedYouTubeUrl(value: string): boolean {
  return value === "" || Boolean(getYouTubeVideoId(value));
}

export function getYouTubeEmbedUrl(value: string | null | undefined): string {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : "";
}
