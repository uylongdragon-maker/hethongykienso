"use client";

import React, { useState } from "react";
import FileUpload from "@/components/FileUpload";
import { SOURCES, CATEGORIES, DEPARTMENTS, AUTHORITIES, RESPONSIBLE_COMMITTEES } from "@/lib/constants";

export { SOURCES, CATEGORIES, DEPARTMENTS, AUTHORITIES, RESPONSIBLE_COMMITTEES };

interface PetitionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function addDaysIso(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().split("T")[0];
}

export default function PetitionForm({ onSuccess, onCancel }: PetitionFormProps) {
  const todayIso = new Date().toISOString().split("T")[0];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState("Kiến nghị");
  const [source, setSource] = useState(SOURCES[5] || SOURCES[0]);
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quarter, setQuarter] = useState("Khu phố 01");
  const [incidentAddressText, setIncidentAddressText] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [content, setContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [authority, setAuthority] = useState(AUTHORITIES[0]);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [responsibleCommittee, setResponsibleCommittee] = useState(RESPONSIBLE_COMMITTEES[0]);
  const [receivedDate, setReceivedDate] = useState(todayIso);
  const [deadline, setDeadline] = useState(() => addDaysIso(todayIso, 30));

  const handleReceivedDateChange = (dateVal: string) => {
    setReceivedDate(dateVal);
    if (dateVal) {
      setDeadline(addDaysIso(dateVal, 30));
    }
  };

  const handleFetchGPS = () => {
    if ("geolocation" in navigator) {
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          setGpsCoordinates(`${lat}, ${lng}`);
        },
        () => {
          setError("Không thể tự động lấy tọa độ GPS. Vui lòng cấp quyền vị trí hoặc tự nhập.");
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setError("Trình duyệt không hỗ trợ định vị vị trí.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const combinedIncidentAddress = gpsCoordinates.trim()
      ? `${incidentAddressText.trim()} (GPS: ${gpsCoordinates.trim()})`
      : incidentAddressText.trim();

    try {
      const res = await fetch("/api/petitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          source,
          senderName: senderName.trim(),
          senderPhone: senderPhone.trim() || null,
          senderAddress: senderAddress.trim(),
          category,
          incidentAddress: combinedIncidentAddress,
          content: content.trim(),
          attachmentUrl: attachmentUrl || null,
          authority,
          department,
          receivedDate,
          deadline,
          quarter,
          responsibleCommittee,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Có lỗi xảy ra khi lưu hồ sơ.");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
      {error && (
        <div
          style={{
            backgroundColor: "var(--danger-bg)",
            color: "var(--danger)",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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
            {SOURCES.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="form-group">
          <label className="form-label">Họ tên người gửi *</label>
          <input
            type="text"
            required
            className="form-control"
            placeholder="Nguyễn Văn A"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Số điện thoại</label>
          <input
            type="text"
            className="form-control tabular-nums"
            placeholder="0909123456"
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Địa chỉ liên hệ cử tri *</label>
        <input
          type="text"
          required
          className="form-control"
          placeholder="Số nhà, đường, Phường Bình Đông"
          value={senderAddress}
          onChange={(e) => setSenderAddress(e.target.value)}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
        <div className="form-group">
          <label className="form-label">Lĩnh vực phản ánh *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-control" required>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Khu phố *</label>
          <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="form-control" required>
            {Array.from({ length: 30 }, (_, i) => {
              const kp = `Khu phố ${(i + 1).toString().padStart(2, "0")}`;
              return (
                <option key={kp} value={kp}>
                  {kp}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="form-group">
          <label className="form-label">Ngày tiếp nhận *</label>
          <input
            type="date"
            required
            className="form-control tabular-nums"
            value={receivedDate}
            onChange={(e) => handleReceivedDateChange(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Hạn giải quyết (+30 ngày) *</label>
          <input
            type="date"
            required
            className="form-control tabular-nums"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Địa điểm phản ánh & tọa độ GPS *</label>
        <input
          type="text"
          required
          className="form-control"
          placeholder="1122 Phạm Thế Hiển"
          value={incidentAddressText}
          onChange={(e) => setIncidentAddressText(e.target.value)}
          style={{ marginBottom: "0.45rem" }}
        />
        <div style={{ display: "flex", gap: "0.55rem" }}>
          <input
            type="text"
            className="form-control tabular-nums"
            placeholder="Tọa độ GPS (VD: 10.7250, 106.6350)"
            value={gpsCoordinates}
            onChange={(e) => setGpsCoordinates(e.target.value)}
          />
          <button type="button" onClick={handleFetchGPS} className="btn-secondary">
            Lấy GPS
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Nội dung kiến nghị cử tri *</label>
        <textarea
          required
          rows={3}
          className="form-control form-textarea"
          placeholder="Nhập nội dung kiến nghị..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <FileUpload
        value={attachmentUrl}
        onChange={setAttachmentUrl}
        label="Tài liệu đính kèm ban đầu (nếu có)"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <div className="form-group">
          <label className="form-label">Thẩm quyền xử lý</label>
          <select value={authority} onChange={(e) => setAuthority(e.target.value)} className="form-control">
            {AUTHORITIES.map((auth) => (
              <option key={auth} value={auth}>
                {auth}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Đơn vị xử lý trực tiếp *</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="form-control">
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Ban HĐND phụ trách</label>
          <select value={responsibleCommittee} onChange={(e) => setResponsibleCommittee(e.target.value)} className="form-control">
            {RESPONSIBLE_COMMITTEES.map((comm) => (
              <option key={comm} value={comm}>
                {comm}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>
          Hủy
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu hồ sơ kiến nghị"}
        </button>
      </div>
    </form>
  );
}
