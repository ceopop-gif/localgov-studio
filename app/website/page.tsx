import {redirect} from "next/navigation";
import {getChatGPTUser,chatGPTSignInPath} from "@/app/chatgpt-auth";
import {LocalAdminLogin} from "@/components/local-admin-login";
export const dynamic="force-dynamic";
export const metadata={title:"เข้าสู่ระบบเว็บไซต์หน่วยงาน",robots:{index:false,follow:false}};
export default async function WebsitePage(){const user=await getChatGPTUser();if(user?.platform)redirect('/admin');if(user?.siteId)redirect(`/admin/${user.siteId}`);return <LocalAdminLogin chatGPTSignInUrl={chatGPTSignInPath('/admin')} localReturnTo="/website"/>;}
