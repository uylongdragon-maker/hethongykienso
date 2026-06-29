import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Hàm chuẩn hóa địa chỉ: Loại bỏ "Khu phố 23" hoặc "KP23" và nối thêm đuôi Quận 8, HCM
function sanitizeAddress(address: string): string {
  if (!address) return "";
  
  // 1. Loại bỏ "Khu phố 23" hoặc "KP23" (không phân biệt hoa thường)
  let cleaned = address.replace(/khu\s*phố\s*23|kp\s*23/gi, "");
  
  // Dọn dẹp khoảng trống, dấu phẩy thừa do thay thế
  cleaned = cleaned.replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim();

  // 2. Loại bỏ các phần phường/thành phố trùng lặp nếu người dùng lỡ nhập vào trước
  cleaned = cleaned.replace(/(,\s*)?chánh\s*hưng(\s*ward)?/gi, "");
  cleaned = cleaned.replace(/(,\s*)?ho\s*chi\s*minh(\s*city)?/gi, "");
  cleaned = cleaned.replace(/(,\s*)?tp\.?\s*hcm/gi, "");
  cleaned = cleaned.trim();

  // Nối đuôi địa chỉ chuẩn hóa bắt buộc
  return `${cleaned}, Chánh Hưng Ward, Ho Chi Minh City`;
}

// Hàm sinh mã vụ việc tiếp theo: [Prefix]YYYY-NNN
async function generatePetitionCode(type: string): Promise<string> {
  let prefix = "KN"; // Mặc định là Kiến nghị
  if (type === "Giám sát") prefix = "GS";
  if (type === "Khảo sát") prefix = "KS";

  const currentYear = new Date().getFullYear();
  const yearStr = currentYear.toString();

  // Tìm vụ việc cùng tiền tố và năm có mã lớn nhất
  const latest = await prisma.petition.findFirst({
    where: {
      petitionCode: {
        startsWith: `${prefix}${yearStr}`,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!latest) {
    return `${prefix}${yearStr}-001`;
  }

  // Phân tích mã cũ để tìm số tiếp theo (Ví dụ: KN2026-005)
  const code = latest.petitionCode;
  const dashIndex = code.indexOf("-");
  if (dashIndex !== -1) {
    const numPart = code.substring(dashIndex + 1);
    const num = parseInt(numPart, 10);
    if (!isNaN(num)) {
      const nextNum = (num + 1).toString().padStart(3, "0");
      return `${prefix}${yearStr}-${nextNum}`;
    }
  }

  // Dự phòng nếu phân tích thất bại
  const count = await prisma.petition.count({
    where: {
      petitionCode: {
        startsWith: `${prefix}${yearStr}`,
      },
    },
  });
  const nextNum = (count + 1).toString().padStart(3, "0");
  return `${prefix}${yearStr}-${nextNum}`;
}

// 1. GET: Lấy danh sách kiến nghị cử tri (đồng thời tự động chuyển trạng thái "Quá hạn")
export async function GET() {
  try {
    const now = new Date();

    // Tự động quét và cập nhật trạng thái "Quá hạn" cho các vụ việc chưa hoàn thành quá deadline
    await prisma.petition.updateMany({
      where: {
        status: { not: "Đã xong" },
        deadline: { lt: now },
      },
      data: {
        status: "Quá hạn",
      },
    });

    // Lấy toàn bộ danh sách vụ việc
    const petitions = await prisma.petition.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: petitions });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách vụ việc:", error);
    return NextResponse.json(
      { success: false, error: "Không thể tải danh sách vụ việc." },
      { status: 500 }
    );
  }
}

// 2. POST: Tạo mới một kiến nghị vụ việc
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type, // "Kiến nghị", "Giám sát", "Khảo sát"
      source,
      senderName,
      senderPhone,
      senderAddress,
      category,
      incidentAddress, // Chứa địa chỉ nơi phản ánh & tọa độ GPS nếu có
      content,
      attachmentUrl,
      authority,
      department,
      receivedDate,
    } = body;

    // Kiểm tra dữ liệu bắt buộc
    if (
      !type ||
      !source ||
      !senderName ||
      !senderAddress ||
      !category ||
      !incidentAddress ||
      !content ||
      !authority ||
      !department ||
      !receivedDate
    ) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ các trường thông tin bắt buộc." },
        { status: 400 }
      );
    }

    // Danh mục lĩnh vực hợp lệ
    const validCategories = ["Quản lý đô thị", "Đất đai", "Môi trường", "An ninh trật tự", "Chế độ chính sách"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: "Lĩnh vực phân loại không hợp lệ." },
        { status: 400 }
      );
    }

    // Tự động sinh mã vụ việc
    const petitionCode = await generatePetitionCode(type);

    // Tính toán thời hạn giải quyết: Ngày tiếp nhận + 30 ngày
    const received = new Date(receivedDate);
    const deadline = new Date(received.getTime());
    deadline.setDate(deadline.getDate() + 30);

    // Chuẩn hóa địa chỉ liên hệ của người gửi
    const sanitizedAddress = sanitizeAddress(senderAddress);

    // Trạng thái ban đầu
    const initialStatus = "Đang xử lý";

    // Tạo bản ghi trong Database
    const newPetition = await prisma.petition.create({
      data: {
        petitionCode,
        source,
        senderName,
        senderPhone: senderPhone || null,
        senderAddress: sanitizedAddress,
        category,
        location: incidentAddress,
        content,
        attachmentUrl: attachmentUrl || null,
        authority,
        department,
        receivedDate: received,
        deadline,
        extendedUntil: null,
        status: initialStatus,
        replyDocNumber: null,
        replyDocDate: null,
        replyDocLink: null,
        reviewStatus: "Chưa giải quyết",
        notes: null,
      },
    });

    return NextResponse.json({ success: true, data: newPetition }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi tạo mới kiến nghị:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể tạo mới kiến nghị." },
      { status: 500 }
    );
  }
}
