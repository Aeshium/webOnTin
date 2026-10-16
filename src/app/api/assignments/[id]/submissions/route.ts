import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assignments, assignmentSubmissions, courseEnrollments, courses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Chỉ học sinh mới có thể nộp bài tập." }, { status: 403 });
  }
  const assignmentId = Number((await params).id);
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
    return NextResponse.json({ error: "Bài tập không hợp lệ." }, { status: 400 });
  }
  let body: { content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung bài nộp không hợp lệ." }, { status: 400 });
  }
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (content.length < 1 || content.length > 20_000) {
    return NextResponse.json({ error: "Nội dung bài nộp cần từ 1 đến 20.000 ký tự." }, { status: 400 });
  }
  const [assignment] = await db.select({ id: assignments.id })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .innerJoin(courseEnrollments, and(
      eq(courseEnrollments.courseId, courses.id),
      eq(courseEnrollments.userId, user.id)
    ))
    .where(eq(assignments.id, assignmentId))
    .limit(1);
  if (!assignment) return NextResponse.json({ error: "Không tìm thấy bài tập." }, { status: 404 });
  const [submission] = await db.insert(assignmentSubmissions)
    .values({ assignmentId, userId: user.id, content })
    .onConflictDoUpdate({
      target: [assignmentSubmissions.assignmentId, assignmentSubmissions.userId],
      set: { content, score: null, feedback: null, gradedAt: null, submittedAt: new Date() },
    })
    .returning({ id: assignmentSubmissions.id, submittedAt: assignmentSubmissions.submittedAt });
  return NextResponse.json(submission, { status: 201 });
}
