import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

// 1. PUT: Cập nhật quyền hạn/thông tin tài khoản (Chỉ ADMIN)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Chỉ Quản trị viên (ADMIN) mới có quyền sửa tài khoản!" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { fullName, cccd, role, department, password, email, phone } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Tài khoản không tồn tại trên hệ thống." },
        { status: 404 }
      );
    }

    const updateData: any = {
      fullName: fullName ? fullName.trim() : existing.fullName,
      role: role ? role.trim() : existing.role,
      department: department !== undefined ? department : existing.department,
      email: email !== undefined ? email : existing.email,
      phone: phone !== undefined ? phone : existing.phone,
    };

    if (cccd && cccd.trim() !== existing.cccd) {
      const duplicateCccd = await prisma.user.findUnique({
        where: { cccd: cccd.trim() },
      });
      if (duplicateCccd && duplicateCccd.id !== id) {
        return NextResponse.json(
          { success: false, error: "Số CCCD này đã thuộc về tài khoản khác!" },
          { status: 400 }
        );
      }
      updateData.cccd = cccd.trim();
    }

    if (password) {
      updateData.passwordHash = hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        cccd: true,
        role: true,
        department: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: `Cập nhật thông tin tài khoản ${updatedUser.username} thành công!`,
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật tài khoản:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể cập nhật tài khoản." },
      { status: 500 }
    );
  }
}

// 2. DELETE: Xóa tài khoản (Chỉ ADMIN)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Chỉ Quản trị viên (ADMIN) mới có quyền xóa tài khoản!" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Không cho tự xóa chính mình
    if (session.id === id) {
      return NextResponse.json(
        { success: false, error: "Bạn không thể tự xóa tài khoản Admin đang đăng nhập!" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Tài khoản không tồn tại." },
        { status: 404 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Đã xóa thành công tài khoản ${existing.username}.`,
    });
  } catch (error: any) {
    console.error("Lỗi xóa tài khoản:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể xóa tài khoản." },
      { status: 500 }
    );
  }
}
