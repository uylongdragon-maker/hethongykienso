"use client";

import React, { useState, useRef } from "react";

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
  placeholder = "Tải lên tệp văn bản kết quả (PDF, Word, Ảnh...)",
}: FileUploadProps) {
  const [internalUrl, setInternalUrl] = useState<string>(value !== undefined ? (value || "") : (defaultValue || ""));
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "manual">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUrl = value !== undefined ? (value || "") : internalUrl;

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
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể tải tệp lên.");
      }

      updateUrl(data.url, file.name);
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải tệp.");
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

  return (
    <div className="file-upload-widget" style={{ width: "100%" }}>
      {label && <label className="form-label">{label}</label>}

      {/* Hidden input to pass value in form submit */}
      {name && <input type="hidden" name={name} value={currentUrl} />}

      {/* When a file/url already exists */}
      {currentUrl ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.6rem 0.85rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "10px",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
            <span style={{ fontSize: "1.2rem" }}>📄</span>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#15803d",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  textDecoration: "underline",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title="Bấm để mở và xem nội dung tệp"
              >
                {fileName || (currentUrl.split("/").pop() || "Xem văn bản đính kèm")} ↗
              </a>
              <span style={{ fontSize: "0.72rem", color: "#166534" }}>Đã tải lên • Nhấp để mở xem trực tiếp</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-neon-blue"
              style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem" }}
            >
              Đổi file
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
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
              title="Xóa tệp này"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        /* Upload box */
        <div>
          {mode === "upload" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
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
                    {uploading ? "Đang tải tệp lên máy chủ..." : "Bấm vào đây để chọn tệp (PDF, Word, Ảnh...)"}
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                  Hỗ trợ định dạng PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Tối đa 25MB)
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6b7280",
                    fontSize: "0.74rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Hoặc nhập đường dẫn link trực tiếp
                </button>
              </div>
            </div>
          ) : (
            /* Manual link mode */
            <div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder={placeholder}
                  className="form-control"
                  value={currentUrl}
                  onChange={(e) => updateUrl(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  className="btn-neon-blue"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}
                >
                  Tải file lên
                </button>
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
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        style={{ display: "none" }}
      />

      {error && (
        <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.3rem", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
