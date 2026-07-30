"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updatePetitionResolution(id: string, formData: FormData) {
  // Thông tin cơ bản chỉnh sửa
  const senderName = formData.get("senderName") as string;
  const senderPhone = (formData.get("senderPhone") as string) || null;
  const senderAddress = formData.get("senderAddress") as string;
  const source = formData.get("source") as string;
  const category = formData.get("category") as string;
  const department = formData.get("department") as string;
  const authority = formData.get("authority") as string;
  const location = formData.get("location") as string;
  const content = formData.get("content") as string;
  const attachmentUrl = (formData.get("attachmentUrl") as string) || null;
  const receivedDateStr = formData.get("receivedDate") as string;
  const deadlineStr = formData.get("deadline") as string;
  const quarter = formData.get("quarter") as string;

  // Kết quả giải quyết chỉnh sửa
  const status = formData.get("status") as string;
  const replyDocNumber = (formData.get("replyDocNumber") as string) || null;
  const replyDocLink = (formData.get("replyDocLink") as string) || null;
  const extendedUntilStr = (formData.get("extendedUntil") as string) || null;
  const reviewStatus = (formData.get("reviewStatus") as string) || "Chưa giải quyết";
  const notes = (formData.get("notes") as string) || null;

  if (!senderName || !senderAddress || !source || !category || !department || !authority || !location || !content || !receivedDateStr || !deadlineStr || !status) {
    throw new Error("Vui lòng điền đầy đủ các thông tin bắt buộc.");
  }

  const validStatuses = ["Đang xử lý", "Đã xong", "Chờ Admin phê duyệt", "Quá hạn"];
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
      senderName,
      senderPhone,
      senderAddress,
      source,
      category,
      department,
      authority,
      location,
      content,
      attachmentUrl,
      receivedDate: new Date(receivedDateStr),
      deadline: new Date(deadlineStr),
      quarter,
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
