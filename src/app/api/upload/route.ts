import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sanitizeAttachmentUrl } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập để tải tệp lên." },
        { status: 401 }
      );
    }

    if (session.role === "CAN_BO") {
      return NextResponse.json(
        { success: false, error: "Tài khoản Lãnh đạo phường không có quyền tải tệp chỉnh sửa." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy tệp tải lên." },
        { status: 400 }
      );
    }

    const MAX_SIZE = 3.5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          success: false,
          error: `Dung lượng tệp (${sizeMB}MB) vượt quá giới hạn 3.5MB cho phép tải trực tiếp. Vui lòng nén tệp hoặc dán liên kết Google Drive / OneDrive.`,
        },
        { status: 400 }
      );
    }

    const originalName = file.name;
    const mimeType = (file.type || "application/octet-stream").toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const check = sanitizeAttachmentUrl(dataUrl);
    if (!check.valid || !check.url) {
      return NextResponse.json(
        { success: false, error: check.error || "Định dạng tệp không được hỗ trợ." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      url: check.url,
      fileName: originalName,
      size: file.size,
    });
  } catch (error) {
    console.error("Lỗi khi xử lý tệp:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi xử lý tệp trên máy chủ.",
      },
      { status: 500 }
    );
  }
}
