import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import crypto from "crypto";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  const salt = "binhdong_salt_2026";
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

function sanitizeAddress(address: string): string {
  if (!address) return "";
  let cleaned = address.replace(/khu\s*phố\s*23|kp\s*23/gi, "");
  cleaned = cleaned.replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim();
  cleaned = cleaned.replace(/(,\s*)?(phường\s*)?bình\s*đông/gi, "");
  cleaned = cleaned.replace(/(,\s*)?(phường\s*)?chánh\s*hưng/gi, "");
  cleaned = cleaned.replace(/(,\s*)?tp\.?\s*h(ồ|o)\s*ch(í|i)\s*minh/gi, "");
  cleaned = cleaned.replace(/(,\s*)?tp\.?\s*hcm/gi, "");
  cleaned = cleaned.replace(/(,\s*)?ho\s*chi\s*minh(\s*city)?/gi, "");
  cleaned = cleaned.trim();
  return `${cleaned}, Phường Bình Đông, TP. Hồ Chí Minh`;
}

async function main() {
  console.log("Starting database seeding with CCCD & Roles...");

  // Clear existing tables
  await prisma.petition.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.administrativeUnit.deleteMany({});
  console.log("Cleared old records.");

  // 1. Seed Vietnamese Administrative Units
  const hcm = await prisma.administrativeUnit.create({
    data: {
      code: "79",
      name: "Thành phố Hồ Chí Minh",
      nameEn: "Ho Chi Minh City",
      fullName: "Thành phố Hồ Chí Minh",
      level: "TinhThanh",
    },
  });

  const q8 = await prisma.administrativeUnit.create({
    data: {
      code: "760",
      name: "Quận 8",
      nameEn: "Quan 8",
      fullName: "Quận 8, Thành phố Hồ Chí Minh",
      level: "QuanHuyen",
      parentId: hcm.id,
    },
  });

  const binhDong = await prisma.administrativeUnit.create({
    data: {
      code: "26830",
      name: "Phường Bình Đông",
      nameEn: "Phuong Binh Dong",
      fullName: "Phường Bình Đông, Quận 8, Thành phố Hồ Chí Minh",
      level: "PhuongXa",
      parentId: q8.id,
    },
  });

  for (let i = 1; i <= 5; i++) {
    const quarterNum = i.toString().padStart(2, "0");
    await prisma.administrativeUnit.create({
      data: {
        code: `26830-${quarterNum}`,
        name: `Khu phố ${quarterNum}`,
        fullName: `Khu phố ${quarterNum}, Phường Bình Đông, Quận 8, TP. Hồ Chí Minh`,
        level: "KhuPho",
        parentId: binhDong.id,
      },
    });
  }

  // 2. Seed Accounts with CCCD:
  const users = [
    {
      username: "admin",
      passwordHash: hashPassword("123456"),
      fullName: "Quản Trị Viên Hệ Thống",
      cccd: "079090000001",
      email: "admin@binhdong.gov.vn",
      phone: "0909111222",
      role: "ADMIN",
      department: "Ban Quản trị & Phê duyệt Hệ thống",
      administrativeUnitId: binhDong.id,
    },
    {
      username: "chuyenvien",
      passwordHash: hashPassword("123456"),
      fullName: "Chuyên Viên Xử Lý Hồ Sơ",
      cccd: "079090000002",
      email: "chuyenvien@binhdong.gov.vn",
      phone: "0908333444",
      role: "CHUYEN_VIEN",
      department: "Phòng Tổng hợp & Tiếp nhận Hồ sơ",
      administrativeUnitId: binhDong.id,
    },
    {
      username: "canbo_binhdong",
      passwordHash: hashPassword("canbo123"),
      fullName: "Phạm Văn Bình",
      cccd: "079090000003",
      email: "canbo@binhdong.gov.vn",
      phone: "0907555666",
      role: "CAN_BO",
      department: "Phòng KT-HT & Đô thị",
      administrativeUnitId: binhDong.id,
    },
  ];

  for (const user of users) {
    const createdUser = await prisma.user.create({ data: user });
    console.log(`Created User: ${createdUser.username} (${createdUser.fullName}) [CCCD: ${createdUser.cccd}] [Role: ${createdUser.role}]`);
  }

  // 3. Seed Petitions
  const petitions = [
    {
      petitionCode: "KN2024-001",
      source: "Tiếp xúc cử tri (trước kỳ họp)",
      quarter: "Khu phố 15",
      senderName: "Nguyễn Văn A",
      senderPhone: "0909001111",
      senderAddress: sanitizeAddress("1111 Tạ Quang Bửu"),
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
      quarter: "Khu phố 02",
      senderName: "Trần Thị B",
      senderPhone: null,
      senderAddress: sanitizeAddress("456 Phạm Thế Hiển"),
      category: "Chế độ chính sách",
      location: "Trường Tiểu học Bình Đông, Phường Bình Đông, TP. Hồ Chí Minh",
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
      notes: "Đã được Admin phê duyệt hoàn tất",
    },
    {
      petitionCode: "KN2026-042",
      source: "Tiếp xúc cử tri (hàng tuần)",
      quarter: "Khu phố 28",
      senderName: "Lê Văn C",
      senderPhone: null,
      senderAddress: sanitizeAddress("789 Phạm Hùng"),
      category: "Môi trường",
      location: "Chợ Bình Đông, Phường Bình Đông, TP. Hồ Chí Minh",
      content: "Rác thải tại chợ",
      authority: "UBND phường",
      department: "Phòng KT-HT và Đô thị",
      receivedDate: new Date("2026-01-20T08:00:00Z"),
      deadline: new Date("2026-02-19T17:00:00Z"),
      extendedUntil: null,
      status: "Đang chờ ý kiến cấp trên",
      replyDocNumber: "Đã lập dự thảo xử lý",
      replyDocLink: null,
      reviewStatus: "Mới giải quyết 1 phần",
      notes: "Chuyên viên đã trình Admin phê duyệt văn bản trả lời",
    },
  ];

  for (const item of petitions) {
    const created = await prisma.petition.create({ data: item });
    console.log(`Created petition: ${created.petitionCode} - ${created.senderName}`);
  }

  console.log("Seeding finished successfully!");
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
