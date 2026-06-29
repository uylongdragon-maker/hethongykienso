import { prisma } from "@/lib/db";
import ReportsClient from "./ReportsClient";

// Đảm bảo trang luôn lấy dữ liệu mới nhất (không cache tĩnh)
export const revalidate = 0;

export default async function ReportsPage() {
  // Lấy danh sách kiến nghị xếp theo ngày tiếp nhận mới nhất
  const petitions = await prisma.petition.findMany({
    orderBy: {
      receivedDate: "desc",
    },
  });

  // Chuyển đổi DateTime sang dạng ISO string để gửi qua Client Component an toàn
  const serializedPetitions = petitions.map((p) => ({
    ...p,
    receivedDate: p.receivedDate.toISOString(),
    deadline: p.deadline.toISOString(),
    extendedUntil: p.extendedUntil ? p.extendedUntil.toISOString() : null,
    replyDocDate: p.replyDocDate ? p.replyDocDate.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div>
      <ReportsClient initialPetitions={serializedPetitions} />
    </div>
  );
}
