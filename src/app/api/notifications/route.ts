import { and, desc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const stored = await db
    .select({
      id: notifications.id,
      title: notifications.title,
      message: notifications.message,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(20);

  const inactiveDays = Math.floor(
    (Date.now() - user.lastLoginAt.getTime()) / (24 * 60 * 60 * 1000)
  );
  const reminders = [];
  if (inactiveDays >= 1) {
    const tone =
      inactiveDays >= 7
        ? "Đã hơn một tuần kể từ lần ôn gần nhất. Hãy quay lại với một phiên ngắn khi bạn sẵn sàng."
        : inactiveDays >= 3
          ? `Đã ${inactiveDays} ngày bạn chưa đăng nhập. Một bài ôn ngắn sẽ giúp bạn giữ nhịp.`
          : "Đã hơn một ngày bạn chưa đăng nhập. Thử dành ít phút ôn lại kiến thức nhé.";
    reminders.push({
      id: null,
      title: "Nhắc nhở ôn tập",
      message: tone,
      readAt: null,
      createdAt: user.lastLoginAt.toISOString(),
      kind: "reminder",
    });
  }
  if (user.examDate) {
    const daysLeft = Math.ceil(
      (Date.UTC(user.examDate.getUTCFullYear(), user.examDate.getUTCMonth(), user.examDate.getUTCDate()) -
        Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) /
        (24 * 60 * 60 * 1000)
    );
    if (daysLeft >= 0) {
      reminders.push({
        id: null,
        title: daysLeft === 0 ? "Hôm nay là ngày thi" : `Còn ${daysLeft} ngày đến kỳ thi`,
        message: daysLeft === 0 ? "Chúc bạn bình tĩnh và làm bài thật tốt." : "Bạn có thể xem lại tiến trình và chọn chuyên đề cần ôn.",
        readAt: null,
        createdAt: new Date().toISOString(),
        kind: "exam",
      });
    }
  }

  return NextResponse.json({
    notifications: [...reminders, ...stored],
    unreadCount: reminders.length + stored.filter((item) => !item.readAt).length,
    daysUntilExam: user.examDate
      ? Math.max(
          0,
          Math.ceil(
            (Date.UTC(user.examDate.getUTCFullYear(), user.examDate.getUTCMonth(), user.examDate.getUTCDate()) -
              Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) /
              (24 * 60 * 60 * 1000)
          )
        )
      : null,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Thông tin gửi lên không hợp lệ." }, { status: 400 });
  }
  if (typeof body.id !== "number" || !Number.isInteger(body.id) || body.id <= 0) {
    return NextResponse.json({ error: "Thông báo không hợp lệ." }, { status: 400 });
  }
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, body.id),
        eq(notifications.userId, user.id),
        isNull(notifications.readAt)
      )
    );
  return NextResponse.json({ ok: true });
}
