import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ProfileSettings } from "@/components/profile-settings";
import { getUserAchievements } from "@/lib/queries";

export const metadata: Metadata = { title: "Tài khoản" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-32 pb-20 text-center">
        <h1 className="text-2xl font-black text-white">Đăng nhập để xem tài khoản</h1>
        <Link href="/dang-nhap" className="mt-5 inline-flex rounded-xl bg-cyan-300 px-5 py-3 font-bold text-ink-950">Đăng nhập</Link>
      </main>
    );
  }
  const achievements = await getUserAchievements(user.id);
  return <ProfileSettings user={user} achievements={achievements} />;
}
