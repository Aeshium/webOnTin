import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { assignments, assignmentSubmissions, courseEnrollments, courses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

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
  const results = await Promise.all(rows.map(async (assignment) => {
    const resultHistory = await db
      .select({
        id: assignmentSubmissions.id,
        startedAt: assignmentSubmissions.startedAt,
        submittedAt: assignmentSubmissions.submittedAt,
        score: assignmentSubmissions.score,
        feedback: assignmentSubmissions.feedback,
      })
      .from(assignmentSubmissions)
      .where(and(
        eq(assignmentSubmissions.assignmentId, assignment.id),
        eq(assignmentSubmissions.userId, user.id)
      ))
      .orderBy(desc(assignmentSubmissions.startedAt))
      .limit(50);
    const latestSubmission = resultHistory[0];
    const due = assignment.dueAt && assignment.dueAt <= new Date();
    return {
      ...assignment,
      dueAt: assignment.dueAt?.toISOString() ?? null,
      latestSubmission: latestSubmission ? {
        ...latestSubmission,
        startedAt: latestSubmission.startedAt?.toISOString() ?? null,
        submittedAt: latestSubmission.submittedAt?.toISOString() ?? null,
      } : null,
      resultHistory: resultHistory.map((submission) => ({
        ...submission,
        startedAt: submission.startedAt?.toISOString() ?? null,
        submittedAt: submission.submittedAt?.toISOString() ?? null,
      })),
      status: latestSubmission?.submittedAt ? "submitted" : due ? "expired" : "open",
    };
  }));
  return NextResponse.json(results);
}
