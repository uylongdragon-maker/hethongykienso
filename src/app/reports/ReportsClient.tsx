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

interface ReportsClientProps {
  initialPetitions: SerializedPetition[];
}

export default function ReportsClient({ initialPetitions }: ReportsClientProps) {
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

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, inProgress, completed, overdue, completionRate };
  }, [initialPetitions]);

  const unitStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; pending: number; overdue: number }>();
    
    initialPetitions.forEach((p) => {
      const unit = p.department;
      if (!map.has(unit)) {
        map.set(unit, { total: 0, completed: 0, pending: 0, overdue: 0 });
      }
      const uStats = map.get(unit)!;
      uStats.total++;
      if (p.status === "Đã xong") {
        uStats.completed++;
      } else {
        uStats.pending++;
        if (isOverdue(p)) {
          uStats.overdue++;
        }
      }
    });
    
    return Array.from(map.entries()).map(([name, data]) => {
      const rate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
      return { name, ...data, completionRate: rate };
    }).sort((a, b) => b.total - a.total);
  }, [initialPetitions]);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <div>
          <h1 className="page-title">Báo cáo hiệu suất giải quyết</h1>
          <p className="page-subtitle">Thống kê chi tiết tỷ lệ giải quyết kiến nghị theo phòng ban, đơn vị trực tiếp</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem", alignItems: "start" }}>
        {/* Tóm tắt tổng thể */}
        <section className="glass-card" style={{ padding: "1.75rem" }}>
          <h3 className="detail-section-title" style={{ marginTop: 0, marginBottom: "1.25rem" }}>
            Tỷ lệ hoàn thành tổng thể
          </h3>
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div
              style={{
                width: "160px",
                height: "160px",
                borderRadius: "50%",
                background: `conic-gradient(var(--success) ${stats.completionRate}%, #e2e8f0 ${stats.completionRate}% 100%)`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "135px",
                  height: "135px",
                  borderRadius: "50%",
                  backgroundColor: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "2.25rem", fontWeight: "800", color: "var(--success)" }}>
                  {stats.completionRate}%
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
                  ĐÃ GIẢI QUYẾT
                </span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem", display: "grid", gap: "0.85rem", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Tổng số tiếp nhận:</span>
              <strong style={{ color: "var(--text-primary)" }}>{stats.total} vụ việc</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Đã hoàn thành:</span>
              <strong style={{ color: "var(--success)" }}>{stats.completed} vụ việc</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Đang giải quyết:</span>
              <strong style={{ color: "var(--warning)" }}>{stats.inProgress} vụ việc</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Trong đó quá hạn:</span>
              <strong style={{ color: "var(--danger)" }}>{stats.overdue} vụ việc</strong>
            </div>
          </div>
        </section>

        {/* Bảng báo cáo theo đơn vị */}
        <section className="glass-card" style={{ padding: "1.75rem" }}>
          <h3 className="detail-section-title" style={{ marginTop: 0, marginBottom: "1rem" }}>
            Hiệu suất theo Đơn vị xử lý trực tiếp
          </h3>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Đơn vị chuyên môn</th>
                  <th style={{ width: "80px", textAlign: "center" }}>Tổng số</th>
                  <th style={{ width: "90px", textAlign: "center" }}>Đã xong</th>
                  <th style={{ width: "90px", textAlign: "center" }}>Đang xử lý</th>
                  <th style={{ width: "80px", textAlign: "center" }}>Trễ hạn</th>
                  <th style={{ width: "120px", textAlign: "center" }}>Tỷ lệ hoàn thành</th>
                </tr>
              </thead>
              <tbody>
                {unitStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      Chưa có dữ liệu xử lý theo đơn vị.
                    </td>
                  </tr>
                ) : (
                  unitStats.map((u) => (
                    <tr key={u.name}>
                      <td style={{ fontWeight: "600" }}>{u.name}</td>
                      <td style={{ textAlign: "center" }}>{u.total}</td>
                      <td style={{ textAlign: "center", color: "var(--success)", fontWeight: "600" }}>{u.completed}</td>
                      <td style={{ textAlign: "center" }}>{u.pending}</td>
                      <td style={{ textAlign: "center", color: u.overdue > 0 ? "var(--danger)" : "inherit", fontWeight: u.overdue > 0 ? "600" : "normal" }}>
                        {u.overdue}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ flexGrow: 1, height: "6px", backgroundColor: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${u.completionRate}%`, height: "100%", backgroundColor: u.completionRate >= 80 ? "var(--success)" : u.completionRate >= 50 ? "var(--warning)" : "var(--danger)" }}></div>
                          </div>
                          <span style={{ fontSize: "0.85rem", fontWeight: "700", minWidth: "35px" }}>
                            {u.completionRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
