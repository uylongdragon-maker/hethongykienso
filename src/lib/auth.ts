import crypto from "crypto";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "hethongykienso_secret_key_2026_binhdong";
const TOKEN_NAME = "auth_token";

// Mật khẩu băm chuẩn bằng SHA-256 + Salt
export function hashPassword(password: string): string {
  const salt = "binhdong_salt_2026";
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}

// Tạo JWT Token nhẹ không cần thư viện ngoài
export function signToken(payload: Record<string, any>, expiresInHours = 24): string {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const fullPayload = { ...payload, exp };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken<T = any>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
    
    // Kiểm tra thời hạn token
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
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
  role: "ADMIN" | "CHUYEN_VIEN" | "CAN_BO" | "NGUOI_DAN" | string;
  department?: string | null;
  administrativeUnitId?: string | null;
}

// Lấy thông tin session hiện tại từ HTTP Cookie
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken<SessionUser>(token);
}

export { TOKEN_NAME };
