import { runOperation } from "@/db/repository";
import type { AgencyAccessStatus } from "@/lib/agency-term";

export function getSiteAccessStatus(siteId: string): Promise<AgencyAccessStatus> {
  return runOperation("site_access_status", {p_site_id: siteId});
}
