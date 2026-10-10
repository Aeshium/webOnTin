// GET /api/questions?topic=phan-cung&limit=10
// Rút ngẫu nhiên câu hỏi. Đáp án đúng KHÔNG được gửi xuống trình duyệt — chống xem source :)
import { NextRequest, NextResponse } from "next/server";
import {
  createExamSessionToken,
  getRandomQuestions,
  getRandomStudyQuestions,
  storeMockExamSession,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { getMockExam } from "@/lib/mock-exams";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get("topic"); // null = đề tổng hợp
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 50) : 10;
  const mode = req.nextUrl.searchParams.get("mode");
  const examId = req.nextUrl.searchParams.get("examId");

  if (mode === "study") {
    const questions = await getRandomStudyQuestions(topic, limit);
    return NextResponse.json(questions);
  }
  if (mode === "exam") {
    const targetCount = Math.min(limit, 40);
    const selectedExam = examId ? getMockExam(examId) : null;
    if (examId && !selectedExam) {
      return NextResponse.json({ error: "Đề thi không tồn tại." }, { status: 404 });
    }
    const [basic, advanced] = selectedExam
      ? await Promise.all([
          getRandomQuestions(null, selectedExam.level === "basic" ? targetCount : 0, "basic"),
          getRandomQuestions(null, selectedExam.level === "advanced" ? targetCount : 0, "advanced"),
        ])
      : await Promise.all([
          getRandomQuestions(null, Math.ceil(targetCount / 2), "basic"),
          getRandomQuestions(null, Math.floor(targetCount / 2), "advanced"),
        ]);
    const selected = [...basic, ...advanced];
    if (selected.length < targetCount) {
      const selectedIds = new Set(selected.map((question) => question.id));
      const additional = await getRandomQuestions(
        null,
        targetCount - selected.length,
        selectedExam?.level
      );
      selected.push(...additional.filter((question) => !selectedIds.has(question.id)));
    }
    if (selected.length < targetCount) {
      return NextResponse.json({ error: "Chưa đủ câu hỏi cho đề đã chọn." }, { status: 409 });
    }
    for (let index = selected.length - 1; index > 0; index -= 1) {
      const otherIndex = Math.floor(Math.random() * (index + 1));
      [selected[index], selected[otherIndex]] = [selected[otherIndex], selected[index]];
    }
    const questions = selected;
    if (questions.length === 0) {
      return NextResponse.json({ error: "Chưa có câu hỏi để thi thử." }, { status: 404 });
    }
    const user = await getCurrentUser();
    const response = NextResponse.json(questions);
    if (user) {
      const token = createExamSessionToken();
      await storeMockExamSession({
        userId: user.id,
        token,
        questionIds: questions.map((question) => question.id),
        durationSec: 30 * 60,
        examId,
      });
      response.headers.set("X-Ontin-Exam-Session", token);
    }
    return response;
  }
  const questions = await getRandomQuestions(topic, limit);
  return NextResponse.json(questions);
}
