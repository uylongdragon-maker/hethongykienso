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

      <form action={updatePetitionWithId}>
        <div className="grid-layout-details">
          {/* Cột trái: Thông tin tổng quan vụ việc (Editable) */}
          <section className="glass-card detail-card" style={{ padding: "2rem" }}>
            <h3 className="detail-section-title" style={{ marginTop: 0 }}>
              Thông tin chi tiết tiếp nhận (Chỉnh sửa)
            </h3>

            <div style={{ display: "grid", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">Người kiến nghị / Phản ánh</label>
                <input
                  type="text"
                  name="senderName"
                  defaultValue={petition.senderName}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  name="senderPhone"
                  defaultValue={petition.senderPhone || ""}
                  className="form-control"
                  placeholder="Không bắt buộc"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Địa chỉ người gửi</label>
                <input
                  type="text"
                  name="senderAddress"
                  defaultValue={petition.senderAddress}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nguồn tiếp nhận</label>
                <select name="source" defaultValue={petition.source} className="form-control" required>
                  <option value="Tiếp xúc cử tri (trước kỳ họp)">Tiếp xúc cử tri (trước kỳ họp)</option>
                  <option value="Tiếp xúc cử tri (sau kỳ họp)">Tiếp xúc cử tri (sau kỳ họp)</option>
                  <option value="Tiếp xúc cử tri (hàng tuần)">Tiếp xúc cử tri (hàng tuần)</option>
                  <option value="Sau giám sát">Sau giám sát</option>
                  <option value="Đơn thư trực tiếp">Đơn thư trực tiếp</option>
                  <option value="Cổng DVC Quốc gia">Cổng DVC Quốc gia</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Lĩnh vực</label>
                  <select name="category" defaultValue={petition.category} className="form-control" required>
                    <option value="Quản lý đô thị">Quản lý đô thị</option>
                    <option value="Đất đai">Đất đai</option>
                    <option value="Môi trường">Môi trường</option>
                    <option value="An ninh trật tự">An ninh trật tự</option>
                    <option value="Chế độ chính sách">Chế độ chính sách</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Khu phố</label>
                  <select name="quarter" defaultValue={petition.quarter || "Khu phố 01"} className="form-control" required>
                    {Array.from({ length: 30 }, (_, i) => {
                      const kp = `Khu phố ${(i + 1).toString().padStart(2, "0")}`;
                      return <option key={kp} value={kp}>{kp}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Đơn vị xử lý trực tiếp</label>
                <select name="department" defaultValue={petition.department} className="form-control" required>
                  <option value="Phòng KT-HT và Đô thị">Phòng KT-HT và Đô thị</option>
                  <option value="Phòng Văn hóa - Xã hội">Phòng Văn hóa - Xã hội</option>
                  <option value="Phòng Địa chính - Nhà đất">Phòng Địa chính - Nhà đất</option>
                  <option value="Tổ Trật tự Đô thị">Tổ Trật tự Đô thị</option>
                  <option value="Sở Giao thông Vận tải">Sở Giao thông Vận tải</option>
                  <option value="Sở Xây dựng">Sở Xây dựng</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Thẩm quyền xử lý</label>
                <select name="authority" defaultValue={petition.authority} className="form-control" required>
                  <option value="UBND phường">UBND phường</option>
                  <option value="Các Sở, ban ngành Thành phố">Các Sở, ban ngành Thành phố</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Địa bàn phản ánh (GPS)</label>
                <input
                  type="text"
                  name="location"
                  defaultValue={petition.location}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                <label className="form-label">Tóm tắt nội dung kiến nghị</label>
                <textarea
                  name="content"
                  defaultValue={petition.content}
                  rows={4}
                  className="form-control form-textarea"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tài liệu đính kèm (Link URL)</label>
                <input
                  type="text"
                  name="attachmentUrl"
                  defaultValue={petition.attachmentUrl || ""}
                  className="form-control"
                  placeholder="https://..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Ngày tiếp nhận</label>
                  <input
                    type="date"
                    name="receivedDate"
                    defaultValue={toInputDateFormat(petition.receivedDate)}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hạn giải quyết</label>
                  <input
                    type="date"
                    name="deadline"
                    defaultValue={toInputDateFormat(petition.deadline)}
                    className="form-control"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Cột phải: Form cập nhật thông tin giải quyết & rà soát */}
          <section className="glass-card detail-card" style={{ padding: "2rem" }}>
            <h3 className="detail-section-title" style={{ marginTop: 0 }}>
              Kết quả giải quyết & Ý kiến rà soát
            </h3>

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
          </section>
        </div>
      </form>
    </div>
  );
}
