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
  title: "Hệ thống ứng dụng tổng hợp, theo dõi giải quyết kiến nghị cử tri của Hội đồng nhân dân phường Bình Đông",
  description: "Hệ thống ứng dụng tổng hợp, theo dõi giải quyết kiến nghị cử tri của Hội đồng nhân dân phường Bình Đông",
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
