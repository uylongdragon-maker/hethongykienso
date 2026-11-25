import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildWorkflowUpdateData } from "@/lib/petitions";

// 1. PUT: Cập nhật chi tiết kết quả xử lý kiến nghị (Áp dụng quy tắc phân quyền chuẩn)
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
        replyDocNumber: body.replyDocNumber,
        replyDocDate: body.replyDocDate,
        replyDocLink: body.replyDocLink,
        attachmentUrl: body.attachmentUrl,
        extendedUntil: body.extendedUntil,
        notes: body.notes,
        responsibleCommittee: body.responsibleCommittee,
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
      message: result.submittedForApproval
        ? "Đã gửi hồ sơ trình Quản trị viên phê duyệt dứt điểm."
        : "Đã cập nhật kết quả giải quyết thành công.",
    });
  } catch (error) {
    console.error("Lỗi cập nhật vụ việc:", error);
    return NextResponse.json(
      { success: false, error: "Không thể cập nhật vụ việc." },
      { status: 500 }
    );
  }
}

// 2. DELETE: Xóa vụ việc (CHỈ DÀNH CHO ADMIN)
export async function DELETE(
  _req: NextRequest,
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

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Chỉ Quản trị viên mới có thẩm quyền xóa vụ việc.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.petition.findUnique({
      where: { id },
      select: { id: true },
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

    return NextResponse.json({
      success: true,
      message: "Đã xóa vụ việc thành công.",
    });
  } catch (error) {
    console.error("Lỗi xóa vụ việc:", error);
    return NextResponse.json(
      { success: false, error: "Không thể xóa vụ việc." },
      { status: 500 }
    );
  }
}
