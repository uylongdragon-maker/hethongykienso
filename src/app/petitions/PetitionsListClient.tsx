"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PetitionForm from "@/components/PetitionForm";

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

interface PetitionsListClientProps {
  initialPetitions: SerializedPetition[];
}

export default function PetitionsListClient({ initialPetitions }: PetitionsListClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  
  // Trạng thái mở modal tạo mới
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Đánh giá quá hạn
  const isOverdue = (pet: SerializedPetition) => {
    return pet.status === "Quá hạn" || (pet.status !== "Đã xong" && new Date(pet.deadline) < new Date());
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    initialPetitions.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [initialPetitions]);

  const filteredPetitions = useMemo(() => {
    return initialPetitions.filter((p) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        p.petitionCode.toLowerCase().includes(searchLower) ||
        p.senderName.toLowerCase().includes(searchLower) ||
        p.senderAddress.toLowerCase().includes(searchLower) ||
        p.content.toLowerCase().includes(searchLower) ||
        p.location.toLowerCase().includes(searchLower);

      const matchesCategory = categoryFilter === "ALL" || p.category === categoryFilter;

      let matchesStatus = true;
      if (statusFilter !== "ALL") {
        if (statusFilter === "OVERDUE") {
          matchesStatus = isOverdue(p);
        } else {
          matchesStatus = p.status === statusFilter;
        }
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [initialPetitions, search, statusFilter, categoryFilter]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (pet: SerializedPetition) => {
    const overdue = isOverdue(pet);
    if (overdue) {
      return <span className="badge badge-overdue">Quá hạn</span>;
    }
    switch (pet.status) {
      case "Đã xong":
        return <span className="badge badge-resolved">Đã xong</span>;
      case "Đang xử lý":
        return <span className="badge badge-in-progress">Đang xử lý</span>;
      case "Đang chờ ý kiến cấp trên":
        return <span className="badge badge-new" style={{ color: "var(--info)", backgroundColor: "var(--info-bg)" }}>Đang chờ ý kiến cấp trên</span>;
      default:
        return <span className="badge">{pet.status}</span>;
    }
  };

  const handleExportCSV = () => {
    let csv = "STT,Mã vụ việc,Nguồn tiếp nhận,Họ tên người gửi,Địa chỉ liên hệ,Số điện thoại,Lĩnh vực,Tọa độ phản ánh,Nội dung kiến nghị,Thẩm quyền xử lý,Đơn vị xử lý trực tiếp,Ngày tiếp nhận,Hạn giải quyết,Gia hạn,Trạng thái,Văn bản trả lời,Ý kiến rà soát\n";
    
    filteredPetitions.forEach((pet, index) => {
      const phone = pet.senderPhone || "";
      const extended = pet.extendedUntil ? formatDate(pet.extendedUntil) : "";
      const replyDoc = pet.replyDocNumber || "";
      const notes = pet.notes || "";
      // Hiển thị tên chuẩn cho thẩm quyền xử lý
      const authorityDisplay = pet.authority === "UBND phường" ? "Phường Bình Đông" : pet.authority;
      
      csv += `${index + 1},${pet.petitionCode},"${pet.source}","${pet.senderName}","${pet.senderAddress}","${phone}","${pet.category}","${pet.location}","${pet.content.replace(/"/g, '""')}","${authorityDisplay}","${pet.department}","${formatDate(pet.receivedDate)}","${formatDate(pet.deadline)}","${extended}","${pet.status}","${replyDoc}","${notes}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_kien_nghi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportOfficialLetter = () => {
    // Tạo nội dung công văn gửi các phòng ban dưới dạng CSV
    let csv = "STT,Mã vụ việc,Nội dung kiến nghị,Đơn vị xử lý trực tiếp,Thẩm quyền xử lý,Ngày tiếp nhận,Hạn giải quyết,Trạng thái,Ghi chú yêu cầu\n";
    const pending = filteredPetitions.filter((p) => p.status !== "Đã xong");
    pending.forEach((pet, index) => {
      const notes = pet.notes || "";
      csv += `${index + 1},${pet.petitionCode},"${pet.content.replace(/"/g, '""')}","${pet.department}","${pet.authority}","${formatDate(pet.receivedDate)}","${formatDate(pet.deadline)}","${pet.status}","${notes}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cong_van_gui_phong_ban_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFormSuccess = () => {
    setIsCreateOpen(false);
    router.refresh();
  };

  // Cập nhật tiến độ nhanh (inline)
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [quickStatus, setQuickStatus] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [quickExtendedUntil, setQuickExtendedUntil] = useState("");
  const [quickReplyDocNumber, setQuickReplyDocNumber] = useState("");
  const [quickReplyDocLink, setQuickReplyDocLink] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const openQuickUpdate = (pet: SerializedPetition) => {
    setUpdatingId(pet.id);
    setQuickStatus(pet.status);
    setQuickNotes(pet.notes || "");
    setQuickExtendedUntil(pet.extendedUntil ? pet.extendedUntil.split("T")[0] : "");
    setQuickReplyDocNumber(pet.replyDocNumber || "");
    setQuickReplyDocLink(pet.replyDocLink || "");
    setQuickError(null);
  };

  const handleQuickUpdate = async () => {
    if (!updatingId) return;
    setQuickLoading(true);
    setQuickError(null);
    try {
      const res = await fetch(`/api/petitions/${updatingId}/quick-update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: quickStatus,
          notes: quickNotes,
          extendedUntil: quickExtendedUntil || null,
          replyDocNumber: quickReplyDocNumber || null,
          replyDocLink: quickReplyDocLink || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Có lỗi xảy ra.");
      setUpdatingId(null);
      router.refresh();
    } catch (err: any) {
      setQuickError(err.message || "Không thể cập nhật.");
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <div>
          <h1 className="page-title">Sổ theo dõi & Giám sát vụ việc</h1>
          <p className="page-subtitle">Sổ chi tiết theo dõi tiến độ giải quyết kiến nghị cử tri</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Tiếp nhận kiến nghị
          </button>
          <button onClick={handleExportCSV} className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Xuất CSV
          </button>
          <button onClick={handleExportOfficialLetter} className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", borderColor: "var(--info)", color: "var(--info)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Công văn gửi các phòng ban
          </button>
          <button onClick={() => window.print()} className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            In báo cáo
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        {/* Thanh tìm kiếm và bộ lọc */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Tìm kiếm mã, người gửi, địa bàn phản ánh, nội dung..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div style={{ minWidth: "200px" }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Đang xử lý">Đang xử lý</option>
              <option value="Đã xong">Đã xong</option>
              <option value="Đang chờ ý kiến cấp trên">Đang chờ ý kiến cấp trên</option>
              <option value="OVERDUE">Quá hạn</option>
            </select>
          </div>

          <div style={{ minWidth: "180px" }}>
            <select
              className="form-control"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">Tất cả lĩnh vực</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bảng chi tiết */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: "50px", textAlign: "center", borderBottom: "1px solid var(--border-color)" }}>STT</th>
                <th rowSpan={2} style={{ width: "110px", borderBottom: "1px solid var(--border-color)" }}>Mã vụ việc</th>
                <th rowSpan={2} style={{ width: "130px", borderBottom: "1px solid var(--border-color)" }}>Nguồn tiếp nhận</th>
                <th colSpan={3} style={{ textAlign: "center", borderBottom: "1px solid var(--border-color)" }}>Thông tin người gửi</th>
                <th rowSpan={2} style={{ width: "100px", borderBottom: "1px solid var(--border-color)" }}>Lĩnh vực</th>
                <th rowSpan={2} style={{ width: "180px", borderBottom: "1px solid var(--border-color)" }}>Địa bàn phản ánh (GPS)</th>
                <th rowSpan={2} style={{ borderBottom: "1px solid var(--border-color)" }}>Nội dung kiến nghị</th>
                <th colSpan={2} style={{ textAlign: "center", borderBottom: "1px solid var(--border-color)" }}>Thẩm quyền xử lý</th>
                <th rowSpan={2} style={{ width: "150px", borderBottom: "1px solid var(--border-color)" }}>Đơn vị xử lý trực tiếp</th>
                <th rowSpan={2} style={{ width: "100px", borderBottom: "1px solid var(--border-color)" }}>Ngày tiếp nhận</th>
                <th rowSpan={2} style={{ width: "100px", borderBottom: "1px solid var(--border-color)" }}>Hạn giải quyết</th>
                <th rowSpan={2} style={{ width: "100px", borderBottom: "1px solid var(--border-color)" }}>Gia hạn</th>
                <th rowSpan={2} style={{ width: "100px", borderBottom: "1px solid var(--border-color)" }}>Trạng thái</th>
                <th rowSpan={2} style={{ width: "150px", borderBottom: "1px solid var(--border-color)" }}>Văn bản trả lời (Link)</th>
                <th rowSpan={2} style={{ width: "120px", borderBottom: "1px solid var(--border-color)" }}>Kết quả rà soát</th>
                <th rowSpan={2} style={{ width: "200px", borderBottom: "1px solid var(--border-color)" }}>Ghi chú</th>
                <th rowSpan={2} style={{ width: "90px", textAlign: "center", borderBottom: "1px solid var(--border-color)" }}>Hành động</th>
              </tr>
              <tr>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-color)" }}>Họ tên</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-color)" }}>Địa chỉ liên hệ</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-color)" }}>Số điện thoại</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-color)" }}>Phường</th>
                <th style={{ fontSize: "0.75rem", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-color)" }}>Sở/Ngành TP</th>
              </tr>
            </thead>
            <tbody>
              {filteredPetitions.length === 0 ? (
                <tr>
                  <td colSpan={19} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    Không tìm thấy dữ liệu nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredPetitions.map((pet, index) => {
                  const overdue = isOverdue(pet);
                  return (
                    <tr key={pet.id} style={overdue ? { backgroundColor: "rgba(225, 29, 72, 0.04)" } : {}}>
                      <td style={{ textAlign: "center", fontWeight: "500", color: "var(--text-muted)" }}>
                        {index + 1}
                      </td>
                      <td style={{ fontWeight: "700", color: overdue ? "var(--danger)" : "var(--primary)" }}>
                        {pet.petitionCode}
                      </td>
                      <td style={{ fontSize: "0.85rem", fontWeight: "500" }}>
                        {pet.source}
                      </td>
                      <td style={{ fontWeight: "600" }}>{pet.senderName}</td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={pet.senderAddress}>
                        {pet.senderAddress}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{pet.senderPhone || "-"}</td>
                      <td style={{ fontSize: "0.85rem", fontWeight: "500" }}>{pet.category}</td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{pet.location}</td>
                      <td>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-primary)", whiteSpace: "pre-line", minWidth: "200px" }}>
                          {pet.content}
                        </div>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: "bold", color: "var(--primary)" }}>
                        {pet.authority === "UBND phường" ? "✓" : "-"}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: "bold", color: "var(--primary)" }}>
                        {pet.authority !== "UBND phường" ? "✓" : "-"}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {pet.department}
                      </td>
                      <td style={{ fontSize: "0.85rem" }}>
                        {formatDate(pet.receivedDate)}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: overdue ? "var(--danger)" : "inherit", fontWeight: overdue ? "700" : "500" }}>
                        {formatDate(pet.deadline)}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--warning)" }}>
                        {pet.extendedUntil ? formatDate(pet.extendedUntil) : "-"}
                      </td>
                      <td>{getStatusBadge(pet)}</td>
                      <td>
                        {pet.replyDocNumber ? (
                          pet.replyDocLink ? (
                            <a
                              href={pet.replyDocLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "var(--primary)", fontWeight: "500", textDecoration: "underline" }}
                            >
                              {pet.replyDocNumber}
                            </a>
                          ) : (
                            <span style={{ fontWeight: "500", fontSize: "0.85rem" }}>{pet.replyDocNumber}</span>
                          )
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>-</span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.85rem", fontWeight: "600", color: pet.reviewStatus === "Hoàn thành" ? "var(--success)" : pet.reviewStatus === "Mới giải quyết 1 phần" ? "var(--warning)" : "var(--text-secondary)" }}>
                        {pet.reviewStatus}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {pet.notes || "-"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center" }}>
                          <button
                            onClick={() => openQuickUpdate(pet)}
                            className="btn btn-secondary"
                            style={{ padding: "0.35rem 0.6rem", fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: "0.25rem", backgroundColor: "var(--info-bg)", color: "var(--info)", borderColor: "var(--info)" }}
                            title="Cập nhật tiến độ nhanh"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            Tiến độ
                          </button>
                          <a href={`/petitions/${pet.id}`} className="btn btn-secondary" style={{ padding: "0.35rem 0.6rem", fontSize: "0.7rem" }}>
                            Chi tiết
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Glassmorphic Modal tiếp nhận kiến nghị mới */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: "750px", width: "90vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tiếp nhận kiến nghị / Vụ việc mới</h3>
              <button className="modal-close" onClick={() => setIsCreateOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <PetitionForm onSuccess={handleFormSuccess} onCancel={() => setIsCreateOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal cập nhật tiến độ nhanh */}
      {updatingId && (
        <div className="modal-overlay" onClick={() => setUpdatingId(null)}>
          <div
            className="modal-content glass-card"
            style={{ maxWidth: "480px", width: "90vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "0.5rem", verticalAlign: "middle" }}>
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Cập nhật tiến độ
              </h3>
              <button className="modal-close" onClick={() => setUpdatingId(null)}>&times;</button>
            </div>
            <div className="modal-body">
              {quickError && (
                <div style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.875rem", border: "1px solid rgba(225,29,72,0.2)" }}>
                  {quickError}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Trạng thái giải quyết</label>
                <select
                  className="form-control"
                  value={quickStatus}
                  onChange={(e) => setQuickStatus(e.target.value)}
                >
                  <option value="Đang xử lý">Đang xử lý</option>
                  <option value="Đã xong">Đã xong</option>
                  <option value="Đang chờ ý kiến cấp trên">Đang chờ ý kiến cấp trên</option>
                  <option value="Quá hạn">Quá hạn</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Thời hạn gia hạn giải quyết (nếu có)</label>
                <input
                  type="date"
                  className="form-control"
                  value={quickExtendedUntil}
                  onChange={(e) => setQuickExtendedUntil(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Văn bản trả lời (Số hiệu văn bản)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Số 12/UBND, Đang chờ Cty DVCI..."
                  value={quickReplyDocNumber}
                  onChange={(e) => setQuickReplyDocNumber(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Link văn bản trả lời (Đường dẫn PDF, nếu có)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: https://example.com/reply.pdf"
                  value={quickReplyDocLink}
                  onChange={(e) => setQuickReplyDocLink(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú tiến độ (tùy chọn)</label>
                <textarea
                  className="form-control form-textarea"
                  rows={2}
                  placeholder="Nhập ghi chú về tiến độ giải quyết..."
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setUpdatingId(null)}
                  className="btn btn-secondary"
                  style={{ flexGrow: 1 }}
                  disabled={quickLoading}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleQuickUpdate}
                  className="btn btn-primary"
                  style={{ flexGrow: 2 }}
                  disabled={quickLoading}
                >
                  {quickLoading ? "Đang lưu..." : "Lưu tiến độ & Thông tin"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
