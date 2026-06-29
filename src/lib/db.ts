import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Sử dụng DATABASE_URL (hỗ trợ pooler cho môi trường chạy ứng dụng), 
// và fallback sang DIRECT_URL nếu không tìm thấy.
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
