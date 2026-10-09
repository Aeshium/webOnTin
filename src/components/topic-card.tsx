// Thẻ chuyên đề — Server Component (không "use client") vì không cần tương tác JS,
// hover được xử lý hoàn toàn bằng CSS.
import Link from "next/link";
import {
  Cpu,
  AppWindow,
  Globe,
  FileText,
  Sheet,
  Database,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { TopicWithCount } from "@/lib/queries";

// Map tên icon (lưu trong DB) → component icon thật.
const ICONS: Record<string, LucideIcon> = {
  Cpu,
  AppWindow,
  Globe,
  FileText,
  Sheet,
  Database,
};

export function TopicCard({ topic }: { topic: TopicWithCount }) {
  const Icon = ICONS[topic.icon] ?? Database;

  return (
    <Link
      href={`/luyen-thi/${topic.id}`}
      className="glass card-glow group relative flex flex-col rounded-3xl p-6"
      style={{ ["--c1" as string]: topic.colorFrom }}
    >
      <div className="flex items-start justify-between">
        <span
          className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl text-ink-950 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${topic.colorFrom}, ${topic.colorTo})`,
            boxShadow: `0 12px 32px -10px ${topic.colorFrom}66`,
          }}
        >
          <Icon className="h-6 w-6" strokeWidth={2.4} />
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">
          {topic.questionCount} câu
        </span>
      </div>

      <h3 className="mt-5 text-lg font-extrabold text-white">{topic.name}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">
        {topic.tagline}
      </p>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-slate-300 transition-colors group-hover:text-white">
        Vào ôn luyện
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          style={{ color: topic.colorFrom }}
          strokeWidth={2.5}
        />
      </span>
    </Link>
  );
}
