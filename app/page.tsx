import { redirect } from "next/navigation";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { SUNG_NOEN_SITE_ID } from "@/lib/site-repository";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getChatGPTUser();
  redirect(
    user?.authSource === "local" ? `/admin/${SUNG_NOEN_SITE_ID}` : "/admin",
  );
}
