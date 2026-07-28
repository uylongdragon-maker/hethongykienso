import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

// 1. GET: Lấy danh sách toàn bộ tài khoản (Chỉ ADMIN)
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Chỉ Quản trị viên (ADMIN) mới có quyền xem danh sách tài khoản!" },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
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
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách tài khoản:", error);
    return NextResponse.json(
      { success: false, error: "Không thể lấy danh sách tài khoản." },
      { status: 500 }
    );
  }
}

// 2. POST: Tạo tài khoản cán bộ/chuyên viên mới (Chỉ ADMIN)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Chỉ Quản trị viên (ADMIN) mới có quyền tạo mới tài khoản!" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, password, fullName, cccd, role, department, email, phone } = body;

    if (!username || !password || !fullName || !cccd || !role) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ các thông tin bắt buộc (Username, Password, Họ tên, CCCD, Vai trò)." },
        { status: 400 }
      );
    }

    // Kiểm tra trùng username
    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Tên đăng nhập này đã tồn tại trên hệ thống!" },
        { status: 400 }
      );
    }

    // Kiểm tra trùng CCCD
    const existingCccd = await prisma.user.findUnique({
      where: { cccd: cccd.trim() },
    });
    if (existingCccd) {
      return NextResponse.json(
        { success: false, error: "Số CCCD này đã được đăng ký cho một tài khoản khác!" },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        username: username.trim(),
        passwordHash,
        fullName: fullName.trim(),
        cccd: cccd.trim(),
        role: role.trim(),
        department: department ? department.trim() : "Phòng Xử lý & Tham mưu",
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        cccd: true,
        role: true,
        department: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, data: newUser, message: `Tạo tài khoản ${newUser.username} thành công!` },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Lỗi tạo tài khoản mới:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể tạo mới tài khoản." },
      { status: 500 }
    );
  }
}
