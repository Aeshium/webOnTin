import type { Metadata } from "next";
import { LeaderboardClient } from "@/components/leaderboard-client";
import { getLeaderboard, type LeaderboardPeriod } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bảng xếp hạng thi thử",
  description:
    "So sánh điểm số và thời gian từ các bài thi thử Tin học đã hoàn thành.",
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: requestedPeriod } = await searchParams;
  const period: LeaderboardPeriod =
    requestedPeriod === "week" || requestedPeriod === "month"
      ? requestedPeriod
      : "all";
  const leaderboard = await getLeaderboard(period);

  return <LeaderboardClient period={period} {...leaderboard} />;
}
