import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/users/approve-change - Admin phê duyệt hoặc từ chối yêu cầu thay đổi thông tin
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Chỉ Quản trị viên (ADMIN) mới có quyền phê duyệt yêu cầu thay đổi thông tin!" },
        { status: 403 }
      );
    }

    const { userId, action } = await req.json();
    if (!userId || !action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Dữ liệu yêu cầu không hợp lệ." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Tài khoản không tồn tại." },
        { status: 404 }
      );
    }

    if (action === "APPROVE") {
      // Check duplicate CCCD if CCCD is changing
      if (user.pendingCccd && user.pendingCccd !== user.cccd) {
        const dupCccd = await prisma.user.findUnique({
          where: { cccd: user.pendingCccd },
        });
        if (dupCccd && dupCccd.id !== userId) {
          return NextResponse.json(
            { success: false, error: `Số CCCD "${user.pendingCccd}" đã thuộc về một tài khoản khác!` },
            { status: 400 }
          );
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: user.pendingFullName ? user.pendingFullName : user.fullName,
          cccd: user.pendingCccd ? user.pendingCccd : user.cccd,
          position: user.pendingPosition ? user.pendingPosition : user.position,
          pendingFullName: null,
          pendingCccd: null,
          pendingPosition: null,
          changeRequestStatus: "APPROVED",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Đã PHÊ DUYỆT thành công thay đổi thông tin cho tài khoản ${user.username}!`,
      });
    } else {
      // REJECT
      await prisma.user.update({
        where: { id: userId },
        data: {
          pendingFullName: null,
          pendingCccd: null,
          pendingPosition: null,
          changeRequestStatus: "REJECTED",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Đã TỪ CHỐI yêu cầu thay đổi thông tin của tài khoản ${user.username}.`,
      });
    }
  } catch (error: any) {
    console.error("Lỗi phê duyệt yêu cầu thay đổi thông tin:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể xử lý yêu cầu phê duyệt." },
      { status: 500 }
    );
  }
}
