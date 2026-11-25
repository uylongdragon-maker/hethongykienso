"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { buildWorkflowUpdateData } from "@/lib/petitions";
import { sanitizeWardAddress } from "@/lib/petitionUtils";

export async function updatePetitionResolution(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role === "CAN_BO") {
    throw new Error("Tài khoản Lãnh đạo phường có quyền chỉ xem, không được phép chỉnh sửa dữ liệu.");
  }

  const senderName = (formData.get("senderName") as string)?.trim();
  const senderPhone = ((formData.get("senderPhone") as string) || "").trim() || null;
  const senderAddress = (formData.get("senderAddress") as string)?.trim();
  const source = (formData.get("source") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const department = (formData.get("department") as string)?.trim();
  const authority = (formData.get("authority") as string)?.trim();
  const location = (formData.get("location") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const attachmentUrl = ((formData.get("attachmentUrl") as string) || "").trim() || null;
  const receivedDateStr = (formData.get("receivedDate") as string)?.trim();
  const deadlineStr = (formData.get("deadline") as string)?.trim();
  const quarter = ((formData.get("quarter") as string) || "").trim() || null;

  const status = (formData.get("status") as string)?.trim();
  const replyDocNumber = ((formData.get("replyDocNumber") as string) || "").trim() || null;
  const replyDocDateStr = ((formData.get("replyDocDate") as string) || "").trim() || null;
  const replyDocLink = ((formData.get("replyDocLink") as string) || "").trim() || null;
  const extendedUntilStr = ((formData.get("extendedUntil") as string) || "").trim() || null;
  const reviewStatus = ((formData.get("reviewStatus") as string) || "Chưa giải quyết").trim();
  const notes = ((formData.get("notes") as string) || "").trim() || null;
  const responsibleCommittee = ((formData.get("responsibleCommittee") as string) || "").trim() || null;

  if (
    !senderName ||
    !senderAddress ||
    !source ||
    !category ||
    !department ||
    !authority ||
    !location ||
    !content ||
    !receivedDateStr ||
    !deadlineStr ||
    !status
  ) {
    throw new Error("Vui lòng điền đầy đủ các thông tin bắt buộc.");
  }

  const receivedDate = new Date(receivedDateStr);
  const deadline = new Date(deadlineStr);
  if (isNaN(receivedDate.getTime()) || isNaN(deadline.getTime())) {
    throw new Error("Ngày tiếp nhận hoặc hạn giải quyết không hợp lệ.");
  }

  const existing = await prisma.petition.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      reviewStatus: true,
      replyDocNumber: true,
      replyDocDate: true,
      replyDocLink: true,
      attachmentUrl: true,
      extendedUntil: true,
      notes: true,
    },
  });

  if (!existing) {
    throw new Error("Vụ việc kiến nghị không tồn tại trên hệ thống.");
  }

  const workflow = buildWorkflowUpdateData({
    existing,
    session,
    input: {
      status,
      reviewStatus,
      replyDocNumber,
      replyDocDate: replyDocDateStr,
      replyDocLink,
      attachmentUrl,
      extendedUntil: extendedUntilStr,
      notes,
      responsibleCommittee,
    },
  });

  if (!workflow.ok) {
    throw new Error(workflow.error);
  }

  await prisma.petition.update({
    where: { id },
    data: {
      senderName,
      senderPhone,
      senderAddress: sanitizeWardAddress(senderAddress),
      source,
      category,
      department,
      authority,
      location: sanitizeWardAddress(location),
      content,
      receivedDate,
      deadline,
      quarter,
      ...workflow.data,
    },
  });

  revalidatePath("/petitions");
  revalidatePath(`/petitions/${id}`);
  revalidatePath("/reports");
  revalidatePath("/map");
  revalidatePath("/");
  redirect("/petitions");
}
