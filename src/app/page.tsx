import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard";
import {
  getSiteStats,
  getTopicPerformance,
  listAttempts,
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
  const [topics, stats, recentAttempts] = await Promise.all([
    getTopicPerformance(user?.id),
    getSiteStats(user?.id),
    listAttempts(5, user?.id),
  ]);

  return (
    <Dashboard
      topics={topics}
      recentAttempts={recentAttempts}
      stats={stats}
      userName={user?.name ?? null}
    />
  );
}
