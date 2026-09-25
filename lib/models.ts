export type SiteRecord = {
  id: string;
  ownerUserId: string;
  name: string;
  englishName: string;
  slug: string;
  organizationType: string;
  province: string;
  district: string;
  subdistrict: string;
  address: string;
  phone: string;
  email: string;
  vision: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  servicesJson: string;
  homepageJson: string;
  status: string;
  completeness: number;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
};

export type ContentRecord = {
  id: string;
  siteId: string;
  type: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  fiscalYear: number | null;
  status: string;
  coverUrl: string;
  galleryJson: string;
  youtubeUrl: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdBy: string;
  approvedBy: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRequestRecord = {
  id: string;
  siteId: string;
  trackingCode: string;
  requestType: string;
  fullName: string;
  phone: string;
  email: string;
  details: string;
  address: string;
  latitude: string;
  longitude: string;
  status: string;
  assignedDepartment: string;
  consent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardStats = {
  content: number;
  drafts: number;
  openRequests: number;
  completedRequests: number;
};

export const DEMO_SITE: SiteRecord = {
  id: "demo-sungnoen",
  ownerUserId: "demo",
  name: "เทศบาลตำบลตัวอย่าง",
  englishName: "Subdistrict Municipality Template",
  slug: "sungnoen-demo",
  organizationType: "เทศบาลตำบล",
  province: "ต้องตรวจสอบ",
  district: "ต้องตรวจสอบ",
  subdistrict: "ต้องตรวจสอบ",
  address: "ต้องตรวจสอบก่อนเผยแพร่",
  phone: "ต้องตรวจสอบ",
  email: "ต้องตรวจสอบ",
  vision: "ข้อความวิสัยทัศน์รอข้อมูลยืนยันจากหน่วยงาน",
  logoUrl: "",
  primaryColor: "#0B5260",
  secondaryColor: "#E4B949",
  servicesJson:
    '["lighting","road","water","waste","complaint","construction","tax","welfare"]',
  homepageJson: "{}",
  status: "template",
  completeness: 42,
  createdAt: "2026-09-07 00:00:00",
  updatedAt: "2026-09-07 00:00:00",
  isDemo: true,
};

export const DEMO_CONTENT: ContentRecord[] = [
  {
    id: "demo-news-1",
    siteId: DEMO_SITE.id,
    type: "news",
    title: "ตัวอย่างข่าวประชาสัมพันธ์ของหน่วยงาน",
    excerpt: "พื้นที่นี้จะแสดงข่าวล่าสุดหลังเจ้าหน้าที่ตรวจและอนุมัติแล้ว",
    body: "ข้อมูลสาธิตสำหรับแสดงรูปแบบหน้าเว็บไซต์เท่านั้น",
    category: "ข่าวประชาสัมพันธ์",
    fiscalYear: 2569,
    status: "published",
    coverUrl: "",
    galleryJson: "[]",
    youtubeUrl: "",
    createdBy: "ระบบตัวอย่าง",
    approvedBy: "",
    scheduledAt: null,
    publishedAt: "2026-09-07 00:00:00",
    createdAt: "2026-09-07 00:00:00",
    updatedAt: "2026-09-07 00:00:00",
  },
  {
    id: "demo-news-2",
    siteId: DEMO_SITE.id,
    type: "procurement",
    title: "ตัวอย่างประกาศจัดซื้อจัดจ้าง",
    excerpt: "ค้นหาเอกสารได้ตามปี ประเภท เลขโครงการ และหน่วยงาน",
    body: "ข้อมูลสาธิตสำหรับแสดงรูปแบบหน้าเว็บไซต์เท่านั้น",
    category: "จัดซื้อจัดจ้าง",
    fiscalYear: 2569,
    status: "published",
    coverUrl: "",
    galleryJson: "[]",
    youtubeUrl: "",
    createdBy: "ระบบตัวอย่าง",
    approvedBy: "",
    scheduledAt: null,
    publishedAt: "2026-09-06 00:00:00",
    createdAt: "2026-09-06 00:00:00",
    updatedAt: "2026-09-06 00:00:00",
  },
  {
    id: "demo-news-3",
    siteId: DEMO_SITE.id,
    type: "ita",
    title: "ตัวอย่างข้อมูลเปิดเผย ITA / OIT ปีงบประมาณ 2569",
    excerpt: "จัดหมวดข้อมูลโปร่งใสแยกตามปีงบประมาณอย่างชัดเจน",
    body: "ข้อมูลสาธิตสำหรับแสดงรูปแบบหน้าเว็บไซต์เท่านั้น",
    category: "ITA / OIT",
    fiscalYear: 2569,
    status: "published",
    coverUrl: "",
    galleryJson: "[]",
    youtubeUrl: "",
    createdBy: "ระบบตัวอย่าง",
    approvedBy: "",
    scheduledAt: null,
    publishedAt: "2026-09-05 00:00:00",
    createdAt: "2026-09-05 00:00:00",
    updatedAt: "2026-09-05 00:00:00",
  },
];

export const DEMO_REQUESTS: ServiceRequestRecord[] = [
  {
    id: "demo-request-1",
    siteId: DEMO_SITE.id,
    trackingCode: "DEMO-2569-001",
    requestType: "แจ้งไฟฟ้าสาธารณะ",
    fullName: "ข้อมูลผู้แจ้งถูกปกปิด",
    phone: "***-***-0001",
    email: "",
    details: "ตัวอย่างคำร้องสำหรับสาธิตขั้นตอนการทำงาน",
    address: "พื้นที่ตัวอย่าง",
    latitude: "",
    longitude: "",
    status: "in_progress",
    assignedDepartment: "กองช่าง",
    consent: true,
    createdAt: "2026-09-07 08:30:00",
    updatedAt: "2026-09-07 09:10:00",
  },
  {
    id: "demo-request-2",
    siteId: DEMO_SITE.id,
    trackingCode: "DEMO-2569-002",
    requestType: "แจ้งขยะ",
    fullName: "ข้อมูลผู้แจ้งถูกปกปิด",
    phone: "***-***-0002",
    email: "",
    details: "ตัวอย่างคำร้องสำหรับสาธิตขั้นตอนการทำงาน",
    address: "พื้นที่ตัวอย่าง",
    latitude: "",
    longitude: "",
    status: "received",
    assignedDepartment: "กองสาธารณสุข",
    consent: true,
    createdAt: "2026-09-07 10:20:00",
    updatedAt: "2026-09-07 10:20:00",
  },
];

export const DEMO_STATS: DashboardStats = {
  content: 3,
  drafts: 2,
  openRequests: 2,
  completedRequests: 8,
};
