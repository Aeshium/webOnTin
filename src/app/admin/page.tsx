import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { assignments, courses, feedbacks, lessons, users } from "@/db/schema";

export const metadata: Metadata = { title: "Quản trị hệ thống" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [[students], [teachers], [courseCount], [lessonCount], [assignmentCount], [pendingFeedback]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(sql`${users.role} = 'student' and ${users.isActive} = true`),
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(sql`${users.role} = 'teacher' and ${users.isActive} = true`),
    db.select({ count: sql<number>`count(*)::int` }).from(courses),
    db.select({ count: sql<number>`count(*)::int` }).from(lessons),
    db.select({ count: sql<number>`count(*)::int` }).from(assignments),
    db.select({ count: sql<number>`count(*)::int` }).from(feedbacks).where(sql`${feedbacks.status} = 'pending'`),
  ]);
  const cards = [
    ["Học sinh", students.count, "Tài khoản đang hoạt động"],
    ["Giáo viên", teachers.count, "Tài khoản đang hoạt động"],
    ["Khóa học", courseCount.count, `${lessonCount.count} bài học · ${assignmentCount.count} bài tập`],
    ["Phản hồi chờ", pendingFeedback.count, "Cần được xem xét"],
  ] as const;
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-bold tracking-[0.2em] text-cyan-300 uppercase">Quản trị</p>
      <h1 className="mt-2 text-3xl font-black text-white">Tổng quan hệ thống</h1>
      <p className="mt-2 text-sm text-slate-400">Quản lý tài khoản, xem nội dung học tập và xử lý phản hồi.</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, count, caption]) => (
          <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-sm font-semibold text-slate-400">{title}</p>
            <p className="mt-3 text-3xl font-black text-white">{count}</p>
            <p className="mt-1 text-xs text-slate-500">{caption}</p>
          </article>
        ))}
      </div>
      <section className="mt-7 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
        <h2 className="text-lg font-black text-white">Bắt đầu quản lý</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/users" className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-ink-950">Quản lý tài khoản</Link>
          <Link href="/admin/feedbacks" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white">Xem phản hồi</Link>
          <Link href="/teacher" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white">Mở cổng giáo viên</Link>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-slate-500">
          Quyền truy cập được kiểm tra trên máy chủ bằng session của ÔnTin. Bảng Supabase này không dùng Supabase Auth, vì vậy không thể dùng auth.uid() để viết RLS cho từng tài khoản ứng dụng.
        </p>
      </section>
    </div>
  );
}
