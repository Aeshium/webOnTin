import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  assignments,
  assignmentSubmissions,
  courseEnrollments,
  courses,
  lessons,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function authorizedUser() {
  const user = await getCurrentUser();
  return user?.role === "teacher" || user?.role === "admin" ? user : null;
}

async function ownsCourse(user: NonNullable<Awaited<ReturnType<typeof authorizedUser>>>, courseId: number) {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(
      eq(courses.id, courseId),
      ...(user.role === "admin" ? [] : [eq(courses.teacherId, user.id)])
    ))
    .limit(1);
  return course !== undefined;
}

export async function GET() {
  const user = await authorizedUser();
  if (!user) return NextResponse.json({ error: "Chỉ giáo viên mới được quản lý khóa học." }, { status: 403 });

  const owned = await db
    .select()
    .from(courses)
    .where(user.role === "admin" ? undefined : eq(courses.teacherId, user.id))
    .orderBy(desc(courses.createdAt));
  const details = await Promise.all(owned.map(async (course) => {
    const [courseLessons, courseAssignments, enrolledStudents, [studentCount], [assignmentCount], [submissionCount]] = await Promise.all([
      db.select().from(lessons).where(eq(lessons.courseId, course.id)).orderBy(lessons.sortOrder),
      db.select().from(assignments).where(eq(assignments.courseId, course.id)).orderBy(desc(assignments.createdAt)),
      db.select({
        id: courseEnrollments.id,
        name: users.name,
        email: users.email,
      })
        .from(courseEnrollments)
        .innerJoin(users, eq(courseEnrollments.userId, users.id))
        .where(eq(courseEnrollments.courseId, course.id))
        .orderBy(users.name),
      db.select({ count: sql<number>`count(*)::int` })
        .from(courseEnrollments)
        .where(eq(courseEnrollments.courseId, course.id)),
      db.select({ count: sql<number>`count(*)::int` })
        .from(assignments)
        .where(eq(assignments.courseId, course.id)),
      db.select({ count: sql<number>`count(*)::int` })
        .from(assignmentSubmissions)
        .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
        .innerJoin(courseEnrollments, and(
          eq(courseEnrollments.courseId, assignments.courseId),
          eq(courseEnrollments.userId, assignmentSubmissions.userId)
        ))
        .where(eq(assignments.courseId, course.id)),
    ]);
    const expectedSubmissions = (studentCount?.count ?? 0) * (assignmentCount?.count ?? 0);
    return {
      ...course,
      lessons: courseLessons,
      assignments: courseAssignments,
      enrolledStudents,
      enrolledCount: studentCount?.count ?? 0,
      completionPercent: expectedSubmissions === 0
        ? 0
        : Math.round(((submissionCount?.count ?? 0) / expectedSubmissions) * 100),
    };
  }));
  return NextResponse.json(details);
}

export async function POST(request: NextRequest) {
  const user = await authorizedUser();
  if (!user) return NextResponse.json({ error: "Chỉ giáo viên mới được quản lý khóa học." }, { status: 403 });

  let body: {
    kind?: unknown;
    courseId?: unknown;
    email?: unknown;
    title?: unknown;
    description?: unknown;
    content?: unknown;
    dueAt?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu khóa học không hợp lệ." }, { status: 400 });
  }
  if (body?.kind === "enrollment") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!Number.isInteger(body.courseId) || (body.courseId as number) <= 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Hãy nhập email học sinh hợp lệ và khóa học." }, { status: 400 });
    }
    const courseId = body.courseId as number;
    if (!(await ownsCourse(user, courseId))) {
      return NextResponse.json({ error: "Không tìm thấy khóa học của bạn." }, { status: 404 });
    }
    const [student] = await db.select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.email, email), eq(users.role, "student"), eq(users.isActive, true)))
      .limit(1);
    if (!student) return NextResponse.json({ error: "Không tìm thấy học sinh đang hoạt động với email này." }, { status: 404 });
    const [enrollment] = await db.insert(courseEnrollments)
      .values({ courseId, userId: student.id })
      .onConflictDoNothing()
      .returning({ id: courseEnrollments.id });
    if (!enrollment) return NextResponse.json({ error: "Học sinh này đã tham gia khóa học." }, { status: 409 });
    return NextResponse.json({ ...enrollment, ...student }, { status: 201 });
  }
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (title.length < 2 || title.length > 160 || description.length > 5000) {
    return NextResponse.json({ error: "Tiêu đề cần 2–160 ký tự, mô tả tối đa 5.000 ký tự." }, { status: 400 });
  }

  if (body.kind === "course") {
    const [created] = await db.insert(courses).values({
      teacherId: user.id,
      title,
      description,
    }).returning();
    return NextResponse.json(created, { status: 201 });
  }
  if (!Number.isInteger(body.courseId) || (body.courseId as number) <= 0 || !(await ownsCourse(user, body.courseId as number))) {
    return NextResponse.json({ error: "Không tìm thấy khóa học của bạn." }, { status: 404 });
  }
  const courseId = body.courseId as number;
  if (body.kind === "lesson") {
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (content.length < 1 || content.length > 20_000) {
      return NextResponse.json({ error: "Nội dung bài học cần từ 1 đến 20.000 ký tự." }, { status: 400 });
    }
    const [created] = await db.insert(lessons).values({ courseId, title, content }).returning();
    return NextResponse.json(created, { status: 201 });
  }
  if (body.kind === "assignment") {
    let dueAt: Date | null = null;
    if (body.dueAt !== undefined && body.dueAt !== null && body.dueAt !== "") {
      if (typeof body.dueAt !== "string" || Number.isNaN(Date.parse(body.dueAt))) {
        return NextResponse.json({ error: "Hạn nộp không hợp lệ." }, { status: 400 });
      }
      dueAt = new Date(body.dueAt);
    }
    const [created] = await db.insert(assignments).values({ courseId, title, description, dueAt }).returning();
    return NextResponse.json(created, { status: 201 });
  }
  return NextResponse.json({ error: "Loại nội dung không hợp lệ." }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const user = await authorizedUser();
  if (!user) return NextResponse.json({ error: "Chỉ giáo viên mới được quản lý khóa học." }, { status: 403 });
  let body: { kind?: unknown; id?: unknown; title?: unknown; description?: unknown; content?: unknown; dueAt?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
  }
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (!Number.isInteger(body?.id) || (body.id as number) <= 0 || title.length < 2 || title.length > 160 || description.length > 5000) {
    return NextResponse.json({ error: "Thông tin nội dung không hợp lệ." }, { status: 400 });
  }
  const id = body.id as number;
  if (body.kind === "course") {
    const [updated] = await db.update(courses)
      .set({ title, description })
      .where(and(eq(courses.id, id), ...(user.role === "admin" ? [] : [eq(courses.teacherId, user.id)])))
      .returning();
    return updated ? NextResponse.json(updated) : NextResponse.json({ error: "Không tìm thấy khóa học." }, { status: 404 });
  }
  const table = body.kind === "lesson" ? lessons : body.kind === "assignment" ? assignments : null;
  if (!table) return NextResponse.json({ error: "Loại nội dung không hợp lệ." }, { status: 400 });
  const [record] = await db.select({ courseId: table.courseId }).from(table).where(eq(table.id, id)).limit(1);
  if (!record || !(await ownsCourse(user, record.courseId))) {
    return NextResponse.json({ error: "Không tìm thấy nội dung trong khóa học của bạn." }, { status: 404 });
  }
  if (body.kind === "lesson") {
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content || content.length > 20_000) return NextResponse.json({ error: "Nội dung bài học không hợp lệ." }, { status: 400 });
    const [updated] = await db.update(lessons).set({ title, content }).where(eq(lessons.id, id)).returning();
    return NextResponse.json(updated);
  }
  const dueAt = body.dueAt === null || body.dueAt === "" || body.dueAt === undefined ? null :
    typeof body.dueAt === "string" && !Number.isNaN(Date.parse(body.dueAt)) ? new Date(body.dueAt) : undefined;
  if (dueAt === undefined) return NextResponse.json({ error: "Hạn nộp không hợp lệ." }, { status: 400 });
  const [updated] = await db.update(assignments).set({ title, description, dueAt }).where(eq(assignments.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const user = await authorizedUser();
  if (!user) return NextResponse.json({ error: "Chỉ giáo viên mới được quản lý khóa học." }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "ID nội dung không hợp lệ." }, { status: 400 });

  if (kind === "course") {
    const [deleted] = await db.delete(courses)
      .where(and(eq(courses.id, id), ...(user.role === "admin" ? [] : [eq(courses.teacherId, user.id)])))
      .returning({ id: courses.id });
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Không tìm thấy khóa học." }, { status: 404 });
  }
  if (kind === "enrollment") {
    const [record] = await db.select({ courseId: courseEnrollments.courseId })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(and(
        eq(courseEnrollments.id, id),
        ...(user.role === "admin" ? [] : [eq(courses.teacherId, user.id)])
      ))
      .limit(1);
    if (!record) return NextResponse.json({ error: "Không tìm thấy học sinh trong khóa học của bạn." }, { status: 404 });
    await db.delete(courseEnrollments).where(eq(courseEnrollments.id, id));
    return NextResponse.json({ ok: true });
  }
  if (kind === "lesson" || kind === "assignment") {
    const table = kind === "lesson" ? lessons : assignments;
    const [record] = await db.select({ courseId: table.courseId }).from(table).where(eq(table.id, id)).limit(1);
    if (!record || !(await ownsCourse(user, record.courseId))) {
      return NextResponse.json({ error: "Không tìm thấy nội dung trong khóa học của bạn." }, { status: 404 });
    }
    await db.delete(table).where(eq(table.id, id));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Loại nội dung không hợp lệ." }, { status: 400 });
}
