import { and, asc, count, eq, ilike, inArray, notInArray, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questions, topics } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const QUESTION_FIELDS = {
  id: questions.id,
  content: questions.content,
  options: questions.options,
  correctIndex: questions.correctIndex,
  explanation: questions.explanation,
  topicId: questions.topicId,
  topicName: topics.name,
  difficulty: questions.difficulty,
};

function parseIds(value: string | null) {
  if (value === null || value.trim() === "") return [];
  const ids = value.split(",").map((item) => Number(item));
  if (ids.length > 100 || ids.some((id) => !Number.isInteger(id) || id <= 0)) return null;
  return [...new Set(ids)];
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return NextResponse.json({ error: "Chỉ giáo viên mới được truy cập ngân hàng câu hỏi." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const ids = parseIds(params.get("ids"));
  if (params.has("ids")) {
    if (ids === null) return NextResponse.json({ error: "Danh sách ID câu hỏi không hợp lệ." }, { status: 400 });
    if (ids.length === 0) return NextResponse.json({ items: [] });
    const items = await db.select(QUESTION_FIELDS)
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(inArray(questions.id, ids))
      .orderBy(asc(questions.id));
    return NextResponse.json({ items });
  }

  const term = (params.get("q") ?? "").trim().slice(0, 160);
  const topicId = (params.get("topicId") ?? "").trim();
  const difficulty = params.get("difficulty") ?? "";
  const status = params.get("status") ?? "all";
  const page = Number(params.get("page") ?? 1);
  const pageSize = Number(params.get("pageSize") ?? 10);
  const selectedIds = parseIds(params.get("selectedIds"));
  if (
    !Number.isInteger(page) || page < 1 ||
    !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50 ||
    !["", "basic", "advanced"].includes(difficulty) ||
    !["all", "selected", "unselected"].includes(status) ||
    selectedIds === null
  ) {
    return NextResponse.json({ error: "Bộ lọc ngân hàng câu hỏi không hợp lệ." }, { status: 400 });
  }

  const conditions = [];
  if (term) {
    const escapedTerm = term.replace(/[\\%_]/g, "\\$&");
    conditions.push(or(
      ilike(questions.content, `%${escapedTerm}%`),
      ilike(topics.name, `%${escapedTerm}%`)
    )!);
  }
  if (topicId) conditions.push(eq(questions.topicId, topicId));
  if (difficulty) conditions.push(eq(questions.difficulty, difficulty));
  if (status === "selected") {
    if (selectedIds.length === 0) return NextResponse.json({ items: [], total: 0, page, pageSize, totalPages: 0, topics: await db.select({ id: topics.id, name: topics.name }).from(topics).orderBy(asc(topics.sortOrder)) });
    conditions.push(inArray(questions.id, selectedIds));
  } else if (status === "unselected" && selectedIds.length > 0) {
    conditions.push(notInArray(questions.id, selectedIds));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [items, [totalRow], topicOptions] = await Promise.all([
    db.select(QUESTION_FIELDS)
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(where)
      .orderBy(asc(topics.sortOrder), asc(questions.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(where),
    db.select({ id: topics.id, name: topics.name }).from(topics).orderBy(asc(topics.sortOrder)),
  ]);
  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.ceil(total / pageSize);
  return NextResponse.json({ items, total, page, pageSize, totalPages, topics: topicOptions });
}
