// Trang lịch sử ôn luyện — server lấy dữ liệu, client hiển thị tương tác.
import type { Metadata } from "next";
import { listAttempts } from "@/lib/queries";
import { HistoryClient } from "@/components/history-client";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lịch sử ôn luyện",
};

export default async function HistoryPage() {
  const user = await getCurrentUser();
  const attempts = await listAttempts(30, user?.id);
  return <HistoryClient attempts={attempts} isGuest={!user} />;
}
