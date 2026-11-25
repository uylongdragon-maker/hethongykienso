"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { SessionUser } from "@/lib/auth";
import { getRoleDisplayName } from "@/lib/petitionUtils";
import { Spinner } from "@/components/Spinner";

interface MainLayoutProps {
  children: React.ReactNode;
  initialUser: SessionUser | null;
}

const FONT_SCALES = [92, 100, 110, 120] as const;

export default function MainLayout({ children, initialUser }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [fontScaleIdx, setFontScaleIdx] = useState<number>(1);
  const [navigating, setNavigating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    setMobileOpen(false);
    setNavigating(false);
  }, [pathname]);

  // Hiển thị thanh tiến trình ngay lập tức khi bấm chuyển trang nội bộ
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      const destPath = href.split("?")[0].split("#")[0];
      if (destPath !== pathname) {
        setNavigating(true);
      }
    };
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [pathname]);

  useEffect(() => {
    if (!navigating) return;
    const t = setTimeout(() => setNavigating(false), 8000);
    return () => clearTimeout(t);
  }, [navigating]);

  // Khôi phục cỡ chữ đã chọn từ localStorage (hỗ trợ lãnh đạo lớn tuổi)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hdnd_font_scale_idx");
      if (saved !== null) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed < FONT_SCALES.length) {
          setFontScaleIdx(parsed);
          document.documentElement.style.fontSize = `${FONT_SCALES[parsed]}%`;
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const updateFontScale = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(FONT_SCALES.length - 1, nextIdx));
    setFontScaleIdx(clamped);
    document.documentElement.style.fontSize = `${FONT_SCALES[clamped]}%`;
    try {
      localStorage.setItem("hdnd_font_scale_idx", String(clamped));
    } catch {
      // Ignore
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout Error:", err);
      setLoggingOut(false);
    }
  };

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const fontSizeControls = (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
      <button
        type="button"
        onClick={() => updateFontScale(fontScaleIdx - 1)}
        disabled={fontScaleIdx === 0}
        className="party-header-btn"
        title="Thu nhỏ cỡ chữ"
        aria-label="Thu nhỏ cỡ chữ"
      >
        A-
      </button>
      <button
        type="button"
        onClick={() => updateFontScale(fontScaleIdx + 1)}
        disabled={fontScaleIdx === FONT_SCALES.length - 1}
        className="party-header-btn"
        title="Phóng to cỡ chữ"
        aria-label="Phóng to cỡ chữ"
      >
        A+
      </button>
    </div>
  );

  // Chưa đăng nhập: Cổng tra cứu công khai với Banner Đỏ cờ - Vàng kim trang nghiêm
  if (!user) {
    return (
      <div className="party-shell">
        <header className="party-header">
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.8rem", minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#FDE047", letterSpacing: "0.05em" }}>
                HỘI ĐỒNG NHÂN DÂN PHƯỜNG BÌNH ĐÔNG
              </span>
              <span
                className="party-title-long"
                style={{
                  fontSize: "0.84rem",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  textTransform: "uppercase",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                HỆ THỐNG ỨNG DỤNG TỔNG HỢP, THEO DÕI GIẢI QUYẾT KIẾN NGHỊ CỬ TRI CỦA HỘI ĐỒNG NHÂN DÂN PHƯỜNG BÌNH ĐÔNG
              </span>
            </div>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
            {fontSizeControls}
            <Link href="/login" className="party-header-btn-gold">
              Đăng nhập cán bộ
            </Link>
          </div>
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      href: "/petitions",
      label: "Sổ theo dõi kiến nghị",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      href: "/map",
      label: "Bản đồ địa bàn",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ];

  return (
    <div className="party-shell">
      {navigating && (
        <div className="route-progress-track" role="progressbar" aria-label="Đang tải trang">
          <div className="route-progress-bar" />
        </div>
      )}
      {/* Banner Đỏ cờ - Vàng kim toàn chiều rộng phía trên */}
      <header className="party-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth <= 1024) {
                setMobileOpen((prev) => !prev);
              } else {
                setCollapsed((prev) => !prev);
              }
            }}
            className="party-header-btn"
            title="Ẩn hoặc hiện danh mục chức năng"
            aria-label="Menu điều hướng"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#FDE047", letterSpacing: "0.05em" }}>
                HỘI ĐỒNG NHÂN DÂN PHƯỜNG BÌNH ĐÔNG
              </span>
              <span
                className="party-title-long"
                style={{
                  fontSize: "0.84rem",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  textTransform: "uppercase",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                HỆ THỐNG ỨNG DỤNG TỔNG HỢP, THEO DÕI GIẢI QUYẾT KIẾN NGHỊ CỬ TRI CỦA HỘI ĐỒNG NHÂN DÂN PHƯỜNG BÌNH ĐÔNG
              </span>
            </div>
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexShrink: 0 }}>
          {fontSizeControls}

          <Link
            href="/users"
            style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.25 }}
          >
            <span style={{ fontSize: "0.84rem", fontWeight: 800, color: "#FFFFFF" }}>
              {user.fullName}
            </span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#FDE047" }}>
              {getRoleDisplayName(user.role)}
            </span>
          </Link>

          <button type="button" onClick={handleLogout} disabled={loggingOut} className="party-header-btn">
            {loggingOut ? (
              <>
                <Spinner size={13} />
                <span>Đang thoát...</span>
              </>
            ) : (
              "Đăng xuất"
            )}
          </button>
        </div>
      </header>

      {/* Không gian làm việc 2 cột: Menu chức năng bên trái + Nội dung chính */}
      <div className={`app-container ${collapsed ? "sidebar-collapsed" : ""}`}>
        <div
          className={`mobile-menu-backdrop ${mobileOpen ? "open" : ""}`}
          onClick={() => setMobileOpen(false)}
        />

        <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
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

        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
