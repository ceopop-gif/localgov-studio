import { getChatGPTUser } from "@/app/chatgpt-auth";
import { runOperation } from "@/db/repository";
import type { AgencyAccessStatus } from "@/lib/agency-term";
export type AgencyRegistration = {
 id:string; name:string; slug:string; province:string; email:string; phone:string; status:string;
 username:string|null; contactName:string; approvalStatus:"pending"|"approved"|"rejected"|"suspended";
 domainLabel:string; domainStatus:"pending_dns"|"active"; submittedAt:string;
 startOn:string|null; expiresOn:string|null; accessStatus:AgencyAccessStatus;
};
export async function getPlatformUser() {
 const user=await getChatGPTUser();
 if(!user || user.authSource !== "local" || !user.platform) return null;
 return await runOperation<boolean>("is_platform_admin",{p_user_id:user.id}) ? user : null;
}
