"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, History, Play, Timer, Trophy } from "lucide-react";
import type { AttemptSummary, PausedExamSummary } from "@/lib/queries";
import { getMockExamName } from "@/lib/mock-exams";
import {
  getAttemptHistoryHiddenBefore,
  subscribeAttemptHistoryVisibility,
} from "@/lib/attempt-history-visibility";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreColor(percent: number) {
  if (percent >= 80) return "text-emerald-300";
  if (percent >= 50) return "text-amber-300";
  return "text-rose-300";
}

function formatTime(sec: number) {
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function DashboardRecentAttempts({
  attempts,
  pausedExams,
  userId,
}: {
  attempts: AttemptSummary[];
  pausedExams: PausedExamSummary[];
  userId: number | null;
}) {
  const hiddenBefore = useSyncExternalStore(
    subscribeAttemptHistoryVisibility,
    () => (userId === null ? 0 : getAttemptHistoryHiddenBefore(userId)),
    () => 0
  );

  const visibleAttempts = attempts.filter(
    (attempt) => Date.parse(attempt.createdAt) > hiddenBefore
  );
  const recentItems = [
    ...visibleAttempts.map((attempt) => ({
      ...attempt,
      kind: "completed" as const,
      sortDate: attempt.createdAt,
    })),
    ...pausedExams.map((exam) => ({
      ...exam,
      kind: "paused" as const,
      sortDate: exam.pausedAt,
    })),
  ]
    .sort((a, b) => Date.parse(b.sortDate) - Date.parse(a.sortDate))
    .slice(0, 4);

  return (
    <section className="glass rounded-3xl p-5 sm:p-6 lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-300 uppercase">
            <History className="h-4 w-4" />
            Theo dõi ôn tập
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            Lịch sử làm bài gần đây
          </h2>
        </div>
        <Link
          href="/lich-su"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 transition-colors hover:text-white"
        >
          Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {recentItems.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/15 px-5 py-9 text-center">
          <Trophy className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 font-bold text-white">Chưa có bài làm nào</p>
          <p className="mt-1 text-sm text-slate-500">
            Hoàn thành bài luyện đầu tiên, kết quả sẽ xuất hiện ở đây.
          </p>
          <Link
            href="/thi-thu"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/15"
          >
            <Play className="h-4 w-4" /> Bắt đầu thi thử
          </Link>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-white/8">
          {recentItems.map((item) => {
            if (item.kind === "paused") {
              const title = getMockExamName(item.examId);
              return (
                <article
                  key={`paused-${item.id}`}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="max-w-full truncate rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-xs font-bold text-amber-200">
                        {title}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-200">
                        <Timer className="h-3 w-3" />
                        Đang tạm dừng
                      </span>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(item.pausedAt)} · Đã làm {item.answeredCount}/{item.questionCount} câu · {formatTime(item.elapsedSec)}
                    </p>
                  </div>
                  <Link
                    href={`/thi-thu?resumeSessionId=${item.id}`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-ink-950 transition hover:brightness-110"
                  >
                    <Play className="h-4 w-4" />
                    Tiếp tục
                  </Link>
                </article>
              );
            }

            const attempt = item;
            const percent = Math.round(
              (attempt.correctCount / attempt.totalQuestions) * 100
            );
            const title =
              attempt.topicName ??
              (attempt.mode === "exam"
                ? "Đề thi thử tổng hợp"
                : "Luyện tập tổng hợp");
            return (
              <article
                key={attempt.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="max-w-full truncate rounded-full px-2.5 py-1 text-xs font-bold"
                      style={{
                        background: `${attempt.topicColorFrom ?? "#22d3ee"}20`,
                        color: attempt.topicColorFrom ?? "#67e8f9",
                      }}
                    >
                      {title}
                    </span>
                    {attempt.mode === "exam" && (
                      <span className="rounded-full bg-violet-400/10 px-2 py-1 text-[10px] font-bold text-violet-300">
                        Thi thử
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDate(attempt.createdAt)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:w-40">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-400">
                        {attempt.correctCount}/{attempt.totalQuestions} đúng
                      </span>
                      <span className={`font-black ${scoreColor(percent)}`}>
                        {percent}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href="/lich-su"
                    aria-label={`Xem lại bài ${title}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
