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
  getEffectiveDeadlineEnd,
  isPetitionOverdue,
} from "@/lib/petitionUtils";

interface OverviewClientProps {
  initialUser: SessionUser | null;
  initialPetitions: SerializedPetition[];
}

function getOverdueDays(pet: SerializedPetition): number {
  const diffMs = Date.now() - getEffectiveDeadlineEnd(pet).getTime();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / 86_400_000));
}

function cleanSnippet(text: string): string {
  return text.replace(/^\s*[-•–—]\s*/, "").replace(/\s+/g, " ").trim();
}

export default function OverviewClient({ initialUser, initialPetitions }: OverviewClientProps) {
  const router = useRouter();
  const [searchCode, setSearchCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<PublicPetitionSummary | null | undefined>(undefined);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [categorySort, setCategorySort] = useState<"volume" | "pending">("volume");

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

    const total = initialPetitions.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      inProgress,
      completed,
      overdue,
      pendingAdmin,
      completionRate,
    };
  }, [initialPetitions]);

  const catBreak = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; overdue: number }>();
    initialPetitions.forEach((p) => {
      const cat = p.category || "Khác";
      const cur = map.get(cat) || { total: 0, completed: 0, overdue: 0 };
      cur.total += 1;
      if (p.status === "Đã xong") cur.completed += 1;
      else if (isPetitionOverdue(p)) cur.overdue += 1;
      map.set(cat, cur);
    });

    const rows = Array.from(map.entries()).map(([name, val]) => {
      const pending = val.total - val.completed;
      const doneRate = val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0;
      return {
        name,
        count: val.total,
        completed: val.completed,
        pending,
        overdue: val.overdue,
        doneRate,
      };
    });

    const sorted =
      categorySort === "pending"
        ? rows.sort((a, b) => b.pending - a.pending || b.count - a.count)
        : rows.sort((a, b) => b.count - a.count || b.pending - a.pending);

    const maxCount = Math.max(1, ...sorted.map((r) => r.count));
    return sorted.slice(0, 8).map((r) => ({
      ...r,
      barPct: Math.round((r.count / maxCount) * 100),
      completedBarPct: Math.round((r.completed / maxCount) * 100),
    }));
  }, [initialPetitions, categorySort]);

  const urgentQueue = useMemo(() => {
    return initialPetitions
      .filter((p) => p.status === "Chờ Admin phê duyệt" || isPetitionOverdue(p))
      .sort((a, b) => {
        const aPend = a.status === "Chờ Admin phê duyệt" ? 0 : 1;
        const bPend = b.status === "Chờ Admin phê duyệt" ? 0 : 1;
        if (aPend !== bPend) return aPend - bPend;
        return getOverdueDays(b) - getOverdueDays(a);
      })
      .slice(0, 6);
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
        <section style={{ marginBottom: "3.5rem" }}>
          <h1
            style={{
              fontSize: "clamp(1.85rem, 3.3vw, 2.85rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              maxWidth: "920px",
              marginBottom: "1.15rem",
            }}
          >
            Hệ thống ứng dụng tổng hợp, theo dõi giải quyết kiến nghị cử tri của Hội đồng nhân dân phường Bình Đông
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: "680px" }}>
            Nhập mã hồ sơ kiến nghị để tra cứu trạng thái xử lý và văn bản phản hồi từ cơ quan có thẩm quyền.
          </p>
        </section>

        <section style={{ maxWidth: "680px" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "0.85rem" }}>
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
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.5rem",
                paddingTop: "1rem",
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
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>Văn bản trả lời</div>
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
    { label: "Đã giải quyết xong", value: stats.completed, color: "var(--success)", href: "/petitions?status=Đã xong" },
    { label: "Đang xử lý trong hạn", value: stats.inProgress, color: "var(--warning)", href: "/petitions?status=Đang xử lý" },
    { label: "Chờ Admin phê duyệt", value: stats.pendingAdmin, color: "var(--info)", href: "/petitions?status=Chờ Admin phê duyệt" },
    { label: "Quá hạn giải quyết", value: stats.overdue, color: "var(--danger)", href: "/petitions?status=OVERDUE" },
  ];

  const barSegments = [
    { key: "completed", value: stats.completed, color: "#059669", label: "Đã xong" },
    { key: "pendingAdmin", value: stats.pendingAdmin, color: "#2563eb", label: "Chờ duyệt" },
    { key: "inProgress", value: stats.inProgress, color: "#d97706", label: "Đang xử lý" },
    { key: "overdue", value: stats.overdue, color: "#dc2626", label: "Quá hạn" },
  ].filter((s) => s.value > 0);

  return (
    <div className="page-content">
      {/* Tiêu đề & tác vụ chính */}
      <div className="page-header" style={{ marginBottom: "2.25rem" }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">Tổng quan theo dõi kiến nghị cử tri</h1>
          <p className="page-subtitle">
            Hoàn thành {stats.completed}/{stats.total} vụ việc ({stats.completionRate}%)
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", flexShrink: 0 }}>
          <Link href="/petitions" className="btn-primary">
            Mở sổ theo dõi vụ việc
          </Link>
          <Link href="/reports" className="btn-secondary">
            Báo cáo hiệu suất
          </Link>
        </div>
      </div>

      {/* Hàng chỉ số trọng tâm + Thanh tỷ trọng phân đoạn (dataviz mark spec: 8px, 2px gap) */}
      <section style={{ marginBottom: "3.25rem" }}>
        <div className="overview-kpi-grid">
          {metrics.map((m) => (
            <Link key={m.label} href={m.href} className="overview-kpi-item">
              <span className="tabular-nums overview-kpi-value" style={{ color: m.color }}>
                {m.value}
              </span>
              <span className="overview-kpi-label">{m.label}</span>
            </Link>
          ))}
        </div>

        {stats.total > 0 && (
          <div
            role="img"
            aria-label={`Tỷ lệ xử lý: ${stats.completed} đã xong, ${stats.pendingAdmin} chờ duyệt, ${stats.inProgress} đang xử lý, ${stats.overdue} quá hạn`}
            style={{
              display: "flex",
              gap: "2px",
              height: "8px",
              width: "100%",
              marginTop: "1.5rem",
              borderRadius: "4px",
              overflow: "hidden",
              backgroundColor: "rgba(18, 19, 22, 0.06)",
            }}
          >
            {barSegments.map((seg) => (
              <div
                key={seg.key}
                title={`${seg.label}: ${seg.value} vụ (${Math.round((seg.value / stats.total) * 100)}%)`}
                style={{
                  width: `${(seg.value / stats.total) * 100}%`,
                  height: "100%",
                  backgroundColor: seg.color,
                  transition: "width 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Hai vùng không gian bất đối xứng có khóa minmax(0, ...) chống tràn cột */}
      <section className="overview-split" style={{ marginBottom: "3.5rem" }}>
        {/* Vùng trái: Biểu đồ thanh ngang phân bổ lĩnh vực */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1.35rem",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ fontSize: "1.12rem", fontWeight: 800 }}>Phân bổ vụ việc theo lĩnh vực</h2>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button
                type="button"
                onClick={() => setCategorySort("volume")}
                className={categorySort === "volume" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.74rem" }}
              >
                Nhiều nhất
              </button>
              <button
                type="button"
                onClick={() => setCategorySort("pending")}
                className={categorySort === "pending" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.74rem" }}
              >
                Chưa xong
              </button>
            </div>
          </div>

          {catBreak.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chưa có dữ liệu kiến nghị.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {catBreak.map((c) => (
                <div key={c.name} style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      alignItems: "baseline",
                      gap: "1rem",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <span
                      title={c.name}
                      style={{
                        fontSize: "0.86rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.completed}/{c.count} xong ({c.doneRate}%)
                    </span>
                  </div>

                  {/* Thanh đôi: Tổng số lượng tương đối + Tỷ lệ đã hoàn thành màu xanh */}
                  <div
                    style={{
                      position: "relative",
                      height: "7px",
                      width: "100%",
                      backgroundColor: "rgba(18, 19, 22, 0.06)",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${c.barPct}%`,
                        backgroundColor: c.overdue > 0 ? "rgba(220, 38, 38, 0.28)" : "rgba(217, 119, 6, 0.3)",
                        borderRadius: "4px",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${c.completedBarPct}%`,
                        backgroundColor: "#059669",
                        borderRadius: "4px",
                        transition: "width 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vùng phải: Hồ sơ ưu tiên xử lý & phê duyệt (không khung hộp, cắt gọn 2 dòng) */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1.35rem",
            }}
          >
            <h2 style={{ fontSize: "1.12rem", fontWeight: 800 }}>
              Hồ sơ cần ưu tiên xử lý & phê duyệt
            </h2>
            {stats.overdue > 0 && (
              <Link
                href="/petitions?status=OVERDUE"
                style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--danger)", whiteSpace: "nowrap" }}
              >
                Xem {stats.overdue} quá hạn
              </Link>
            )}
          </div>

          {urgentQueue.length === 0 ? (
            <p style={{ color: "var(--success)", fontSize: "0.9rem", fontWeight: 600 }}>
              Hiện không có hồ sơ chờ phê duyệt hoặc quá hạn.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {urgentQueue.map((p) => {
                const overdue = isPetitionOverdue(p);
                const overdueDays = overdue ? getOverdueDays(p) : 0;
                const isPendingApproval = p.status === "Chờ Admin phê duyệt";
                return (
                  <div key={p.id} className="urgent-row">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "0.65rem",
                          flexWrap: "wrap",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <Link
                          href={`/petitions/${p.id}`}
                          className="tabular-nums"
                          style={{
                            fontWeight: 800,
                            fontSize: "0.88rem",
                            fontFamily: "var(--font-mono)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {p.petitionCode}
                        </Link>
                        <span
                          className={`status-text ${isPendingApproval ? "status-pending-admin" : "status-overdue"}`}
                          style={{ fontSize: "0.78rem" }}
                        >
                          {isPendingApproval
                            ? "Chờ Admin phê duyệt"
                            : overdueDays > 0
                            ? `Quá hạn ${overdueDays} ngày`
                            : "Quá hạn"}
                        </span>
                        <span
                          style={{
                            fontSize: "0.76rem",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "220px",
                          }}
                        >
                          {p.department}
                        </span>
                      </div>

                      <p className="line-clamp-2" style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                        {cleanSnippet(p.content)}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, alignSelf: "center" }}>
                      {initialUser.role === "ADMIN" && isPendingApproval && (
                        <button
                          type="button"
                          disabled={approvingId === p.id}
                          onClick={() => handleQuickApprove(p.id)}
                          className="btn-primary"
                          style={{ padding: "0.38rem 0.75rem", fontSize: "0.76rem" }}
                        >
                          {approvingId === p.id ? "Đang duyệt..." : "Duyệt xong"}
                        </button>
                      )}
                      <Link
                        href={`/petitions/${p.id}`}
                        className="btn-secondary"
                        style={{ padding: "0.38rem 0.75rem", fontSize: "0.76rem" }}
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.12rem", fontWeight: 800 }}>Hồ sơ tiếp nhận gần đây</h2>
          <Link href="/petitions" style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--info)" }}>
            Xem toàn bộ ({stats.total})
          </Link>
        </div>

        {initialPetitions.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chưa có vụ việc nào trên hệ thống.</p>
        ) : (
          <div className="table-container" style={{ backgroundColor: "#ffffff", borderRadius: "var(--radius-lg)" }}>
            <table className="data-table" style={{ tableLayout: "fixed", minWidth: "860px" }}>
              <thead>
                <tr>
                  <th style={{ width: "118px" }}>Mã vụ việc</th>
                  <th style={{ width: "155px" }}>Người gửi</th>
                  <th>Nội dung kiến nghị</th>
                  <th style={{ width: "205px" }}>Đơn vị xử lý</th>
                  <th style={{ width: "115px" }}>Hạn giải quyết</th>
                  <th style={{ width: "130px" }}>Trạng thái</th>
                  <th style={{ width: "86px" }}></th>
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
                        <div className="line-clamp-2" style={{ color: "var(--text-secondary)", lineHeight: 1.45 }}>
                          {cleanSnippet(p.content)}
                        </div>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.department}</div>
                        {committee && (
                          <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>{committee}</div>
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
                          style={{ padding: "0.35rem 0.72rem", fontSize: "0.76rem" }}
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
    </div>
  );
}
