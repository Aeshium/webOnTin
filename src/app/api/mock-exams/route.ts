import { NextResponse } from "next/server";
import { getMockExamStats } from "@/lib/queries";
import { MOCK_EXAMS } from "@/lib/mock-exams";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getMockExamStats();
  return NextResponse.json(MOCK_EXAMS.map((exam) => ({
    ...exam,
    ...(stats[exam.id] ?? { attemptCount: 0, averagePercent: null }),
  })));
}
