import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard";
import {
  getSiteStats,
  getTopicPerformance,
  listAttempts,
  listPausedMockExams,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DashBoard",
  description:
    "Theo dõi lịch sử làm bài, điểm trung bình theo chuyên đề và tiếp tục ôn thi Tin học.",
};

export default async function HomePage() {
  const user = await getCurrentUser();
  const [topics, stats, recentAttempts, pausedExams] = await Promise.all([
    getTopicPerformance(user?.id),
    getSiteStats(user?.id),
    listAttempts(4, user?.id),
    user ? listPausedMockExams(user.id) : Promise.resolve([]),
  ]);

  return (
    <Dashboard
      topics={topics}
      recentAttempts={recentAttempts}
      pausedExams={pausedExams}
      userId={user?.id ?? null}
      stats={stats}
      userName={user?.name ?? null}
    />
  );
}
