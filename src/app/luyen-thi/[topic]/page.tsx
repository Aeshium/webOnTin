// Trang luyện thi theo chuyên đề, ví dụ: /luyen-thi/phan-cung
// [topic] trong tên thư mục = dynamic route (giống app.get("/luyen-thi/:topic") của Express).
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTopicsWithCounts } from "@/lib/queries";
import { QuizExperience } from "@/components/quiz/quiz-experience";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ topic: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { topic } = await params;
  const topics = await getTopicsWithCounts();
  const t = topics.find((x) => x.id === topic);
  return { title: t ? `Ôn thi: ${t.name}` : "Ôn thi theo chuyên đề" };
}

export default async function TopicQuizPage({ params }: PageProps) {
  const { topic } = await params; // Next 15+: params là Promise, nhớ await
  const topics = await getTopicsWithCounts();
  const t = topics.find((x) => x.id === topic);

  if (!t) notFound(); // URL bậy → trang 404

  return (
    <QuizExperience
      config={{
        topicId: t.id,
        topicName: t.name,
        mode: "practice",
        colorFrom: t.colorFrom,
        colorTo: t.colorTo,
        totalAvailable: t.questionCount,
      }}
    />
  );
}
