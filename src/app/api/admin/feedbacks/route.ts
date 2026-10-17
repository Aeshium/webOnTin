import { and, desc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền quản lý phản hồi." }, { status: 403 });
  }
  const rows = await db
    .select({
      id: feedbacks.id,
      type: feedbacks.type,
      content: feedbacks.content,
      imageDataUrl: feedbacks.imageDataUrl,
      status: feedbacks.status,
      createdAt: feedbacks.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(feedbacks)
    .leftJoin(users, eq(feedbacks.userId, users.id))
    .orderBy(desc(feedbacks.createdAt));
  return NextResponse.json(rows);
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền quản lý phản hồi." }, { status: 403 });
  }

  let body: { id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
  }
  if (
    typeof body?.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id) ||
    (body.status !== "pending" && body.status !== "resolved")
  ) {
    return NextResponse.json({ error: "ID hoặc trạng thái phản hồi không hợp lệ." }, { status: 400 });
  }

  const [updated] = await db
    .update(feedbacks)
    .set({ status: body.status })
    .where(and(eq(feedbacks.id, body.id), eq(feedbacks.status, body.status === "resolved" ? "pending" : "resolved")))
    .returning({ id: feedbacks.id, status: feedbacks.status });
  if (!updated) {
    return NextResponse.json({ error: "Không tìm thấy phản hồi hoặc trạng thái đã được cập nhật." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền xóa phản hồi." }, { status: 403 });
  }
  let body: { ids?: unknown; allResolved?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu xóa không hợp lệ." }, { status: 400 });
  }
  if (
    body?.allResolved !== true &&
    (!Array.isArray(body?.ids) || body.ids.length < 1 || body.ids.length > 200 ||
      !body.ids.every((id) => typeof id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))
  ) {
    return NextResponse.json({ error: "Chọn ít nhất một phản hồi hợp lệ để xóa." }, { status: 400 });
  }

  const requestedIds = body.allResolved === true ? null : body.ids as string[];
  const deletedIds = await db.transaction(async (tx) => {
    const resolvedRows = await tx
      .select({ id: feedbacks.id })
      .from(feedbacks)
      .where(requestedIds
        ? and(eq(feedbacks.status, "resolved"), inArray(feedbacks.id, requestedIds))
        : eq(feedbacks.status, "resolved"))
      .for("update");
    if (resolvedRows.length === 0) return [];
    const deleted = await tx
      .delete(feedbacks)
      .where(and(
        eq(feedbacks.status, "resolved"),
        inArray(feedbacks.id, resolvedRows.map((row) => row.id))
      ))
      .returning({ id: feedbacks.id });
    return deleted.map((row) => row.id);
  });
  return NextResponse.json({ deletedCount: deletedIds.length, deletedIds });
}
