// Trang thi thử: đề 40 câu trộn chuyên đề và độ khó, 30 phút đếm ngược.
import type { Metadata } from "next";
import { getSiteStats } from "@/lib/queries";
import { QuizExperience } from "@/components/quiz/quiz-experience";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thi thử tổng hợp",
  description: "Đề thi thử Tin học tổng hợp gồm 40 câu từ 6 chuyên đề, 30 phút đếm ngược.",
};

export default async function MockExamPage() {
  const stats = await getSiteStats();

  return (
    <QuizExperience
      config={{
        topicId: null, // null = trộn từ tất cả chuyên đề
        topicName: "Đề thi thử tổng hợp",
        mode: "exam",
        colorFrom: "#22d3ee",
        colorTo: "#a78bfa",
        totalAvailable: stats.questionCount,
        examSeconds: 30 * 60,
        examQuestionCount: Math.min(40, stats.questionCount),
      }}
    />
  );
}
