import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { STATUSES, REVIEW_STATUSES } from "@/lib/constants";
import { sanitizeAttachmentUrl } from "@/lib/security";
import {
  SerializedPetition,
  composeNotesWithCommittee,
  extractCommitteeFromNotes,
} from "@/lib/petitionUtils";

let lastOverdueSyncAt = 0;
const OVERDUE_SYNC_TTL_MS = 60_000;

/**
 * Tự động cập nhật trạng thái "Quá hạn" dựa trên hạn hiệu lực (extendedUntil || deadline)
 * Giới hạn chạy tối đa mỗi 60 giây để tránh tranh chấp khóa ghi CSDL
 */
export async function syncOverduePetitions(force = false): Promise<void> {
  const nowMs = Date.now();
  if (!force && nowMs - lastOverdueSyncAt < OVERDUE_SYNC_TTL_MS) {
    return;
  }
  lastOverdueSyncAt = nowMs;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  try {
    await prisma.petition.updateMany({
      where: {
        status: "Đang xử lý",
        OR: [
          {
            extendedUntil: null,
            deadline: { lt: startOfToday },
          },
          {
            extendedUntil: { not: null, lt: startOfToday },
          },
        ],
      },
      data: {
        status: "Quá hạn",
      },
    });

    // Khôi phục "Đang xử lý" nếu vụ việc đã được gia hạn tới hôm nay hoặc tương lai
    await prisma.petition.updateMany({
      where: {
        status: "Quá hạn",
        extendedUntil: { gte: startOfToday },
      },
      data: {
        status: "Đang xử lý",
      },
    });
  } catch (err) {
    console.error("Lỗi đồng bộ trạng thái quá hạn:", err);
  }
}

interface RawPetitionRow {
  id: string;
  petitionCode: string;
  source: string;
  quarter: string | null;
  senderName: string;
  senderAddress: string;
  senderPhone: string | null;
  category: string;
  location: string;
  content: string;
  attachmentUrl: string | null;
  authority: string;
  department: string;
  receivedDate: Date | string;
  deadline: Date | string;
  extendedUntil: Date | string | null;
  status: string;
  replyDocNumber: string | null;
  replyDocDate: Date | string | null;
  replyDocLink: string | null;
  reviewStatus: string;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function toIso(val: Date | string | null | undefined): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? String(val) : parsed.toISOString();
}

function replaceDataUrlWithProxy(
  id: string,
  field: "replyDocLink" | "attachmentUrl",
  value: string | null
): string | null {
  if (!value) return null;
  if (value.startsWith("data:")) {
    return `/api/petitions/${id}/document?field=${field}`;
  }
  return value;
}

/**
 * Truy vấn danh sách vụ việc siêu nhẹ:
 * Thay thế chuỗi Base64 nhiều MB ngay từ tầng SQL bằng URL stream nội bộ,
 * giảm 99% băng thông CSDL và kích thước HTML trả về trình duyệt.
 */
export async function fetchSerializedPetitions(): Promise<SerializedPetition[]> {
  // Đồng bộ quá hạn chạy nền không chặn luồng tải trang (UI đã tự tính quá hạn theo thời gian thực)
  void syncOverduePetitions();

  try {
    const rows = await prisma.$queryRaw<RawPetitionRow[]>(Prisma.sql`
      SELECT
        "id",
        "petitionCode",
        "source",
        "quarter",
        "senderName",
        "senderAddress",
        "senderPhone",
        "category",
        "location",
        "content",
        CASE
          WHEN "attachmentUrl" IS NULL OR "attachmentUrl" = '' THEN NULL
          WHEN LEFT("attachmentUrl", 5) = 'data:' THEN '/api/petitions/' || "id" || '/document?field=attachmentUrl'
          ELSE "attachmentUrl"
        END AS "attachmentUrl",
        "authority",
        "department",
        "receivedDate",
        "deadline",
        "extendedUntil",
        "status",
        "replyDocNumber",
        "replyDocDate",
        CASE
          WHEN "replyDocLink" IS NULL OR "replyDocLink" = '' THEN NULL
          WHEN LEFT("replyDocLink", 5) = 'data:' THEN '/api/petitions/' || "id" || '/document?field=replyDocLink'
          ELSE "replyDocLink"
        END AS "replyDocLink",
        "reviewStatus",
        "notes",
        "createdAt",
        "updatedAt"
      FROM "Petition"
      ORDER BY "receivedDate" DESC, "createdAt" DESC
    `);

    return rows.map((p) => ({
      ...p,
      receivedDate: toIso(p.receivedDate) || new Date().toISOString(),
      deadline: toIso(p.deadline) || new Date().toISOString(),
      extendedUntil: toIso(p.extendedUntil),
      replyDocDate: toIso(p.replyDocDate),
      createdAt: toIso(p.createdAt) || new Date().toISOString(),
      updatedAt: toIso(p.updatedAt) || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Fallback findMany do lỗi queryRaw:", err);
    const fallback = await prisma.petition.findMany({
      orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
    });
    return fallback.map((p) => ({
      ...p,
      attachmentUrl: replaceDataUrlWithProxy(p.id, "attachmentUrl", p.attachmentUrl),
      replyDocLink: replaceDataUrlWithProxy(p.id, "replyDocLink", p.replyDocLink),
      receivedDate: p.receivedDate.toISOString(),
      deadline: p.deadline.toISOString(),
      extendedUntil: p.extendedUntil ? p.extendedUntil.toISOString() : null,
      replyDocDate: p.replyDocDate ? p.replyDocDate.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }
}

export async function generateNextPetitionCode(type: string): Promise<string> {
  let prefix = "KN";
  if (type === "Giám sát") prefix = "GS";
  if (type === "Khảo sát") prefix = "KS";

  const yearStr = new Date().getFullYear().toString();
  const pattern = `${prefix}${yearStr}-`;

  const latest = await prisma.petition.findFirst({
    where: {
      petitionCode: { startsWith: pattern },
    },
    select: { petitionCode: true },
    orderBy: { petitionCode: "desc" },
  });

  if (!latest) {
    return `${pattern}001`;
  }

  const dashIdx = latest.petitionCode.indexOf("-");
  if (dashIdx !== -1) {
    const parsed = parseInt(latest.petitionCode.slice(dashIdx + 1), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      const width = Math.max(3, String(parsed + 1).length);
      return `${pattern}${String(parsed + 1).padStart(width, "0")}`;
    }
  }

  const count = await prisma.petition.count({
    where: { petitionCode: { startsWith: pattern } },
  });
  return `${pattern}${String(count + 1).padStart(3, "0")}`;
}

export interface WorkflowUpdateInput {
  status?: string;
  reviewStatus?: string;
  replyDocNumber?: string | null;
  replyDocDate?: string | Date | null;
  replyDocLink?: string | null;
  attachmentUrl?: string | null;
  extendedUntil?: string | Date | null;
  notes?: string | null;
  responsibleCommittee?: string | null;
}

export function buildWorkflowUpdateData(params: {
  existing: {
    id: string;
    status: string;
    reviewStatus: string;
    replyDocNumber: string | null;
    replyDocDate: Date | null;
    replyDocLink: string | null;
    attachmentUrl: string | null;
    extendedUntil: Date | null;
    notes: string | null;
  };
  session: SessionUser;
  input: WorkflowUpdateInput;
}): {
  ok: true;
  data: {
    status: string;
    reviewStatus: string;
    replyDocNumber: string | null;
    replyDocDate: Date | null;
    replyDocLink: string | null;
    attachmentUrl: string | null;
    extendedUntil: Date | null;
    notes: string | null;
  };
  submittedForApproval: boolean;
} | {
  ok: false;
  statusCode: number;
  error: string;
} {
  const { existing, session, input } = params;

  if (session.role === "CAN_BO") {
    return {
      ok: false,
      statusCode: 403,
      error: "Tài khoản Lãnh đạo phường có quyền chỉ xem, không được phép chỉnh sửa dữ liệu.",
    };
  }

  if (input.status && !STATUSES.includes(input.status)) {
    return {
      ok: false,
      statusCode: 400,
      error: "Trạng thái giải quyết không hợp lệ.",
    };
  }

  if (input.reviewStatus && !REVIEW_STATUSES.includes(input.reviewStatus)) {
    return {
      ok: false,
      statusCode: 400,
      error: "Trạng thái rà soát không hợp lệ.",
    };
  }

  // Kiểm duyệt link trả lời (giữ nguyên dữ liệu gốc nếu client gửi lại proxy URL nội bộ)
  let nextReplyDocLink = existing.replyDocLink;
  if (input.replyDocLink !== undefined) {
    const proxyPath = `/api/petitions/${existing.id}/document?field=replyDocLink`;
    if (input.replyDocLink === proxyPath) {
      nextReplyDocLink = existing.replyDocLink;
    } else {
      const check = sanitizeAttachmentUrl(input.replyDocLink);
      if (!check.valid) {
        return { ok: false, statusCode: 400, error: check.error || "Liên kết văn bản trả lời không hợp lệ." };
      }
      nextReplyDocLink = check.url;
    }
  }

  // Kiểm duyệt link đính kèm ban đầu
  let nextAttachmentUrl = existing.attachmentUrl;
  if (input.attachmentUrl !== undefined) {
    const proxyPath = `/api/petitions/${existing.id}/document?field=attachmentUrl`;
    if (input.attachmentUrl === proxyPath) {
      nextAttachmentUrl = existing.attachmentUrl;
    } else {
      const check = sanitizeAttachmentUrl(input.attachmentUrl);
      if (!check.valid) {
        return { ok: false, statusCode: 400, error: check.error || "Liên kết tệp đính kèm không hợp lệ." };
      }
      nextAttachmentUrl = check.url;
    }
  }

  // Xử lý ngày gia hạn
  let nextExtendedUntil = existing.extendedUntil;
  if (input.extendedUntil !== undefined) {
    if (!input.extendedUntil) {
      nextExtendedUntil = null;
    } else {
      const d = input.extendedUntil instanceof Date ? input.extendedUntil : new Date(input.extendedUntil);
      if (isNaN(d.getTime())) {
        return { ok: false, statusCode: 400, error: "Ngày gia hạn không hợp lệ." };
      }
      nextExtendedUntil = d;
    }
  }

  // Xử lý ngày văn bản trả lời
  let nextReplyDocDate = existing.replyDocDate;
  if (input.replyDocDate !== undefined) {
    if (!input.replyDocDate) {
      nextReplyDocDate = null;
    } else {
      const d = input.replyDocDate instanceof Date ? input.replyDocDate : new Date(input.replyDocDate);
      if (isNaN(d.getTime())) {
        return { ok: false, statusCode: 400, error: "Ngày văn bản trả lời không hợp lệ." };
      }
      nextReplyDocDate = d;
    }
  }

  let finalStatus = input.status || existing.status;
  let finalReviewStatus = input.reviewStatus || existing.reviewStatus;
  let submittedForApproval = false;

  // Chuẩn hóa ghi chú và bảo toàn [Ban phụ trách: ...]
  const rawNotesInput = input.notes !== undefined ? input.notes : existing.notes;
  const { cleanNotes } = extractCommitteeFromNotes(rawNotesInput);
  let workingBodyNotes = cleanNotes;

  // Quy tắc phân quyền phê duyệt:
  // Chuyên viên không được chốt "Đã xong" / "Hoàn thành" trực tiếp mà phải qua bước "Chờ Admin phê duyệt"
  if (session.role === "CHUYEN_VIEN") {
    if (finalStatus === "Đã xong" || finalReviewStatus === "Hoàn thành") {
      finalStatus = "Chờ Admin phê duyệt";
      finalReviewStatus = "Mới giải quyết 1 phần";
      submittedForApproval = true;
      const approvalStamp = `[Chuyên viên ${session.fullName} trình duyệt]`;
      if (!workingBodyNotes.includes(approvalStamp)) {
        workingBodyNotes = workingBodyNotes
          ? `${approvalStamp} ${workingBodyNotes}`
          : `${approvalStamp} Đã cập nhật dự thảo kết quả xử lý`;
      }
    }
  } else if (session.role === "ADMIN") {
    // Đồng bộ nhất quán giữa trạng thái xử lý và trạng thái rà soát khi Admin chốt hồ sơ
    if (input.status === "Đã xong") {
      finalStatus = "Đã xong";
      if (!input.reviewStatus || input.reviewStatus === "Chưa giải quyết" || existing.status === "Chờ Admin phê duyệt") {
        finalReviewStatus = "Hoàn thành";
      }
    } else if (input.reviewStatus === "Hoàn thành" && !input.status) {
      finalStatus = "Đã xong";
      finalReviewStatus = "Hoàn thành";
    }
  }

  // Nếu mở lại hồ sơ từ "Đã xong" sang trạng thái chưa xong, đồng bộ lại trạng thái rà soát
  if (finalStatus !== "Đã xong" && finalReviewStatus === "Hoàn thành") {
    finalReviewStatus = "Mới giải quyết 1 phần";
  }

  // Nếu gia hạn sang ngày còn hiệu lực mà trạng thái cũ đang "Quá hạn" (và người dùng không cố tình chọn "Quá hạn"), khôi phục "Đang xử lý"
  if (nextExtendedUntil && finalStatus === "Quá hạn" && input.status !== "Quá hạn") {
    const endExt = new Date(nextExtendedUntil);
    endExt.setHours(23, 59, 59, 999);
    if (endExt.getTime() >= Date.now()) {
      finalStatus = "Đang xử lý";
    }
  }

  // Tự động ghi nhận ngày ban hành văn bản khi hoàn tất nếu chưa điền
  if (finalStatus === "Đã xong" && !nextReplyDocDate && input.replyDocDate === undefined) {
    nextReplyDocDate = new Date();
  }

  const finalNotes = composeNotesWithCommittee(
    workingBodyNotes,
    input.responsibleCommittee,
    existing.notes
  );

  const nextReplyDocNumber =
    input.replyDocNumber !== undefined
      ? input.replyDocNumber?.trim() || null
      : existing.replyDocNumber;

  return {
    ok: true,
    submittedForApproval,
    data: {
      status: finalStatus,
      reviewStatus: finalReviewStatus,
      replyDocNumber: nextReplyDocNumber,
      replyDocDate: nextReplyDocDate,
      replyDocLink: nextReplyDocLink,
      attachmentUrl: nextAttachmentUrl,
      extendedUntil: nextExtendedUntil,
      notes: finalNotes,
    },
  };
}
