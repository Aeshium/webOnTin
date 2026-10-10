import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const BACKGROUNDS = new Set([
  "aurora",
  "ocean",
  "sunset",
  "forest",
  "rose",
  "lavender",
  "midnight",
]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  let body: {
    name?: unknown;
    schoolName?: unknown;
    className?: unknown;
    background?: unknown;
    examDate?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const schoolName = typeof body.schoolName === "string" ? body.schoolName.trim() : "";
  const className = typeof body.className === "string" ? body.className.trim() : "";
  const background = typeof body.background === "string" ? body.background : "";
  const examDateValue = body.examDate;
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Tên cần có từ 2 đến 80 ký tự." }, { status: 400 });
  }
  if (schoolName.length > 120 || className.length > 80) {
    return NextResponse.json({ error: "Tên trường tối đa 120 ký tự, tên lớp tối đa 80 ký tự." }, { status: 400 });
  }
  if (!BACKGROUNDS.has(background)) {
    return NextResponse.json({ error: "Mẫu hình nền không hợp lệ." }, { status: 400 });
  }
  let examDate: Date | null = null;
  if (examDateValue !== null && examDateValue !== "") {
    if (typeof examDateValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(examDateValue)) {
      return NextResponse.json({ error: "Ngày thi không hợp lệ." }, { status: 400 });
    }
    examDate = new Date(`${examDateValue}T00:00:00.000Z`);
    if (Number.isNaN(examDate.getTime()) || examDate.toISOString().slice(0, 10) !== examDateValue) {
      return NextResponse.json({ error: "Ngày thi không hợp lệ." }, { status: 400 });
    }
    if (examDate.getTime() < new Date().setUTCHours(0, 0, 0, 0)) {
      return NextResponse.json({ error: "Ngày thi cần là hôm nay hoặc một ngày trong tương lai." }, { status: 400 });
    }
  }

  const dateChanged = user.examDate?.toISOString().slice(0, 10) !== (examDate?.toISOString().slice(0, 10) ?? null);
  await db.transaction(async (tx) => {
    await tx.update(users).set({
      name,
      schoolName: schoolName || null,
      className: className || null,
      background,
      examDate,
    }).where(eq(users.id, user.id));
    if (dateChanged && examDate) {
      await tx.insert(notifications).values({
        userId: user.id,
        title: "Đã lưu ngày thi",
        message: `Ngày thi của bạn đã được cập nhật: ${examDate.toISOString().slice(0, 10)}.`,
      });
    }
  });
  return NextResponse.json({ ok: true });
}
