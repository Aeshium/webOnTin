import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assignmentQuestions, assignmentSubmissions, assignments, courses, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { gradeAssignmentAnswer, type AssignmentAnswer } from "@/lib/assignment-questions";

export const dynamic = "force-dynamic";

async function getTeacher() {
  const user = await getCurrentUser();
  return user?.role === "teacher" || user?.role === "admin" ? user : null;
}

export async function GET() {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: "Không có quyền xem bài nộp." }, { status: 403 });
  const rows = await db
    .select({
      id: assignmentSubmissions.id,
      assignmentId: assignments.id,
      assignmentTitle: assignments.title,
      courseId: courses.id,
      courseTitle: courses.title,
      studentName: users.name,
      studentEmail: users.email,
      content: assignmentSubmissions.content,
      selectedAnswers: assignmentSubmissions.selectedAnswers,
      score: assignmentSubmissions.score,
      feedback: assignmentSubmissions.feedback,
      submittedAt: assignmentSubmissions.submittedAt,
      startedAt: assignmentSubmissions.startedAt,
      gradedAt: assignmentSubmissions.gradedAt,
    })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .innerJoin(users, eq(assignmentSubmissions.userId, users.id))
    .where(and(
      isNotNull(assignmentSubmissions.submittedAt),
      ...(teacher.role === "admin" ? [] : [eq(courses.teacherId, teacher.id)])
    ))
    .orderBy(desc(assignmentSubmissions.submittedAt));
  const assignmentIds = [...new Set(rows.map((row) => row.assignmentId))];
  const questions = assignmentIds.length
    ? await db.select({
        assignmentId: assignmentQuestions.assignmentId,
        id: assignmentQuestions.id,
        content: assignmentQuestions.content,
        options: assignmentQuestions.options,
        questionType: assignmentQuestions.questionType,
        difficulty: assignmentQuestions.difficulty,
        correctIndex: assignmentQuestions.correctIndex,
        correctAnswers: assignmentQuestions.correctAnswers,
        acceptedAnswers: assignmentQuestions.acceptedAnswers,
        explanation: assignmentQuestions.explanation,
        sortOrder: assignmentQuestions.sortOrder,
      })
      .from(assignmentQuestions)
      .where(inArray(assignmentQuestions.assignmentId, assignmentIds))
      .orderBy(assignmentQuestions.sortOrder)
    : [];
  const questionsByAssignment = new Map<number, typeof questions>();
  for (const question of questions) {
    const list = questionsByAssignment.get(question.assignmentId) ?? [];
    list.push(question);
    questionsByAssignment.set(question.assignmentId, list);
  }
  return NextResponse.json(rows.map((row) => ({
    ...row,
    reviewQuestions: (questionsByAssignment.get(row.assignmentId) ?? []).map((question, index) => ({
      ...question,
      selectedAnswer: row.selectedAnswers?.[index] ?? null,
      ...gradeAssignmentAnswer(question, row.selectedAnswers?.[index] ?? null as AssignmentAnswer),
    })),
  })));
}

export async function PATCH(request: NextRequest) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: "Không có quyền chấm bài." }, { status: 403 });
  let body: { id?: unknown; score?: unknown; feedback?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu chấm bài không hợp lệ." }, { status: 400 });
  }
  if (
    !Number.isInteger(body?.id) ||
    (body.id as number) <= 0 ||
    !Number.isInteger(body.score) ||
    (body.score as number) < 0 ||
    (body.score as number) > 100 ||
    typeof body.feedback !== "string" ||
    body.feedback.length > 2000
  ) {
    return NextResponse.json({ error: "Điểm phải từ 0–100 và nhận xét tối đa 2.000 ký tự." }, { status: 400 });
  }
  const [ownedSubmission] = await db
    .select({ id: assignmentSubmissions.id })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(and(
      eq(assignmentSubmissions.id, body.id as number),
      isNotNull(assignmentSubmissions.submittedAt),
      ...(teacher.role === "admin" ? [] : [eq(courses.teacherId, teacher.id)])
    ))
    .limit(1);
  if (!ownedSubmission) return NextResponse.json({ error: "Không tìm thấy bài nộp trong khóa học của bạn." }, { status: 404 });
  const [updated] = await db
    .update(assignmentSubmissions)
    .set({ score: body.score as number, feedback: body.feedback, gradedAt: new Date() })
    .where(eq(assignmentSubmissions.id, body.id as number))
    .returning({ id: assignmentSubmissions.id, score: assignmentSubmissions.score, feedback: assignmentSubmissions.feedback });
  return NextResponse.json(updated);
}
