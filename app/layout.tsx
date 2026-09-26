import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://weblocalgov.com"),
  title: {
    default: "LocalGov Studio — ระบบเว็บไซต์ท้องถิ่นหลายหน่วยงาน",
    template: "%s | LocalGov Studio",
  },
  description:
    "ระบบเว็บไซต์สำเร็จรูปสำหรับ อบต. เทศบาล และองค์กรปกครองส่วนท้องถิ่น พร้อมหน้าบ้าน CMS E-Service และระบบติดตามคำร้อง",
  openGraph: {
    type: "website",
    locale: "th_TH",
    title: "LocalGov Studio — ระบบเว็บไซต์ท้องถิ่นหลายหน่วยงาน",
    description: "สร้างและบริหารหลายเว็บไซต์ท้องถิ่นจากศูนย์กลางเดียว",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}
