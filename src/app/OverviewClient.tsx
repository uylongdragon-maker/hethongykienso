"use client";

import { useMemo } from "react";

interface SerializedPetition {
  id: string;
  petitionCode: string;
  source: string;
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

export default function OverviewClient({ initialPetitions }: OverviewClientProps) {
  const isOverdue = (pet: SerializedPetition) => {
    return pet.status === "Quá hạn" || (pet.status !== "Đã xong" && new Date(pet.deadline) < new Date());
  };

  const stats = useMemo(() => {
    let total = initialPetitions.length;
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

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <div>
          <h1 className="page-title">Hệ thống phân tích & Tổng quan</h1>
          <p className="page-subtitle">Thống kê dữ liệu, biểu đồ phân tích và phân loại kiến nghị cử tri</p>
        </div>
      </div>

      {/* Khối thống kê số liệu */}
      <section className="stats-grid" style={{ marginBottom: "2.5rem" }}>
        <div className="stat-card">
          <div className="stat-indicator total"></div>
          <span className="stat-label">Tổng số vụ việc</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-card">
          <div className="stat-indicator pending"></div>
          <span className="stat-label">Đang giải quyết</span>
          <span className="stat-value">{stats.inProgress}</span>
        </div>
        <div className="stat-card">
          <div className="stat-indicator resolved"></div>
          <span className="stat-label">Đã hoàn thành (Đã xong)</span>
          <span className="stat-value">{stats.completed}</span>
        </div>
        <div className="stat-card">
          <div className="stat-indicator overdue"></div>
          <span className="stat-label">Vụ việc quá hạn</span>
          <span className="stat-value" style={{ color: "var(--danger)" }}>
            {stats.overdue}
          </span>
        </div>
      </section>

      {/* Biểu đồ chi tiết */}
      <div className="glass-card" style={{ padding: "2rem" }}>
        <h3 className="detail-section-title" style={{ marginTop: 0, marginBottom: "1.5rem" }}>
          Phân tích & Thống kê cơ cấu vụ việc
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", marginBottom: "3rem" }}>
          <div>
            <h4 style={{ marginBottom: "1.25rem", color: "var(--primary)", fontSize: "1.1rem" }}>
              Cơ cấu kiến nghị theo Lĩnh vực
            </h4>
            {stats.total === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chưa có dữ liệu thống kê.</p>
            ) : (
              categoryStats.map(([category, count]) => (
                <div key={category} style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
                    <span style={{ fontWeight: "600" }}>{category}</span>
                    <strong>{count} vụ việc ({Math.round((count / stats.total) * 100)}%)</strong>
                  </div>
                  <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(0,0,0,0.04)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${(count / stats.total) * 100}%`, height: "100%", backgroundColor: "var(--primary)", borderRadius: "4px" }}></div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div>
            <h4 style={{ marginBottom: "1.25rem", color: "var(--primary)", fontSize: "1.1rem" }}>
              Thống kê theo Nguồn tiếp nhận
            </h4>
            {stats.total === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chưa có dữ liệu thống kê.</p>
            ) : (
              sourceStats.map(([source, count]) => (
                <div key={source} style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
                    <span style={{ fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "240px" }} title={source}>{source}</span>
                    <strong>{count} vụ việc ({Math.round((count / stats.total) * 100)}%)</strong>
                  </div>
                  <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(0,0,0,0.04)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${(count / stats.total) * 100}%`, height: "100%", backgroundColor: "var(--info)", borderRadius: "4px" }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "2rem" }}>
          <h4 style={{ marginBottom: "1.25rem", color: "var(--primary)", fontSize: "1.1rem" }}>
            Phân bổ theo Thẩm quyền xử lý vụ việc
          </h4>
          {stats.total === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chưa có dữ liệu thống kê.</p>
          ) : (
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              {authorityStats.map(([auth, count]) => (
                <div key={auth} style={{ flexGrow: 1, backgroundColor: "var(--bg-content-box)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", textAlign: "center", minWidth: "220px" }}>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>{auth}</div>
                  <div style={{ fontSize: "2.25rem", fontWeight: "700", color: "var(--text-primary)" }}>{count}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Tỷ lệ cơ cấu: {Math.round((count / stats.total) * 100)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
