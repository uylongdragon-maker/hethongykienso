import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { CATEGORIES, SOURCES, AUTHORITIES, DEPARTMENTS } from "@/lib/constants";
import { sanitizeAttachmentUrl } from "@/lib/security";
import { sanitizeWardAddress, composeNotesWithCommittee } from "@/lib/petitionUtils";
import { fetchSerializedPetitions, generateNextPetitionCode } from "@/lib/petitions";

// 1. GET: Lấy danh sách kiến nghị cử tri (Yêu cầu xác thực cán bộ)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập để truy cập danh sách vụ việc." },
        { status: 401 }
      );
    }

    const petitions = await fetchSerializedPetitions();
    return NextResponse.json({ success: true, data: petitions });
  } catch (error) {
    console.error("Lỗi lấy danh sách vụ việc:", error);
    return NextResponse.json(
      { success: false, error: "Không thể tải danh sách vụ việc." },
      { status: 500 }
    );
  }
}

// 2. POST: Tiếp nhận kiến nghị mới (Chỉ ADMIN và CHUYEN_VIEN)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập để tiếp nhận vụ việc mới." },
        { status: 401 }
      );
    }

    if (session.role === "CAN_BO") {
      return NextResponse.json(
        { success: false, error: "Tài khoản Lãnh đạo phường có quyền chỉ xem, không được phép tạo mới dữ liệu." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      type,
      source,
      senderName,
      senderPhone,
      senderAddress,
      category,
      incidentAddress,
      content,
      attachmentUrl,
      authority,
      department,
      receivedDate,
      deadline,
      quarter,
      responsibleCommittee,
    } = body;

    if (
      !type ||
      !source ||
      !senderName?.trim() ||
      !senderAddress?.trim() ||
      !category ||
      !incidentAddress?.trim() ||
      !content?.trim() ||
      !authority ||
      !department ||
      !receivedDate
    ) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ các trường thông tin bắt buộc." },
        { status: 400 }
      );
    }

    if (!["Kiến nghị", "Giám sát", "Khảo sát"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Loại vụ việc không hợp lệ." },
        { status: 400 }
      );
    }

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: "Lĩnh vực phân loại không hợp lệ." },
        { status: 400 }
      );
    }

    if (!SOURCES.includes(source)) {
      return NextResponse.json(
        { success: false, error: "Nguồn tiếp nhận không hợp lệ." },
        { status: 400 }
      );
    }

    if (!AUTHORITIES.includes(authority) || !DEPARTMENTS.includes(department)) {
      return NextResponse.json(
        { success: false, error: "Thẩm quyền hoặc đơn vị xử lý không hợp lệ." },
        { status: 400 }
      );
    }

    const attachCheck = sanitizeAttachmentUrl(attachmentUrl);
    if (!attachCheck.valid) {
      return NextResponse.json(
        { success: false, error: attachCheck.error || "Tệp đính kèm không hợp lệ." },
        { status: 400 }
      );
    }

    const received = new Date(receivedDate);
    if (isNaN(received.getTime())) {
      return NextResponse.json(
        { success: false, error: "Ngày tiếp nhận không hợp lệ." },
        { status: 400 }
      );
    }

    const finalDeadline = deadline
      ? new Date(deadline)
      : new Date(received.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (isNaN(finalDeadline.getTime())) {
      return NextResponse.json(
        { success: false, error: "Thời hạn giải quyết không hợp lệ." },
        { status: 400 }
      );
    }

    const sanitizedAddress = sanitizeWardAddress(senderAddress);
    const sanitizedLocation = sanitizeWardAddress(incidentAddress);
    const notes = composeNotesWithCommittee(null, responsibleCommittee, null);

    // Chống xung đột mã trùng khi tạo đồng thời (tối đa 3 lần thử)
    let created = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const petitionCode = await generateNextPetitionCode(type);
      try {
        created = await prisma.petition.create({
          data: {
            petitionCode,
            source,
            quarter: quarter?.trim() || null,
            senderName: senderName.trim(),
            senderPhone: senderPhone?.trim() || null,
            senderAddress: sanitizedAddress,
            category,
            location: sanitizedLocation,
            content: content.trim(),
            attachmentUrl: attachCheck.url,
            authority,
            department,
            receivedDate: received,
            deadline: finalDeadline,
            extendedUntil: null,
            status: "Đang xử lý",
            replyDocNumber: null,
            replyDocDate: null,
            replyDocLink: null,
            reviewStatus: "Chưa giải quyết",
            notes,
          },
        });
        break;
      } catch (err: any) {
        if (err?.code === "P2002" && attempt < 2) {
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi tạo mới kiến nghị:", error);
    return NextResponse.json(
      { success: false, error: "Không thể tạo mới kiến nghị." },
      { status: 500 }
    );
  }
}
