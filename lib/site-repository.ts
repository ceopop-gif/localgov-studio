import { supabaseRest } from "@/db/supabase-rest";
import { rows, createRecord, runOperation, toDatabase } from "@/db/repository";
import { MASTER_TEMPLATE_NAME, MASTER_TEMPLATE_SITE_ID } from "@/lib/template-identity";
import { getSiteAccessStatus } from "@/lib/site-access";
import type {
  ContentRecord,
  DashboardStats,
  ServiceRequestRecord,
  SiteRecord,
} from "@/lib/models";

export const SUNG_NOEN_SITE_ID = MASTER_TEMPLATE_SITE_ID;
export const SUNG_NOEN_SITE_SLUG = "sung-noen";

const SUNG_NOEN_OFFICIAL_DATA = {
  name: MASTER_TEMPLATE_NAME,
  englishName: "Sung Noen Subdistrict Municipality",
  organizationType: "เทศบาลตำบล",
  province: "นครราชสีมา",
  district: "สูงเนิน",
  subdistrict: "สูงเนิน",
  address: "111 หมู่ 1 ถนนมิตรสัมพันธ์ ตำบลสูงเนิน อำเภอสูงเนิน จังหวัดนครราชสีมา 30170",
  phone: "0-4441-9795, 0-4441-9397, 0-4441-9930",
  email: "sungnoen.general@gmail.com",
  vision:
    "เทศบาลตำบลสูงเนินต้องเป็นเมืองน่าอยู่ ปลอดภัย สะอาด เป็นระเบียบ โปร่งใสในการบริหาร มีเทคโนโลยีและนวัตกรรมที่ทันสมัย การให้บริการประชาชนอย่างเท่าเทียม สนับสนุนการใช้พลังงานสะอาดแบบยั่งยืน",
  primaryColor: "#0B5260",
  secondaryColor: "#E4B949",
  servicesJson:
    '["lighting","road","water","waste","complaint","construction","tax","welfare"]',
  completeness: 67,
} as const;

const EXAMPLE_ARTICLE_TIMESTAMP = "2026-09-08T00:00:00.000Z";

const SUNG_NOEN_EXAMPLE_ARTICLES = [
  {
    id: "example-article-road-lighting",
    siteId: SUNG_NOEN_SITE_ID,
    type: "article",
    title: "ไฟถนนดับหรือถนนชำรุด แจ้งอย่างไรให้แก้ไขได้ตรงจุด",
    excerpt: "เตรียมภาพ จุดเกิดเหตุ และจุดสังเกตให้ครบ ช่วยให้เจ้าหน้าที่ตรวจสอบพื้นที่และประสานงานได้รวดเร็วขึ้น",
    body: `ถนน ทางเท้า และไฟส่องสว่างสาธารณะเป็นเรื่องใกล้ตัวที่ส่งผลต่อความปลอดภัยของทุกคน หากพบหลุมบ่อ ฝาท่อชำรุด ไฟถนนดับ หรือสิ่งกีดขวาง ควรแจ้งหน่วยงานท้องถิ่นทันที โดยหลีกเลี่ยงการเข้าใกล้จุดอันตรายหรือซ่อมแซมด้วยตนเอง

ก่อนส่งเรื่อง เตรียมข้อมูล 3 อย่าง ได้แก่ ภาพที่เห็นปัญหาชัดเจน ตำแหน่งหรือบ้านเลขที่ใกล้เคียง และจุดสังเกตที่เจ้าหน้าที่หาเจอได้ง่าย หากใช้โทรศัพท์มือถือ สามารถกดใช้ตำแหน่งปัจจุบันเพื่อแนบพิกัดจริงกับคำร้องได้

อธิบายผลกระทบสั้น ๆ เช่น อยู่ใกล้ทางแยก มีผู้สูงอายุใช้เส้นทาง หรือเกิดน้ำขังเมื่อฝนตก ข้อมูลเหล่านี้ช่วยให้เจ้าหน้าที่ประเมินความเร่งด่วนได้โดยไม่ต้องคาดเดา

หลังส่งคำร้อง ควรเก็บเลขรับเรื่องไว้เพื่อติดตามสถานะ หากพบว่าสภาพพื้นที่เปลี่ยนแปลงหรืออันตรายเพิ่มขึ้น สามารถใช้เลขเดิมประกอบการแจ้งข้อมูลเพิ่มเติมได้`,
    category: "โครงสร้างพื้นฐานใกล้บ้าน",
    fiscalYear: null,
    status: "published",
    coverUrl: "/graphics/articles/road-lighting.webp",
    galleryJson: '["/graphics/articles/road-lighting.webp"]',
    youtubeUrl: "",
    attachmentUrl: "",
    attachmentName: "",
    createdBy: "ระบบตัวอย่างสำหรับแก้ไข",
    approvedBy: "ระบบตัวอย่าง",
    scheduledAt: null,
    publishedAt: EXAMPLE_ARTICLE_TIMESTAMP,
    createdAt: EXAMPLE_ARTICLE_TIMESTAMP,
    updatedAt: EXAMPLE_ARTICLE_TIMESTAMP,
  },
  {
    id: "example-article-waste-environment",
    siteId: SUNG_NOEN_SITE_ID,
    type: "article",
    title: "แยกขยะที่บ้าน เริ่มง่าย ช่วยให้ชุมชนสะอาดขึ้นทุกวัน",
    excerpt: "รู้จักแยกขยะเปียก ขยะรีไซเคิล ขยะทั่วไป และขยะอันตราย ก่อนนำออกจากบ้าน",
    body: `การจัดการขยะที่ดีเริ่มได้ตั้งแต่ในบ้าน เมื่อแยกขยะก่อนทิ้ง เจ้าหน้าที่จัดเก็บทำงานได้ปลอดภัยขึ้น วัสดุที่นำกลับมาใช้ใหม่ได้ไม่ปะปนกับเศษอาหาร และชุมชนลดกลิ่นรวมถึงสัตว์พาหะได้

เริ่มจากจัดภาชนะอย่างน้อย 4 กลุ่ม คือ ขยะเปียกจากอาหาร วัสดุรีไซเคิลที่สะอาดและแห้ง ขยะทั่วไป และขยะอันตราย เช่น หลอดไฟ ถ่านไฟฉาย หรือกระป๋องสารเคมี ควรปิดถุงให้เรียบร้อยและแยกของมีคมในภาชนะที่แข็งแรง

วัน เวลา และจุดทิ้งขยะอาจแตกต่างกันในแต่ละพื้นที่ จึงควรตรวจประกาศของหน่วยงานหรือสอบถามเจ้าหน้าที่ก่อนนำขยะชิ้นใหญ่และขยะอันตรายออกมาวาง หากพบขยะตกค้าง ให้ถ่ายภาพ ระบุจุด และแจ้งผ่านระบบคำร้อง

ชุมชนที่สะอาดไม่ใช่งานของฝ่ายใดฝ่ายหนึ่ง ประชาชนช่วยลดและแยกขยะ ส่วนหน่วยงานท้องถิ่นจัดระบบเก็บขน ดูแลพื้นที่สาธารณะ และสื่อสารตารางบริการให้เข้าใจตรงกัน`,
    category: "สิ่งแวดล้อมและความสะอาด",
    fiscalYear: null,
    status: "published",
    coverUrl: "/graphics/articles/waste-environment.webp",
    galleryJson: '["/graphics/articles/waste-environment.webp"]',
    youtubeUrl: "",
    attachmentUrl: "",
    attachmentName: "",
    createdBy: "ระบบตัวอย่างสำหรับแก้ไข",
    approvedBy: "ระบบตัวอย่าง",
    scheduledAt: null,
    publishedAt: EXAMPLE_ARTICLE_TIMESTAMP,
    createdAt: EXAMPLE_ARTICLE_TIMESTAMP,
    updatedAt: EXAMPLE_ARTICLE_TIMESTAMP,
  },
  {
    id: "example-article-elderly-welfare",
    siteId: SUNG_NOEN_SITE_ID,
    type: "article",
    title: "ผู้สูงอายุและผู้พิการ ติดต่อขอข้อมูลสวัสดิการอย่างไร",
    excerpt: "เริ่มจากตรวจสิทธิ เตรียมเอกสาร และติดต่อหน่วยงานท้องถิ่นในพื้นที่ทะเบียนบ้านของผู้ขอรับบริการ",
    body: `หน่วยงานท้องถิ่นเป็นหนึ่งในจุดประสานสำคัญของงานสวัสดิการชุมชน ทั้งข้อมูลผู้สูงอายุ ผู้พิการ เด็ก ครอบครัวเปราะบาง และผู้ประสบปัญหาทางสังคม แต่เงื่อนไขและช่วงเวลารับลงทะเบียนอาจเปลี่ยนแปลงได้ จึงควรสอบถามข้อมูลล่าสุดก่อนทุกครั้ง

เมื่อจะติดต่อ ควรเตรียมบัตรประจำตัวประชาชน ทะเบียนบ้าน เอกสารรับรองที่เกี่ยวข้อง และข้อมูลบัญชีธนาคารตามที่เจ้าหน้าที่แจ้ง หากให้ญาติหรือผู้ดูแลดำเนินการแทน อาจต้องมีเอกสารเพิ่มเติมตามประเภทบริการ

บอกเจ้าหน้าที่ให้ชัดว่าต้องการตรวจสิทธิ สมัครใหม่ เปลี่ยนแปลงข้อมูล หรือแจ้งเหตุที่ทำให้ไม่สามารถเดินทางไปติดต่อด้วยตนเอง หากเป็นผู้ป่วยติดเตียงหรือมีข้อจำกัดด้านการเดินทาง ควรแจ้งสภาพปัญหาและช่องทางติดต่อกลับไว้ครบถ้วน

อย่าส่งภาพบัตรประชาชนหรือข้อมูลส่วนบุคคลผ่านช่องทางสาธารณะ ให้ใช้แบบฟอร์มที่หน่วยงานกำหนดหรือส่งตรงกับเจ้าหน้าที่ และเก็บหลักฐานการยื่นเรื่องไว้จนกว่าจะดำเนินการเรียบร้อย`,
    category: "สวัสดิการและคุณภาพชีวิต",
    fiscalYear: null,
    status: "published",
    coverUrl: "/graphics/articles/elderly-welfare.webp",
    galleryJson: '["/graphics/articles/elderly-welfare.webp"]',
    youtubeUrl: "",
    attachmentUrl: "",
    attachmentName: "",
    createdBy: "ระบบตัวอย่างสำหรับแก้ไข",
    approvedBy: "ระบบตัวอย่าง",
    scheduledAt: null,
    publishedAt: EXAMPLE_ARTICLE_TIMESTAMP,
    createdAt: EXAMPLE_ARTICLE_TIMESTAMP,
    updatedAt: EXAMPLE_ARTICLE_TIMESTAMP,
  },
  {
    id: "example-article-public-health",
    siteId: SUNG_NOEN_SITE_ID,
    type: "article",
    title: "หน้าฝนนี้ ช่วยกันลดแหล่งเพาะยุงและดูแลทางระบายน้ำ",
    excerpt: "สำรวจน้ำขังรอบบ้านทุกสัปดาห์ พร้อมแจ้งจุดเสี่ยงในพื้นที่สาธารณะให้เจ้าหน้าที่ตรวจสอบ",
    body: `เมื่อเข้าสู่ฤดูฝน ภาชนะเล็ก ๆ ที่มีน้ำขังและทางระบายน้ำที่อุดตันอาจกลายเป็นปัญหาสุขภาพและสิ่งแวดล้อมของทั้งชุมชน การสำรวจรอบบ้านอย่างสม่ำเสมอจึงช่วยลดความเสี่ยงได้ตั้งแต่ต้นทาง

เทน้ำออกจากจานรองกระถาง ปิดฝาภาชนะเก็บน้ำ เก็บยางรถยนต์และภาชนะที่ไม่ใช้ให้พ้นฝน รวมถึงเปลี่ยนน้ำในแจกันตามความเหมาะสม หากพบขยะหรือวัชพืชขวางทางระบายน้ำบริเวณบ้าน ควรจัดการโดยไม่ลงไปในจุดที่เสี่ยงอันตราย

สำหรับท่อสาธารณะ คูระบายน้ำ หรือพื้นที่รกร้างที่ประชาชนจัดการเองไม่ได้ ให้ถ่ายภาพและปักหมุดตำแหน่งผ่านระบบคำร้อง ระบุว่ามีน้ำขัง กลิ่น หรือยุงจำนวนมาก และแจ้งช่วงเวลาที่พบปัญหา

หน่วยงานท้องถิ่นสามารถนำข้อมูลจากหลายจุดมาวางแผนสำรวจ ทำความสะอาด และประสานงานด้านสาธารณสุขได้แม่นยำขึ้น ส่วนประชาชนช่วยติดตามพื้นที่ใกล้บ้านและแจ้งข้อมูลใหม่เมื่อสถานการณ์เปลี่ยนแปลง`,
    category: "สุขภาพชุมชน",
    fiscalYear: null,
    status: "published",
    coverUrl: "/graphics/articles/public-health.webp",
    galleryJson: '["/graphics/articles/public-health.webp"]',
    youtubeUrl: "",
    attachmentUrl: "",
    attachmentName: "",
    createdBy: "ระบบตัวอย่างสำหรับแก้ไข",
    approvedBy: "ระบบตัวอย่าง",
    scheduledAt: null,
    publishedAt: EXAMPLE_ARTICLE_TIMESTAMP,
    createdAt: EXAMPLE_ARTICLE_TIMESTAMP,
    updatedAt: EXAMPLE_ARTICLE_TIMESTAMP,
  },
  {
    id: "example-article-community-participation",
    siteId: SUNG_NOEN_SITE_ID,
    type: "article",
    title: "ประชาชนมีส่วนร่วมกับแผนพัฒนาท้องถิ่นได้อย่างไร",
    excerpt: "ติดตามประกาศ เตรียมข้อเสนอจากปัญหาจริง และร่วมสะท้อนความต้องการของชุมชนอย่างมีข้อมูล",
    body: `แผนพัฒนาท้องถิ่นมีผลต่อโครงการและบริการในชีวิตประจำวัน ตั้งแต่ถนน น้ำ การจัดการขยะ พื้นที่สาธารณะ ไปจนถึงงานด้านเด็ก ผู้สูงอายุ และสุขภาพชุมชน ประชาชนจึงมีบทบาทสำคัญในการบอกปัญหาและลำดับความต้องการของพื้นที่

เริ่มจากติดตามประกาศการประชุมประชาคม การรับฟังความคิดเห็น และการเผยแพร่ร่างแผนของหน่วยงาน เมื่อมีประเด็นที่ต้องการเสนอ ควรรวบรวมสถานที่ ภาพถ่าย จำนวนผู้ได้รับผลกระทบ และเหตุผลว่าปัญหานั้นสำคัญต่อชุมชนอย่างไร

ข้อเสนอที่ชัดควรระบุปัญหาก่อนเสนอวิธีแก้ เช่น ทางเดินไม่ปลอดภัยสำหรับผู้สูงอายุ น้ำท่วมซ้ำในจุดเดิม หรือพื้นที่เด็กเล่นขาดการดูแล วิธีนี้เปิดโอกาสให้เจ้าหน้าที่พิจารณาทางเลือก งบประมาณ และหน่วยงานที่เกี่ยวข้องได้รอบด้าน

หลังส่งข้อเสนอ ควรติดตามประกาศและเอกสารสาธารณะของหน่วยงาน เพื่อดูว่าประเด็นได้รับการบรรจุ พิจารณา หรือขอข้อมูลเพิ่มเติมหรือไม่ การมีส่วนร่วมอย่างต่อเนื่องช่วยให้แผนสะท้อนชีวิตจริงของคนในพื้นที่มากขึ้น`,
    category: "การมีส่วนร่วมของประชาชน",
    fiscalYear: null,
    status: "published",
    coverUrl: "/graphics/articles/community-participation.webp",
    galleryJson: '["/graphics/articles/community-participation.webp"]',
    youtubeUrl: "",
    attachmentUrl: "",
    attachmentName: "",
    createdBy: "ระบบตัวอย่างสำหรับแก้ไข",
    approvedBy: "ระบบตัวอย่าง",
    scheduledAt: null,
    publishedAt: EXAMPLE_ARTICLE_TIMESTAMP,
    createdAt: EXAMPLE_ARTICLE_TIMESTAMP,
    updatedAt: EXAMPLE_ARTICLE_TIMESTAMP,
  },
] as const;

async function ensureSungNoenExampleArticles() {

  await supabaseRest.insert("content_items", SUNG_NOEN_EXAMPLE_ARTICLES.map(article=>toDatabase({...article})), true);
}

export async function ensureSungNoenSiteForUser(
  userId: string,
  userEmail: string,
): Promise<SiteRecord> {

  const findExisting = async () => {
    const [site] = await rows("sites", {slug:`eq.${SUNG_NOEN_SITE_SLUG}`,limit:"1"});
    return site ?? null;
  };

  const existing = await findExisting();
  if (existing) {
    if (existing.ownerUserId !== userId) {
      throw new Error("เว็บไซต์เทศบาลตำบลสูงเนินมีเจ้าของในระบบแล้ว");
    }
    return existing;
  }

  try {
    await createRecord("sites", {
        id: SUNG_NOEN_SITE_ID,
        ownerUserId: userId,
        slug: SUNG_NOEN_SITE_SLUG,
        status: "draft",
        ...SUNG_NOEN_OFFICIAL_DATA,
      }, {
        id: crypto.randomUUID(),
        siteId: SUNG_NOEN_SITE_ID,
        actorUserId: userId,
        actorEmail: userEmail,
        action: "site.created",
        entityType: "site",
        entityId: SUNG_NOEN_SITE_ID,
        metadata: JSON.stringify({
          slug: SUNG_NOEN_SITE_SLUG,
          template: "local-government-v1",
          requestedByUser: true,
          verifiedSources: [
            "https://sungnoen.go.th/",
            "https://sungnoen.go.th/page27-2/",
            "https://sungnoen.go.th/page39-2/",
          ],
        }),
      }, {
        id: crypto.randomUUID(),
        siteId: SUNG_NOEN_SITE_ID,
        userId,
        email: userEmail,
        role: "super_admin",
        department: "ผู้ดูแลระบบกลาง",
      });
  } catch (error) {
    const racedSite = await findExisting();
    if (racedSite?.ownerUserId === userId) return racedSite;
    throw error;
  }

  const created = await findExisting();
  if (!created) throw new Error("สร้างเว็บไซต์เทศบาลตำบลสูงเนินไม่สำเร็จ");
  return created;
}

export async function listSitesForUser(userId:string):Promise<SiteRecord[]> {
  return rows("sites", {owner_user_id:`eq.${userId}`,order:"updated_at.desc"});
}
export async function getManagedSite(siteId:string,userId:string):Promise<SiteRecord|null> {
  if (userId.startsWith("site-admin:") && userId !== `site-admin:${siteId}`) return null;
  const [site] = await rows("sites", {id:`eq.${siteId}`,limit:"1"});
  if (!site) return null;
  if (await runOperation<boolean>("is_platform_admin",{p_user_id:userId})) return site;
  if (await getSiteAccessStatus(siteId) !== "active") return null;
  if (site.ownerUserId === userId) return site;
  const [membership] = await rows("site_members", {site_id:`eq.${siteId}`,user_id:`eq.${userId}`,active:"eq.true",limit:"1"});
  return membership ? site : null;
}
export async function getPublicSiteBySlug(slug:string):Promise<SiteRecord|null> {
  return (await rows("sites", {slug:`eq.${slug}`,limit:"1"}))[0] ?? null;
}
export async function listPublishedSites():Promise<SiteRecord[]> {
  const sites = await rows("sites", {status:"eq.published",order:"updated_at.desc"});
  const statuses = await Promise.all(sites.map(site => getSiteAccessStatus(site.id)));
  return sites.filter((_, index) => statuses[index] === "active");
}
export async function listContentForSite(siteId:string):Promise<ContentRecord[]> {
  if (siteId === SUNG_NOEN_SITE_ID) await ensureSungNoenExampleArticles();
  return rows("content_items", {site_id:`eq.${siteId}`,order:"updated_at.desc",limit:"80"});
}
export async function listPublishedContent(siteId:string):Promise<ContentRecord[]> {
  if (siteId === SUNG_NOEN_SITE_ID) await ensureSungNoenExampleArticles();
  return rows("content_items", {site_id:`eq.${siteId}`,status:"eq.published",order:"published_at.desc.nullslast,updated_at.desc",limit:"30"});
}
export async function listPublishedServiceForms(siteId:string):Promise<ContentRecord[]> {
  const result:ContentRecord[] = [];
  for(let offset=0;;offset+=200){
    const page = await rows("content_items", {site_id:`eq.${siteId}`,type:"eq.service",status:"eq.published",order:"updated_at.desc,id.asc",offset:String(offset),limit:"200"});
    result.push(...page);
    if(page.length<200)return result;
  }
}
export async function listRequestsForSite(siteId:string):Promise<ServiceRequestRecord[]> {
  return rows("service_requests", {site_id:`eq.${siteId}`,order:"created_at.desc",limit:"80"});
}
export async function getDashboardStats(siteId:string):Promise<DashboardStats> {
  return runOperation<DashboardStats>("dashboard_stats", {p_site_id:siteId});
}

