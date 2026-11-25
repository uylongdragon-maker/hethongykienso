import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import MainLayout from "@/components/MainLayout";
import { getSession } from "@/lib/auth";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HỆ THỐNG ỨNG DỤNG TỔNG HỢP, THEO DÕI GIẢI QUYẾT KIẾN NGHỊ CỬ TRI CỦA HỘI ĐỒNG NHÂN DÂN PHƯỜNG BÌNH ĐÔNG",
  description: "HỆ THỐNG ỨNG DỤNG TỔNG HỢP, THEO DÕI GIẢI QUYẾT KIẾN NGHỊ CỬ TRI CỦA HỘI ĐỒNG NHÂN DÂN PHƯỜNG BÌNH ĐÔNG",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="vi" className={montserrat.variable}>
      <body>
        <MainLayout initialUser={session}>{children}</MainLayout>
      </body>
    </html>
  );
}
