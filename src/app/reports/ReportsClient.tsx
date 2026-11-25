"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  SerializedPetition,
  formatDateVN,
  isPetitionOverdue,
} from "@/lib/petitionUtils";

interface ReportsClientProps {
  initialPetitions: SerializedPetition[];
}

export default function ReportsClient({ initialPetitions }: ReportsClientProps) {
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

  const selectedPetitions = useMemo(() => {
    if (!selectedQuarter) return [];
    const selNorm = selectedQuarter.replace(/\s+/g, "").toLowerCase();
    return initialPetitions.filter((p) => {
      if (!p.quarter) return false;
      return p.quarter.replace(/\s+/g, "").toLowerCase() === selNorm;
    });
  }, [selectedQuarter, initialPetitions]);

  const stats = useMemo(() => {
    const total = initialPetitions.length;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    let pendingAdmin = 0;

    initialPetitions.forEach((p) => {
      if (p.status === "Đã xong") {
        completed++;
      } else {
        inProgress++;
        if (p.status === "Chờ Admin phê duyệt") pendingAdmin++;
        if (isPetitionOverdue(p)) overdue++;
      }
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, inProgress, completed, overdue, pendingAdmin, completionRate };
  }, [initialPetitions]);

  const unitStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; pending: number; overdue: number }>();
    initialPetitions.forEach((p) => {
      const unit = p.department || "Chưa phân công";
      if (!map.has(unit)) map.set(unit, { total: 0, completed: 0, pending: 0, overdue: 0 });
      const u = map.get(unit)!;
      u.total++;
      if (p.status === "Đã xong") {
        u.completed++;
      } else {
        u.pending++;
        if (isPetitionOverdue(p)) u.overdue++;
      }
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        ...data,
        completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [initialPetitions]);

  const quarterStats = useMemo(() => {
    const list = Array.from({ length: 30 }, (_, i) => ({
      name: `Khu phố ${(i + 1).toString().padStart(2, "0")}`,
      shortName: `KP ${(i + 1).toString().padStart(2, "0")}`,
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
    }));

    initialPetitions.forEach((p) => {
      if (!p.quarter) return;
      const match = p.quarter.match(/(?:Khu\s*phố|Khu\s*pho|KP)\s*(\d+)/i);
      if (match) {
        const idx = parseInt(match[1], 10) - 1;
        if (idx >= 0 && idx < 30) {
          const q = list[idx];
          q.total++;
          if (p.status === "Đã xong") {
            q.completed++;
          } else {
            q.pending++;
            if (isPetitionOverdue(p)) q.overdue++;
          }
        }
      }
    });

    return list;
  }, [initialPetitions]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo hiệu suất giải quyết kiến nghị</h1>
          <p className="page-subtitle">
            Tổng hợp tiến độ xử lý theo đơn vị chuyên môn và 30 khu phố thuộc phường Bình Đông
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn-primary no-print">
          In báo cáo
        </button>
      </div>

      {/* Chỉ số hiệu suất tổng thể trên không gian mở */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
          gap: "2rem",
          marginBottom: "3.25rem",
        }}
      >
        <div>
          <div className="tabular-nums" style={{ fontSize: "2.65rem", fontWeight: 800, color: "var(--success)", lineHeight: 1.05 }}>
            {stats.completionRate}%
          </div>
          <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Tỷ lệ giải quyết hoàn thành
          </div>
        </div>
        <div>
          <div className="tabular-nums" style={{ fontSize: "2.65rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.05 }}>
            {stats.total}
          </div>
          <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Tổng số vụ việc tiếp nhận
          </div>
        </div>
        <div>
          <div className="tabular-nums" style={{ fontSize: "2.65rem", fontWeight: 800, color: "var(--success)", lineHeight: 1.05 }}>
            {stats.completed}
          </div>
          <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Đã hoàn thành
          </div>
        </div>
        <div>
          <div className="tabular-nums" style={{ fontSize: "2.65rem", fontWeight: 800, color: "var(--warning)", lineHeight: 1.05 }}>
            {stats.inProgress}
          </div>
          <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Đang giải quyết
          </div>
        </div>
        <div>
          <div className="tabular-nums" style={{ fontSize: "2.65rem", fontWeight: 800, color: "var(--danger)", lineHeight: 1.05 }}>
            {stats.overdue}
          </div>
          <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Trễ hạn giải quyết
          </div>
        </div>
      </section>

      {/* Bảng hiệu suất theo đơn vị xử lý trực tiếp */}
      <section style={{ marginBottom: "3.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "1rem" }}>
          Hiệu suất theo đơn vị xử lý trực tiếp
        </h2>

        <div className="table-container" style={{ backgroundColor: "#ffffff", borderRadius: "var(--radius-lg)" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Đơn vị chuyên môn</th>
                <th style={{ width: "95px", textAlign: "center" }}>Tổng số</th>
                <th style={{ width: "95px", textAlign: "center" }}>Đã xong</th>
                <th style={{ width: "110px", textAlign: "center" }}>Đang xử lý</th>
                <th style={{ width: "95px", textAlign: "center" }}>Quá hạn</th>
                <th style={{ width: "180px" }}>Tỷ lệ hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              {unitStats.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem" }}>
                    Chưa có dữ liệu thống kê.
                  </td>
                </tr>
              ) : (
                unitStats.map((u) => (
                  <tr key={u.name}>
                    <td style={{ fontWeight: 700 }}>{u.name}</td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{u.total}</td>
                    <td style={{ textAlign: "center", color: "var(--success)", fontWeight: 700 }}>{u.completed}</td>
                    <td style={{ textAlign: "center" }}>{u.pending}</td>
                    <td
                      style={{
                        textAlign: "center",
                        color: u.overdue > 0 ? "var(--danger)" : "var(--text-muted)",
                        fontWeight: u.overdue > 0 ? 800 : 500,
                      }}
                    >
                      {u.overdue}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div className="progress-track" style={{ flex: 1 }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${u.completionRate}%`,
                              backgroundColor:
                                u.completionRate >= 80
                                  ? "var(--success)"
                                  : u.completionRate >= 50
                                  ? "var(--warning)"
                                  : "var(--danger)",
                            }}
                          />
                        </div>
                        <span className="tabular-nums" style={{ fontSize: "0.78rem", fontWeight: 800, minWidth: "36px", textAlign: "right" }}>
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

      {/* Tần suất phản ánh theo 30 Khu phố (Bề mặt màu sắc thuần, không khung viền) */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>
            Tần suất phản ánh theo 30 khu phố
          </h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.78rem", fontWeight: 600 }}>
            <span style={{ color: "var(--text-muted)" }}>Xám: Không phát sinh</span>
            <span style={{ color: "var(--success)" }}>Xanh: Đã giải quyết 100%</span>
            <span style={{ color: "var(--warning)" }}>Vàng: Đang xử lý</span>
            <span style={{ color: "var(--danger)" }}>Đỏ: Có hồ sơ quá hạn</span>
          </div>
        </div>

        <div
          className="quarters-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))",
            gap: "0.65rem",
          }}
        >
          {quarterStats.map((q) => {
            let bg = "#eaedf2";
            let numColor = "var(--text-muted)";
            if (q.total > 0) {
              if (q.overdue > 0) {
                bg = "rgba(220, 38, 38, 0.14)";
                numColor = "var(--danger)";
              } else if (q.pending > 0) {
                bg = "rgba(217, 119, 6, 0.14)";
                numColor = "var(--warning)";
              } else {
                bg = "rgba(5, 150, 105, 0.14)";
                numColor = "var(--success)";
              }
            }

            return (
              <button
                key={q.name}
                type="button"
                className="heatmap-cell tabular-nums"
                onClick={() => setSelectedQuarter(q.name)}
                style={{
                  background: bg,
                  borderRadius: "var(--radius-md)",
                  padding: "0.85rem 0.5rem",
                  textAlign: "center",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.2rem",
                }}
              >
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                  {q.shortName}
                </span>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: numColor }}>
                  {q.total}
                </span>

                <div className="heatmap-tooltip">
                  <div style={{ fontWeight: 800, marginBottom: "0.35rem" }}>{q.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem" }}>
                    <span>Tổng số:</span>
                    <strong>{q.total}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "#34d399" }}>
                    <span>Đã xong:</span>
                    <strong>{q.completed}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "#fbbf24" }}>
                    <span>Đang xử lý:</span>
                    <strong>{q.pending}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "#f87171" }}>
                    <span>Quá hạn:</span>
                    <strong>{q.overdue}</strong>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Modal chi tiết vụ việc của Khu phố */}
      {selectedQuarter && (
        <div className="modal-overlay" onClick={() => setSelectedQuarter(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "740px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedQuarter}</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                  {selectedPetitions.length} vụ việc ghi nhận
                </p>
              </div>
              <button className="modal-close" onClick={() => setSelectedQuarter(null)}>
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {selectedPetitions.length === 0 ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  Khu phố này hiện chưa có vụ việc phản ánh.
                </p>
              ) : (
                selectedPetitions.map((pet) => {
                  const od = isPetitionOverdue(pet);
                  return (
                    <div
                      key={pet.id}
                      style={{
                        padding: "1rem 1.15rem",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--bg-app)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                          {pet.petitionCode}
                        </span>
                        <span
                          className={`status-text ${
                            od
                              ? "status-overdue"
                              : pet.status === "Đã xong"
                              ? "status-resolved"
                              : "status-progress"
                          }`}
                        >
                          {od ? "Quá hạn" : pet.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{pet.senderName}</div>
                      <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>{pet.content}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        <span>
                          Tiếp nhận: {formatDateVN(pet.receivedDate)} ({pet.department})
                        </span>
                        <Link href={`/petitions/${pet.id}`} style={{ color: "var(--info)", fontWeight: 700 }}>
                          Chi tiết hồ sơ
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
