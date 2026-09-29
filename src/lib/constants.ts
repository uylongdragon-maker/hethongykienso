// Danh mục chuẩn toàn hệ thống - Hệ thống Ý kiến số Phường Bình Đông

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
  "Quản lý đô thị",
  "Đất đai",
  "Môi trường",
  "An ninh trật tự",
  "Chế độ chính sách",
  "Quy hoạch, quy hoạch đô thị, phát triển hạ tầng kỹ thuật và hạ tầng xã hội trên địa bàn",
  "Kế hoạch, đầu tư",
  "Tài chính",
  "Ngân sách",
  "Liên kết, hợp tác giữa các đơn vị hành chính",
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
];

export const DEPARTMENTS = [
  "Phòng KT-HT và Đô thị",
  "Phòng Kinh tế, Hạ tầng và Đô thị phường",
  "Phòng Văn hóa - Xã hội",
  "Phòng Địa chính - Nhà đất",
  "Tư pháp - Hộ tịch",
  "Tổ Trật tự Đô thị",
  "Công an Phường Bình Đông",
  "Quân sự phường",
  "Trung tâm phục vụ hành chính công phường",
  "Văn phòng HĐND & UBND phường",
  "Trung tâm cung ứng dịch vụ công phường",
  "Ban Quản lý dự án đầu tư xây dựng phường",
  "UBMTTQVN phường",
  "Sở Giao thông Vận tải",
  "Sở Xây dựng",
];

export const AUTHORITIES = [
  "UBND phường",
  "Các Sở, ban ngành Thành phố",
  "UBND Quận",
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
