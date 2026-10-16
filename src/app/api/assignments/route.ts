import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { assignments, assignmentSubmissions, courseEnrollments, courses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập để xem bài tập." }, { status: 401 });
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      dueAt: assignments.dueAt,
      courseTitle: courses.title,
      courseId: courses.id,
      submissionId: assignmentSubmissions.id,
      submittedAt: assignmentSubmissions.submittedAt,
      score: assignmentSubmissions.score,
      feedback: assignmentSubmissions.feedback,
    })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .innerJoin(courseEnrollments, and(
      eq(courseEnrollments.courseId, courses.id),
      eq(courseEnrollments.userId, user.id)
    ))
    .leftJoin(assignmentSubmissions, and(
      eq(assignmentSubmissions.assignmentId, assignments.id),
      eq(assignmentSubmissions.userId, user.id)
    ))
    .orderBy(desc(assignments.createdAt));
  return NextResponse.json(rows);
}
