import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy tệp tải lên." },
        { status: 400 }
      );
    }

    // Giới hạn kích thước tệp tối đa 3.5MB để phù hợp với giới hạn 4.5MB của Vercel Serverless
    const MAX_SIZE = 3.5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          success: false,
          error: `Dung lượng tệp (${sizeMB}MB) vượt quá giới hạn 3.5MB cho phép tải trực tiếp. Vui lòng nén tệp hoặc chuyển sang chế độ 'Dán liên kết' (Google Drive / OneDrive).`,
        },
        { status: 400 }
      );
    }

    const originalName = file.name;
    const mimeType = file.type || "application/octet-stream";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      fileName: originalName,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Lỗi khi xử lý tệp:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Lỗi xử lý tệp trên máy chủ.",
      },
      { status: 500 }
    );
  }
}
