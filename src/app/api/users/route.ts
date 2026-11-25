import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, isValidUserRole } from "@/lib/auth";
import { DEPARTMENTS } from "@/lib/constants";

// 1. GET: Lấy danh sách toàn bộ tài khoản (Chỉ ADMIN)
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Chỉ Quản trị viên mới có quyền xem danh sách tài khoản." },
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
  } catch (error) {
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
        { success: false, error: "Chỉ Quản trị viên mới có quyền tạo mới tài khoản." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const cccd = typeof body.cccd === "string" ? body.cccd.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const department = typeof body.department === "string" ? body.department.trim() : "";
    const position = typeof body.position === "string" ? body.position.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!username || !password || !fullName || !cccd || !role) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ Tên đăng nhập, Mật khẩu, Họ tên, CCCD và Vai trò." },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
      return NextResponse.json(
        { success: false, error: "Tên đăng nhập gồm 3-40 ký tự chữ, số hoặc dấu gạch dưới." },
        { status: 400 }
      );
    }

    if (password.length < 6 || password.length > 128) {
      return NextResponse.json(
        { success: false, error: "Mật khẩu phải từ 6 ký tự trở lên." },
        { status: 400 }
      );
    }

    if (!/^\d{9,12}$/.test(cccd)) {
      return NextResponse.json(
        { success: false, error: "Số CCCD phải gồm từ 9 đến 12 chữ số." },
        { status: 400 }
      );
    }

    if (!isValidUserRole(role)) {
      return NextResponse.json(
        { success: false, error: "Vai trò phân quyền không hợp lệ." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Tên đăng nhập này đã tồn tại trên hệ thống." },
        { status: 400 }
      );
    }

    const existingCccd = await prisma.user.findUnique({
      where: { cccd },
      select: { id: true },
    });
    if (existingCccd) {
      return NextResponse.json(
        { success: false, error: "Số CCCD này đã được đăng ký cho tài khoản khác." },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        fullName,
        cccd,
        role,
        department: department || DEPARTMENTS[0],
        position: position || "Chuyên viên thống kê báo cáo",
        email: email || null,
        phone: phone || null,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        cccd: true,
        role: true,
        department: true,
        position: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, data: newUser, message: `Đã tạo tài khoản ${newUser.username}.` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lỗi tạo tài khoản mới:", error);
    return NextResponse.json(
      { success: false, error: "Không thể tạo mới tài khoản." },
      { status: 500 }
    );
  }
}
