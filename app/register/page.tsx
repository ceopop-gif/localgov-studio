import {env} from "cloudflare:workers";
import {AgencyRegistration} from "@/components/agency-registration";
export const dynamic="force-dynamic";
export const metadata={title:"ลงทะเบียนหน่วยงาน | WebLocalGov",description:"ลงทะเบียน อบต. และเทศบาล ระบุที่ตั้งสำนักงานและตั้งบัญชีเจ้าหน้าที่เพื่อส่งคำขออนุมัติ"};
export default function RegisterPage(){return <AgencyRegistration mapsKey={env.GOOGLE_MAPS_BROWSER_KEY||""}/>;}
