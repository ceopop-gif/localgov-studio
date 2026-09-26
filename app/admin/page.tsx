import {redirect} from "next/navigation";
import {getPlatformUser,type AgencyRegistration} from "@/lib/platform";
import {runOperation} from "@/db/repository";
import {PlatformConsole} from "@/components/platform-console";
export const dynamic="force-dynamic";
export const metadata={title:"หลังบ้านใหญ่ | WebLocalGov",robots:{index:false,follow:false}};
export default async function Admin({searchParams}:{searchParams:Promise<{new?:string}>}){const user=await getPlatformUser();if(!user)redirect('/admin/login');const agencies=await runOperation<AgencyRegistration[]>("list_agencies",{p_actor_id:user.id});return <PlatformConsole initialAgencies={agencies} userName={user.displayName} startCreating={(await searchParams).new==='1'}/>;}
