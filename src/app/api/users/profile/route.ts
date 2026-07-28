import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// PUT /api/users/profile - Cập nhật thông tin cá nhân hoặc gửi yêu cầu phê duyệt
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập để thực hiện!" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      phone,
      email,
      avatarUrl,
      requestedFullName,
      requestedCccd,
      requestedPosition,
    } = body;

    const existing = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Tài khoản không tồn tại." },
        { status: 404 }
      );
    }

    // Direct update data (SĐT, Email, Avatar ảnh 3x4)
    const updateData: any = {};
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (email !== undefined) updateData.email = email ? email.trim() : null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl ? avatarUrl.trim() : null;

    // Check if user requested sensitive changes (Họ tên, CCCD, Chức vụ)
    const hasRequestedChanges =
      (requestedFullName && requestedFullName.trim() !== existing.fullName) ||
      (requestedCccd && requestedCccd.trim() !== existing.cccd) ||
      (requestedPosition && requestedPosition.trim() !== (existing.position || "Chuyên viên thống kê báo cáo"));

    if (hasRequestedChanges) {
      updateData.pendingFullName = requestedFullName ? requestedFullName.trim() : null;
      updateData.pendingCccd = requestedCccd ? requestedCccd.trim() : null;
      updateData.pendingPosition = requestedPosition ? requestedPosition.trim() : null;
      updateData.changeRequestStatus = "PENDING";
      updateData.changeRequestedAt = new Date();
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        cccd: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        position: true,
        avatarUrl: true,
        pendingFullName: true,
        pendingCccd: true,
        pendingPosition: true,
        changeRequestStatus: true,
        changeRequestedAt: true,
      },
    });

    let message = "Cập nhật thông tin cá nhân thành công!";
    if (hasRequestedChanges) {
      message = "Đã cập nhật SĐT/Email và gửi Yêu cầu Thay đổi Thông tin Định danh đến Quản trị viên (Admin) chờ phê duyệt!";
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message,
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật profile:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể cập nhật thông tin cá nhân." },
      { status: 500 }
    );
  }
}
