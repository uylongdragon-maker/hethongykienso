// Danh mục chuẩn toàn hệ thống - Hệ thống ứng dụng tổng hợp, theo dõi giải quyết kiến nghị cử tri của Hội đồng nhân dân phường Bình Đông

export const SOURCES = [
  "Tiếp xúc cử tri (trước kỳ họp)",
  "Tiếp xúc cử tri (sau kỳ họp)",
  "Tiếp xúc cử tri (hàng tuần)",
  "Trước kỳ họp (Thành phố)",
  "Sau kỳ họp (Thành phố)",
  "Trước kỳ họp (Phường)",
  "Sau kỳ họp (Phường)",
  "Sau giám sát",
  "Đơn thư trực tiếp",
  "Cổng DVC Quốc gia",
];

export const CATEGORIES = [
  "Quy hoạch, quy hoạch đô thị, phát triển hạ tầng kỹ thuật và hạ tầng xã hội trên địa bàn",
  "Kế hoạch, đầu tư",
  "Tài chính",
  "Ngân sách",
  "Liên kết, hợp tác giữa các đơn vị hành chính",
  "Đất đai",
  "Tài nguyên, môi trường",
  "Nông, lâm, ngư nghiệp",
  "Công nghiệp",
  "Thương mại, dịch vụ",
  "Du lịch",
  "Xây dựng và giao thông ở địa phương",
  "Tổ chức bộ máy và xây dựng chính quyền",
  "Giáo dục",
  "Y tế",
  "Văn hóa, xã hội",
  "Thể dục, thể thao",
  "Khoa học, công nghệ, thông tin",
  "Đổi mới sáng tạo, chuyển đổi số",
  "Quốc phòng, an ninh",
  "Dân tộc và tôn giáo ở địa phương",
  "Quản lý đô thị",
  "Môi trường",
  "An ninh trật tự",
  "Chế độ chính sách",
];

export const DEPARTMENTS = [
  "Văn phòng HĐND & UBND phường",
  "Phòng Văn hóa - Xã hội phường",
  "Phòng Hạ tầng phường",
  "Phòng Tài chính - Kế hoạch phường",
  "Trung tâm Phục vụ hành chính công phường",
  "Trung tâm Cung ứng dịch vụ công phường",
  "Công an phường",
  "Quân sự phường",
  "UB MTTQ VN phường",
  "Ban Quản lý dự án đầu tư xây dựng phường",
  "Đảng ủy phường",
  "Sở, Ngành Thành phố",
];

export const AUTHORITIES = [
  "UBND phường",
  "Các Sở, ban ngành Thành phố",
  "UBND Thành phố",
];

export const RESPONSIBLE_COMMITTEES = [
  "Ban Kinh tế - Ngân sách",
  "Ban Văn hóa - Xã hội",
];

export const STATUSES = [
  "Đang xử lý",
  "Đã xong",
  "Chờ Admin phê duyệt",
  "Quá hạn",
];

export const REVIEW_STATUSES = [
  "Chưa giải quyết",
  "Mới giải quyết 1 phần",
  "Hoàn thành",
];

// Hàm chuẩn hóa tên danh mục để hỗ trợ dữ liệu cũ
export function normalizeCategory(cat?: string | null): string {
  if (!cat) return "Quản lý đô thị";
  const trimmed = cat.trim();
  if (trimmed === "Đô thị") return "Quản lý đô thị";
  if (trimmed === "Chính sách") return "Chế độ chính sách";
  return trimmed;
}
