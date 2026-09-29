import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tệp tải lên." }, { status: 400 });
    }

    // Giới hạn kích thước tệp 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Dung lượng tệp vượt quá 25MB." }, { status: 400 });
    }

    // Lấy phần mở rộng và chuẩn hóa tên file
    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase();
    
    // Tạo tên file an toàn kèm timestamp
    const baseName = path.basename(originalName, ext)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);

    const uniqueFileName = `${Date.now()}_${baseName}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, uniqueFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: originalName,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Lỗi khi tải tệp lên:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi xử lý tệp trên máy chủ." },
      { status: 500 }
    );
  }
}
