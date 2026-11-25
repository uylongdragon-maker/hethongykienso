import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, invalidateUserSessionCache, verifyPassword } from "@/lib/auth";
import { sanitizeAttachmentUrl } from "@/lib/security";

// PUT /api/users/profile - Cập nhật thông tin cá nhân, đổi mật khẩu hoặc gửi yêu cầu phê duyệt định danh
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập để thực hiện." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      phone,
      email,
      avatarUrl,
      currentPassword,
      newPassword,
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

    const updateData: Record<string, unknown> = {};

    // Đổi mật khẩu cá nhân
    if (newPassword !== undefined && String(newPassword).length > 0) {
      if (!currentPassword || !verifyPassword(String(currentPassword), existing.passwordHash)) {
        return NextResponse.json(
          { success: false, error: "Mật khẩu hiện tại không chính xác." },
          { status: 400 }
        );
      }
      if (String(newPassword).length < 6 || String(newPassword).length > 128) {
        return NextResponse.json(
          { success: false, error: "Mật khẩu mới phải có ít nhất 6 ký tự." },
          { status: 400 }
        );
      }
      updateData.passwordHash = hashPassword(String(newPassword));
    }

    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (email !== undefined) updateData.email = email ? String(email).trim() : null;

    if (avatarUrl !== undefined) {
      const checkAvatar = sanitizeAttachmentUrl(avatarUrl ? String(avatarUrl) : null);
      if (!checkAvatar.valid) {
        return NextResponse.json(
          { success: false, error: checkAvatar.error || "Đường dẫn ảnh thẻ không hợp lệ." },
          { status: 400 }
        );
      }
      updateData.avatarUrl = checkAvatar.url;
    }

    const nextReqName = requestedFullName ? String(requestedFullName).trim() : "";
    const nextReqCccd = requestedCccd ? String(requestedCccd).trim() : "";
    const nextReqPos = requestedPosition ? String(requestedPosition).trim() : "";

    if (nextReqCccd && !/^\d{9,12}$/.test(nextReqCccd)) {
      return NextResponse.json(
        { success: false, error: "Số CCCD đề xuất phải gồm từ 9 đến 12 chữ số." },
        { status: 400 }
      );
    }

    const hasRequestedChanges =
      (nextReqName && nextReqName !== existing.fullName) ||
      (nextReqCccd && nextReqCccd !== existing.cccd) ||
      (nextReqPos && nextReqPos !== (existing.position || "Chuyên viên thống kê báo cáo"));

    if (hasRequestedChanges) {
      updateData.pendingFullName = nextReqName || null;
      updateData.pendingCccd = nextReqCccd || null;
      updateData.pendingPosition = nextReqPos || null;
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
    invalidateUserSessionCache(session.id);

    let message = "Đã lưu thông tin hồ sơ cá nhân.";
    if (updateData.passwordHash) {
      message = "Đã đổi mật khẩu cá nhân thành công.";
    } else if (hasRequestedChanges) {
      message = "Đã gửi yêu cầu thay đổi thông tin định danh chờ Quản trị viên phê duyệt.";
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message,
    });
  } catch (error) {
    console.error("Lỗi cập nhật profile:", error);
    return NextResponse.json(
      { success: false, error: "Không thể cập nhật thông tin cá nhân." },
      { status: 500 }
    );
  }
}
