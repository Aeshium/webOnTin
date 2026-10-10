import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MockExamSubmissionError, resumeMockExamSession } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "ID bài thi không hợp lệ." }, { status: 400 });
  }
  try {
    return NextResponse.json(await resumeMockExamSession({ userId: user.id, sessionId }));
  } catch (error) {
    if (error instanceof MockExamSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Khôi phục bài thi thất bại:", error);
    return NextResponse.json({ error: "Không thể khôi phục bài thi." }, { status: 500 });
  }
}
