// GET /api/bank?q=tu-khoa&topic=excel-bang-tinh — tra cứu ngân hàng câu hỏi (có đáp án + giải thích)
import { NextRequest, NextResponse } from "next/server";
import { searchQuestionBank } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const topic = (req.nextUrl.searchParams.get("topic") ?? "").trim();
  const offsetRaw = Number(req.nextUrl.searchParams.get("offset") ?? "0");
  const offset = Number.isFinite(offsetRaw)
    ? Math.min(Math.max(0, Math.floor(offsetRaw)), 10_000)
    : 0;
  const data = await searchQuestionBank(q, topic, offset);
  return NextResponse.json(data);
}
