import { and, asc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courseEnrollments, courses, lessonQuestions, lessons, questions, topics } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return NextResponse.json({ error: "Học sinh cần đăng nhập để xem bài học." }, { status: 403 });
  const rawCourseId = request.nextUrl.searchParams.get("courseId");
  if (rawCourseId === null) {
    const enrolledCourses = await db
      .select({ id: courses.id, title: courses.title })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courseEnrollments.userId, user.id));
    const result = await Promise.all(enrolledCourses.map(async (course) => {
      const summaries = await db
        .select({
          id: lessons.id,
          title: lessons.title,
          description: lessons.description,
          questionCount: sql<number>`count(${lessonQuestions.questionId})::int`,
        })
        .from(lessons)
        .leftJoin(lessonQuestions, eq(lessonQuestions.lessonId, lessons.id))
        .where(eq(lessons.courseId, course.id))
        .groupBy(lessons.id)
        .orderBy(asc(lessons.sortOrder), asc(lessons.id));
      return { ...course, lessons: summaries };
    }));
    return NextResponse.json(result);
  }
  const courseId = Number(rawCourseId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return NextResponse.json({ error: "Khóa học không hợp lệ." }, { status: 400 });
  }
  const [enrollment] = await db
    .select({ id: courseEnrollments.id, title: courses.title })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, user.id)))
    .limit(1);
  if (!enrollment) return NextResponse.json({ error: "Bạn chưa được đăng ký khóa học này." }, { status: 403 });

  const courseLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.sortOrder), asc(lessons.id));
  const lessonResults = await Promise.all(courseLessons.map(async (lesson) => {
    const attachedQuestions = await db
      .select({
        id: questions.id,
        content: questions.content,
        options: questions.options,
        correctIndex: questions.correctIndex,
        explanation: questions.explanation,
        topicName: topics.name,
      })
      .from(lessonQuestions)
      .innerJoin(questions, eq(lessonQuestions.questionId, questions.id))
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(eq(lessonQuestions.lessonId, lesson.id))
      .orderBy(asc(lessonQuestions.sortOrder));
    return { ...lesson, questions: attachedQuestions };
  }));
  return NextResponse.json({ courseTitle: enrollment.title, lessons: lessonResults });
}
