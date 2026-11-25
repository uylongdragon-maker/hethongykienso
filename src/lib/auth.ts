import crypto from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "hethongykienso_secret_key_2026_binhdong";
const LEGACY_SALT = "binhdong_salt_2026";
const TOKEN_NAME = "auth_token";

export const VALID_USER_ROLES = ["ADMIN", "CHUYEN_VIEN", "CAN_BO"] as const;
export type ValidUserRole = (typeof VALID_USER_ROLES)[number];

export function isValidUserRole(role: unknown): role is ValidUserRole {
  return typeof role === "string" && (VALID_USER_ROLES as readonly string[]).includes(role);
}

// Mật khẩu băm chuẩn bằng scrypt + salt ngẫu nhiên 128-bit
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function isLegacyPasswordHash(storedHash: string): boolean {
  return !storedHash.startsWith("scrypt$");
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (storedHash.startsWith("scrypt$")) {
      const parts = storedHash.split("$");
      if (parts.length !== 3) return false;
      const [, salt, expectedHex] = parts;
      const derived = crypto.scryptSync(password, salt, 64);
      const expectedBuf = Buffer.from(expectedHex, "hex");
      if (derived.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(derived, expectedBuf);
    }

    // Tương thích ngược với tài khoản cũ dùng HMAC-SHA256
    const legacyHex = crypto.createHmac("sha256", LEGACY_SALT).update(password).digest("hex");
    const a = Buffer.from(legacyHex, "utf8");
    const b = Buffer.from(storedHash, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function signToken(payload: Record<string, unknown>, expiresInHours = 24): string {
  const header = { alg: "HS256", typ: "JWT" };
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = nowSec + expiresInHours * 3600;
  const fullPayload = { ...payload, iat: nowSec, exp };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    if (!encodedHeader || !encodedPayload || !signature) return null;

    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf-8"));
    if (!header || header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }

    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    const sigBuf = Buffer.from(signature, "utf8");
    const expBuf = Buffer.from(expectedSignature, "utf8");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || typeof payload.exp !== "number" || payload.exp < nowSec) {
      return null;
    }

    return payload as T;
  } catch {
    return null;
  }
}

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "CHUYEN_VIEN" | "CAN_BO" | string;
  department?: string | null;
  position?: string | null;
  administrativeUnitId?: string | null;
}

interface CachedSessionEntry {
  user: SessionUser | null;
  expiresAt: number;
}

const globalSessionCache = globalThis as unknown as {
  __ykiensoSessionCache?: Map<string, CachedSessionEntry>;
};

function getSessionCache(): Map<string, CachedSessionEntry> {
  if (!globalSessionCache.__ykiensoSessionCache) {
    globalSessionCache.__ykiensoSessionCache = new Map<string, CachedSessionEntry>();
  }
  return globalSessionCache.__ykiensoSessionCache;
}

export function invalidateUserSessionCache(userId?: string): void {
  const store = getSessionCache();
  if (userId) {
    store.delete(userId);
  } else {
    store.clear();
  }
}

// Xác thực token kết hợp đối chiếu tài khoản thực tế trong CSDL
// Có bộ nhớ đệm 30 giây theo userId để tránh lặp roundtrip DB khi chuyển trang nhanh
export const getSession = cache(async (): Promise<SessionUser | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (!token) return null;

    const decoded = verifyToken<SessionUser>(token);
    if (!decoded || !decoded.id) return null;

    const now = Date.now();
    const store = getSessionCache();
    const cached = store.get(decoded.id);
    if (cached && cached.expiresAt > now) {
      return cached.user;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        department: true,
        position: true,
        administrativeUnitId: true,
      },
    });

    if (store.size > 500) {
      for (const [k, v] of store.entries()) {
        if (v.expiresAt <= now) store.delete(k);
      }
    }

    store.set(decoded.id, { user: dbUser || null, expiresAt: now + 30_000 });
    return dbUser || null;
  } catch {
    return null;
  }
});

export { TOKEN_NAME };
