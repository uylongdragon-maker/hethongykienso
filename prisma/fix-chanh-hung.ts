/**
 * Script cập nhật toàn bộ dữ liệu trong database:
 * - Loại bỏ "Khu phố 23", "KP23" khỏi địa chỉ
 * - Loại bỏ "Chánh Hưng" và các biến thể
 * - Chuẩn hóa đuôi → "Phường Bình Đông, TP. Hồ Chí Minh"
 * - Sửa location sai địa danh
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function sanitizeAddress(raw: string): string {
  if (!raw) return raw;

  let cleaned = raw
    // Xóa KP23 / Khu phố 23
    .replace(/khu\s*phố\s*23|kp\s*23/gi, "")
    // Xóa đuôi phường/thành phố cũ (tránh lặp)
    .replace(/(,\s*)?(phường\s*)?bình\s*đông/gi, "")
    .replace(/(,\s*)?(phường\s*)?chánh\s*hưng(\s*ward)?/gi, "")
    .replace(/(,\s*)?tp\.?\s*h(ồ|o)\s*ch(í|i)\s*minh/gi, "")
    .replace(/(,\s*)?tp\.?\s*hcm/gi, "")
    .replace(/(,\s*)?ho\s*chi\s*minh(\s*city)?/gi, "")
    // Dọn khoảng trắng và dấu phẩy thừa
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,|,\s*$/g, "")
    .trim();

  return `${cleaned}, Phường Bình Đông, TP. Hồ Chí Minh`;
}

function needsAddressFix(addr: string): boolean {
  return (
    /khu\s*phố\s*23|kp\s*23/i.test(addr) ||
    /chánh\s*hưng|chanh\s*hung/i.test(addr) ||
    /ho\s*chi\s*minh\s*city/i.test(addr) ||
    !/phường bình đông/i.test(addr)
  );
}

function needsLocationFix(loc: string): boolean {
  return (
    /khu\s*phố\s*23|kp\s*23/i.test(loc) ||
    /chánh\s*hưng|chanh\s*hung/i.test(loc)
  );
}

async function main() {
  console.log("🔄 Bắt đầu chuẩn hóa địa chỉ trong database...\n");

  const all = await prisma.petition.findMany();
  let updated = 0;

  for (const pet of all) {
    const fixAddr = needsAddressFix(pet.senderAddress);
    const fixLoc  = needsLocationFix(pet.location);

    if (!fixAddr && !fixLoc) continue;

    const newAddr = fixAddr ? sanitizeAddress(pet.senderAddress) : pet.senderAddress;
    const newLoc  = fixLoc
      ? pet.location
          .replace(/khu\s*phố\s*23|kp\s*23/gi, "")
          .replace(/chánh\s*hưng\s*ward/gi, "Phường Bình Đông")
          .replace(/phường\s*chánh\s*hưng/gi, "Phường Bình Đông")
          .replace(/chánh\s*hưng/gi, "Bình Đông")
          .replace(/chanh\s*hung/gi, "Bình Đông")
          .replace(/ho\s*chi\s*minh\s*city/gi, "TP. Hồ Chí Minh")
          .replace(/,\s*,/g, ",")
          .replace(/^\s*,|,\s*$/g, "")
          .trim()
      : pet.location;

    await prisma.petition.update({
      where: { id: pet.id },
      data: { senderAddress: newAddr, location: newLoc },
    });

    console.log(`✅ ${pet.petitionCode} — ${pet.senderName}`);
    if (fixAddr) {
      console.log(`   📍 Địa chỉ: "${pet.senderAddress}"`);
      console.log(`            → "${newAddr}"`);
    }
    if (fixLoc) {
      console.log(`   📌 Địa điểm: "${pet.location}"`);
      console.log(`             → "${newLoc}"`);
    }
    console.log();
    updated++;
  }

  console.log(updated === 0
    ? "✨ Không có bản ghi nào cần cập nhật."
    : `✅ Hoàn tất! Đã cập nhật ${updated} bản ghi.`
  );
}

main()
  .catch((e) => {
    console.error("❌ Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
