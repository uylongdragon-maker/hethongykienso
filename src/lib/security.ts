/**
 * Tiện ích bảo mật dùng chung (Client & Server safe)
 * - Chống Stored XSS khi xuất HTML / Popup bản đồ
 * - Kiểm duyệt giao thức URL an toàn (chặn javascript:, data:text/html, image/svg+xml)
 * - Giới hạn tần suất truy cập (Rate Limiting) chống dò mật khẩu / CCCD
 */

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SAFE_DATA_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_DATA_URL_LENGTH = 5 * 1024 * 1024; // ~3.6MB tệp gốc

export function sanitizeAttachmentUrl(
  rawUrl: string | null | undefined
): { valid: boolean; url: string | null; error?: string } {
  if (!rawUrl || !rawUrl.trim()) {
    return { valid: true, url: null };
  }

  const trimmed = rawUrl.trim();

  // Đường dẫn nội bộ hợp lệ tới API xem tài liệu
  if (/^\/api\/petitions\/[a-zA-Z0-9_-]+\/document(\?(field=(replyDocLink|attachmentUrl)))?$/.test(trimmed)) {
    return { valid: true, url: trimmed };
  }

  // Đường dẫn tương đối tĩnh hợp lệ trong /uploads/ (tương thích dữ liệu cũ)
  if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return { valid: true, url: trimmed };
  }

  // Kiểm duyệt Base64 Data URL
  if (trimmed.startsWith("data:")) {
    if (trimmed.length > MAX_DATA_URL_LENGTH) {
      return {
        valid: false,
        url: null,
        error: "Dung lượng tệp mã hóa vượt quá giới hạn 3.5MB cho phép.",
      };
    }

    const match = trimmed.match(/^data:([a-zA-Z0-9.+/-]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) {
      return {
        valid: false,
        url: null,
        error: "Định dạng dữ liệu tệp đính kèm không hợp lệ.",
      };
    }

    const mime = match[1].toLowerCase();
    if (!SAFE_DATA_MIME_TYPES.includes(mime)) {
      return {
        valid: false,
        url: null,
        error: "Loại tệp không được phép tải lên vì lý do an toàn thông tin (chỉ chấp nhận PDF, Word, Excel, JPG, PNG, WebP).",
      };
    }

    return { valid: true, url: trimmed };
  }

  // Kiểm duyệt URL liên kết ngoài (chỉ chấp nhận http:// hoặc https://)
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return {
        valid: false,
        url: null,
        error: "Liên kết chỉ được phép sử dụng giao thức http:// hoặc https://.",
      };
    }
    return { valid: true, url: parsed.toString() };
  } catch {
    return {
      valid: false,
      url: null,
      error: "Đường dẫn liên kết không đúng định dạng URL hợp lệ.",
    };
  }
}

export function isSafeUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) return false;
  return sanitizeAttachmentUrl(rawUrl).valid;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const globalRateStore = globalThis as unknown as {
  __ykiensoRateMap?: Map<string, RateBucket>;
};

function getRateMap(): Map<string, RateBucket> {
  if (!globalRateStore.__ykiensoRateMap) {
    globalRateStore.__ykiensoRateMap = new Map<string, RateBucket>();
  }
  return globalRateStore.__ykiensoRateMap;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const store = getRateMap();

  // Dọn dẹp định kỳ khi bảng vượt ngưỡng 2000 khóa
  if (store.size > 2000) {
    for (const [k, v] of store.entries()) {
      if (v.resetAt <= now) store.delete(k);
    }
  }

  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "local";
}
