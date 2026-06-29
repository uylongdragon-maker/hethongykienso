import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Hàm chuẩn hóa địa chỉ
function sanitizeAddress(address: string): string {
  if (!address) return "";
  let cleaned = address.replace(/khu\s*phố\s*23|kp\s*23/gi, "");
  cleaned = cleaned.replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim();
  cleaned = cleaned.replace(/(,\s*)?chánh\s*hưng(\s*ward)?/gi, "");
  cleaned = cleaned.replace(/(,\s*)?ho\s*chi\s*minh(\s*city)?/gi, "");
  cleaned = cleaned.replace(/(,\s*)?tp\.?\s*hcm/gi, "");
  cleaned = cleaned.trim();
  return `${cleaned}, Chánh Hưng Ward, Ho Chi Minh City`;
}

async function main() {
  console.log("Starting database seeding with Petition model...");

  await prisma.petition.deleteMany({});
  console.log("Cleared old records.");

  const petitions = [
    {
      petitionCode: "KN2024-001",
      source: "Tiếp xúc cử tri (trước kỳ họp)",
      senderName: "Nguyễn Văn A",
      senderPhone: "0909001111",
      senderAddress: sanitizeAddress("1111 Tạ Quang Bửu, KP23"),
      category: "Quản lý đô thị",
      location: "1122 Phạm Thế Hiển (GPS: 10.742300, 106.682100)",
      content: "Sửa chữa hẻm 123",
      authority: "UBND phường",
      department: "Phòng KT-HT và Đô thị",
      receivedDate: new Date("2025-12-01T08:00:00Z"),
      deadline: new Date("2025-12-31T17:00:00Z"),
      extendedUntil: null,
      status: "Quá hạn",
      replyDocNumber: "UBND phường đã khảo sát hẻm",
      replyDocLink: "https://example.com/reply-01.pdf",
      reviewStatus: "Chưa giải quyết",
      notes: "Đã nhắc lần 2",
    },
    {
      petitionCode: "GS2026-015",
      source: "Sau giám sát",
      senderName: "Trần Thị B",
      senderPhone: null,
      senderAddress: sanitizeAddress("456 Phạm Thế Hiển"),
      category: "Chế độ chính sách",
      location: "Trường Tiểu học Chánh Hưng",
      content: "Quà tết cho hộ nghèo",
      authority: "UBND phường",
      department: "Phòng Văn hóa - Xã hội",
      receivedDate: new Date("2026-01-15T08:00:00Z"),
      deadline: new Date("2026-02-14T17:00:00Z"),
      extendedUntil: null,
      status: "Đã xong",
      replyDocNumber: "Số 12/UBND",
      replyDocLink: "https://example.com/reply-12.pdf",
      reviewStatus: "Hoàn thành",
      notes: "Đúng hạn",
    },
    {
      petitionCode: "KN2026-042",
      source: "Tiếp xúc cử tri (hàng tuần)",
      senderName: "Lê Văn C",
      senderPhone: null,
      senderAddress: sanitizeAddress("789 Phạm Hùng, Khu phố 23"),
      category: "Môi trường",
      location: "Chợ phường 4",
      content: "Rác thải tại chợ",
      authority: "UBND phường",
      department: "Phòng KT-HT và Đô thị",
      receivedDate: new Date("2026-01-20T08:00:00Z"),
      deadline: new Date("2026-02-19T17:00:00Z"),
      extendedUntil: null,
      status: "Đang xử lý",
      replyDocNumber: "Đang chờ Cty DVCI phối hợp",
      replyDocLink: null,
      reviewStatus: "Chưa giải quyết",
      notes: "Đã gửi công văn",
    },
  ];

  for (const item of petitions) {
    const created = await prisma.petition.create({
      data: item,
    });
    console.log(`Created petition: ${created.petitionCode} - ${created.senderName}`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
