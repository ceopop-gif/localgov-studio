import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { redirect } from "next/navigation";
import { PlatformDashboard } from "@/components/platform-dashboard";
import {
  ensureSungNoenSiteForUser,
  listSitesForUser,
  SUNG_NOEN_SITE_ID,
} from "@/lib/site-repository";
import type { SiteRecord } from "@/lib/models";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ศูนย์บริหารเว็บไซต์",
  robots: { index: false, follow: false },
};

export default async function Home() {
  const user = await requireChatGPTUser("/");
  if (user.authSource === "local") redirect(`/admin/${SUNG_NOEN_SITE_ID}`);
  let initialSites: SiteRecord[] = [];

  try {
    await ensureSungNoenSiteForUser(user.id, user.email);
    initialSites = await listSitesForUser(user.id);
  } catch (error) {
    console.error("dashboard site list unavailable", error);
  }

  return (
    <PlatformDashboard
      initialSites={initialSites}
      user={{ displayName: user.displayName, email: user.email }}
    />
  );
}
