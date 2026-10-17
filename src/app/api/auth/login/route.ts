import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userAchievements, users } from "@/db/schema";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { roleSafeNextPath } from "@/lib/role-access";

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown; next?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Vui lòng nhập email và mật khẩu." }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Email hoặc mật khẩu không chính xác." }, { status: 401 });
  }
  if (!user.isActive) {
    return NextResponse.json({ error: "Tài khoản này hiện đã bị khóa." }, { status: 403 });
  }

  try {
    const now = new Date();
    const dayNumber = (date: Date) =>
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000;
    const dayGap = dayNumber(now) - dayNumber(user.lastLoginAt);
    const loginStreak =
      dayGap === 0
        ? Math.max(user.loginStreak, 1)
        : dayGap === 1
          ? user.loginStreak + 1
          : 1;

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ lastLoginAt: now, loginStreak, loginCount: user.loginCount + 1 })
        .where(eq(users.id, user.id));

      const earnedKeys = [];
      if (loginStreak >= 7) earnedKeys.push("login-7-days");
      if (loginStreak >= 30) earnedKeys.push("login-30-days");
      if (earnedKeys.length > 0) {
        await tx
          .insert(userAchievements)
          .values(earnedKeys.map((achievementKey) => ({ userId: user.id, achievementKey })))
          .onConflictDoNothing();
      }
    });

    const token = await createSession(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      next: roleSafeNextPath(user.role, typeof body.next === "string" ? body.next : null),
    });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Đăng nhập thất bại:", error);
    return NextResponse.json({ error: "Không thể đăng nhập lúc này." }, { status: 500 });
  }
}
