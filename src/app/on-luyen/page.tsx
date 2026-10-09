import type { Metadata } from "next";
import { QuizExperience } from "@/components/quiz/quiz-experience";
import { getSiteStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ôn luyện tổng hợp",
  description:
    "Ôn luyện câu hỏi Tin học ngẫu nhiên từ tất cả chuyên đề, không giới hạn thời gian thi thử.",
};

export default async function StudyPage() {
  const stats = await getSiteStats();

  return (
    <QuizExperience
      config={{
        topicId: null,
        topicName: "Ôn luyện tổng hợp",
        mode: "practice",
        colorFrom: "#22d3ee",
        colorTo: "#a78bfa",
        totalAvailable: stats.questionCount,
      }}
    />
  );
}
