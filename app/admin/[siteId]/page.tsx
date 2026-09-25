import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSiteAdminUser } from "@/app/chatgpt-auth";
import { AdminWorkspace } from "@/components/admin-workspace";
import {
  DEMO_CONTENT,
  DEMO_REQUESTS,
  DEMO_SITE,
  DEMO_STATS,
  type ContentRecord,
  type DashboardStats,
  type ServiceRequestRecord,
} from "@/lib/models";
import {
  ensureSungNoenSiteForUser,
  getDashboardStats,
  getManagedSite,
  listContentForSite,
  listRequestsForSite,
  SUNG_NOEN_SITE_ID,
} from "@/lib/site-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "หลังบ้านเว็บไซต์",
  robots: { index: false, follow: false },
};

export default async function AdminSitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const user = await requireSiteAdminUser(`/admin/${siteId}`);

  if (siteId === DEMO_SITE.id) {
    return (
      <AdminWorkspace
        initialSite={DEMO_SITE}
        initialContent={DEMO_CONTENT}
        initialRequests={DEMO_REQUESTS}
        initialStats={DEMO_STATS}
        user={{ displayName: user.displayName, email: user.email, authSource: user.authSource }}
      />
    );
  }

  let site = null;
  try {
    site = await getManagedSite(siteId, user.id);
    if (!site && siteId === SUNG_NOEN_SITE_ID && user.authSource === "chatgpt") {
      site = await ensureSungNoenSiteForUser(user.id, user.email);
    }
  } catch (error) {
    console.error("managed site unavailable", error);
  }
  if (!site) notFound();

  let content: ContentRecord[] = [];
  let requests: ServiceRequestRecord[] = [];
  let stats: DashboardStats = { content: 0, drafts: 0, openRequests: 0, completedRequests: 0 };
  try {
    [content, requests, stats] = await Promise.all([
      listContentForSite(site.id),
      listRequestsForSite(site.id),
      getDashboardStats(site.id),
    ]);
  } catch (error) {
    console.error("admin workspace data unavailable", error);
  }

  return (
    <AdminWorkspace
      initialSite={site}
      initialContent={content}
      initialRequests={requests}
      initialStats={stats}
      user={{ displayName: user.displayName, email: user.email, authSource: user.authSource }}
    />
  );
}
