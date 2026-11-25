import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  isLegacyPasswordHash,
  signToken,
  TOKEN_NAME,
  verifyPassword,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`login:${ip}:${username.toLowerCase()}`, 10, 5 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Nhập sai quá nhiều lần. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        administrativeUnit: {
          select: { name: true, fullName: true, code: true },
        },
      },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    // Tự động nâng cấp băm mật khẩu cũ (SHA-256) sang scrypt có salt ngẫu nhiên
    if (isLegacyPasswordHash(user.passwordHash)) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hashPassword(password) },
        });
      } catch {
        // Không làm gián đoạn đăng nhập nếu nâng cấp nền thất bại
      }
    }

    const sessionPayload = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      position: user.position,
      administrativeUnitId: user.administrativeUnitId,
      unitName: user.administrativeUnit?.name || "Phường Bình Đông",
    };

    const token = signToken(sessionPayload, 24);

    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công",
      user: sessionPayload,
    });

    response.cookies.set({
      name: TOKEN_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
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
