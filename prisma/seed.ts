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
  console.log("Starting database seeding (upsert mode - preserves existing data)...");

  // 1. Seed Vietnamese Administrative Units (upsert)
  const hcm = await prisma.administrativeUnit.upsert({
    where: { code: "79" },
    update: {},
    create: {
      code: "79",
      name: "Thành phố Hồ Chí Minh",
      nameEn: "Ho Chi Minh City",
      fullName: "Thành phố Hồ Chí Minh",
      level: "TinhThanh",
    },
  });

  const q8 = await prisma.administrativeUnit.upsert({
    where: { code: "760" },
    update: {},
    create: {
      code: "760",
      name: "Quận 8",
      nameEn: "Quan 8",
      fullName: "Quận 8, Thành phố Hồ Chí Minh",
      level: "QuanHuyen",
      parentId: hcm.id,
    },
  });

  const binhDong = await prisma.administrativeUnit.upsert({
    where: { code: "26830" },
    update: {},
    create: {
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
    await prisma.administrativeUnit.upsert({
      where: { code: `26830-${quarterNum}` },
      update: {},
      create: {
        code: `26830-${quarterNum}`,
        name: `Khu phố ${quarterNum}`,
        fullName: `Khu phố ${quarterNum}, Phường Bình Đông, Quận 8, TP. Hồ Chí Minh`,
        level: "KhuPho",
        parentId: binhDong.id,
      },
    });
  }
  console.log("Administrative units seeded.");

  // 2. Seed Accounts with CCCD & Chức danh chuẩn:
  const users = [
    {
      username: "admin",
      passwordHash: hashPassword("123456"),
      fullName: "Quản Trị Viên Hệ Thống",
      position: "Kỹ thuật viên",
      cccd: "079090000001",
      email: "admin@binhdong.gov.vn",
      phone: "0909111222",
      role: "ADMIN",
      department: "Bộ phận Kỹ thuật & Quản trị Hệ thống",
      administrativeUnitId: binhDong.id,
    },
    {
      username: "ttthang",
      passwordHash: hashPassword("123456"),
      fullName: "Trần Thanh Thắng",
      position: "Phó Chủ tịch HĐND phường Bình Đông",
      cccd: "079080000001",
      email: "ttthang@binhdong.gov.vn",
      phone: "0909333555",
      role: "ADMIN",
      department: "Thường trực HĐND phường Bình Đông",
      administrativeUnitId: binhDong.id,
    },
    {
      username: "dtadao",
      passwordHash: hashPassword("123456"),
      fullName: "Đoàn Thị Anh Đào",
      position: "Phó Trưởng Ban Kinh tế - Ngân sách HĐND phường Bình Đông",
      cccd: "048172000306",
      email: "dtadao@binhdong.gov.vn",
      phone: "0908123456",
      role: "ADMIN",
      department: "Ban Kinh tế - Ngân sách HĐND phường Bình Đông",
      administrativeUnitId: binhDong.id,
    },
    {
      username: "ptdat",
      passwordHash: hashPassword("123456"),
      fullName: "Phan Tấn Đạt",
      position: "Phó Trưởng Ban Văn hóa - Xã hội HĐND phường Bình Đông",
      cccd: "079085039418",
      email: "ptdat@binhdong.gov.vn",
      phone: "0907987654",
      role: "ADMIN",
      department: "Ban Văn hóa - Xã hội HĐND phường Bình Đông",
      administrativeUnitId: binhDong.id,
    },
    {
      username: "chuyenvien",
      passwordHash: hashPassword("123456"),
      fullName: "Chuyên Viên Xử Lý Hồ Sơ",
      position: "Chuyên viên thống kê báo cáo",
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
      position: "Cán bộ chuyên trách",
      cccd: "079090000003",
      email: "canbo@binhdong.gov.vn",
      phone: "0907555666",
      role: "CAN_BO",
      department: "Phòng KT-HT & Đô thị",
      administrativeUnitId: binhDong.id,
    },
  ];

  for (const user of users) {
    const { administrativeUnitId, ...userData } = user;
    const createdUser = await prisma.user.upsert({
      where: { username: user.username },
      update: {
        passwordHash: user.passwordHash,
        fullName: user.fullName,
        position: user.position,
        cccd: user.cccd,
        role: user.role,
        department: user.department,
      },
      create: user,
    });
    console.log(`Upsert User: ${createdUser.username} (${createdUser.fullName}) [Chức vụ: ${createdUser.position}] [CCCD: ${createdUser.cccd}] [Role: ${createdUser.role}]`);
  }

  // 3. Seed Petitions - Dữ liệu mẫu đã được xóa theo yêu cầu.
  // Các kiến nghị sẽ được nhập thủ công trên giao diện hệ thống.
  console.log("Skipping petition seeds (removed example data).");

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
