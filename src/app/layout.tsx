import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import MainLayout from "@/components/MainLayout";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HỆ THỐNG TIẾP NHẬN VÀ GIẢI QUYẾT KIẾN NGHỊ HÀNH CHÍNH SÓ PHƯỜNG BÌNH ĐÔNG",
  description: "Hệ thống tiếp nhận, xử lý và giám sát ý kiến, kiến nghị của cử tri và công dân.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={montserrat.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
