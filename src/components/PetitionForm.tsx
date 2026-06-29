"use client";

import { useState } from "react";

interface PetitionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PetitionForm({ onSuccess, onCancel }: PetitionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Trạng thái các trường dữ liệu
  const [type, setType] = useState("Kiến nghị");
  const [source, setSource] = useState("Tiếp xúc cử tri (trước kỳ họp)");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [category, setCategory] = useState("Quản lý đô thị");
  const [incidentAddressText, setIncidentAddressText] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [content, setContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [authority, setAuthority] = useState("UBND phường");
  const [department, setDepartment] = useState("Phòng KT-HT và Đô thị");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);

  // Lấy tọa độ GPS tự động bằng Geolocation API của trình duyệt
  const handleFetchGPS = () => {
    if ("geolocation" in navigator) {
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          setGpsCoordinates(`${lat}, ${lng}`);
        },
        (err) => {
          console.error("Lỗi định vị:", err);
          setError("Không thể tự động định vị GPS. Vui lòng cấp quyền hoặc tự điền.");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setError("Trình duyệt của bạn không hỗ trợ định vị GPS.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Gộp địa chỉ xảy ra sự việc với tọa độ GPS
    const combinedIncidentAddress = gpsCoordinates
      ? `${incidentAddressText} (GPS: ${gpsCoordinates})`
      : incidentAddressText;

    try {
      const res = await fetch("/api/petitions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          source,
          senderName,
          senderPhone: senderPhone || null,
          senderAddress,
          category,
          incidentAddress: combinedIncidentAddress,
          content,
          attachmentUrl: attachmentUrl || null,
          authority,
          department,
          receivedDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Có lỗi xảy ra khi gửi dữ liệu.");
      }

      // Reset form & gọi callback thành công
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="petition-form-box">
      {error && (
        <div
          style={{
            backgroundColor: "var(--danger-bg)",
            color: "var(--danger)",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            marginBottom: "1rem",
            fontSize: "0.9rem",
            border: "1px solid rgba(225, 29, 72, 0.2)",
          }}
        >
          {error}
        </div>
      )}

      <div className="grid-cols-2">
        <div className="form-group">
          <label className="form-label">Loại vụ việc</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="form-control">
            <option value="Kiến nghị">Kiến nghị (KN)</option>
            <option value="Giám sát">Giám sát (GS)</option>
            <option value="Khảo sát">Khảo sát (KS)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Nguồn tiếp nhận</label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="form-control">
            <option value="Tiếp xúc cử tri (trước kỳ họp)">Tiếp xúc cử tri (trước kỳ họp)</option>
            <option value="Tiếp xúc cử tri (sau kỳ họp)">Tiếp xúc cử tri (sau kỳ họp)</option>
            <option value="Tiếp xúc cử tri (hàng tuần)">Tiếp xúc cử tri (hàng tuần)</option>
            <option value="Sau giám sát">Sau giám sát</option>
            <option value="Đơn thư trực tiếp">Đơn thư trực tiếp</option>
            <option value="Cổng DVC Quốc gia">Cổng DVC Quốc gia</option>
          </select>
        </div>
      </div>

      <h4 className="detail-section-title" style={{ marginTop: "1rem", fontSize: "0.95rem" }}>
        Thông tin người kiến nghị
      </h4>
      <div className="grid-cols-2">
        <div className="form-group">
          <label className="form-label">Họ tên người gửi</label>
          <input
            type="text"
            required
            className="form-control"
            placeholder="Ví dụ: Nguyễn Văn A..."
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Số điện thoại (nếu có)</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ví dụ: 0909xxxxxx..."
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Địa chỉ liên hệ của người gửi (Tự động chuẩn hóa về Chánh Hưng Ward, lọc bỏ KP23)
        </label>
        <input
          type="text"
          required
          className="form-control"
          placeholder="Ví dụ: 1111 Tạ Quang Bửu, KP23..."
          value={senderAddress}
          onChange={(e) => setSenderAddress(e.target.value)}
        />
      </div>

      <h4 className="detail-section-title" style={{ marginTop: "1rem", fontSize: "0.95rem" }}>
        Phân loại lĩnh vực & Địa điểm phản ánh
      </h4>
      <div className="grid-cols-2">
        <div className="form-group">
          <label className="form-label">Lĩnh vực phân loại</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-control">
            <option value="Quản lý đô thị">Quản lý đô thị</option>
            <option value="Đất đai">Đất đai</option>
            <option value="Môi trường">Môi trường</option>
            <option value="An ninh trật tự">An ninh trật tự</option>
            <option value="Chế độ chính sách">Chế độ chính sách</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Ngày tiếp nhận hồ sơ</label>
          <input
            type="date"
            required
            className="form-control"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Định vị tọa độ số GPS */}
      <div className="form-group">
        <label className="form-label">Địa điểm xảy ra sự việc (Địa chỉ nơi phản ánh)</label>
        <input
          type="text"
          required
          className="form-control"
          placeholder="Ví dụ: 1122 Phạm Thế Hiển..."
          value={incidentAddressText}
          onChange={(e) => setIncidentAddressText(e.target.value)}
          style={{ marginBottom: "0.5rem" }}
        />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Tọa độ GPS (Vĩ độ, Kinh độ) - VD: 10.7423, 106.6821"
            value={gpsCoordinates}
            onChange={(e) => setGpsCoordinates(e.target.value)}
          />
          <button
            type="button"
            onClick={handleFetchGPS}
            className="btn btn-secondary"
            style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0 1rem" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
            Định vị GPS
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Tóm tắt nội dung kiến nghị</label>
        <textarea
          required
          rows={3}
          className="form-control form-textarea"
          placeholder="Nội dung phản ánh..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Đường dẫn tài liệu đính kèm (nếu có)</label>
        <input
          type="text"
          className="form-control"
          placeholder="Ví dụ: https://example.com/file.pdf"
          value={attachmentUrl}
          onChange={(e) => setAttachmentUrl(e.target.value)}
        />
      </div>

      <h4 className="detail-section-title" style={{ marginTop: "1rem", fontSize: "0.95rem" }}>
        Thẩm quyền & Đơn vị trực tiếp
      </h4>
      <div className="grid-cols-2">
        <div className="form-group">
          <label className="form-label">Thẩm quyền xử lý</label>
          <select value={authority} onChange={(e) => setAuthority(e.target.value)} className="form-control">
            <option value="UBND phường">UBND phường</option>
            <option value="Các Sở, ban ngành Thành phố">Các Sở, ban ngành Thành phố</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Đơn vị xử lý trực tiếp</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="form-control">
            <option value="Phòng KT-HT và Đô thị">Phòng KT-HT và Đô thị</option>
            <option value="Phòng Văn hóa - Xã hội">Phòng Văn hóa - Xã hội</option>
            <option value="Phòng Địa chính - Nhà đất">Phòng Địa chính - Nhà đất</option>
            <option value="Tổ Trật tự Đô thị">Tổ Trật tự Đô thị</option>
            <option value="Sở Giao thông Vận tải">Sở Giao thông Vận tải</option>
            <option value="Sở Xây dựng">Sở Xây dựng</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>
          Hủy bỏ
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Đang gửi..." : "Lưu kiến nghị"}
        </button>
      </div>
    </form>
  );
}
