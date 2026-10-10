import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listPausedMockExams, pauseMockExamSession, MockExamSubmissionError } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập để xem bài thi tạm dừng." }, { status: 401 });
  return NextResponse.json(await listPausedMockExams(user.id));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập để lưu tiến trình bài thi." }, { status: 401 });

  let body: {
    token?: unknown;
    answers?: unknown;
    markedForReview?: unknown;
    currentIndex?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu tạm dừng không hợp lệ." }, { status: 400 });
  }

  if (
    typeof body.token !== "string" ||
    body.token.length < 32 ||
    !Array.isArray(body.answers) ||
    !body.answers.every((value) => value === null || (Number.isInteger(value) && value >= 0 && value <= 3)) ||
    !Array.isArray(body.markedForReview) ||
    !body.markedForReview.every((value) => typeof value === "boolean") ||
    !Number.isInteger(body.currentIndex)
  ) {
    return NextResponse.json({ error: "Dữ liệu tạm dừng không hợp lệ." }, { status: 400 });
  }

  try {
    await pauseMockExamSession({
      userId: user.id,
      token: body.token,
      answers: body.answers as (number | null)[],
      markedForReview: body.markedForReview as boolean[],
      currentIndex: body.currentIndex as number,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MockExamSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Tạm dừng bài thi thất bại:", error);
    return NextResponse.json({ error: "Không thể lưu tiến trình bài thi." }, { status: 500 });
  }
}
