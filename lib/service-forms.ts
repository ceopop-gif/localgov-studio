import type { ContentRecord } from "./models";

export function getServiceForms(content: ContentRecord[]) {
  return content.filter(item => item.type === "service" && item.status === "published" && Boolean(item.attachmentUrl));
}

export function getFormDownloadUrl(url: string) {
  return url + (url.includes("?") ? "&" : "?") + "download=1";
}

export function isRequestFormFile(file: { contentType?: string; fileName: string }) {
  return /\.(pdf|docx|xlsx|pptx)$/i.test(file.fileName) ||
    ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"].includes(file.contentType || "");
}
