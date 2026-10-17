import { and, asc, eq, isNull } from "drizzle-orm";
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Chỉ học sinh mới có thể nộp bài tập." }, { status: 403 });
  }
  const assignmentId = Number((await params).id);
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
    return NextResponse.json({ error: "Bài tập không hợp lệ." }, { status: 400 });
  }
  let body: { sessionId?: unknown; questionIds?: unknown; answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu bài nộp không hợp lệ." }, { status: 400 });
  }
  if (
    !Number.isInteger(body?.sessionId) ||
    (body.sessionId as number) <= 0 ||
    !Array.isArray(body.questionIds) ||
    !body.questionIds.every((id) => Number.isInteger(id) && (id as number) > 0) ||
    !Array.isArray(body.answers) ||
    !body.answers.every((answer) => answer === null || (Number.isInteger(answer) && answer >= 0 && answer <= 3))
  ) {
    return NextResponse.json({ error: "Danh sách câu trả lời không hợp lệ." }, { status: 400 });
  }
  const [assignment] = await db
    .select({
      id: assignments.id,
      dueAt: assignments.dueAt,
      durationSec: assignments.durationSec,
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
  const questions = await db
    .select({
      id: assignmentQuestions.id,
      correctIndex: assignmentQuestions.correctIndex,
      explanation: assignmentQuestions.explanation,
    })
    .from(assignmentQuestions)
    .where(eq(assignmentQuestions.assignmentId, assignmentId))
    .orderBy(asc(assignmentQuestions.sortOrder));
  const suppliedIds = body.questionIds as number[];
  const answers = body.answers as (number | null)[];
  if (
    questions.length === 0 ||
    suppliedIds.length !== questions.length ||
    answers.length !== questions.length ||
    suppliedIds.some((id, index) => id !== questions[index].id)
  ) {
    return NextResponse.json({ error: "Danh sách câu hỏi đã thay đổi. Tải lại bài thi rồi thử lại." }, { status: 409 });
  }

  const submittedAt = new Date();
  const result = await db.transaction(async (tx) => {
    const [session] = await tx
      .select({
        id: assignmentSubmissions.id,
        startedAt: assignmentSubmissions.startedAt,
      })
      .from(assignmentSubmissions)
      .where(and(
        eq(assignmentSubmissions.id, body.sessionId as number),
        eq(assignmentSubmissions.assignmentId, assignmentId),
        eq(assignmentSubmissions.userId, user.id),
        isNull(assignmentSubmissions.submittedAt)
      ))
      .for("update");
    if (!session?.startedAt) return { error: "Không tìm thấy phiên làm bài đang mở." as const };

    const timeLimit = session.startedAt.getTime() + assignment.durationSec * 1000;
    const deadline = assignment.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const expiresAt = Math.min(timeLimit, deadline);
    if (submittedAt.getTime() > expiresAt + 15_000) {
      return { error: "Đã hết thời gian hoặc bài tập quá hạn." as const };
    }
    const correctCount = questions.reduce(
      (count, question, index) => count + (answers[index] === question.correctIndex ? 1 : 0),
      0
    );
    const score = Math.round((correctCount / questions.length) * 100);
    const [submission] = await tx
      .update(assignmentSubmissions)
      .set({
        selectedAnswers: answers,
        content: JSON.stringify(answers),
        score,
        submittedAt,
        gradedAt: submittedAt,
      })
      .where(and(
        eq(assignmentSubmissions.id, session.id),
        isNull(assignmentSubmissions.submittedAt)
      ))
      .returning({
        id: assignmentSubmissions.id,
        score: assignmentSubmissions.score,
        submittedAt: assignmentSubmissions.submittedAt,
      });
    return { submission, correctCount, totalQuestions: questions.length };
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({
    ...result.submission,
    submittedAt: result.submission?.submittedAt?.toISOString() ?? null,
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
  }, { status: 201 });
}
