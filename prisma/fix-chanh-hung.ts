/**
 * Script cập nhật dữ liệu database:
 * Thay thế tất cả "Chánh Hưng" (và các biến thể tiếng Anh) trong địa chỉ
 * thành "Phường Bình Đông, TP. Hồ Chí Minh" cho chuẩn.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixAddress(raw: string): Promise<string> {
  if (!raw) return raw;

  // Loại bỏ các đuôi sai trước khi chuẩn hóa lại
  let cleaned = raw
    .replace(/,?\s*chánh\s*hưng\s*ward/gi, "")
    .replace(/,?\s*phường\s*chánh\s*hưng/gi, "")
    .replace(/,?\s*chánh\s*hưng/gi, "")
    .replace(/,?\s*ho\s*chi\s*minh\s*city/gi, "")
    .replace(/,?\s*tp\.?\s*hồ\s*chí\s*minh/gi, "")
    .replace(/,?\s*tp\.?\s*hcm/gi, "")
    .replace(/,?\s*phường\s*bình\s*đông/gi, "") // loại bỏ nếu đã có để tránh lặp
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,|,\s*$/g, "")
    .trim();

  // Nối đuôi chuẩn
  return `${cleaned}, Phường Bình Đông, TP. Hồ Chí Minh`;
}

async function main() {
  console.log("🔄 Bắt đầu cập nhật địa chỉ trong database...\n");

  // Lấy tất cả bản ghi có chứa "Chánh Hưng" hoặc "Chanh Hung" hoặc đuôi sai
  const allPetitions = await prisma.petition.findMany();

  let updatedCount = 0;

  for (const pet of allPetitions) {
    const needsAddressUpdate =
      /chánh\s*hưng|chanh\s*hung/i.test(pet.senderAddress) ||
      !/phường bình đông/i.test(pet.senderAddress);

    const needsLocationUpdate =
      /chánh\s*hưng|chanh\s*hung/i.test(pet.location);

    if (needsAddressUpdate || needsLocationUpdate) {
      const newSenderAddress = needsAddressUpdate
        ? await fixAddress(pet.senderAddress)
        : pet.senderAddress;

      const newLocation = needsLocationUpdate
        ? pet.location
            .replace(/,?\s*chánh\s*hưng\s*ward/gi, ", Phường Bình Đông")
            .replace(/,?\s*phường\s*chánh\s*hưng/gi, ", Phường Bình Đông")
            .replace(/chánh\s*hưng/gi, "Bình Đông")
            .replace(/chanh\s*hung/gi, "Bình Đông")
            .replace(/ho\s*chi\s*minh\s*city/gi, "TP. Hồ Chí Minh")
            .trim()
        : pet.location;

      await prisma.petition.update({
        where: { id: pet.id },
        data: {
          senderAddress: newSenderAddress,
          location: newLocation,
        },
      });

      console.log(`✅ Đã cập nhật: ${pet.petitionCode} - ${pet.senderName}`);
      if (needsAddressUpdate) {
        console.log(`   senderAddress: "${pet.senderAddress}"`);
        console.log(`             → "${newSenderAddress}"`);
      }
      if (needsLocationUpdate) {
        console.log(`   location: "${pet.location}"`);
        console.log(`         → "${newLocation}"`);
      }
      console.log();
      updatedCount++;
    }
  }

  if (updatedCount === 0) {
    console.log("✨ Không có bản ghi nào cần cập nhật.");
  } else {
    console.log(`\n✅ Hoàn tất! Đã cập nhật ${updatedCount} bản ghi.`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi chạy migration:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
