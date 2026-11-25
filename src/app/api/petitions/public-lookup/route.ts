import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/security";
import { syncOverduePetitions } from "@/lib/petitions";
import { PublicPetitionSummary } from "@/lib/petitionUtils";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`public-lookup:${ip}`, 25, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Quá nhiều lượt tra cứu liên tiếp. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
        },
        { status: 429 }
      );
    }

    const rawCode = req.nextUrl.searchParams.get("code")?.trim() || "";
    if (!rawCode || rawCode.length < 3 || rawCode.length > 32) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập mã vụ việc hợp lệ (ví dụ: KN2026-001)." },
        { status: 400 }
      );
    }

    await syncOverduePetitions();

    const found = await prisma.petition.findFirst({
      where: {
        petitionCode: {
          equals: rawCode,
          mode: "insensitive",
        },
      },
      select: {
        petitionCode: true,
        source: true,
        quarter: true,
        category: true,
        authority: true,
        department: true,
        receivedDate: true,
        deadline: true,
        extendedUntil: true,
        status: true,
        reviewStatus: true,
        replyDocNumber: true,
        replyDocDate: true,
      },
    });

    if (!found) {
      return NextResponse.json({ success: true, data: null });
    }

    const summary: PublicPetitionSummary = {
      petitionCode: found.petitionCode,
      source: found.source,
      quarter: found.quarter,
      category: found.category,
      authority: found.authority,
      department: found.department,
      receivedDate: found.receivedDate.toISOString(),
      deadline: found.deadline.toISOString(),
      extendedUntil: found.extendedUntil ? found.extendedUntil.toISOString() : null,
      status: found.status,
      reviewStatus: found.reviewStatus,
      replyDocNumber: found.replyDocNumber,
      replyDocDate: found.replyDocDate ? found.replyDocDate.toISOString() : null,
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    console.error("Lỗi tra cứu công khai:", err);
    return NextResponse.json(
      { success: false, error: "Không thể thực hiện tra cứu vào lúc này." },
      { status: 500 }
    );
  }
}
