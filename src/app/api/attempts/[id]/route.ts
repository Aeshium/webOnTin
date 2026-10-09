// GET /api/attempts/123 — chi tiết một lượt làm bài (để xem lại từng câu)
import { NextRequest, NextResponse } from "next/server";
import { getAttemptDetail } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // từ Next 15+, params là một Promise
  const numId = Number(id);

  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const detail = await getAttemptDetail(numId, (await getCurrentUser())?.id);
  if (!detail) {
    return NextResponse.json({ error: "Không tìm thấy bài làm" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
