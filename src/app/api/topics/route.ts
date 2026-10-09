// GET /api/topics — trả về danh sách chuyên đề kèm số câu hỏi.
// Nếu viết bằng Express:  app.get("/api/topics", async (req, res) => res.json(...))
import { NextResponse } from "next/server";
import { getTopicsWithCounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getTopicsWithCounts();
  return NextResponse.json(data);
}
