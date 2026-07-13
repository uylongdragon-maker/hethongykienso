"use client";

import React, { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const navItemsRef = useRef<HTMLUListElement>(null);

  // Animate sidebar nav links on mount
  useGSAP(() => {
    if (navItemsRef.current) {
      gsap.from(navItemsRef.current.querySelectorAll(".nav-link"), {
        opacity: 0,
        x: -16,
        duration: 0.4,
        stagger: 0.07,
        ease: "power3.out",
        clearProps: "transform,opacity",
        delay: 0.1,
      });
    }
  }, { scope: sidebarRef });

  // Animate sidebar expand/collapse
  useEffect(() => {
    if (sidebarRef.current) {
      if (collapsed) {
        gsap.to(sidebarRef.current, {
          opacity: 0,
          x: -20,
          duration: 0.25,
          ease: "power2.in",
        });
      } else {
        gsap.fromTo(
          sidebarRef.current,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }
        );
      }
    }
  }, [collapsed]);

  const navItems = [
    {
      href: "/",
      label: "Tổng quan vụ việc",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      href: "/petitions",
      label: "Sổ theo dõi & Giám sát",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      href: "/reports",
      label: "Báo cáo hiệu suất",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`app-container ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Floating show button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            position: "fixed",
            left: "1rem",
            top: "1rem",
            zIndex: 999,
            backgroundColor: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "10px",
            padding: "0.5rem 0.85rem",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.85rem",
            fontWeight: "600",
            color: "var(--text-primary)",
            transition: "all 0.2s ease",
          }}
          title="Hiện thanh menu"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
          <span>Menu</span>
        </button>
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className="sidebar"
        style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Logo + collapse button */}
        <div
          className="logo-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden" }}>
            <div
              className="logo-icon"
              style={{ borderRadius: "8px", background: "#1d1d1f", width: "30px", height: "30px", flexShrink: 0 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem", overflow: "hidden" }}>
              <span className="logo-text" style={{ fontSize: "0.65rem", lineHeight: "1.25", fontWeight: 800, whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>
                HỆ THỐNG TIẾP NHẬN & GQKN
              </span>
              <span style={{ fontSize: "0.54rem", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                HÀNH CHÍNH SÓ P. BÌNH ĐÔNG
              </span>
            </div>
          </div>

          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0.3rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              borderRadius: "6px",
              transition: "background 0.15s ease",
            }}
            title="Ẩn thanh menu"
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nav section label */}
        <div style={{
          fontSize: "0.65rem",
          fontWeight: "700",
          letterSpacing: "0.08em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          paddingLeft: "0.95rem",
          marginBottom: "0.4rem",
          marginTop: "0.5rem",
        }}>
          Điều hướng
        </div>

        <nav>
          <ul className="nav-menu" ref={navItemsRef}>
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={`nav-link${isActive ? " active" : ""}`}
                    style={{
                      position: "relative",
                      ...(isActive
                        ? {
                            background: "rgba(0,0,0,0.06)",
                            color: "var(--text-primary)",
                          }
                        : {}),
                    }}
                  >
                    {/* Active indicator pill */}
                    {isActive && (
                      <span style={{
                        position: "absolute",
                        left: 0,
                        top: "25%",
                        height: "50%",
                        width: "3px",
                        background: "var(--text-primary)",
                        borderRadius: "0 4px 4px 0",
                      }} />
                    )}
                    <span style={{
                      display: "flex",
                      alignItems: "center",
                      opacity: isActive ? 1 : 0.65,
                      transition: "opacity 0.2s ease",
                    }}>
                      {item.icon}
                    </span>
                    <span className="nav-text">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer */}
        <div className="sidebar-footer" style={{ marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#34c759",
            }} />
            <span>Hệ thống đang hoạt động</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header
          className="main-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0.6rem 2.75rem",
            background: "rgba(245, 245, 247, 0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <span style={{
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            fontWeight: "700",
            letterSpacing: "0.1em",
          }}>
            HỆ THỐNG Ý KIẾN SỐ
          </span>
        </header>
        {children}
      </main>
    </div>
  );
}
