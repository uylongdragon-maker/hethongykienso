"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import JarvisLoader from "@/components/JarvisLoader";

gsap.registerPlugin(useGSAP);

interface SerializedPetition {
  id: string;
  petitionCode: string;
  source: string;
  quarter: string | null;
  senderName: string;
  senderAddress: string;
  senderPhone: string | null;
  category: string;
  location: string;
  content: string;
  attachmentUrl: string | null;
  authority: string;
  department: string;
  receivedDate: string;
  deadline: string;
  extendedUntil: string | null;
  status: string;
  replyDocNumber: string | null;
  replyDocDate: string | null;
  replyDocLink: string | null;
  reviewStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserSession {
  id: string;
  username: string;
  fullName: string;
  role: string;
  department?: string;
}

interface OverviewClientProps {
  initialPetitions: SerializedPetition[];
}

/* ── Shared card style ── */
const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "20px",
  border: "1px solid rgba(0,0,0,0.07)",
  padding: "1.6rem 1.75rem",
  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
};

export default function OverviewClient({ initialPetitions }: OverviewClientProps) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<SerializedPetition | null | undefined>(undefined);

  const heroRef = useRef<HTMLDivElement>(null);
  const bentoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) setUser(data.user);
        else setUser(null);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuth();
  }, []);

  /* GSAP – public landing */
  useGSAP(() => {
    if (!user && heroRef.current) {
      gsap.from(heroRef.current.querySelectorAll(".anim-hero"), {
        opacity: 0, y: 30, stagger: 0.12, duration: 0.8, ease: "power3.out",
      });
    }
  }, { scope: heroRef, dependencies: [user] });

  /* GSAP – bento entrance */
  useGSAP(() => {
    if (user && bentoRef.current) {
      gsap.from(bentoRef.current.querySelectorAll("[data-bento]"), {
        opacity: 0, y: 28, scale: 0.96, stagger: 0.07, duration: 0.7,
        ease: "power3.out", clearProps: "transform,opacity",
      });
    }
  }, { scope: bentoRef, dependencies: [user] });

  const isOverdue = (p: SerializedPetition) =>
    p.status === "Quá hạn" || (p.status !== "Đã xong" && new Date(p.deadline) < new Date());

  const stats = useMemo(() => {
    let inProgress = 0, completed = 0, overdue = 0, pendingAdmin = 0;
    initialPetitions.forEach((p) => {
      if (p.status === "Đã xong") completed++;
      else {
        inProgress++;
        if (p.status === "Chờ Admin phê duyệt") pendingAdmin++;
        if (isOverdue(p)) overdue++;
      }
    });
    return { total: initialPetitions.length, inProgress, completed, overdue, pendingAdmin };
  }, [initialPetitions]);

  const catBreak = useMemo(() => {
    const m = new Map<string, number>();
    initialPetitions.forEach((p) => { const c = p.category || "Khác"; m.set(c, (m.get(c) || 0) + 1); });
    return Array.from(m.entries()).map(([name, count]) => ({
      name, count, pct: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
    }));
  }, [initialPetitions, stats.total]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    const f = initialPetitions.find((p) => p.petitionCode.toLowerCase() === searchCode.trim().toLowerCase());
    setSearchResult(f || null);
  };

  if (loadingUser) {
    return (
      <div style={{ padding: "6rem 2rem", display: "flex", justifyContent: "center" }}>
        <JarvisLoader text="Đang khởi tạo giao diện..." size={120} />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     1. PUBLIC LANDING (chưa đăng nhập)
     ═══════════════════════════════════════════════════ */
  if (!user) {
    return (
      <div ref={heroRef} style={{ backgroundColor: "#f5f5f7", minHeight: "100vh" }}>
        <section style={{
          backgroundColor: "#121316", color: "#fff",
          padding: "5rem 2.5rem 6rem", position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: "-20%", right: "-10%",
            width: 700, height: 700, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(239,68,68,.15) 0%, rgba(0,240,255,.08) 70%, transparent 100%)",
            pointerEvents: "none",
          }} />
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="anim-hero" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.35rem 0.85rem", borderRadius: 9999,
              backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(0,240,255,.3)",
              fontSize: "0.72rem", fontWeight: 700, color: "#00f0ff", marginBottom: "1.75rem",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#00f0ff", boxShadow: "0 0 8px #00f0ff" }} />
              CỔNG DỊCH VỤ CÔNG BÌNH ĐÔNG
            </div>
            <h1 className="anim-hero" style={{
              fontSize: "clamp(2rem,3.8vw,3.4rem)", fontWeight: 800, lineHeight: 1.18,
              letterSpacing: "-0.03em", maxWidth: 980, marginBottom: "1.5rem",
            }}>
              HỆ THỐNG TIẾP NHẬN Ý KIẾN SỐ VÀ GIẢI QUYẾT THỦ TỤC HÀNH CHÍNH PHƯỜNG BÌNH ĐÔNG
            </h1>
            <p className="anim-hero" style={{
              fontSize: "1.05rem", color: "rgba(255,255,255,.7)", maxWidth: 720,
              lineHeight: 1.6, marginBottom: "2.5rem",
            }}>
              Cổng tiếp nhận và tra cứu hồ sơ ý kiến cử tri công khai. Đảm bảo quy trình xử lý minh bạch.
            </p>
            <div className="anim-hero">
              <a href="/login" className="btn-neon-blue" style={{ textDecoration: "none", padding: "0.85rem 1.75rem" }}>
                Đăng nhập Cán bộ / Chuyên viên
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1200, margin: "3rem auto", padding: "0 1.5rem" }}>
          <div style={{ ...cardStyle, padding: "2.5rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>Tra Cứu Tiến Độ</span>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#121316", marginBottom: "1.25rem" }}>Tra cứu Mã vụ việc</h2>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.75rem", maxWidth: 600, marginBottom: "1.25rem" }}>
              <input type="text" value={searchCode} onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Nhập mã (VD: KN2026-042)" required
                style={{ flex: 1, padding: "0.75rem 1rem", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)", fontSize: "0.9rem", fontFamily: "ui-monospace,monospace" }} />
              <button type="submit" className="btn-neon-blue">Tra cứu</button>
            </form>
            {searchResult !== undefined && (
              <div style={{ paddingTop: "1rem", borderTop: "1px solid rgba(0,0,0,.06)" }}>
                {searchResult === null ? (
                  <div style={{ color: "#dc2626", fontSize: "0.88rem", fontWeight: 600 }}>Không tìm thấy vụ việc với mã &quot;{searchCode}&quot;.</div>
                ) : (
                  <div style={{ backgroundColor: "#f9fafb", borderRadius: 12, padding: "1.25rem", border: "1px solid rgba(0,0,0,.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <span style={{ fontWeight: 800, fontFamily: "ui-monospace,monospace" }}>Mã: {searchResult.petitionCode}</span>
                      <span className={`status-badge ${searchResult.status === "Đã xong" ? "status-completed" : "status-in-progress"}`}>{searchResult.status}</span>
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "#374151" }}><strong>Nội dung:</strong> {searchResult.content}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     2. BENTO DASHBOARD (đã đăng nhập)
     ═══════════════════════════════════════════════════ */
  const statCards = [
    { label: "Tổng vụ việc", value: stats.total, color: "#121316" },
    { label: "Chờ Admin duyệt", value: stats.pendingAdmin, color: "#d97706" },
    { label: "Hoàn thành", value: stats.completed, color: "#10b981" },
    { label: "Quá hạn", value: stats.overdue, color: "#ef4444" },
  ];

  return (
    <div ref={bentoRef} style={{ padding: "2rem 2.5rem", maxWidth: 1400, margin: "0 auto" }}>

      {/* ── ROW 1: 4 Stat Cards ── */}
      <div data-bento style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "1.25rem",
        marginBottom: "1.5rem",
      }}>
        {statCards.map((s) => (
          <div key={s.label} style={cardStyle}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
              {s.label}
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: s.color, fontFamily: "ui-monospace,monospace", lineHeight: 1.1 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: Infographics (7) + Task Hub (5) ── */}
      <div data-bento style={{
        display: "grid",
        gridTemplateColumns: "7fr 5fr",
        gap: "1.5rem",
        marginBottom: "1.5rem",
      }}>
        {/* LEFT: Category Infographics */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Phân Rã Lĩnh Vực
          </span>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#121316", marginBottom: "1.25rem" }}>
            Infographics Tiến Độ Rà Soát
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {catBreak.map((c) => (
              <div key={c.name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.3rem" }}>
                  <span>{c.name}</span>
                  <span style={{ fontFamily: "ui-monospace,monospace" }}>{c.count} ({c.pct}%)</span>
                </div>
                <div style={{ height: 10, width: "100%", backgroundColor: "#f3f4f6", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${c.pct}%`, minWidth: c.pct > 0 ? "8px" : 0,
                    background: "linear-gradient(90deg, #ef4444, #f97316, #ffd700, #00f0ff)",
                    borderRadius: 9999, transition: "width .8s cubic-bezier(.16,1,.3,1)",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Task & Approval Hub */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Trung Tâm Tác Vụ
            </span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#121316", marginBottom: "1.25rem" }}>
              Hàng Chờ Phê Duyệt
            </h2>

            <div style={{
              backgroundColor: stats.pendingAdmin > 0 ? "#fffbeb" : "#f0fdf4",
              border: `1px solid ${stats.pendingAdmin > 0 ? "#fde68a" : "#bbf7d0"}`,
              borderRadius: 16, padding: "1.2rem", marginBottom: "1.5rem",
            }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: stats.pendingAdmin > 0 ? "#b45309" : "#166534", textTransform: "uppercase" }}>
                Chờ Admin dứt điểm
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: stats.pendingAdmin > 0 ? "#d97706" : "#166534", fontFamily: "ui-monospace,monospace", lineHeight: 1.2 }}>
                {stats.pendingAdmin} <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#6b7280" }}>hồ sơ</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {user.role === "ADMIN" ? (
              <>
                <a href="/petitions" className="btn-neon-red" style={{ textDecoration: "none", width: "100%", justifyContent: "center" }}>
                  Phê Duyệt Hồ Sơ
                </a>
                <a href="/users" className="btn-neon-blue" style={{ textDecoration: "none", width: "100%", justifyContent: "center" }}>
                  Quản Lý Tài Khoản
                </a>
              </>
            ) : (
              <a href="/petitions" className="btn-neon-blue" style={{ textDecoration: "none", width: "100%", justifyContent: "center" }}>
                Lập Dự Thảo & Trình Admin
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Recent Petitions ── */}
      <div data-bento style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Nhật Ký Mới Nhất</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#121316" }}>Hồ Sơ Kiến Nghị Gần Đây</h2>
          </div>
          <a href="/petitions" className="btn-neon-blue" style={{ textDecoration: "none", padding: "0.4rem 0.85rem", fontSize: "0.78rem" }}>
            Xem tất cả ({stats.total})
          </a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {initialPetitions.slice(0, 4).map((p) => (
            <div key={p.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "0.85rem 1.1rem", borderRadius: 14,
              backgroundColor: "#f9fafb", border: "1px solid rgba(0,0,0,.06)",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontWeight: 800, fontFamily: "ui-monospace,monospace", fontSize: "0.9rem" }}>{p.petitionCode}</span>
                  <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>• {p.senderName}</span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "#374151", marginTop: "0.2rem", maxWidth: 550, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.content}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                <span className={`status-badge ${p.status === "Đã xong" ? "status-completed" : p.status === "Chờ Admin phê duyệt" ? "status-expired" : "status-in-progress"}`}>
                  {p.status}
                </span>
                <a href={`/petitions/${p.id}`}
                  className={p.status === "Chờ Admin phê duyệt" ? "btn-neon-red" : "btn-neon-blue"}
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.74rem", textDecoration: "none" }}>
                  Chi tiết
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
