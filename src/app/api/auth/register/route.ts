import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";
import { roleSafeNextPath } from "@/lib/role-access";

export async function POST(request: NextRequest) {
  let body: {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
    next?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Tên cần có từ 2 đến 80 ký tự." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Mật khẩu xác nhận không khớp." }, { status: 400 });
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return NextResponse.json({ error: "Email này đã được đăng ký." }, { status: 409 });
  }

  try {
    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: await hashPassword(password), loginCount: 1 })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });
    const token = await createSession(user.id);
    const response = NextResponse.json({
      user,
      next: roleSafeNextPath("student", typeof body.next === "string" ? body.next : null),
    });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json({ error: "Email này đã được đăng ký." }, { status: 409 });
    }
    console.error("Tạo tài khoản thất bại:", error);
    return NextResponse.json({ error: "Không thể tạo tài khoản lúc này." }, { status: 500 });
  }
}
