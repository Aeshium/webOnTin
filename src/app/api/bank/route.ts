// GET /api/bank?q=tu-khoa&topic=excel-bang-tinh — tra cứu ngân hàng câu hỏi (có đáp án + giải thích)
import { NextRequest, NextResponse } from "next/server";
import { searchQuestionBank } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const topic = (req.nextUrl.searchParams.get("topic") ?? "").trim();
  const data = await searchQuestionBank(q, topic);
  return NextResponse.json(data);
}
