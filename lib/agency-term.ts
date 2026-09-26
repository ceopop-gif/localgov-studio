export const ACCESS_LABELS = {
  pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ไม่อนุมัติ",
  suspended: "หยุดใช้งาน", awaiting_start: "รอกำหนดวันส่งงาน",
  scheduled: "รอวันเริ่มใช้", expired: "หมดอายุ", active: "ใช้งานอยู่",
} as const;
export type AgencyAccessStatus = Exclude<keyof typeof ACCESS_LABELS, "approved">;

export function validStartDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    && value >= "1900-01-01" && value <= "9997-12-31";
}

export function twoYearExpiry(value: string): string {
  if (!validStartDate(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year + 2, month, 0)).getUTCDate();
  return new Date(Date.UTC(year + 2, month - 1, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

export function formatServiceDate(value: string | null | undefined): string {
  if (!value) return "ยังไม่กำหนด";
  return new Intl.DateTimeFormat("th-TH", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"})
    .format(new Date(`${value}T00:00:00Z`));
}
