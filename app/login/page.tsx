import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  chatGPTSignInPath,
  getChatGPTUser,
  safeRelativeReturnPath,
} from "@/app/chatgpt-auth";
import { LocalAdminLogin } from "@/components/local-admin-login";
import { SUNG_NOEN_SITE_ID } from "@/lib/site-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบหลังบ้าน",
  description: "หน้าเข้าสู่ระบบเจ้าหน้าที่เทศบาลตำบลสูงเนิน",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const fallback = `/admin/${SUNG_NOEN_SITE_ID}`;
  const requestedReturnTo = (await searchParams).return_to ?? fallback;
  const returnTo = safeRelativeReturnPath(requestedReturnTo);
  const user = await getChatGPTUser();
  if (user) redirect(user.authSource === "local" ? fallback : returnTo);

  return (
    <LocalAdminLogin
      chatGPTSignInUrl={chatGPTSignInPath("/admin")}
      localReturnTo={fallback}
    />
  );
}
