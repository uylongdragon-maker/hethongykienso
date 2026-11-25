import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildWorkflowUpdateData } from "@/lib/petitions";

// PATCH: Cập nhật nhanh tiến độ & phê duyệt từ màn hình danh sách / tổng quan
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.petition.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        reviewStatus: true,
        replyDocNumber: true,
        replyDocDate: true,
        replyDocLink: true,
        attachmentUrl: true,
        extendedUntil: true,
        notes: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Vụ việc kiến nghị không tồn tại trên hệ thống." },
        { status: 404 }
      );
    }

    const result = buildWorkflowUpdateData({
      existing,
      session,
      input: {
        status: body.status,
        reviewStatus: body.reviewStatus,
        notes: body.notes,
        extendedUntil: body.extendedUntil,
        replyDocNumber: body.replyDocNumber,
        replyDocDate: body.replyDocDate,
        replyDocLink: body.replyDocLink,
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode }
      );
    }

    const updated = await prisma.petition.update({
      where: { id },
      data: result.data,
      select: {
        id: true,
        petitionCode: true,
        status: true,
        reviewStatus: true,
        replyDocNumber: true,
        replyDocDate: true,
        extendedUntil: true,
        notes: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      submittedForApproval: result.submittedForApproval,
      message: result.submittedForApproval
        ? "Đã gửi yêu cầu trình Quản trị viên phê duyệt kết quả."
        : "Đã lưu cập nhật tiến độ thành công.",
    });
  } catch (error) {
    console.error("Lỗi cập nhật nhanh vụ việc:", error);
    return NextResponse.json(
      { success: false, error: "Không thể cập nhật vụ việc." },
      { status: 500 }
    );
  }
}
