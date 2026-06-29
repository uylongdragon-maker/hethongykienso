import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 1. PUT: Cập nhật chi tiết kết quả xử lý kiến nghị
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      status,
      replyDocNumber,
      replyDocDate,
      replyDocLink,
      extendedUntil,
      reviewStatus,
      notes,
    } = body;

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

    // Kiểm tra tính hợp lệ của kết quả rà soát
    if (reviewStatus) {
      const validReviewStatuses = ["Hoàn thành", "Chưa giải quyết", "Mới giải quyết 1 phần"];
      if (!validReviewStatuses.includes(reviewStatus)) {
        return NextResponse.json(
          { success: false, error: "Kết quả rà soát không hợp lệ." },
          { status: 400 }
        );
      }
    }

    // Cập nhật dữ liệu
    const updated = await prisma.petition.update({
      where: { id },
      data: {
        status: status || existing.status,
        replyDocNumber: replyDocNumber !== undefined ? replyDocNumber : existing.replyDocNumber,
        replyDocDate: replyDocDate ? new Date(replyDocDate) : (replyDocDate === null ? null : existing.replyDocDate),
        replyDocLink: replyDocLink !== undefined ? replyDocLink : existing.replyDocLink,
        extendedUntil: extendedUntil ? new Date(extendedUntil) : (extendedUntil === null ? null : existing.extendedUntil),
        reviewStatus: reviewStatus || existing.reviewStatus,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Lỗi cập nhật vụ việc:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể cập nhật vụ việc." },
      { status: 500 }
    );
  }
}

// 2. DELETE: Xóa vụ việc
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    await prisma.petition.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa vụ việc thành công." });
  } catch (error: any) {
    console.error("Lỗi xóa vụ việc:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể xóa vụ việc." },
      { status: 500 }
    );
  }
}
