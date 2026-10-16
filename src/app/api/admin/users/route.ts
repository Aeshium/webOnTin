import { and, asc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, users, type UserRole } from "@/db/schema";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";

export const dynamic = "force-dynamic";
const ROLES: UserRole[] = ["student", "teacher", "admin"];

async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Không có quyền quản lý tài khoản." }, { status: 403 });
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .orderBy(asc(users.name));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Không có quyền tạo tài khoản giáo viên." }, { status: 403 });
  }
  let body: { name?: unknown; email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu tài khoản không hợp lệ." }, { status: 400 });
  }
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const passwordError = validatePassword(password);
  if (
    name.length < 2 ||
    name.length > 80 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    passwordError
  ) {
    return NextResponse.json({
      error: passwordError ?? "Hãy nhập họ tên, email hợp lệ và mật khẩu đúng chính sách.",
    }, { status: 400 });
  }

  try {
    const [created] = await db
      .insert(users)
      .values({ name, email, passwordHash: await hashPassword(password), role: "teacher" })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "Email này đã tồn tại." }, { status: 409 });
    }
    console.error("Tạo tài khoản giáo viên thất bại:", error);
    return NextResponse.json({ error: "Không thể tạo tài khoản giáo viên." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Không có quyền quản lý tài khoản." }, { status: 403 });

  let body: { id?: unknown; role?: unknown; isActive?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
  }
  const id = body?.id;
  if (!Number.isInteger(id) || (id as number) <= 0) {
    return NextResponse.json({ error: "ID tài khoản không hợp lệ." }, { status: 400 });
  }
  if (
    body.role !== undefined && (typeof body.role !== "string" || !ROLES.includes(body.role as UserRole)) ||
    body.isActive !== undefined && typeof body.isActive !== "boolean"
  ) {
    return NextResponse.json({ error: "Vai trò hoặc trạng thái tài khoản không hợp lệ." }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : undefined;
  const passwordError = password === undefined ? null : validatePassword(password);
  if (passwordError || (body.password !== undefined && password === undefined)) {
    return NextResponse.json({ error: passwordError ?? "Mật khẩu không hợp lệ." }, { status: 400 });
  }
  if (id === admin.id && (body.role !== undefined || body.isActive === false || password !== undefined)) {
    return NextResponse.json({ error: "Không thể tự thay đổi vai trò, khóa hoặc đặt lại mật khẩu tài khoản đang dùng." }, { status: 400 });
  }

  try {
    const [target] = await db.select().from(users).where(eq(users.id, id as number)).limit(1);
    if (!target) return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });

    if (target.role === "admin" && (body.role !== undefined && body.role !== "admin" || body.isActive === false)) {
      const [adminCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
      if ((adminCount?.count ?? 0) <= 1) {
        return NextResponse.json({ error: "Không thể khóa hoặc hạ quyền quản trị viên cuối cùng." }, { status: 409 });
      }
    }

    const update: Partial<typeof users.$inferInsert> = {};
    if (body.role !== undefined) update.role = body.role as UserRole;
    if (body.isActive !== undefined) update.isActive = body.isActive;
    if (password !== undefined) update.passwordHash = await hashPassword(password);
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Không có thay đổi hợp lệ." }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id as number))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      });
    if (password !== undefined || body.isActive === false) {
      await db.delete(sessions).where(eq(sessions.userId, id as number));
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Cập nhật tài khoản thất bại:", error);
    return NextResponse.json({ error: "Không thể cập nhật tài khoản." }, { status: 500 });
  }
}
