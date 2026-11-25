"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { SessionUser } from "@/lib/auth";
import { getRoleDisplayName } from "@/lib/petitionUtils";

interface MainLayoutProps {
  children: React.ReactNode;
  initialUser: SessionUser | null;
}

export default function MainLayout({ children, initialUser }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Khi chưa đăng nhập (Cổng tra cứu công khai): hiển thị không gian mở, ẩn thanh điều hướng nội bộ
  if (!user) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <header className="main-header">
          <Link
            href="/"
            style={{
              fontSize: "0.85rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            HỘI ĐỒNG NHÂN DÂN PHƯỜNG BÌNH ĐÔNG
          </Link>
          <Link href="/login" className="btn-primary">
            Đăng nhập cán bộ
          </Link>
        </header>
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    );
  }

  const navItems = [
    {
      href: "/",
      label: "Tổng quan",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      href: "/petitions",
      label: "Sổ theo dõi vụ việc",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      href: "/reports",
      label: "Báo cáo hiệu suất",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      href: "/map",
      label: "Bản đồ vụ việc",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
      ),
    },
    {
      href: "/users",
      label: user.role === "ADMIN" ? "Quản lý tài khoản" : "Hồ sơ cá nhân",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`app-container ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div
        className={`mobile-menu-backdrop ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
          <Link
            href="/"
            title="Hệ thống ứng dụng tổng hợp, theo dõi giải quyết kiến nghị cử tri của Hội đồng nhân dân phường Bình Đông"
            style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}
          >
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              KIẾN NGHỊ CỬ TRI
            </span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              HĐND Phường Bình Đông
            </span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setCollapsed(true);
              setMobileOpen(false);
            }}
            className="btn-secondary"
            style={{ padding: "0.35rem", borderRadius: "8px" }}
            title="Thu gọn thanh điều hướng"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        <nav>
          <ul className="nav-menu">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`nav-link${isActive ? " active" : ""}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth <= 1024) {
                  setMobileOpen((prev) => !prev);
                } else {
                  setCollapsed((prev) => !prev);
                }
              }}
              className="btn-secondary"
              style={{ padding: "0.45rem 0.65rem" }}
              title="Bật hoặc tắt menu điều hướng"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>

            <span
              style={{
                fontSize: "0.82rem",
                color: "var(--text-primary)",
                fontWeight: 700,
              }}
            >
              Hệ thống theo dõi giải quyết kiến nghị cử tri HĐND phường Bình Đông
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link
              href="/users"
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}
            >
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {user.fullName}
              </span>
              <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                {getRoleDisplayName(user.role)}
              </span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary"
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.78rem" }}
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
