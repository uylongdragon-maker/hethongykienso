"use client";

import React, { useState, useRef } from "react";
import { openDocumentViewer, compressImageIfNeeded, readFileAsDataUrl } from "@/lib/fileViewer";

interface FileUploadProps {
  name?: string;
  defaultValue?: string | null;
  value?: string | null;
  onChange?: (url: string) => void;
  label?: string;
  placeholder?: string;
}

export default function FileUpload({
  name = "replyDocLink",
  defaultValue = "",
  value,
  onChange,
  label,
  placeholder = "Dán link Google Drive, OneDrive hoặc liên kết văn bản...",
}: FileUploadProps) {
  const [internalUrl, setInternalUrl] = useState<string>(
    value !== undefined ? value || "" : defaultValue || ""
  );
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "manual">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUrl = value !== undefined ? value || "" : internalUrl;

  const updateUrl = (newUrl: string, name?: string) => {
    if (value === undefined) {
      setInternalUrl(newUrl);
    }
    if (name) {
      setFileName(name);
    }
    if (onChange) {
      onChange(newUrl);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const isImage = file.type.startsWith("image/");
      const MAX_SIZE = 3.5 * 1024 * 1024; // 3.5MB

      // Nếu là ảnh chụp từ điện thoại (thường 4-10MB), tự động nén kích thước
      if (isImage) {
        let dataUrl: string;
        if (file.size > 500 * 1024) {
          // Nén ảnh về kích thước chuẩn và dung lượng nhẹ (~200KB - 400KB)
          dataUrl = await compressImageIfNeeded(file, 1600, 0.8);
        } else {
          dataUrl = await readFileAsDataUrl(file);
        }
        updateUrl(dataUrl, file.name);
        return;
      }

      // Đối với tài liệu (PDF, Word, Excel...)
      if (file.size > MAX_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(
          `Tệp "${file.name}" có dung lượng ${sizeMB}MB (vượt quá 3.5MB cho phép tải trực tiếp). Vui lòng tải tệp lên Google Drive/OneDrive rồi chuyển sang tab "Dán liên kết" để gắn link.`
        );
      }

      // Đọc file sang Base64 Data URL ngay trên trình duyệt (nhanh, an toàn, không phụ thuộc ổ cứng máy chủ)
      const dataUrl = await readFileAsDataUrl(file);
      updateUrl(dataUrl, file.name);
    } catch (err: any) {
      console.error("Lỗi chọn tệp:", err);
      setError(err.message || "Không thể xử lý tệp được chọn.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    updateUrl("");
    setFileName("");
    setError(null);
  };

  // Xác định tên hiển thị thân thiện cho tệp
  const getDisplayName = () => {
    if (fileName) return fileName;
    if (!currentUrl) return "";
    if (currentUrl.startsWith("data:")) {
      if (currentUrl.includes("application/pdf")) return "Tài liệu đính kèm (PDF)";
      if (currentUrl.includes("image/")) return "Ảnh đính kèm";
      return "Tài liệu văn bản đã tải lên";
    }
    if (currentUrl.includes("drive.google.com")) return "Tài liệu Google Drive";
    if (currentUrl.includes("onedrive") || currentUrl.includes("sharepoint")) return "Tài liệu OneDrive";
    try {
      const urlObj = new URL(currentUrl);
      const pathname = urlObj.pathname;
      const lastPart = pathname.split("/").filter(Boolean).pop();
      return lastPart || currentUrl;
    } catch {
      return currentUrl.length > 40 ? currentUrl.slice(0, 37) + "..." : currentUrl;
    }
  };

  return (
    <div className="file-upload-widget" style={{ width: "100%" }}>
      {label && <label className="form-label">{label}</label>}

      {/* Hidden input to pass value in standard form submit */}
      {name && <input type="hidden" name={name} value={currentUrl} />}

      {/* Khi đã có tệp hoặc link */}
      {currentUrl ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.65rem 0.85rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "10px",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden" }}>
            <span style={{ fontSize: "1.3rem" }}>
              {currentUrl.startsWith("data:image/") ? "🖼️" : currentUrl.startsWith("data:") ? "📄" : "🔗"}
            </span>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div
                style={{
                  color: "#15803d",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={fileName || currentUrl}
              >
                {getDisplayName()}
              </div>
              <span style={{ fontSize: "0.72rem", color: "#166534" }}>
                {currentUrl.startsWith("data:") ? "Tệp đã lưu an toàn trong hệ thống" : "Đường dẫn liên kết văn bản"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => openDocumentViewer(currentUrl, fileName || "van-ban")}
              className="btn-neon-blue"
              style={{
                padding: "0.3rem 0.65rem",
                fontSize: "0.75rem",
                backgroundColor: "#16a34a",
                borderColor: "#16a34a",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
              title="Mở xem văn bản"
            >
              👁️ Mở xem
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentUrl.startsWith("data:")) {
                  fileInputRef.current?.click();
                } else {
                  setMode("manual");
                  handleRemove();
                }
              }}
              className="btn-neon-blue"
              style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
              title="Đổi sang tệp hoặc link khác"
            >
              Đổi
            </button>

            <button
              type="button"
              onClick={handleRemove}
              style={{
                background: "none",
                border: "none",
                color: "#ef4444",
                cursor: "pointer",
                padding: "0.3rem 0.5rem",
                fontSize: "0.9rem",
                fontWeight: 700,
              }}
              title="Xóa tệp này"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        /* Box tải file / nhập link */
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Chuyển đổi giữa 2 chế độ: Tải tệp và Dán liên kết */}
          <div
            style={{
              display: "flex",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "2px",
              backgroundColor: "#f8fafc",
              width: "fit-content",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode("upload");
                setError(null);
              }}
              style={{
                padding: "0.3rem 0.75rem",
                fontSize: "0.76rem",
                fontWeight: mode === "upload" ? 700 : 500,
                backgroundColor: mode === "upload" ? "#ffffff" : "transparent",
                color: mode === "upload" ? "#2563eb" : "#64748b",
                border: "none",
                borderRadius: "6px",
                boxShadow: mode === "upload" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              📁 Tải tệp từ máy
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("manual");
                setError(null);
              }}
              style={{
                padding: "0.3rem 0.75rem",
                fontSize: "0.76rem",
                fontWeight: mode === "manual" ? 700 : 500,
                backgroundColor: mode === "manual" ? "#ffffff" : "transparent",
                color: mode === "manual" ? "#2563eb" : "#64748b",
                border: "none",
                borderRadius: "6px",
                boxShadow: mode === "manual" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              🔗 Dán liên kết (Google Drive / OneDrive)
            </button>
          </div>

          {mode === "upload" ? (
            <div>
              <div
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  textAlign: "center",
                  backgroundColor: "#fafaf9",
                  cursor: uploading ? "wait" : "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#2563eb" }}>
                    {uploading ? "Đang xử lý tệp..." : "Bấm vào đây để chọn tệp (PDF, Word, Ảnh...)"}
                  </span>
                </div>
                <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.3rem" }}>
                  Hỗ trợ định dạng PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Tải trực tiếp tối đa 3.5MB)
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder={placeholder}
                  className="form-control"
                  value={currentUrl}
                  onChange={(e) => updateUrl(e.target.value)}
                  style={{ fontSize: "0.82rem" }}
                />
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span>💡</span>
                <span>
                  <strong>Khuyên dùng:</strong> Với văn bản scan nhiều trang hoặc tệp lớn, hãy tải lên Google Drive của đơn vị và dán link chia sẻ vào đây.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden real file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
        style={{ display: "none" }}
      />

      {error && (
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.6rem 0.8rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#b91c1c",
            fontSize: "0.78rem",
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
            <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>{error}</div>
          </div>
          {error.includes("vượt quá 3.5MB") && (
            <button
              type="button"
              onClick={() => {
                setMode("manual");
                setError(null);
              }}
              style={{
                marginTop: "0.4rem",
                padding: "0.3rem 0.6rem",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: "5px",
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Chuyển sang dán liên kết Google Drive ➔
            </button>
          )}
        </div>
      )}
    </div>
  );
}
