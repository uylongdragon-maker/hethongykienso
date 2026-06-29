import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { updatePetitionResolution } from "./actions";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PetitionDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Lấy chi tiết vụ việc
  const petition = await prisma.petition.findUnique({
    where: { id },
  });

  if (!petition) {
    notFound();
  }

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Trích xuất ngày định dạng YYYY-MM-DD để đưa vào input date
  const toInputDateFormat = (date: Date | null) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  // Ràng buộc id cho Server Action
  const updatePetitionWithId = updatePetitionResolution.bind(null, id);

  return (
    <div>
      <a href="/petitions" className="back-link">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Quay lại danh sách vụ việc
      </a>

      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <div>
          <h1 className="page-title">
            Cập nhật kết quả giải quyết {petition.petitionCode}
          </h1>
          <p className="page-subtitle">Cập nhật số hiệu văn bản trả lời, tiến độ giải quyết và ý kiến rà soát</p>
        </div>
      </div>

      <div className="grid-layout-details">
        {/* Cột trái: Thông tin tổng quan vụ việc (Read-only) */}
        <section className="glass-card detail-card" style={{ padding: "2rem" }}>
          <h3 className="detail-section-title" style={{ marginTop: 0 }}>
            Thông tin chi tiết tiếp nhận
          </h3>

          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div>
              <span className="detail-meta-label">Người kiến nghị / Phản ánh</span>
              <strong style={{ fontSize: "1.1rem", color: "var(--primary)" }}>
                {petition.senderName}
              </strong>
              {petition.senderPhone && (
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block" }}>
                  SĐT liên hệ: {petition.senderPhone}
                </span>
              )}
            </div>

            <div>
              <span className="detail-meta-label">Địa chỉ người gửi</span>
              <span style={{ fontSize: "0.9rem" }}>{petition.senderAddress}</span>
            </div>

            <div>
              <span className="detail-meta-label">Nguồn tiếp nhận</span>
              <span className="badge" style={{ display: "inline-block", backgroundColor: "var(--info-bg)", color: "var(--info)" }}>
                {petition.source}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <span className="detail-meta-label">Lĩnh vực</span>
                <strong style={{ fontSize: "0.9rem" }}>{petition.category}</strong>
              </div>
              <div>
                <span className="detail-meta-label">Đơn vị xử lý trực tiếp</span>
                <span style={{ fontSize: "0.9rem" }}>{petition.department}</span>
              </div>
            </div>

            <div>
              <span className="detail-meta-label">Thẩm quyền xử lý</span>
              <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>{petition.authority}</span>
            </div>

            <div>
              <span className="detail-meta-label">Địa bàn phản ánh (GPS)</span>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                {petition.location}
              </span>
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <span className="detail-meta-label">Tóm tắt nội dung kiến nghị</span>
              <div
                style={{
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                  backgroundColor: "rgba(0,0,0,0.02)",
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  whiteSpace: "pre-line",
                }}
              >
                {petition.content}
              </div>
            </div>

            {petition.attachmentUrl && (
              <div>
                <span className="detail-meta-label">Tài liệu đính kèm</span>
                <a
                  href={petition.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ display: "inline-flex", gap: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                >
                  Xem tài liệu đính kèm
                </a>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <div>
                <span className="detail-meta-label">Ngày tiếp nhận</span>
                <strong>{formatDateShort(petition.receivedDate)}</strong>
              </div>
              <div>
                <span className="detail-meta-label">Hạn giải quyết (30 ngày)</span>
                <strong style={{ color: petition.status === "Quá hạn" ? "var(--danger)" : "inherit" }}>
                  {formatDateShort(petition.deadline)}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* Cột phải: Form cập nhật thông tin giải quyết & rà soát */}
        <section className="glass-card detail-card" style={{ padding: "2rem" }}>
          <h3 className="detail-section-title" style={{ marginTop: 0 }}>
            Kết quả giải quyết & Ý kiến rà soát
          </h3>

          <form action={updatePetitionWithId}>
            <div style={{ display: "grid", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">Trạng thái giải quyết vụ việc</label>
                <select
                  name="status"
                  defaultValue={petition.status}
                  className="form-control"
                  required
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
                  name="extendedUntil"
                  defaultValue={toInputDateFormat(petition.extendedUntil)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Văn bản trả lời (Số hiệu văn bản)</label>
                <input
                  type="text"
                  name="replyDocNumber"
                  defaultValue={petition.replyDocNumber || ""}
                  placeholder="Ví dụ: Số 12/UBND, Đang chờ Cty DVCI..."
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Link văn bản trả lời (Đường dẫn PDF)</label>
                <input
                  type="text"
                  name="replyDocLink"
                  defaultValue={petition.replyDocLink || ""}
                  placeholder="Ví dụ: https://example.com/reply.pdf"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kết quả rà soát (Rà soát lại kết quả)</label>
                <select
                  name="reviewStatus"
                  defaultValue={petition.reviewStatus}
                  className="form-control"
                  required
                >
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Chưa giải quyết">Chưa giải quyết</option>
                  <option value="Mới giải quyết 1 phần">Mới giải quyết 1 phần</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú bổ sung</label>
                <textarea
                  name="notes"
                  defaultValue={petition.notes || ""}
                  placeholder="Ví dụ: Đã nhắc lần 2, đúng hạn..."
                  className="form-control form-textarea"
                  rows={4}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <a href="/petitions" className="btn btn-secondary" style={{ flexGrow: 1, textAlign: "center" }}>
                  Hủy bỏ
                </a>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 2 }}>
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
