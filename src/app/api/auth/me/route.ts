import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  // Fetch full & fresh user profile from DB
  const dbUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      username: true,
      fullName: true,
      cccd: true,
      email: true,
      phone: true,
      role: true,
      department: true,
      position: true,
      avatarUrl: true,
      pendingFullName: true,
      pendingCccd: true,
      pendingPosition: true,
      changeRequestStatus: true,
      changeRequestedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!dbUser) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({ authenticated: true, user: dbUser });
}
