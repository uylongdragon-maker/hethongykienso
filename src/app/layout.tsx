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
  title: "Hệ thống ứng dụng tổng hợp, theo dõi giải quyết kiến nghị cử tri của Hội đồng nhân dân phường Bình Đông",
  description: "Hệ thống ứng dụng tổng hợp, theo dõi giải quyết kiến nghị cử tri của Hội đồng nhân dân phường Bình Đông",
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
