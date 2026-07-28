import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken, TOKEN_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
      include: {
        administrativeUnit: {
          select: { name: true, fullName: true, code: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    const hashed = hashPassword(password);
    if (user.passwordHash !== hashed) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    const sessionPayload = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      administrativeUnitId: user.administrativeUnitId,
      unitName: user.administrativeUnit?.name || "Phường Bình Đông",
    };

    const token = signToken(sessionPayload, 24);

    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công",
      user: sessionPayload,
    });

    // Thiết lập HTTP-Only Cookie an toàn
    response.cookies.set({
      name: TOKEN_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 giờ
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống trong quá trình xử lý đăng nhập." },
      { status: 500 }
    );
  }
}
