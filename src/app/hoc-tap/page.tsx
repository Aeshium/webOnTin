import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck } from "lucide-react";

export const metadata: Metadata = { title: "Học Tập" };

const STUDY_OPTIONS = [
  {
    href: "/bai-hoc",
    title: "Học Bài",
    description: "Đọc nội dung theo từng khóa học, chương và bài; làm câu hỏi xen kẽ ngay khi học.",
    icon: BookOpen,
    accent: "from-cyan-400/20 to-blue-500/5",
    iconColor: "text-cyan-200",
  },
  {
    href: "/bai-tap",
    title: "Bài tập",
    description: "Làm bài được giao, tiếp tục bài đang làm và xem kết quả sau khi nộp.",
    icon: ClipboardCheck,
    accent: "from-violet-400/20 to-fuchsia-500/5",
    iconColor: "text-violet-200",
  },
];

export default function StudyPage() {
  return (
    <main className="mx-auto min-h-[70svh] max-w-6xl px-4 pb-20 pt-28 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Không gian học tập</p>
      <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Bạn muốn học theo cách nào?</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
        Chọn học bài theo nội dung hoặc làm bài tập được giao trong khóa học.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {STUDY_OPTIONS.map(({ href, title, description, icon: Icon, accent, iconColor }) => (
          <Link
            key={href}
            href={href}
            className={`group rounded-3xl border border-white/10 bg-gradient-to-br ${accent} p-6 transition hover:-translate-y-1 hover:border-cyan-200/30 hover:shadow-2xl hover:shadow-cyan-950/30 sm:p-8`}
          >
            <span className={`grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/20 ${iconColor}`}>
              <Icon className="h-6 w-6" />
            </span>
            <div className="mt-8 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black text-white">{title}</h2>
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-200" />
            </div>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300">{description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
