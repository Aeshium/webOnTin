import { and, asc, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  assignmentQuestions,
  assignmentSubmissions,
  assignments,
  courseEnrollments,
  courses,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return NextResponse.json({ error: "Học sinh cần đăng nhập để xem bài tập." }, { status: 403 });
  const assignmentId = Number((await params).id);
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) return NextResponse.json({ error: "Bài thi không hợp lệ." }, { status: 400 });
  const [assignment] = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      dueAt: assignments.dueAt,
      durationSec: assignments.durationSec,
      courseId: courses.id,
      courseTitle: courses.title,
    })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .innerJoin(courseEnrollments, and(
      eq(courseEnrollments.courseId, courses.id),
      eq(courseEnrollments.userId, user.id)
    ))
    .where(eq(assignments.id, assignmentId))
    .limit(1);
  if (!assignment) return NextResponse.json({ error: "Không tìm thấy bài thi hoặc bạn chưa tham gia khóa học." }, { status: 404 });
  const [items, [latestSubmission]] = await Promise.all([
    db.select({
      id: assignmentQuestions.id,
      content: assignmentQuestions.content,
      options: assignmentQuestions.options,
      order: assignmentQuestions.sortOrder,
      correctIndex: assignmentQuestions.correctIndex,
      explanation: assignmentQuestions.explanation,
    })
      .from(assignmentQuestions)
      .where(eq(assignmentQuestions.assignmentId, assignmentId))
      .orderBy(asc(assignmentQuestions.sortOrder)),
    db.select({
      id: assignmentSubmissions.id,
      score: assignmentSubmissions.score,
      startedAt: assignmentSubmissions.startedAt,
      currentIndex: assignmentSubmissions.currentIndex,
      submittedAt: assignmentSubmissions.submittedAt,
      selectedAnswers: assignmentSubmissions.selectedAnswers,
      feedback: assignmentSubmissions.feedback,
    })
      .from(assignmentSubmissions)
      .where(and(
        eq(assignmentSubmissions.assignmentId, assignmentId),
        eq(assignmentSubmissions.userId, user.id)
      ))
      .orderBy(desc(assignmentSubmissions.startedAt))
      .limit(1),
  ]);
  return NextResponse.json({
    ...assignment,
    dueAt: assignment.dueAt?.toISOString() ?? null,
    questions: latestSubmission?.submittedAt
      ? items
      : items.map(({ correctIndex: _correctIndex, explanation: _explanation, ...item }) => item),
    latestSubmission: latestSubmission ? {
      ...latestSubmission,
      startedAt: latestSubmission.startedAt?.toISOString() ?? null,
      submittedAt: latestSubmission.submittedAt?.toISOString() ?? null,
    } : null,
  });
}
