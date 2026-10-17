import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { assignmentQuestions, assignments, assignmentSubmissions, courseEnrollments, courses, questions, topics } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { gradeAssignmentAnswer } from "@/lib/assignment-questions";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return NextResponse.json({ error: "Học sinh cần đăng nhập để xem bài tập." }, { status: 401 });
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      dueAt: assignments.dueAt,
      durationSec: assignments.durationSec,
      category: assignments.category,
      solutionDisplay: assignments.solutionDisplay,
      courseTitle: courses.title,
      courseId: courses.id,
    })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .innerJoin(courseEnrollments, and(
      eq(courseEnrollments.courseId, courses.id),
      eq(courseEnrollments.userId, user.id)
    ))
    .orderBy(desc(assignments.createdAt));
  const questionRows = rows.length
    ? await db.select({
        assignmentId: assignmentQuestions.assignmentId,
        questionType: assignmentQuestions.questionType,
        difficulty: assignmentQuestions.difficulty,
        topicId: questions.topicId,
        topicName: topics.name,
        options: assignmentQuestions.options,
        correctIndex: assignmentQuestions.correctIndex,
        correctAnswers: assignmentQuestions.correctAnswers,
        acceptedAnswers: assignmentQuestions.acceptedAnswers,
      })
      .from(assignmentQuestions)
      .leftJoin(questions, eq(assignmentQuestions.sourceQuestionId, questions.id))
      .leftJoin(topics, eq(questions.topicId, topics.id))
      .where(inArray(assignmentQuestions.assignmentId, rows.map((row) => row.id)))
    : [];
  const metadataByAssignment = new Map<number, {
    questionTypes: Set<string>;
    difficulties: Set<string>;
    topics: Set<string>;
    questions: typeof questionRows;
  }>();
  for (const question of questionRows) {
    const metadata = metadataByAssignment.get(question.assignmentId) ?? {
      questionTypes: new Set<string>(),
      difficulties: new Set<string>(),
      topics: new Set<string>(),
      questions: [],
    };
    metadata.questionTypes.add(question.questionType);
    metadata.difficulties.add(question.difficulty);
    if (question.topicName) metadata.topics.add(question.topicName);
    metadata.questions.push(question);
    metadataByAssignment.set(question.assignmentId, metadata);
  }
  const results = await Promise.all(rows.map(async (assignment) => {
    const resultHistory = await db
      .select({
        id: assignmentSubmissions.id,
        startedAt: assignmentSubmissions.startedAt,
        submittedAt: assignmentSubmissions.submittedAt,
        score: assignmentSubmissions.score,
        feedback: assignmentSubmissions.feedback,
        selectedAnswers: assignmentSubmissions.selectedAnswers,
      })
      .from(assignmentSubmissions)
      .where(and(
        eq(assignmentSubmissions.assignmentId, assignment.id),
        eq(assignmentSubmissions.userId, user.id)
      ))
      .orderBy(desc(assignmentSubmissions.startedAt))
      .limit(50);
    const latestSubmission = resultHistory[0];
    const latestSubmitted = resultHistory.find((submission) => submission.submittedAt);
    const due = assignment.dueAt && assignment.dueAt <= new Date();
    return {
      ...assignment,
      questionTypes: [...(metadataByAssignment.get(assignment.id)?.questionTypes ?? [])],
      difficulties: [...(metadataByAssignment.get(assignment.id)?.difficulties ?? [])],
      topics: [...(metadataByAssignment.get(assignment.id)?.topics ?? [])],
      dueAt: assignment.dueAt?.toISOString() ?? null,
      latestSubmission: latestSubmission ? {
        ...latestSubmission,
        startedAt: latestSubmission.startedAt?.toISOString() ?? null,
        submittedAt: latestSubmission.submittedAt?.toISOString() ?? null,
      } : null,
      resultHistory: resultHistory.map((submission) => ({
        id: submission.id,
        score: submission.score,
        feedback: submission.feedback,
        startedAt: submission.startedAt?.toISOString() ?? null,
        submittedAt: submission.submittedAt?.toISOString() ?? null,
      })),
      wrongCount: latestSubmitted?.submittedAt
        ? (metadataByAssignment.get(assignment.id)?.questions ?? []).reduce((count, question, index) =>
            count + (gradeAssignmentAnswer(
              question,
              latestSubmitted.selectedAnswers?.[index] ?? null
            ).isCorrect ? 0 : 1), 0)
        : 0,
      status: latestSubmission?.submittedAt ? "submitted" : due ? "expired" : "open",
    };
  }));
  return NextResponse.json(results);
}
