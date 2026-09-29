"use client";
import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import { SOURCES, CATEGORIES, DEPARTMENTS, AUTHORITIES } from "@/lib/constants";

export { SOURCES, CATEGORIES, DEPARTMENTS, AUTHORITIES };

interface PetitionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PetitionForm({ onSuccess, onCancel }: PetitionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Trạng thái các trường dữ liệu
  const [type, setType] = useState("Kiến nghị");
  const [source, setSource] = useState("Trước kỳ họp (Phường)");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quarter, setQuarter] = useState("Khu phố 01");
  const [incidentAddressText, setIncidentAddressText] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [content, setContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [authority, setAuthority] = useState("UBND phường");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [deadline, setDeadline] = useState(() => {
    const received = new Date();
    const dl = new Date(received.getTime());
    dl.setDate(dl.getDate() + 30);
    return dl.toISOString().split("T")[0];
  });

  // Tự động tính toán lại hạn giải quyết (+30 ngày) khi chọn ngày tiếp nhận
  const handleReceivedDateChange = (dateVal: string) => {
    setReceivedDate(dateVal);
    if (dateVal) {
      const received = new Date(dateVal);
      const dl = new Date(received.getTime());
      dl.setDate(dl.getDate() + 30);
      setDeadline(dl.toISOString().split("T")[0]);
    }
  };

  // Lấy tọa độ GPS tự động bằng Geolocation API
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
          setError("Không thể tự động lấy tọa độ GPS. Vui lòng cấp quyền vị trí hoặc tự điền.");
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setError("Trình duyệt của bạn không hỗ trợ định vị vị trí.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
          deadline,
          quarter,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Có lỗi xảy ra khi gửi dữ liệu.");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="petition-form-box" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div
          style={{
            backgroundColor: "rgba(225, 29, 72, 0.08)",
            color: "#e11d48",
            padding: "0.85rem 1rem",
            borderRadius: "10px",
            fontSize: "0.875rem",
            border: "1px solid rgba(225, 29, 72, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loại vụ việc & Phân loại kỳ họp */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
            Loại vụ việc
          </label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="form-control">
            <option value="Kiến nghị">Kiến nghị (KN)</option>
            <option value="Giám sát">Giám sát (GS)</option>
            <option value="Khảo sát">Khảo sát (KS)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
            Phân loại Kỳ họp / Nguồn tiếp nhận
          </label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="form-control">
            {SOURCES.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Thông tin người gửi */}
      <div style={{ background: "rgba(0,0,0,0.02)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)" }}>
        <h4 style={{ fontSize: "0.9rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.04em", color: "#191918", marginBottom: "1rem" }}>
          Thông tin cử tri gửi kiến nghị
        </h4>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "600", fontSize: "0.8rem", marginBottom: "0.25rem", display: "block" }}>
              Họ tên người gửi <span style={{ color: "#e11d48" }}>*</span>
            </label>
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
            <label className="form-label" style={{ fontWeight: "600", fontSize: "0.8rem", marginBottom: "0.25rem", display: "block" }}>
              Số điện thoại
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Ví dụ: 0909xxxxxx"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: "600", fontSize: "0.8rem", marginBottom: "0.25rem", display: "block" }}>
            Địa chỉ liên hệ người gửi (Tự động định dạng Phường Bình Đông, TP.HCM)
          </label>
          <input
            type="text"
            required
            className="form-control"
            placeholder="Ví dụ: 1111 Tạ Quang Bửu..."
            value={senderAddress}
            onChange={(e) => setSenderAddress(e.target.value)}
          />
        </div>
      </div>

      {/* Phân loại Lĩnh vực & Khu phố */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
            Phân loại Lĩnh vực (21 Lĩnh vực) <span style={{ color: "#e11d48" }}>*</span>
          </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-control" required>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
            Khu phố (Phường Bình Đông)
          </label>
          <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="form-control" required>
            {Array.from({ length: 30 }, (_, i) => {
              const kp = `Khu phố ${(i + 1).toString().padStart(2, "0")}`;
              return <option key={kp} value={kp}>{kp}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Thời gian */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
            Ngày tiếp nhận hồ sơ
          </label>
          <input
            type="date"
            required
            className="form-control"
            value={receivedDate}
            onChange={(e) => handleReceivedDateChange(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
            Thời hạn giải quyết (+30 ngày)
          </label>
          <input
            type="date"
            required
            className="form-control"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      {/* Địa chỉ phản ánh & Định vị GPS */}
      <div className="form-group">
        <label className="form-label" style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
          Địa điểm xảy ra sự việc (Địa chỉ nơi phản ánh & Tọa độ GPS)
        </label>
        <input
          type="text"
          required
          className="form-control"
          placeholder="Ví dụ: 1122 Phạm Thế Hiển, Chợ Bình Đông..."
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
            className="btn-neon-blue"
            style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0 1.1rem", borderColor: "#6366f1", color: "#6366f1" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
            Tự động lấy GPS
          </button>
        </div>
      </div>

      {/* Nội dung kiến nghị */}
      <div className="form-group">
        <label className="form-label" style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
          Nội dung kiến nghị cử tri <span style={{ color: "#e11d48" }}>*</span>
        </label>
        <textarea
          required
          rows={3}
          className="form-control form-textarea"
          placeholder="Nhập chi tiết ý kiến, phản ánh cử tri..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div className="form-group">
        <FileUpload
          value={attachmentUrl}
          onChange={setAttachmentUrl}
          label="Tài liệu / Đơn thư đính kèm (nếu có)"
          placeholder="Tải lên tệp đính kèm hoặc nhập URL"
        />
      </div>

      {/* Thẩm quyền & Đơn vị xử lý trực tiếp */}
      <div style={{ background: "rgba(99, 102, 241, 0.04)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(99, 102, 241, 0.12)" }}>
        <h4 style={{ fontSize: "0.9rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.04em", color: "#4f46e5", marginBottom: "1rem" }}>
          Phân công Thẩm quyền & Đơn vị trực tiếp giải quyết
        </h4>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
              Thẩm quyền xử lý
            </label>
            <select value={authority} onChange={(e) => setAuthority(e.target.value)} className="form-control">
              {AUTHORITIES.map((auth) => (
                <option key={auth} value={auth}>
                  {auth}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
              Đơn vị xử lý trực tiếp cấp phường (9 Đơn vị) <span style={{ color: "#e11d48" }}>*</span>
            </label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="form-control">
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} className="btn-neon-blue" disabled={loading}>
          Hủy bỏ
        </button>
        <button type="submit" className="btn-neon-blue" style={{ minWidth: "140px" }} disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu hồ sơ kiến nghị"}
        </button>
      </div>
    </form>
  );
}
