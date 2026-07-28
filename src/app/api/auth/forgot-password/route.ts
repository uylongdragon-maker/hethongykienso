import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, cccd, newPassword } = body;

    if (!username || !cccd || !newPassword) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Tên đăng nhập, Số CCCD và Mật khẩu mới." },
        { status: 400 }
      );
    }

    // Tìm tài khoản khớp cả username và CCCD
    const user = await prisma.user.findFirst({
      where: {
        username: username.trim(),
        cccd: cccd.trim(),
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Thông tin Tên đăng nhập hoặc số CCCD không chính xác với hồ sơ cán bộ đã cấp!" },
        { status: 400 }
      );
    }

    // Băm mật khẩu mới
    const passwordHash = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      message: `Đã khôi phục mật khẩu thành công cho tài khoản ${user.username} (${user.fullName}). Bạn có thể đăng nhập ngay.`,
    });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống trong quá trình khôi phục mật khẩu." },
      { status: 500 }
    );
  }
}
