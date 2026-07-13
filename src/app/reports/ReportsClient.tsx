"use client";

import { useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

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

interface ReportsClientProps {
  initialPetitions: SerializedPetition[];
}

export default function ReportsClient({ initialPetitions }: ReportsClientProps) {
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

  const selectedPetitions = useMemo(() => {
    if (!selectedQuarter) return [];
    return initialPetitions.filter((p) => {
      if (!p.quarter) return false;
      const qNorm = p.quarter.replace(/\s+/g, "").toLowerCase();
      const selNorm = selectedQuarter.replace(/\s+/g, "").toLowerCase();
      return qNorm === selNorm;
    });
  }, [selectedQuarter, initialPetitions]);

  const isOverdue = (pet: SerializedPetition) => {
    return pet.status === "Quá hạn" || (pet.status !== "Đã xong" && new Date(pet.deadline) < new Date());
  };

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(".glass-card", {
      opacity: 0,
      y: 20,
      duration: 0.5,
      stagger: 0.08,
      ease: "power3.out",
      clearProps: "transform,opacity",
    });
    gsap.from(".heatmap-cell", {
      opacity: 0,
      scale: 0.88,
      duration: 0.35,
      stagger: 0.012,
      delay: 0.3,
      ease: "back.out(1.4)",
      clearProps: "transform,opacity",
    });
  }, { scope: containerRef });

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
        if (isOverdue(p)) overdue++;
      }
    });
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, inProgress, completed, overdue, completionRate };
  }, [initialPetitions]);

  const unitStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; pending: number; overdue: number }>();
    initialPetitions.forEach((p) => {
      const unit = p.department;
      if (!map.has(unit)) map.set(unit, { total: 0, completed: 0, pending: 0, overdue: 0 });
      const u = map.get(unit)!;
      u.total++;
      if (p.status === "Đã xong") { u.completed++; }
      else { u.pending++; if (isOverdue(p)) u.overdue++; }
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data, completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [initialPetitions]);

  const quarterStats = useMemo(() => {
    const list = Array.from({ length: 30 }, (_, i) => ({
      name: `Khu phố ${(i + 1).toString().padStart(2, "0")}`,
      shortName: `KP ${(i + 1).toString().padStart(2, "0")}`,
      total: 0, completed: 0, pending: 0, overdue: 0,
    }));
    initialPetitions.forEach((p) => {
      if (!p.quarter) return;
      const match = p.quarter.match(/(?:Khu\s*phố|Khu\s*pho|KP)\s*(\d+)/i);
      if (match) {
        const idx = parseInt(match[1], 10) - 1;
        if (idx >= 0 && idx < 30) {
          const q = list[idx];
          q.total++;
          if (p.status === "Đã xong") { q.completed++; }
          else { q.pending++; if (isOverdue(p)) q.overdue++; }
        }
      }
    });
    return list;
  }, [initialPetitions]);

  return (
    <div ref={containerRef} className="page-content">

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo hiệu suất</h1>
          <p className="page-subtitle">Thống kê tỷ lệ giải quyết kiến nghị theo đơn vị</p>
        </div>
      </div>

      {/* ── Top 2-col: Donut + Table ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 240px) minmax(0, 1fr)",
        gap: "1.25rem",
        alignItems: "start",
        marginBottom: "1.5rem",
      }}>

        {/* Donut completion card */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-muted)", margin: "0 0 1rem" }}>
            Tỷ lệ hoàn thành tổng thể
          </p>
          <div style={{ display: "flex", justifyContent: "center", margin: "0.5rem 0 1rem" }}>
            <div style={{
              width: 120, height: 120, borderRadius: "50%",
              background: `conic-gradient(var(--success) ${stats.completionRate}%, rgba(0,0,0,0.07) ${stats.completionRate}% 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--success)", lineHeight: 1 }}>{stats.completionRate}%</span>
                <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", marginTop: "0.2rem" }}>ĐÃ GIẢI QUYẾT</span>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {([
              ["Tổng số tiếp nhận", `${stats.total} vụ`, "var(--text-primary)"],
              ["Đã hoàn thành", `${stats.completed} vụ`, "var(--success)"],
              ["Đang giải quyết", `${stats.inProgress} vụ`, "var(--warning)"],
              ["Trong đó quá hạn", `${stats.overdue} vụ`, "var(--danger)"],
            ] as [string, string, string][]).map(([label, value, color]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                <strong style={{ color }}>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Unit performance table card */}
        <div className="glass-card" style={{ padding: "1.5rem", minWidth: 0 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-muted)", margin: "0 0 1rem" }}>
            Hiệu suất theo Đơn vị xử lý trực tiếp
          </p>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Đơn vị chuyên môn</th>
                  <th style={{ width: 65, textAlign: "center" }}>Tổng số</th>
                  <th style={{ width: 75, textAlign: "center" }}>Đã xong</th>
                  <th style={{ width: 80, textAlign: "center" }}>Đang xử lý</th>
                  <th style={{ width: 65, textAlign: "center" }}>Trễ hạn</th>
                  <th style={{ width: 115, textAlign: "center" }}>Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {unitStats.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Chưa có dữ liệu.</td></tr>
                ) : unitStats.map((u) => (
                  <tr key={u.name}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ textAlign: "center" }}>{u.total}</td>
                    <td style={{ textAlign: "center", color: "var(--success)", fontWeight: 600 }}>{u.completed}</td>
                    <td style={{ textAlign: "center" }}>{u.pending}</td>
                    <td style={{ textAlign: "center", color: u.overdue > 0 ? "var(--danger)" : undefined, fontWeight: u.overdue > 0 ? 600 : undefined }}>{u.overdue}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <div style={{ flex: 1, height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${u.completionRate}%`, height: "100%", borderRadius: 3, background: u.completionRate >= 80 ? "var(--success)" : u.completionRate >= 50 ? "var(--warning)" : "var(--danger)" }} />
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, minWidth: 30, textAlign: "right" }}>{u.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Heatmap 30 khu phố ── */}
      <div className="glass-card" style={{ padding: "1.75rem" }}>
        <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-muted)", margin: "0 0 0.3rem" }}>
          Bản đồ nhiệt tần suất phản ánh theo 30 Khu phố
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
          Tần suất phản ánh kiến nghị cử tri và trạng thái xử lý chi tiết tại phường Bình Đông
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {quarterStats.map((q) => {
            let bg = "rgba(241,245,249,0.5)";
            let border = "1px solid rgba(0,0,0,0.07)";
            let shadow = "none";
            if (q.total > 0) {
              if (q.overdue > 0) {
                bg = "rgba(244,63,94,0.09)"; border = "2px solid rgba(244,63,94,0.4)";
                shadow = "0 4px 12px rgba(244,63,94,0.1)";
              } else if (q.pending > 0) {
                bg = "rgba(245,158,11,0.08)"; border = "1.5px solid rgba(245,158,11,0.35)";
              } else {
                bg = "rgba(16,185,129,0.08)"; border = "1.5px solid rgba(16,185,129,0.35)";
              }
            }
            const warnCls = q.overdue > 0 ? "pulse-warning-red" : q.pending > 0 ? "pulse-warning-amber" : "";
            return (
              <div
                key={q.name}
                className={`heatmap-cell ${warnCls}`}
                onClick={() => setSelectedQuarter(q.name)}
                style={{ background: bg, border, borderRadius: 6, boxShadow: shadow, padding: "0.45rem 0.2rem", textAlign: "center", cursor: "pointer", position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 60, transition: "all 0.22s ease" }}
              >
                <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", opacity: 0.8 }}>{q.shortName}</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, marginTop: "0.08rem", color: q.total > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {q.total} <span style={{ fontSize: "0.58rem", fontWeight: 500 }}>vụ</span>
                </div>
                <div className="heatmap-tooltip">
                  <strong style={{ display: "block", marginBottom: "0.35rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.2rem" }}>{q.name}</strong>
                  {[["Tổng", q.total, "#fff"], ["Đã xong", q.completed, "#10b981"], ["Đang xử lý", q.pending, "#fbbf24"], ["Quá hạn", q.overdue, "#f87171"]]
                    .map(([label, value, color]) => (
                      <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", gap: "0.65rem", fontSize: "0.7rem", margin: "0.15rem 0", color: String(color) }}>
                        <span>{label}:</span><strong>{value}</strong>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1.25rem", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "0.85rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Màu sắc trạng thái khu phố:</span>
          {([
            ["rgba(241,245,249,0.5)", "1px solid rgba(0,0,0,0.07)", "Chưa có vụ việc (0)", false],
            ["rgba(16,185,129,0.08)", "1.5px solid rgba(16,185,129,0.35)", "Đã hoàn thành 100%", false],
            ["rgba(245,158,11,0.08)", "1.5px solid rgba(245,158,11,0.35)", "Có vụ việc Đang xử lý", false],
            ["rgba(244,63,94,0.09)", "2px solid rgba(244,63,94,0.4)", "Có vụ việc QUÁ HẠN ⚠️", true],
          ] as [string, string, string, boolean][]).map(([bg, bd, label, warn]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ display: "inline-block", width: 11, height: 11, background: bg, border: bd, borderRadius: 2 }} />
              <span style={{ fontWeight: warn ? 600 : undefined, color: warn ? "#e11d48" : undefined }}>{label}</span>
            </div>
          ))}
          <span style={{ marginLeft: "auto" }}>* Di chuột vào ô để xem chi tiết.</span>
        </div>
      </div>

      {/* ── Quarter detail modal ── */}
      {selectedQuarter && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-content" style={{ maxWidth: 800, width: "90%", maxHeight: "85vh", display: "flex", flexDirection: "column", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.85rem" }}>
              <div>
                <h3 className="detail-section-title" style={{ margin: 0 }}>{selectedQuarter}</h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>Tổng số: {selectedPetitions.length} vụ việc</p>
              </div>
              <button onClick={() => setSelectedQuarter(null)} className="btn btn-secondary" style={{ minWidth: "auto", padding: "0.4rem 0.6rem", borderRadius: "50%", display: "flex", alignItems: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ overflowY: "auto", flexGrow: 1, paddingRight: "0.5rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {selectedPetitions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>Không có vụ việc nào thuộc khu phố này.</div>
              ) : selectedPetitions.map((pet) => {
                const od = isOverdue(pet);
                const sc = od ? "var(--danger)" : pet.status === "Đang xử lý" ? "var(--warning)" : "var(--success)";
                return (
                  <div key={pet.id} style={{ padding: "1rem 1.15rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.5)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                      <span style={{ fontWeight: 700, color: od ? "var(--danger)" : "var(--primary)" }}>{pet.petitionCode}</span>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.18rem 0.45rem", borderRadius: 4, background: `${sc}12`, color: sc, border: `1px solid ${sc}30` }}>{od ? "Quá hạn" : pet.status}</span>
                    </div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.2rem" }}>Người gửi: {pet.senderName}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{pet.content}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem", fontSize: "0.7rem", color: "var(--text-muted)", borderTop: "1px dashed var(--border-color)", paddingTop: "0.4rem", marginTop: "0.4rem" }}>
                      <span>Ngày tiếp nhận: {new Date(pet.receivedDate).toLocaleDateString("vi-VN")}</span>
                      <span>Đơn vị: {pet.department}</span>
                      <a href={`/petitions/${pet.id}`} style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "underline" }}>Xem chi tiết →</a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
