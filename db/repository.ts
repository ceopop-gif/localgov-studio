import type * as schema from "./schema";
import { supabaseRest, type LocalGovTable, type RecordData, type LocalGovRpc } from "./supabase-rest";

type Tables = {sites:typeof schema.sites; site_members:typeof schema.siteMembers; content_items:typeof schema.contentItems; service_requests:typeof schema.serviceRequests; media_files:typeof schema.mediaFiles; audit_logs:typeof schema.auditLogs; local_admin_sessions:typeof schema.localAdminSessions};
export type Row<K extends LocalGovTable> = Tables[K]["$inferSelect"];
type Insert<K extends LocalGovTable> = Tables[K]["$inferInsert"];
export const toDatabase = (row:RecordData):RecordData => Object.fromEntries(Object.entries(row).filter(([,value])=>value!==undefined).map(([key,value])=>[key.replace(/[A-Z]/g,c=>`_${c.toLowerCase()}`),value]));
export const fromDatabase = <T>(row:RecordData):T => Object.fromEntries(Object.entries(row).map(([key,value])=>[key.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase()),value])) as T;

export async function rows<K extends LocalGovTable>(table:K, filters:Record<string,string> = {}):Promise<Row<K>[]> {
  return (await supabaseRest.select(table,filters)).map(row=>fromDatabase<Row<K>>(row));
}
const creates = {sites:"create_site",content_items:"create_content",service_requests:"create_request",media_files:"create_media"} as const;
export async function createRecord<K extends keyof typeof creates>(table:K,data:Insert<K>,audit:Insert<"audit_logs">,member?:Insert<"site_members">):Promise<Row<K>> {
  const result=await supabaseRest.rpc<RecordData>(creates[table],{p_data:toDatabase(data),p_audit:toDatabase(audit),...(member?{p_member:toDatabase(member)}:{})});
  return fromDatabase<Row<K>>(result);
}
const updates = {sites:"update_site",content_items:"update_content",service_requests:"update_request"} as const;
export async function updateRecord<K extends keyof typeof updates>(table:K,id:string,siteId:string,changes:Partial<Insert<K>>,audit:Insert<"audit_logs">):Promise<Row<K>|null> {
  const result=await supabaseRest.rpc<RecordData|null>(updates[table],{p_id:id,p_site_id:siteId,p_data:toDatabase(changes),p_audit:toDatabase(audit)});
  return result?fromDatabase<Row<K>>(result):null;
}
export async function runOperation<T>(name:LocalGovRpc,args:RecordData):Promise<T> { return supabaseRest.rpc<T>(name,args); }
