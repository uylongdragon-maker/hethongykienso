import { isSafeUrl } from "@/lib/security";

/**
 * Tiện ích xử lý hiển thị và mở tệp tài liệu (PDF, Ảnh, Word, Google Drive, hoặc stream nội bộ)
 * Kiểm duyệt giao thức an toàn chống XSS trước khi mở tab mới
 */
export function openDocumentViewer(url: string, title?: string) {
  if (!url) return;

  if (!isSafeUrl(url)) {
    alert("Liên kết tài liệu không hợp lệ hoặc bị chặn vì lý do an toàn thông tin.");
    return;
  }

  if (url.startsWith("data:")) {
    try {
      const commaIdx = url.indexOf(",");
      const meta = url.substring(0, commaIdx);
      const base64Data = url.substring(commaIdx + 1);
      const mimeMatch = meta.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "application/pdf";

      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      const newWin = window.open(blobUrl, "_blank", "noopener,noreferrer");
      if (!newWin) {
        const a = document.createElement("a");
        a.href = blobUrl;
        const ext = mimeType.includes("pdf") ? ".pdf" : mimeType.includes("image") ? ".png" : "";
        a.download = (title || "tai-lieu-dinh-kem") + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    } catch (err) {
      console.error("Lỗi khi mở tệp data URL:", err);
    }
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Nén ảnh chụp từ điện thoại trước khi lưu (~200KB - 400KB)
 */
export async function compressImageIfNeeded(file: File, maxDimension = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
