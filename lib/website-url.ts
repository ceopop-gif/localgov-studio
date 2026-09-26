export const WEBSITE_ORIGIN = "https://weblocalgov.com";
export const RESERVED_WEBSITE_NAMES = [
  "www", "admin", "api", "mail", "website", "register", "login", "site",
  "graphics", "assets", "sungnoen-demo",
] as const;

export function isWebsiteName(value: string): boolean {
  return value.length >= 3 && value.length <= 60
    && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
    && !RESERVED_WEBSITE_NAMES.some(name => name === value);
}

export function websitePath(name: string): string {
  return `/${encodeURIComponent(name)}`;
}
