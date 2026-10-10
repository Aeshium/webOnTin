// Layout gốc — giống file "khung HTML" dùng chung cho MỌI trang.
// Navbar/Footer đặt ở đây nên trang nào cũng có sẵn.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { SiteAccessGate } from "@/components/site-access-gate";

// Font Be Vietnam Pro hỗ trợ tiếng Việt cực chuẩn (dấu không bị vỡ).
const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-bvp",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ÔnTin — Luyện thi Tin học trực tuyến",
    template: "%s · ÔnTin",
  },
  description:
    "Ôn thi Tin học với đề trắc nghiệm theo chuyên đề: phần cứng, hệ điều hành, mạng, Word, Excel, cơ sở dữ liệu. Chấm điểm tức thì, giải thích chi tiết.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="bg-ink-950 font-sans text-slate-200 antialiased">
        <SiteNavbar />
        <SiteAccessGate>
          <main>{children}</main>
        </SiteAccessGate>
        <SiteFooter />
      </body>
    </html>
  );
}
