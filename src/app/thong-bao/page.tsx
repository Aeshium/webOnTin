import type { Metadata } from "next";
import { NotificationsClient } from "@/components/notifications-client";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export const metadata: Metadata = { title: "Thông báo" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-32 pb-20 text-center">
        <h1 className="text-2xl font-black text-white">Đăng nhập để xem thông báo</h1>
        <Link href="/dang-nhap" className="mt-5 inline-flex rounded-xl bg-cyan-300 px-5 py-3 font-bold text-ink-950">Đăng nhập</Link>
      </main>
    );
  }
  return <NotificationsClient />;
}
