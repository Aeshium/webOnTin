import { asc, ilike, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questions, topics } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return NextResponse.json({ error: "Chỉ giáo viên mới được truy cập ngân hàng câu hỏi." }, { status: 403 });
  }
  const term = request.nextUrl.searchParams.get("q")?.trim().slice(0, 160) ?? "";
  const rows = await db
    .select({
      id: questions.id,
      content: questions.content,
      options: questions.options,
      correctIndex: questions.correctIndex,
      explanation: questions.explanation,
      topicId: questions.topicId,
      topicName: topics.name,
    })
    .from(questions)
    .innerJoin(topics, sql`${questions.topicId} = ${topics.id}`)
    .where(term ? or(
      ilike(questions.content, `%${term}%`),
      ilike(topics.name, `%${term}%`)
    ) : undefined)
    .orderBy(asc(questions.topicId), asc(questions.id))
    .limit(600);
  return NextResponse.json(rows);
}
