"use client";

import React, { useState, useRef } from "react";
import { openDocumentViewer, compressImageIfNeeded, readFileAsDataUrl } from "@/lib/fileViewer";
import { sanitizeAttachmentUrl } from "@/lib/security";

interface FileUploadProps {
  name?: string;
  defaultValue?: string | null;
  value?: string | null;
  onChange?: (url: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function FileUpload({
  name = "replyDocLink",
  defaultValue = "",
  value,
  onChange,
  label,
  placeholder = "Nhập liên kết Google Drive, OneDrive hoặc Cổng thông tin...",
  disabled = false,
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

  const updateUrl = (newUrl: string, uploadedName?: string) => {
    if (value === undefined) {
      setInternalUrl(newUrl);
    }
    if (uploadedName) {
      setFileName(uploadedName);
    }
    if (onChange) {
      onChange(newUrl);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || disabled) return;

    setUploading(true);
    setError(null);

    try {
      const isImage = file.type.startsWith("image/") && file.type !== "image/svg+xml";
      const MAX_SIZE = 3.5 * 1024 * 1024;

      if (isImage) {
        const dataUrl =
          file.size > 500 * 1024
            ? await compressImageIfNeeded(file, 1600, 0.8)
            : await readFileAsDataUrl(file);
        const check = sanitizeAttachmentUrl(dataUrl);
        if (!check.valid || !check.url) {
          throw new Error(check.error || "Tệp ảnh không hợp lệ.");
        }
        updateUrl(check.url, file.name);
        return;
      }

      if (file.size > MAX_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(
          `Tệp "${file.name}" (${sizeMB}MB) vượt quá giới hạn 3.5MB tải trực tiếp. Vui lòng chuyển sang chế độ Dán liên kết Google Drive hoặc OneDrive.`
        );
      }

      const dataUrl = await readFileAsDataUrl(file);
      const check = sanitizeAttachmentUrl(dataUrl);
      if (!check.valid || !check.url) {
        throw new Error(check.error || "Định dạng tệp không được hỗ trợ.");
      }
      updateUrl(check.url, file.name);
    } catch (err: any) {
      setError(err.message || "Không thể xử lý tệp được chọn.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleManualUrlChange = (raw: string) => {
    setError(null);
    updateUrl(raw);
    if (raw.trim()) {
      const check = sanitizeAttachmentUrl(raw);
      if (!check.valid) {
        setError(check.error || "Liên kết không hợp lệ.");
      }
    }
  };

  const handleRemove = () => {
    if (disabled) return;
    updateUrl("");
    setFileName("");
    setError(null);
  };

  const getDisplayName = () => {
    if (fileName) return fileName;
    if (!currentUrl) return "";
    if (currentUrl.startsWith("/api/petitions/")) return "Tài liệu đính kèm trên hệ thống";
    if (currentUrl.startsWith("data:")) {
      if (currentUrl.includes("application/pdf")) return "Văn bản PDF đính kèm";
      if (currentUrl.includes("image/")) return "Hình ảnh đính kèm";
      return "Tài liệu đính kèm";
    }
    if (currentUrl.includes("drive.google.com")) return "Tài liệu Google Drive";
    if (currentUrl.includes("onedrive") || currentUrl.includes("sharepoint")) return "Tài liệu OneDrive";
    return currentUrl.length > 48 ? currentUrl.slice(0, 45) + "..." : currentUrl;
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {label && <label className="form-label">{label}</label>}
      {name && <input type="hidden" name={name} value={currentUrl} />}

      {currentUrl ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            backgroundColor: "var(--success-bg)",
            borderRadius: "var(--radius-md)",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "var(--success)",
              fontWeight: 700,
              fontSize: "0.85rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {getDisplayName()}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <button
              type="button"
              onClick={() => openDocumentViewer(currentUrl, fileName || "tai-lieu")}
              className="btn-primary"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.76rem" }}
            >
              Mở tài liệu
            </button>

            {!disabled && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (currentUrl.startsWith("data:") || currentUrl.startsWith("/api/petitions/")) {
                      fileInputRef.current?.click();
                    } else {
                      setMode("manual");
                      handleRemove();
                    }
                  }}
                  className="btn-secondary"
                  style={{ padding: "0.35rem 0.7rem", fontSize: "0.76rem" }}
                >
                  Đổi
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="btn-danger-tonal"
                  style={{ padding: "0.35rem 0.65rem", fontSize: "0.76rem" }}
                >
                  Xóa
                </button>
              </>
            )}
          </div>
        </div>
      ) : disabled ? (
        <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", padding: "0.4rem 0" }}>
          Chưa có văn bản đính kèm
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              onClick={() => {
                setMode("upload");
                setError(null);
              }}
              className={mode === "upload" ? "btn-primary" : "btn-secondary"}
              style={{ padding: "0.35rem 0.8rem", fontSize: "0.76rem" }}
            >
              Tải tệp từ máy
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("manual");
                setError(null);
              }}
              className={mode === "manual" ? "btn-primary" : "btn-secondary"}
              style={{ padding: "0.35rem 0.8rem", fontSize: "0.76rem" }}
            >
              Dán liên kết
            </button>
          </div>

          {mode === "upload" ? (
            <button
              type="button"
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="btn-secondary"
              style={{
                padding: "0.95rem 1rem",
                justifyContent: "center",
                width: "100%",
                fontWeight: 600,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>
                {uploading ? "Đang xử lý tệp..." : "Chọn tệp PDF, Word, Excel hoặc Ảnh (tối đa 3.5MB)"}
              </span>
            </button>
          ) : (
            <input
              type="url"
              placeholder={placeholder}
              className="form-control"
              value={currentUrl}
              onChange={(e) => handleManualUrlChange(e.target.value)}
            />
          )}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
        style={{ display: "none" }}
        disabled={disabled}
      />

      {error && (
        <div
          style={{
            padding: "0.6rem 0.85rem",
            backgroundColor: "var(--danger-bg)",
            borderRadius: "var(--radius-sm)",
            color: "var(--danger)",
            fontSize: "0.78rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <span>{error}</span>
          {error.includes("3.5MB") && (
            <button
              type="button"
              onClick={() => {
                setMode("manual");
                setError(null);
              }}
              className="btn-accent"
              style={{ padding: "0.3rem 0.65rem", fontSize: "0.74rem" }}
            >
              Chuyển sang dán liên kết
            </button>
          )}
        </div>
      )}
    </div>
  );
}
