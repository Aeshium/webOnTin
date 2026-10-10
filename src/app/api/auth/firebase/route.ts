import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userAchievements, users } from "@/db/schema";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";

function safeNextPath(value: string | null) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\r\n]/.test(value)
    ? value
    : "/";
}

export async function POST(request: NextRequest) {
  let body: { idToken?: unknown; next?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || typeof body.idToken !== "string") {
    return NextResponse.json({ error: "Phiên đăng nhập Google không hợp lệ." }, { status: 400 });
  }
  if (body.idToken.length > 10_000) {
    return NextResponse.json({ error: "Phiên đăng nhập Google không hợp lệ." }, { status: 400 });
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Firebase chưa được cấu hình trên máy chủ." }, { status: 503 });
    }
    const verifyResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: body.idToken }),
        cache: "no-store",
      }
    );
    if (!verifyResponse.ok) {
      return NextResponse.json({ error: "Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn." }, { status: 401 });
    }
    const verification: {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
        displayName?: string;
        photoUrl?: string;
        providerUserInfo?: Array<{ providerId?: string }>;
      }>;
    } = await verifyResponse.json();
    const identity = verification.users?.[0];
    if (
      !identity ||
      !identity.providerUserInfo?.some((provider) => provider.providerId === "google.com") ||
      !identity.email ||
      !identity.emailVerified
    ) {
      return NextResponse.json({ error: "Cần dùng tài khoản Google đã xác minh email." }, { status: 401 });
    }
    const email = identity.email.trim().toLowerCase();
    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const now = new Date();
    if (!user) {
      const [created] = await db
        .insert(users)
        .values({
          name: identity.displayName?.trim().slice(0, 80) || email.slice(0, 80),
          email,
          passwordHash: await hashPassword(randomBytes(48).toString("base64url")),
          avatarUrl: identity.photoUrl ?? null,
          loginStreak: 1,
          lastLoginAt: now,
        })
        .returning();
      if (!created) throw new Error("Không tạo được tài khoản Firebase.");
      user = created;
    } else {
      const dayNumber = (date: Date) =>
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000;
      const dayGap = dayNumber(now) - dayNumber(user.lastLoginAt);
      const loginStreak =
        dayGap === 0 ? Math.max(user.loginStreak, 1) : dayGap === 1 ? user.loginStreak + 1 : 1;
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({
            lastLoginAt: now,
            loginStreak,
            ...(!user.avatarUrl && identity.photoUrl ? { avatarUrl: identity.photoUrl } : {}),
          })
          .where(eq(users.id, user.id));
        const earnedKeys = [];
        if (loginStreak >= 7) earnedKeys.push("login-7-days");
        if (loginStreak >= 30) earnedKeys.push("login-30-days");
        if (earnedKeys.length) {
          await tx
            .insert(userAchievements)
            .values(earnedKeys.map((achievementKey) => ({ userId: user.id, achievementKey })))
            .onConflictDoNothing();
        }
      });
    }

    const sessionToken = await createSession(user.id);
    const response = NextResponse.json({ ok: true, next: safeNextPath(typeof body.next === "string" ? body.next : null) });
    setSessionCookie(response, sessionToken);
    return response;
  } catch (error) {
    console.error("Xác thực Firebase thất bại:", error);
    return NextResponse.json({ error: "Không thể xác thực tài khoản Google." }, { status: 500 });
  }
}
