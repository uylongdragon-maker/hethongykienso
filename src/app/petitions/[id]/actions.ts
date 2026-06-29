"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updatePetitionResolution(id: string, formData: FormData) {
  const status = formData.get("status") as string;
  const replyDocNumber = (formData.get("replyDocNumber") as string) || null;
  const replyDocLink = (formData.get("replyDocLink") as string) || null;
  const extendedUntilStr = (formData.get("extendedUntil") as string) || null;
  const reviewStatus = (formData.get("reviewStatus") as string) || "Chưa giải quyết";
  const notes = (formData.get("notes") as string) || null;

  if (!status) {
    throw new Error("Trạng thái giải quyết không được để trống.");
  }

  const validStatuses = ["Đang xử lý", "Đã xong", "Đang chờ ý kiến cấp trên", "Quá hạn"];
  if (!validStatuses.includes(status)) {
    throw new Error("Trạng thái giải quyết không hợp lệ.");
  }

  const existing = await prisma.petition.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Vụ việc kiến nghị không tồn tại trên hệ thống.");
  }

  await prisma.petition.update({
    where: { id },
    data: {
      status,
      replyDocNumber,
      replyDocLink,
      extendedUntil: extendedUntilStr ? new Date(extendedUntilStr) : null,
      reviewStatus,
      notes,
    },
  });

  revalidatePath("/petitions");
  revalidatePath("/");
  redirect("/petitions");
}
