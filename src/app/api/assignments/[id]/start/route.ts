import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assignmentQuestions, assignmentSubmissions, assignments, courseEnrollments, courses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { gradeAssignment, isValidAssignmentAnswer, type AssignmentAnswer } from "@/lib/assignment-questions";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return NextResponse.json({ error: "Chỉ học sinh mới có thể bắt đầu bài thi." }, { status: 403 });
  const assignmentId = Number((await params).id);
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) return NextResponse.json({ error: "Bài thi không hợp lệ." }, { status: 400 });

  const [assignment] = await db
    .select({ id: assignments.id, dueAt: assignments.dueAt, durationSec: assignments.durationSec })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .innerJoin(courseEnrollments, and(eq(courseEnrollments.courseId, courses.id), eq(courseEnrollments.userId, user.id)))
    .where(eq(assignments.id, assignmentId))
    .limit(1);
  if (!assignment) return NextResponse.json({ error: "Không tìm thấy bài thi hoặc bạn chưa tham gia khóa học." }, { status: 404 });
  const [question] = await db.select({ id: assignmentQuestions.id }).from(assignmentQuestions)
    .where(eq(assignmentQuestions.assignmentId, assignmentId)).limit(1);
  if (!question) return NextResponse.json({ error: "Bài thi chưa có câu hỏi." }, { status: 409 });

  const result = await db.transaction(async (tx) => {
    const [active] = await tx.select({
      id: assignmentSubmissions.id,
      startedAt: assignmentSubmissions.startedAt,
      selectedAnswers: assignmentSubmissions.selectedAnswers,
    })
      .from(assignmentSubmissions)
      .where(and(
        eq(assignmentSubmissions.assignmentId, assignmentId),
        eq(assignmentSubmissions.userId, user.id),
        isNull(assignmentSubmissions.submittedAt)
      ))
      .orderBy(desc(assignmentSubmissions.startedAt))
      .limit(1)
      .for("update");
    if (active?.startedAt) {
      const expiresAt = Math.min(
        active.startedAt.getTime() + assignment.durationSec * 1000,
        assignment.dueAt?.getTime() ?? Number.POSITIVE_INFINITY
      );
      if (Date.now() > expiresAt + 15_000) {
        const questions = await tx.select({
          questionType: assignmentQuestions.questionType,
          options: assignmentQuestions.options,
          correctIndex: assignmentQuestions.correctIndex,
          correctAnswers: assignmentQuestions.correctAnswers,
          acceptedAnswers: assignmentQuestions.acceptedAnswers,
        })
          .from(assignmentQuestions)
          .where(eq(assignmentQuestions.assignmentId, assignmentId))
          .orderBy(asc(assignmentQuestions.sortOrder));
        const answers = active.selectedAnswers ?? [];
        const grading = gradeAssignment(questions, answers);
        const submittedAt = new Date();
        await tx.update(assignmentSubmissions)
          .set({
            score: grading.score,
            content: JSON.stringify(answers),
            submittedAt,
            gradedAt: submittedAt,
          })
          .where(and(eq(assignmentSubmissions.id, active.id), isNull(assignmentSubmissions.submittedAt)));
      }
      return active;
    }
    if (assignment.dueAt && assignment.dueAt <= new Date()) return { error: "Bài tập đã quá hạn." as const };
    const [created] = await tx.insert(assignmentSubmissions).values({
      assignmentId,
      userId: user.id,
      content: "",
      startedAt: new Date(),
      selectedAnswers: null,
      submittedAt: null,
    }).returning({
      id: assignmentSubmissions.id,
      startedAt: assignmentSubmissions.startedAt,
    });
    return created;
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ...result, startedAt: result.startedAt?.toISOString() ?? null });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return NextResponse.json({ error: "Chỉ học sinh mới có thể lưu tiến trình." }, { status: 403 });
  const assignmentId = Number((await params).id);
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) return NextResponse.json({ error: "Bài tập không hợp lệ." }, { status: 400 });
  let body: { sessionId?: unknown; questionIds?: unknown; answers?: unknown; currentIndex?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu tiến trình không hợp lệ." }, { status: 400 });
  }
  if (
    !Number.isInteger(body.sessionId) ||
    (body.sessionId as number) <= 0 ||
    !Array.isArray(body.questionIds) ||
    !body.questionIds.every((id) => Number.isInteger(id) && id > 0) ||
    !Array.isArray(body.answers) ||
    !Number.isInteger(body.currentIndex) ||
    (body.currentIndex as number) < 0
  ) return NextResponse.json({ error: "Tiến trình làm bài không hợp lệ." }, { status: 400 });

  const [assignment] = await db.select({
    id: assignments.id,
    dueAt: assignments.dueAt,
    durationSec: assignments.durationSec,
  })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .innerJoin(courseEnrollments, and(eq(courseEnrollments.courseId, courses.id), eq(courseEnrollments.userId, user.id)))
    .where(eq(assignments.id, assignmentId))
    .limit(1);
  if (!assignment) return NextResponse.json({ error: "Không tìm thấy bài tập hoặc bạn chưa tham gia khóa học." }, { status: 404 });
  const questions = await db.select({
    id: assignmentQuestions.id,
    questionType: assignmentQuestions.questionType,
    options: assignmentQuestions.options,
    correctIndex: assignmentQuestions.correctIndex,
    correctAnswers: assignmentQuestions.correctAnswers,
    acceptedAnswers: assignmentQuestions.acceptedAnswers,
  })
    .from(assignmentQuestions)
    .where(eq(assignmentQuestions.assignmentId, assignmentId))
    .orderBy(asc(assignmentQuestions.sortOrder));
  const questionIds = body.questionIds as number[];
  const answers = body.answers as AssignmentAnswer[];
  if (
    questions.length === 0 ||
    questions.length !== questionIds.length ||
    answers.length !== questions.length ||
    (body.currentIndex as number) >= questions.length ||
    questions.some((question, index) =>
      question.id !== questionIds[index] || !isValidAssignmentAnswer(question, answers[index])
    )
  ) return NextResponse.json({ error: "Danh sách câu hỏi đã thay đổi. Tải lại bài thi rồi thử lại." }, { status: 409 });

  const saved = await db.transaction(async (tx) => {
    const [session] = await tx.select({
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
    const expiresAt = Math.min(
      session.startedAt.getTime() + assignment.durationSec * 1000,
      assignment.dueAt?.getTime() ?? Number.POSITIVE_INFINITY
    );
    if (Date.now() > expiresAt + 15_000) return { error: "Đã hết thời gian làm bài." as const };
    const [updated] = await tx.update(assignmentSubmissions)
      .set({ selectedAnswers: answers, currentIndex: body.currentIndex as number })
      .where(and(eq(assignmentSubmissions.id, session.id), isNull(assignmentSubmissions.submittedAt)))
      .returning({ id: assignmentSubmissions.id });
    return { id: updated?.id };
  });
  if ("error" in saved) return NextResponse.json({ error: saved.error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
