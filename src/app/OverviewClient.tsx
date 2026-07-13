"use client";

import { useMemo, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import GoongMap from "@/components/GoongMap";

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

interface OverviewClientProps {
  initialPetitions: SerializedPetition[];
}

// Minimalist Superlist icons
const IconTotal = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconPending = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconResolved = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconOverdue = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function OverviewClient({ initialPetitions }: OverviewClientProps) {
  const isOverdue = (pet: SerializedPetition) => {
    return pet.status === "Quá hạn" || (pet.status !== "Đã xong" && new Date(pet.deadline) < new Date());
  };

  const stats = useMemo(() => {
    const total = initialPetitions.length;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    initialPetitions.forEach((p) => {
      if (p.status === "Đã xong") {
        completed++;
      } else {
        inProgress++;
        if (isOverdue(p)) {
          overdue++;
        }
      }
    });

    return { total, inProgress, completed, overdue };
  }, [initialPetitions]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    initialPetitions.forEach((p) => {
      map.set(p.category, (map.get(p.category) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [initialPetitions]);

  const authorityStats = useMemo(() => {
    const map = new Map<string, number>();
    initialPetitions.forEach((p) => {
      map.set(p.authority, (map.get(p.authority) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [initialPetitions]);

  const sourceStats = useMemo(() => {
    const map = new Map<string, number>();
    initialPetitions.forEach((p) => {
      map.set(p.source, (map.get(p.source) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [initialPetitions]);

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Animate stat cards on load
    gsap.from(".stat-card", {
      opacity: 0,
      y: 24,
      duration: 0.55,
      stagger: 0.1,
      ease: "power3.out",
      clearProps: "transform,opacity",  // Only clear animated props
    });
    // Animate glass cards / chart sections
    gsap.from(".glass-card, .dashboard-card", {
      opacity: 0,
      y: 18,
      duration: 0.5,
      stagger: 0.08,
      delay: 0.3,
      ease: "power3.out",
      clearProps: "transform,opacity",  // Only clear animated props
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="page-content">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "2.5rem" }}>
        <div>
          <h1 className="page-title">Tổng quan & Phân tích</h1>
          <p className="page-subtitle">Thống kê dữ liệu, cơ cấu phân loại kiến nghị cử tri</p>
        </div>
      </div>

      {/* Superlist Clean Grid Cards */}
      <section className="stats-grid" style={{ marginBottom: "3rem" }}>
        {/* Tổng số */}
        <div className="stat-card">
          <div className="stat-indicator total"></div>
          <div className="stat-card-icon" style={{ backgroundColor: "#eaeaea", color: "#191918" }}>
            <IconTotal />
          </div>
          <span className="stat-label">Tổng số tiếp nhận</span>
          <span className="stat-value">{stats.total}</span>
        </div>

        {/* Đang giải quyết */}
        <div className="stat-card">
          <div className="stat-indicator pending"></div>
          <div className="stat-card-icon" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
            <IconPending />
          </div>
          <span className="stat-label">Đang giải quyết</span>
          <span className="stat-value">{stats.inProgress}</span>
        </div>

        {/* Đã hoàn thành */}
        <div className="stat-card">
          <div className="stat-indicator resolved"></div>
          <div className="stat-card-icon" style={{ backgroundColor: "#eefbf6", color: "#0fa370" }}>
            <IconResolved />
          </div>
          <span className="stat-label">Đã hoàn thành</span>
          <span className="stat-value">{stats.completed}</span>
        </div>

        {/* Quá hạn */}
        <div className="stat-card">
          <div className="stat-indicator overdue"></div>
          <div className="stat-card-icon" style={{ backgroundColor: "#fdf1f1", color: "#df4747" }}>
            <IconOverdue />
          </div>
          <span className="stat-label">Vụ việc quá hạn</span>
          <span className="stat-value">{stats.overdue}</span>
        </div>
      </section>

      {/* Document Sheet for charts */}
      <div className="glass-card" style={{ padding: "2.5rem" }}>
        <h3
          className="detail-section-title"
          style={{ marginTop: 0, marginBottom: "2rem" }}
        >
          Phân tích cơ cấu vụ việc
        </h3>

        {/* Two-column charts */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            marginBottom: "3rem",
          }}
        >
          {/* Lĩnh vực */}
          <div>
            <h4
              style={{
                marginBottom: "1.5rem",
                color: "#191918",
                fontSize: "0.95rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Kiến nghị theo Lĩnh vực
            </h4>
            {stats.total === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                Chưa có dữ liệu thống kê.
              </p>
            ) : (
              categoryStats.map(([category, count]) => (
                <div key={category} style={{ marginBottom: "1.25rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.4rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {category}
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>
                      {count} · {Math.round((count / stats.total) * 100)}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill primary"
                      style={{
                        width: `${(count / stats.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Nguồn tiếp nhận */}
          <div>
            <h4
              style={{
                marginBottom: "1.5rem",
                color: "#191918",
                fontSize: "0.95rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Nguồn tiếp nhận
            </h4>
            {stats.total === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                Chưa có dữ liệu thống kê.
              </p>
            ) : (
              sourceStats.map(([source, count]) => (
                <div key={source} style={{ marginBottom: "1.25rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.4rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        maxWidth: "240px",
                      }}
                      title={source}
                    >
                      {source}
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>
                      {count} · {Math.round((count / stats.total) * 100)}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill info"
                      style={{
                        width: `${(count / stats.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Authority Distribution */}
        <div
          style={{
            borderTop: "1px solid var(--border-color)",
            paddingTop: "2.5rem",
          }}
        >
          <h4
            style={{
              marginBottom: "1.5rem",
              color: "#191918",
              fontSize: "0.95rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            Phân bổ theo Thẩm quyền xử lý
          </h4>
          {stats.total === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Chưa có dữ liệu thống kê.
            </p>
          ) : (
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {authorityStats.map(([auth, count]) => {
                const displayName =
                  auth === "UBND phường" ? "Phường Bình Đông" : auth;
                const pct = Math.round((count / stats.total) * 100);
                return (
                  <div key={auth} className="authority-box">
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        marginBottom: "0.5rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {displayName}
                    </div>
                    <div
                      style={{
                        fontSize: "2.25rem",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        lineHeight: 1,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      {count}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        marginTop: "0.5rem",
                      }}
                    >
                      Cơ cấu: {pct}%
                    </div>
                    {/* Mini progress */}
                    <div
                      className="progress-track"
                      style={{ marginTop: "0.75rem", height: "3px" }}
                    >
                      <div
                        className="progress-fill primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bản đồ số giám sát vụ việc phường Bình Đông */}
      <section className="glass-card" style={{ padding: "2.5rem", marginTop: "2.5rem" }}>
        <h3 className="detail-section-title" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
          Bản đồ số giám sát vụ việc phường Bình Đông
        </h3>
        <p className="page-subtitle" style={{ marginBottom: "1.5rem" }}>
          Bản đồ địa hình 3D trực quan hiển thị ranh giới hành chính và phân bố các vụ việc phản ánh cử tri
        </p>
        <GoongMap petitions={initialPetitions} />
      </section>
    </div>
  );
}
