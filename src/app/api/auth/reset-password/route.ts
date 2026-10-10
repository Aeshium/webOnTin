import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, sessions, users } from "@/db/schema";
import { hashPassword, hashToken } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";

export async function POST(request: NextRequest) {
  let body: { token?: unknown; password?: unknown; confirmPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const passwordError = validatePassword(password);
  if (
    !token ||
    passwordError ||
    password !== confirmPassword
  ) {
    return NextResponse.json(
      { error: passwordError ?? (token ? "Mật khẩu xác nhận không khớp." : "Liên kết không hợp lệ.") },
      { status: 400 }
    );
  }

  const now = new Date();
  const [reset] = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);
  if (!reset) {
    return NextResponse.json({ error: "Liên kết đã hết hạn hoặc không còn hợp lệ." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const resetCompleted = await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.id, reset.id),
          gt(passwordResetTokens.expiresAt, now),
          isNull(passwordResetTokens.usedAt)
        )
      )
      .returning({ id: passwordResetTokens.id });
    if (!claimed) return false;

    await tx.update(users).set({ passwordHash }).where(eq(users.id, reset.userId));
    await tx.delete(sessions).where(eq(sessions.userId, reset.userId));
    return true;
  });
  if (!resetCompleted) {
    return NextResponse.json({ error: "Liên kết đã hết hạn hoặc không còn hợp lệ." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
