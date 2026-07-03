import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH: Cập nhật nhanh tiến độ & thông tin vụ việc từ màn hình danh sách
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes, extendedUntil, replyDocNumber, replyDocLink } = body;

    // Kiểm tra bản ghi tồn tại
    const existing = await prisma.petition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Vụ việc kiến nghị không tồn tại trên hệ thống." },
        { status: 404 }
      );
    }

    // Kiểm tra tính hợp lệ của trạng thái nếu có gửi lên
    if (status) {
      const validStatuses = ["Đang xử lý", "Đã xong", "Đang chờ ý kiến cấp trên", "Quá hạn"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: "Trạng thái giải quyết không hợp lệ." },
          { status: 400 }
        );
      }
    }

    // Cập nhật dữ liệu tiến độ & thông tin bổ sung
    const updated = await prisma.petition.update({
      where: { id },
      data: {
        status: status || existing.status,
        notes: notes !== undefined ? notes : existing.notes,
        extendedUntil: extendedUntil
          ? new Date(extendedUntil)
          : extendedUntil === null
          ? null
          : existing.extendedUntil,
        replyDocNumber:
          replyDocNumber !== undefined ? replyDocNumber : existing.replyDocNumber,
        replyDocLink:
          replyDocLink !== undefined ? replyDocLink : existing.replyDocLink,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Lỗi cập nhật nhanh vụ việc:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể cập nhật vụ việc." },
      { status: 500 }
    );
  }
}
