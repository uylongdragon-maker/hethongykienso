"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SessionUser } from "@/lib/auth";
import {
  PublicPetitionSummary,
  SerializedPetition,
  extractCommitteeFromNotes,
  formatDateVN,
  isPetitionOverdue,
} from "@/lib/petitionUtils";

interface OverviewClientProps {
  initialUser: SessionUser | null;
  initialPetitions: SerializedPetition[];
}

export default function OverviewClient({ initialUser, initialPetitions }: OverviewClientProps) {
  const router = useRouter();
  const [searchCode, setSearchCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<PublicPetitionSummary | null | undefined>(undefined);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    let pendingAdmin = 0;

    initialPetitions.forEach((p) => {
      if (p.status === "Đã xong") {
        completed++;
      } else if (p.status === "Chờ Admin phê duyệt") {
        pendingAdmin++;
      } else if (isPetitionOverdue(p)) {
        overdue++;
      } else {
        inProgress++;
      }
    });

    const completionRate =
      initialPetitions.length > 0
        ? Math.round((completed / initialPetitions.length) * 100)
        : 0;

    return {
      total: initialPetitions.length,
      inProgress,
      completed,
      overdue,
      pendingAdmin,
      completionRate,
    };
  }, [initialPetitions]);

  const catBreak = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    initialPetitions.forEach((p) => {
      const cat = p.category || "Khác";
      const cur = map.get(cat) || { total: 0, completed: 0 };
      cur.total += 1;
      if (p.status === "Đã xong") cur.completed += 1;
      map.set(cat, cur);
    });

    return Array.from(map.entries())
      .map(([name, val]) => ({
        name,
        count: val.total,
        completed: val.completed,
        pct: stats.total > 0 ? Math.round((val.total / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [initialPetitions, stats.total]);

  const urgentQueue = useMemo(() => {
    return initialPetitions
      .filter((p) => p.status === "Chờ Admin phê duyệt" || isPetitionOverdue(p))
      .slice(0, 5);
  }, [initialPetitions]);

  const handlePublicLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = searchCode.trim();
    if (!code) return;

    setLookupLoading(true);
    setLookupError(null);

    try {
      const res = await fetch(`/api/petitions/public-lookup?code=${encodeURIComponent(code)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setLookupError(json.error || "Không thể tra cứu mã vụ việc.");
        setSearchResult(undefined);
      } else {
        setSearchResult(json.data || null);
      }
    } catch {
      setLookupError("Không thể kết nối máy chủ tra cứu.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleQuickApprove = async (petId: string) => {
    setApprovingId(petId);
    try {
      const res = await fetch(`/api/petitions/${petId}/quick-update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Đã xong", reviewStatus: "Hoàn thành" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Không thể phê duyệt.");
      } else {
        router.refresh();
      }
    } catch {
      alert("Lỗi kết nối khi phê duyệt.");
    } finally {
      setApprovingId(null);
    }
  };

  /* ═══════════════════════════════════════════════════
     1. CỔNG TRA CỨU CÔNG KHAI (CHƯA ĐĂNG NHẬP)
     ═══════════════════════════════════════════════════ */
  if (!initialUser) {
    return (
      <div className="page-content" style={{ paddingTop: "3.5rem", maxWidth: "1080px" }}>
        <section style={{ marginBottom: "4rem" }}>
          <h1
            style={{
              fontSize: "clamp(1.85rem, 3.3vw, 2.85rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              maxWidth: "920px",
              marginBottom: "1.25rem",
            }}
          >
            Hệ thống ứng dụng tổng hợp, theo dõi giải quyết kiến nghị cử tri của Hội đồng nhân dân phường Bình Đông
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: "680px" }}>
            Nhập mã hồ sơ kiến nghị để tra cứu trạng thái xử lý và văn bản phản hồi từ cơ quan có thẩm quyền.
          </p>
        </section>

        <section style={{ maxWidth: "680px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.85rem" }}>
            Tra cứu tiến độ theo mã vụ việc
          </h2>

          <form
            onSubmit={handlePublicLookup}
            style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.75rem" }}
          >
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Ví dụ: KN2026-001"
              required
              className="form-control tabular-nums"
              style={{ flex: "1 1 280px", fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}
            />
            <button type="submit" disabled={lookupLoading} className="btn-primary" style={{ padding: "0.65rem 1.5rem" }}>
              {lookupLoading ? "Đang tra cứu..." : "Tra cứu"}
            </button>
          </form>

          {lookupError && (
            <div style={{ color: "var(--danger)", fontSize: "0.88rem", fontWeight: 600, marginBottom: "1rem" }}>
              {lookupError}
            </div>
          )}

          {searchResult === null && (
            <div style={{ color: "var(--danger)", fontSize: "0.9rem", fontWeight: 600 }}>
              Không tìm thấy hồ sơ với mã &ldquo;{searchCode.trim()}&rdquo;.
            </div>
          )}

          {searchResult && (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "var(--radius-lg)",
                padding: "1.75rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.25rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Mã vụ việc</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                  {searchResult.petitionCode}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Trạng thái xử lý</div>
                <div
                  className={`status-text ${
                    searchResult.status === "Đã xong"
                      ? "status-resolved"
                      : searchResult.status === "Quá hạn"
                      ? "status-overdue"
                      : "status-progress"
                  }`}
                  style={{ fontSize: "1rem" }}
                >
                  {searchResult.status}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Lĩnh vực</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{searchResult.category}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Đơn vị thụ lý</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{searchResult.department}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Ngày tiếp nhận</div>
                <div className="tabular-nums" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {formatDateVN(searchResult.receivedDate)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Hạn giải quyết</div>
                <div className="tabular-nums" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {formatDateVN(searchResult.extendedUntil || searchResult.deadline)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Kết quả rà soát</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{searchResult.reviewStatus}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Số hiệu văn bản trả lời</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{searchResult.replyDocNumber || "Đang cập nhật"}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     2. BẢNG ĐIỀU HÀNH NỘI BỘ (ĐÃ ĐĂNG NHẬP)
     ═══════════════════════════════════════════════════ */
  const metrics = [
    { label: "Tổng hồ sơ tiếp nhận", value: stats.total, color: "var(--text-primary)", href: "/petitions" },
    { label: "Đang xử lý trong hạn", value: stats.inProgress, color: "var(--warning)", href: "/petitions?status=Đang xử lý" },
    { label: "Chờ Admin phê duyệt", value: stats.pendingAdmin, color: "var(--info)", href: "/petitions?status=Chờ Admin phê duyệt" },
    { label: "Đã giải quyết xong", value: stats.completed, color: "var(--success)", href: "/petitions?status=Đã xong" },
    { label: "Quá hạn giải quyết", value: stats.overdue, color: "var(--danger)", href: "/petitions?status=OVERDUE" },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan theo dõi kiến nghị cử tri</h1>
          <p className="page-subtitle">
            Tỷ lệ giải quyết hoàn thành đạt {stats.completionRate}% trên tổng số {stats.total} vụ việc
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
          <Link href="/petitions" className="btn-primary">
            Mở sổ theo dõi vụ việc
          </Link>
          <Link href="/reports" className="btn-secondary">
            Báo cáo hiệu suất
          </Link>
        </div>
      </div>

      {/* Chỉ số trọng tâm đặt trực tiếp trên không gian nền */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "2rem",
          marginBottom: "3.25rem",
        }}
      >
        {metrics.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            <span
              className="tabular-nums"
              style={{
                fontSize: "clamp(2.2rem, 3vw, 2.85rem)",
                fontWeight: 800,
                color: m.color,
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
              }}
            >
              {m.value}
            </span>
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              {m.label}
            </span>
          </Link>
        ))}
      </section>

      {/* Bố cục bất đối xứng 2 vùng: Phân bổ lĩnh vực & Tác vụ cần xử lý ngay */}
      <section
        className="overview-split"
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: "3.5rem",
          marginBottom: "3.25rem",
          alignItems: "start",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "1.25rem" }}>
            Phân bổ vụ việc theo lĩnh vực
          </h2>

          {catBreak.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chưa có dữ liệu kiến nghị.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.05rem" }}>
              {catBreak.map((c) => (
                <div key={c.name}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                    }}
                  >
                    <span style={{ color: "var(--text-primary)" }}>{c.name}</span>
                    <span className="tabular-nums" style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
                      {c.completed}/{c.count} hoàn thành ({c.pct}%)
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${c.pct}%`,
                        backgroundColor: c.completed === c.count && c.count > 0 ? "var(--success)" : "var(--text-primary)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "1.25rem" }}>
            Hồ sơ cần ưu tiên xử lý & phê duyệt
          </h2>

          {urgentQueue.length === 0 ? (
            <p style={{ color: "var(--success)", fontSize: "0.9rem", fontWeight: 600 }}>
              Hiện không có hồ sơ chờ phê duyệt hoặc quá hạn.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {urgentQueue.map((p) => {
                const overdue = isPetitionOverdue(p);
                const isPendingApproval = p.status === "Chờ Admin phê duyệt";
                return (
                  <div
                    key={p.id}
                    style={{
                      backgroundColor: isPendingApproval ? "var(--info-bg)" : "var(--danger-bg)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.95rem 1.1rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                        <Link
                          href={`/petitions/${p.id}`}
                          className="tabular-nums"
                          style={{ fontWeight: 800, fontSize: "0.88rem", fontFamily: "var(--font-mono)" }}
                        >
                          {p.petitionCode}
                        </Link>
                        <span
                          className={`status-text ${isPendingApproval ? "status-pending-admin" : "status-overdue"}`}
                          style={{ fontSize: "0.76rem" }}
                        >
                          {overdue ? "Quá hạn" : p.status}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: "0.2rem",
                        }}
                      >
                        {p.content}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.45rem", flexShrink: 0 }}>
                      {initialUser.role === "ADMIN" && isPendingApproval && (
                        <button
                          type="button"
                          disabled={approvingId === p.id}
                          onClick={() => handleQuickApprove(p.id)}
                          className="btn-primary"
                          style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}
                        >
                          {approvingId === p.id ? "Đang duyệt..." : "Duyệt xong"}
                        </button>
                      )}
                      <Link
                        href={`/petitions/${p.id}`}
                        className="btn-secondary"
                        style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem", backgroundColor: "#ffffff" }}
                      >
                        Mở
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Danh sách hồ sơ tiếp nhận gần đây */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800 }}>Hồ sơ tiếp nhận gần đây</h2>
          <Link href="/petitions" style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--info)" }}>
            Xem toàn bộ ({stats.total})
          </Link>
        </div>

        {initialPetitions.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chưa có vụ việc nào trên hệ thống.</p>
        ) : (
          <div className="table-container" style={{ borderRadius: "var(--radius-lg)", backgroundColor: "#ffffff" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>Mã vụ việc</th>
                  <th style={{ width: "160px" }}>Người gửi</th>
                  <th>Nội dung kiến nghị</th>
                  <th style={{ width: "210px" }}>Đơn vị xử lý</th>
                  <th style={{ width: "125px" }}>Hạn giải quyết</th>
                  <th style={{ width: "150px" }}>Trạng thái</th>
                  <th style={{ width: "90px" }}></th>
                </tr>
              </thead>
              <tbody>
                {initialPetitions.slice(0, 6).map((p) => {
                  const overdue = isPetitionOverdue(p);
                  const { committee } = extractCommitteeFromNotes(p.notes);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 800, fontFamily: "var(--font-mono)" }}>{p.petitionCode}</td>
                      <td style={{ fontWeight: 600 }}>{p.senderName}</td>
                      <td>
                        <div style={{ maxWidth: "460px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.content}
                        </div>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        <div>{p.department}</div>
                        {committee && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{committee}</div>
                        )}
                      </td>
                      <td className="tabular-nums">{formatDateVN(p.extendedUntil || p.deadline)}</td>
                      <td>
                        <span
                          className={`status-text ${
                            p.status === "Đã xong"
                              ? "status-resolved"
                              : p.status === "Chờ Admin phê duyệt"
                              ? "status-pending-admin"
                              : overdue
                              ? "status-overdue"
                              : "status-progress"
                          }`}
                        >
                          {overdue ? "Quá hạn" : p.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/petitions/${p.id}`}
                          className="btn-secondary"
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.76rem" }}
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style jsx>{`
        @media (max-width: 960px) {
          .overview-split {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
