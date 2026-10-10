// Trang thi thử: đề 40 câu trộn chuyên đề và độ khó, 30 phút đếm ngược.
import type { Metadata } from "next";
import { getMockExamStats, getSiteStats } from "@/lib/queries";
import { MockExamCatalog } from "@/components/quiz/mock-exam-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thi thử tổng hợp",
  description: "Đề thi thử Tin học tổng hợp gồm 40 câu từ 6 chuyên đề, 30 phút đếm ngược.",
};

export default async function MockExamPage({
  searchParams,
}: {
  searchParams: Promise<{ resumeSessionId?: string; resumeGuest?: string }>;
}) {
  const params = await searchParams;
  const resumeSessionId = params.resumeSessionId;
  const resumeGuest = params.resumeGuest === "1";
  const [siteStats, examStats] = await Promise.all([getSiteStats(), getMockExamStats()]);

  return (
    <MockExamCatalog
      totalAvailable={siteStats.questionCount}
      stats={examStats}
      resumeSessionId={resumeSessionId}
      resumeGuest={resumeGuest}
    />
  );
}
