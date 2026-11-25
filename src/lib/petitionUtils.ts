/**
 * Kiểu dữ liệu và hàm xử lý nghiệp vụ thuần (dùng chung cho cả Client & Server, không phụ thuộc DB)
 */

export interface SerializedPetition {
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
  receivedDate: string;
  deadline: string;
  extendedUntil: string | null;
  status: string;
  replyDocNumber: string | null;
  replyDocDate: string | null;
  replyDocLink: string | null;
  reviewStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPetitionSummary {
  petitionCode: string;
  source: string;
  quarter: string | null;
  category: string;
  authority: string;
  department: string;
  receivedDate: string;
  deadline: string;
  extendedUntil: string | null;
  status: string;
  reviewStatus: string;
  replyDocNumber: string | null;
  replyDocDate: string | null;
}

/**
 * Lấy hạn giải quyết hiệu lực (ưu tiên ngày gia hạn nếu có), tính tới cuối ngày (23:59:59.999)
 */
export function getEffectiveDeadlineEnd(
  pet: Pick<SerializedPetition, "deadline" | "extendedUntil">
): Date {
  const targetIso = pet.extendedUntil || pet.deadline;
  const d = new Date(targetIso);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Xác định vụ việc có đang quá hạn hay không
 * - Vụ việc "Đã xong" hoặc "Chờ Admin phê duyệt" không tính là quá hạn
 * - Tôn trọng thời hạn gia hạn (extendedUntil) nếu còn hạn
 */
export function isPetitionOverdue(
  pet: Pick<SerializedPetition, "status" | "deadline" | "extendedUntil">,
  now: Date = new Date()
): boolean {
  if (pet.status === "Đã xong" || pet.status === "Chờ Admin phê duyệt") {
    return false;
  }
  const effectiveEnd = getEffectiveDeadlineEnd(pet);
  if (effectiveEnd.getTime() < now.getTime()) {
    return true;
  }
  if (pet.status === "Quá hạn" && !pet.extendedUntil) {
    return true;
  }
  return false;
}

export function formatDateVN(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const COMMITTEE_TAG_REGEX = /\[Ban phụ trách:\s*([^\]]+)\]\s*/i;

export function extractCommitteeFromNotes(notes: string | null | undefined): {
  committee: string | null;
  cleanNotes: string;
} {
  if (!notes) return { committee: null, cleanNotes: "" };
  const match = notes.match(COMMITTEE_TAG_REGEX);
  const committee = match ? match[1].trim() : null;
  const cleanNotes = notes.replace(COMMITTEE_TAG_REGEX, "").trim();
  return { committee, cleanNotes };
}

export function composeNotesWithCommittee(
  inputNotes: string | null | undefined,
  explicitCommittee?: string | null,
  existingRawNotes?: string | null
): string | null {
  const fromInput = extractCommitteeFromNotes(inputNotes);
  const fromExisting = extractCommitteeFromNotes(existingRawNotes);
  const finalCommittee = explicitCommittee?.trim() || fromInput.committee || fromExisting.committee;
  const body = fromInput.cleanNotes;

  if (finalCommittee && body) {
    return `[Ban phụ trách: ${finalCommittee}] ${body}`;
  }
  if (finalCommittee) {
    return `[Ban phụ trách: ${finalCommittee}]`;
  }
  return body || null;
}

/**
 * Chuẩn hóa địa chỉ tại Phường Bình Đông, TP. Hồ Chí Minh
 * Bảo toàn tọa độ (GPS: lat, lng) ở cuối chuỗi và không xóa nhầm tên Khu phố
 */
export function sanitizeWardAddress(address: string): string {
  if (!address || !address.trim()) return "";

  let raw = address.trim();
  let gpsSuffix = "";

  const gpsMatch = raw.match(/\(\s*GPS:\s*[^)]+\)/i);
  if (gpsMatch) {
    gpsSuffix = ` ${gpsMatch[0].trim()}`;
    raw = raw.replace(gpsMatch[0], "").trim();
  }

  const cleaned = raw
    .replace(/(,\s*)?(phường\s*)?bình\s*đông/gi, "")
    .replace(/(,\s*)?(phường\s*)?chánh\s*hưng(\s*ward)?/gi, "")
    .replace(/(,\s*)?quận\s*8/gi, "")
    .replace(/(,\s*)?tp\.?\s*h(ồ|o)\s*ch(í|i)\s*minh/gi, "")
    .replace(/(,\s*)?tp\.?\s*hcm/gi, "")
    .replace(/(,\s*)?thành\s*phố\s*hồ\s*chí\s*minh/gi, "")
    .replace(/(,\s*)?ho\s*chi\s*minh(\s*city)?/gi, "")
    .replace(/,\s*,+/g, ",")
    .replace(/^\s*,+\s*|\s*,+\s*$/g, "")
    .trim();

  const base = cleaned
    ? `${cleaned}, Phường Bình Đông, TP. Hồ Chí Minh`
    : "Phường Bình Đông, TP. Hồ Chí Minh";

  return `${base}${gpsSuffix}`;
}

export function getRoleDisplayName(role?: string | null): string {
  switch (role) {
    case "ADMIN":
      return "Quản trị viên";
    case "CHUYEN_VIEN":
      return "Chuyên viên xử lý";
    case "CAN_BO":
      return "Lãnh đạo phường (Chỉ xem)";
    default:
      return "Người dùng";
  }
}
