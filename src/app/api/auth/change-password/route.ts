import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  getCurrentUser,
  hashPassword,
  hashToken,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập lại." }, { status: 401 });
  }

  let body: {
    currentPassword?: unknown;
    newPassword?: unknown;
    confirmPassword?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (!currentPassword) {
    return NextResponse.json({ error: "Vui lòng nhập mật khẩu hiện tại." }, { status: 400 });
  }
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return NextResponse.json(
      { error: passwordError },
      { status: 400 }
    );
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Mật khẩu xác nhận không khớp." }, { status: 400 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "Mật khẩu mới cần khác mật khẩu hiện tại." },
      { status: 400 }
    );
  }

  const [account] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
    return NextResponse.json({ error: "Mật khẩu hiện tại không chính xác." }, { status: 400 });
  }

  const sessionToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, user.id));
    await tx
      .delete(sessions)
      .where(
        and(
          eq(sessions.userId, user.id),
          ne(sessions.tokenHash, hashToken(sessionToken))
        )
      );
  });

  return NextResponse.json({ ok: true });
}
