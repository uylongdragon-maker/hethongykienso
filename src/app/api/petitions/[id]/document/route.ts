import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sanitizeAttachmentUrl } from "@/lib/security";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập để xem tài liệu đính kèm." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const fieldParam = req.nextUrl.searchParams.get("field");
    const field: "replyDocLink" | "attachmentUrl" =
      fieldParam === "attachmentUrl" ? "attachmentUrl" : "replyDocLink";

    const petition = await prisma.petition.findUnique({
      where: { id },
      select: {
        petitionCode: true,
        replyDocLink: field === "replyDocLink",
        attachmentUrl: field === "attachmentUrl",
      },
    });

    if (!petition) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy hồ sơ vụ việc." },
        { status: 404 }
      );
    }

    const rawValue = field === "attachmentUrl" ? petition.attachmentUrl : petition.replyDocLink;
    if (!rawValue) {
      return NextResponse.json(
        { success: false, error: "Hồ sơ này chưa có tệp đính kèm." },
        { status: 404 }
      );
    }

    const check = sanitizeAttachmentUrl(rawValue);
    if (!check.valid || !check.url) {
      return NextResponse.json(
        { success: false, error: "Tài liệu không hợp lệ." },
        { status: 400 }
      );
    }

    if (check.url.startsWith("data:")) {
      const commaIdx = check.url.indexOf(",");
      const header = check.url.slice(0, commaIdx);
      const base64Body = check.url.slice(commaIdx + 1);
      const mimeMatch = header.match(/^data:([^;]+);base64$/i);
      const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : "application/octet-stream";

      const buffer = Buffer.from(base64Body, "base64");
      let ext = ".bin";
      if (mimeType === "application/pdf") ext = ".pdf";
      else if (mimeType === "image/jpeg" || mimeType === "image/jpg") ext = ".jpg";
      else if (mimeType === "image/png") ext = ".png";
      else if (mimeType === "image/webp") ext = ".webp";
      else if (mimeType.includes("wordprocessingml")) ext = ".docx";
      else if (mimeType === "application/msword") ext = ".doc";
      else if (mimeType.includes("spreadsheetml")) ext = ".xlsx";
      else if (mimeType === "application/vnd.ms-excel") ext = ".xls";

      const safeCode = petition.petitionCode.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${safeCode}_${field === "attachmentUrl" ? "dinh_kem" : "ket_qua"}${ext}`;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(buffer.byteLength),
          "Content-Disposition": `inline; filename="${filename}"`,
          "Cache-Control": "private, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (check.url.startsWith("http://") || check.url.startsWith("https://")) {
      return NextResponse.redirect(check.url);
    }

    return NextResponse.redirect(new URL(check.url, req.url));
  } catch (err) {
    console.error("Lỗi mở tài liệu đính kèm:", err);
    return NextResponse.json(
      { success: false, error: "Không thể đọc tài liệu đính kèm." },
      { status: 500 }
    );
  }
}
