// GET  /api/attempts  → lịch sử các lượt làm bài (JSON)
// POST /api/attempts  → nhận bài làm, chấm điểm ở SERVER, lưu DB, trả kết quả chi tiết
import { NextRequest, NextResponse } from "next/server";
import {
  gradeAndStoreMockExam,
  gradeAnswers,
  InvalidAnswerError,
  listAttempts,
  MockExamSubmissionError,
  updatePracticeAnswerStreak,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const data = await listAttempts(30, user?.id);
  return NextResponse.json(data);
}

type IncomingAnswer = { questionId: number; selectedIndex: number | null };

export async function POST(req: NextRequest) {
  let body: {
    topicId?: string | null;
    mode?: string;
    examSessionToken?: string;
    answers?: IncomingAnswer[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: "Không có câu trả lời nào" }, { status: 400 });
  }

  // Lọc sạch dữ liệu đầu vào — đừng bao giờ tin dữ liệu từ client.
  const answers = body.answers
    .filter(
      (a) =>
        typeof a?.questionId === "number" &&
        Number.isInteger(a?.questionId) &&
        a.questionId > 0 &&
        (a.selectedIndex === null ||
          (typeof a.selectedIndex === "number" &&
            Number.isInteger(a.selectedIndex) &&
            a.selectedIndex >= 0 &&
            a.selectedIndex <= 3))
    )
    .map((a) => ({ questionId: a.questionId, selectedIndex: a.selectedIndex }));

  if (answers.length !== body.answers.length || new Set(answers.map((answer) => answer.questionId)).size !== answers.length) {
    return NextResponse.json({ error: "Câu trả lời không hợp lệ." }, { status: 400 });
  }

  try {
    const userId = (await getCurrentUser())?.id ?? null;
    if (body.mode === "exam") {
      if (userId === null) {
        if (body.examSessionToken) {
          return NextResponse.json({ error: "Phiên thi thử không hợp lệ." }, { status: 400 });
        }
        return NextResponse.json(await gradeAnswers(answers));
      }
      if (typeof body.examSessionToken !== "string" || body.examSessionToken.length < 32) {
        return NextResponse.json({ error: "Phiên thi thử không hợp lệ." }, { status: 400 });
      }
      const result = await gradeAndStoreMockExam({
        userId,
        token: body.examSessionToken,
        answers,
      });
      return NextResponse.json(result);
    }

    const result = await gradeAnswers(answers);
    if (userId !== null) {
      await updatePracticeAnswerStreak(userId, result.results);
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof MockExamSubmissionError || err instanceof InvalidAnswerError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Chấm điểm thất bại:", err);
    return NextResponse.json({ error: "Có lỗi khi chấm điểm" }, { status: 500 });
  }
}
