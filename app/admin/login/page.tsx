import {redirect} from "next/navigation";
import {getPlatformUser} from "@/lib/platform";
import {chatGPTSignInPath} from "@/app/chatgpt-auth";
import {LocalAdminLogin} from "@/components/local-admin-login";
export const dynamic="force-dynamic";
export const metadata={title:"เข้าสู่หลังบ้านใหญ่",robots:{index:false,follow:false}};
export default async function PlatformLogin(){if(await getPlatformUser())redirect('/admin');return <LocalAdminLogin platform siteName="ศูนย์บริหาร WebLocalGov" chatGPTSignInUrl={chatGPTSignInPath('/admin')} localReturnTo="/admin"/>;}
