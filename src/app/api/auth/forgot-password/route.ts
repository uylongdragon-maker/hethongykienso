import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`forgot-pwd:${ip}`, 5, 15 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Quá giới hạn số lần xác minh. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const cccd = typeof body.cccd === "string" ? body.cccd.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!username || !cccd || !newPassword) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Tên đăng nhập, Số CCCD và Mật khẩu mới." },
        { status: 400 }
      );
    }

    if (!/^\d{9,12}$/.test(cccd)) {
      return NextResponse.json(
        { error: "Số CCCD phải bao gồm từ 9 đến 12 chữ số." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6 || newPassword.length > 128) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có độ dài tối thiểu 6 ký tự." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        username,
        cccd,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Thông tin Tên đăng nhập hoặc số CCCD không khớp với hồ sơ cán bộ đã cấp." },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      message: `Đã khôi phục mật khẩu cho tài khoản ${user.username}. Vui lòng đăng nhập lại.`,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống trong quá trình khôi phục mật khẩu." },
      { status: 500 }
    );
  }
}
