import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// 1. PUT: Cập nhật chi tiết kết quả xử lý kiến nghị (Có phân quyền Chuyên viên vs Admin)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập để thực hiện thao tác." },
        { status: 401 }
      );
    }

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

    let finalStatus = status || existing.status;
    let finalReviewStatus = reviewStatus || existing.reviewStatus;
    let systemNotes = notes !== undefined ? notes : existing.notes;

    // PHÂN QUYỀN VÀ TRÌNH DUYỆT:
    // Nếu là CHUYEN_VIEN và gửi trạng thái "Đã xong" hoặc "Hoàn thành",
    // Chuyên viên không được tự duyệt dứt điểm mà tự động đẩy request duyệt về Admin ("Chờ Admin phê duyệt")
    if (session.role === "CHUYEN_VIEN") {
      if (status === "Đã xong" || reviewStatus === "Hoàn thành") {
        finalStatus = "Chờ Admin phê duyệt";
        finalReviewStatus = "Mới giải quyết 1 phần";
        systemNotes = `[Chuyên viên ${session.fullName} trình Admin phê duyệt kết quả]: ${notes || "Đã xử lý xong dự thảo trả lời"}`;
      }
    }

    // Cập nhật dữ liệu
    const updated = await prisma.petition.update({
      where: { id },
      data: {
        status: finalStatus,
        replyDocNumber: replyDocNumber !== undefined ? replyDocNumber : existing.replyDocNumber,
        replyDocDate: replyDocDate ? new Date(replyDocDate) : (replyDocDate === null ? null : existing.replyDocDate),
        replyDocLink: replyDocLink !== undefined ? replyDocLink : existing.replyDocLink,
        extendedUntil: extendedUntil ? new Date(extendedUntil) : (extendedUntil === null ? null : existing.extendedUntil),
        reviewStatus: finalReviewStatus,
        notes: systemNotes,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message:
        session.role === "CHUYEN_VIEN" && (status === "Đã xong" || reviewStatus === "Hoàn thành")
          ? "Đã gửi yêu cầu trình duyệt về Admin thành công!"
          : "Cập nhật thông tin thành công.",
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật vụ việc:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể cập nhật vụ việc." },
      { status: 500 }
    );
  }
}

// 2. DELETE: Xóa vụ việc (CHỈ DÀNH CHO ADMIN)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập để thực hiện thao tác." },
        { status: 401 }
      );
    }

    // CHUYÊN VIÊN KHÔNG ĐƯỢC XÓA DỮ LIỆU
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Tài khoản Chuyên viên không có thẩm quyền xóa dữ liệu! Chỉ Quản trị viên (ADMIN) mới có quyền xóa.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

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

    return NextResponse.json({ success: true, message: "Đã xóa vụ việc thành công bởi Quản trị viên." });
  } catch (error: any) {
    console.error("Lỗi xóa vụ việc:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể xóa vụ việc." },
      { status: 500 }
    );
  }
}
