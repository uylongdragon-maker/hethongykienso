import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, isValidUserRole } from "@/lib/auth";

// 1. PUT: Cập nhật quyền hạn/thông tin tài khoản (Chỉ ADMIN)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Chỉ Quản trị viên mới có quyền sửa tài khoản." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { fullName, cccd, role, department, password, email, phone, position } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Tài khoản không tồn tại trên hệ thống." },
        { status: 404 }
      );
    }

    if (role !== undefined && !isValidUserRole(role.trim())) {
      return NextResponse.json(
        { success: false, error: "Vai trò phân quyền không hợp lệ." },
        { status: 400 }
      );
    }

    // Ngăn tự hạ quyền Admin của chính mình gây khóa quản trị hệ thống
    if (session.id === id && role && role.trim() !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Không thể tự gỡ quyền Quản trị viên của tài khoản đang đăng nhập." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      fullName: fullName ? String(fullName).trim() : existing.fullName,
      role: role ? String(role).trim() : existing.role,
      department: department !== undefined ? String(department).trim() || null : existing.department,
      email: email !== undefined ? String(email).trim() || null : existing.email,
      phone: phone !== undefined ? String(phone).trim() || null : existing.phone,
      position: position !== undefined ? String(position).trim() || null : existing.position,
    };

    if (cccd && String(cccd).trim() !== existing.cccd) {
      const nextCccd = String(cccd).trim();
      if (!/^\d{9,12}$/.test(nextCccd)) {
        return NextResponse.json(
          { success: false, error: "Số CCCD phải gồm từ 9 đến 12 chữ số." },
          { status: 400 }
        );
      }
      const duplicateCccd = await prisma.user.findUnique({
        where: { cccd: nextCccd },
        select: { id: true },
      });
      if (duplicateCccd && duplicateCccd.id !== id) {
        return NextResponse.json(
          { success: false, error: "Số CCCD này đã thuộc về tài khoản khác." },
          { status: 400 }
        );
      }
      updateData.cccd = nextCccd;
    }

    if (password) {
      if (String(password).length < 6 || String(password).length > 128) {
        return NextResponse.json(
          { success: false, error: "Mật khẩu mới phải từ 6 ký tự trở lên." },
          { status: 400 }
        );
      }
      updateData.passwordHash = hashPassword(String(password));
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
        position: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: `Đã cập nhật tài khoản ${updatedUser.username}.`,
    });
  } catch (error) {
    console.error("Lỗi cập nhật tài khoản:", error);
    return NextResponse.json(
      { success: false, error: "Không thể cập nhật tài khoản." },
      { status: 500 }
    );
  }
}

// 2. DELETE: Xóa tài khoản (Chỉ ADMIN)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Chỉ Quản trị viên mới có quyền xóa tài khoản." },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (session.id === id) {
      return NextResponse.json(
        { success: false, error: "Không thể tự xóa tài khoản đang đăng nhập." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Tài khoản không tồn tại." },
        { status: 404 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Đã xóa tài khoản ${existing.username}.`,
    });
  } catch (error) {
    console.error("Lỗi xóa tài khoản:", error);
    return NextResponse.json(
      { success: false, error: "Không thể xóa tài khoản." },
      { status: 500 }
    );
  }
}
