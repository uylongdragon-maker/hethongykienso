import { NextResponse } from "next/server";
import { TOKEN_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Đã đăng xuất khỏi hệ thống",
  });

  // Xóa session cookie
  response.cookies.set({
    name: TOKEN_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  return response;
}
