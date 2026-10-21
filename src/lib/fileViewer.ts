/**
 * Tiện ích xử lý hiển thị và mở tệp tài liệu (PDF, Ảnh, Word, Google Drive...)
 * Hỗ trợ mở trực tiếp cả link web thông thường lẫn base64 data URL trên tất cả trình duyệt
 */

export function openDocumentViewer(url: string, title?: string) {
  if (!url) return;

  // Nếu là base64 data URL (PDF, Ảnh...)
  if (url.startsWith("data:")) {
    try {
      const commaIdx = url.indexOf(",");
      const meta = url.substring(0, commaIdx);
      const base64Data = url.substring(commaIdx + 1);
      const mimeMatch = meta.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "application/pdf";

      // Chuyển Base64 sang binary Blob
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      // Mở trong tab mới
      const newWin = window.open(blobUrl, "_blank");
      if (!newWin) {
        // Nếu trình duyệt chặn popup, kích hoạt tải xuống
        const a = document.createElement("a");
        a.href = blobUrl;
        const ext = mimeType.includes("pdf") ? ".pdf" : mimeType.includes("image") ? ".png" : "";
        a.download = (title || "tai-lieu-dinh-kem") + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // Thu hồi blob URL sau 2 phút để giải phóng bộ nhớ RAM
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    } catch (err) {
      console.error("Lỗi khi mở tệp data URL:", err);
      window.open(url, "_blank");
    }
  } else {
    // Link thông thường (Google Drive, OneDrive, URL máy chủ)
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Nén ảnh trước khi lưu (giảm từ 5-10MB của camera điện thoại xuống ~300KB)
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

/**
 * Đọc file thông thường sang Base64 Data URL
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
