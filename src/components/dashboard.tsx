import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  ClipboardCheck,
  Clock3,
  History,
  Play,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import type {
  AttemptSummary,
  TopicPerformance,
} from "@/lib/queries";
import { TopicCard } from "@/components/topic-card";
import { ScrollToTopicsButton } from "@/components/scroll-to-topics-button";
import { TopicsLink } from "@/components/topics-link";

type DashboardProps = {
  topics: TopicPerformance[];
  recentAttempts: AttemptSummary[];
  stats: {
    questionCount: number;
    attemptCount: number;
    averagePercent: number | null;
  };
  userName: string | null;
};

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

export function Dashboard({
  topics,
  recentAttempts,
  stats,
  userName,
}: DashboardProps) {
  const attemptedTopics = topics.filter(
    (topic) => topic.averagePercent !== null
  );
  const weakestTopic = [...attemptedTopics].sort(
    (a, b) => (a.averagePercent ?? 0) - (b.averagePercent ?? 0)
  )[0];

  const metrics = [
    {
      label: "Câu hỏi trong ngân hàng",
      value: stats.questionCount.toLocaleString("vi-VN"),
      detail: "Sẵn sàng để luyện tập",
      icon: BookOpen,
      color: "text-cyan-300",
      tint: "bg-cyan-400/10",
    },
    {
      label: "Chuyên đề",
      value: topics.length.toString(),
      detail: "Luyện theo từng phần",
      icon: ClipboardCheck,
      color: "text-violet-300",
      tint: "bg-violet-400/10",
    },
    {
      label: "Lượt thi thử",
      value: stats.attemptCount.toLocaleString("vi-VN"),
      detail: "Đã được lưu",
      icon: Activity,
      color: "text-emerald-300",
      tint: "bg-emerald-400/10",
    },
    {
      label: "Điểm trung bình",
      value:
        stats.averagePercent === null
          ? "—"
          : `${(stats.averagePercent / 10).toFixed(1)}/10`,
      detail:
        stats.averagePercent === null
          ? "Hãy làm bài đầu tiên"
          : `${stats.averagePercent}% số câu đúng`,
      icon: Target,
      color: "text-amber-300",
      tint: "bg-amber-400/10",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-violet-500/10 to-ink-900 p-6 sm:p-9">
        <div className="pointer-events-none absolute -top-28 right-0 h-72 w-72 rounded-full bg-violet-500/15 blur-[100px]" />
        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-center">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              BẢNG ĐIỀU KHIỂN ÔN TẬP
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {userName ? `Chào ${userName}, cùng học tốt hôm nay!` : "Chào bạn, cùng học tốt hôm nay!"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Theo dõi kết quả, xem lại các bài đã làm và chọn chuyên đề tiếp
              theo để củng cố kiến thức Tin học.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ScrollToTopicsButton />
              <Link
                href="/on-luyen"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-300/10 px-5 py-3 text-sm font-bold text-violet-100 transition-colors hover:bg-violet-300/20"
              >
                <BookOpenCheck className="h-4 w-4 text-violet-300" />
                Ôn Luyện
              </Link>
              <Link
                href="/thi-thu"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-black text-ink-950 shadow-lg shadow-violet-500/20 transition hover:brightness-110"
              >
                <Play className="h-4 w-4" fill="currentColor" />
                Làm đề thi thử
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-ink-950/55 p-4 shadow-xl backdrop-blur sm:p-5 lg:col-start-2 lg:row-start-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-wider text-cyan-200 uppercase">
                  Tiến trình học tập
                </p>
                <h2 className="mt-1 text-base font-black text-white">
                  Tổng quan ôn tập
                </h2>
              </div>
              <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[10px] font-bold text-violet-200">
                {userName ? "Tiến trình của bạn" : "Khách"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/5 p-2.5">
                <p className="text-[10px] text-slate-500">Lượt làm</p>
                <p className="mt-1 text-base font-black text-white tabular-nums">
                  {stats.attemptCount.toLocaleString("vi-VN")}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-2.5">
                <p className="text-[10px] text-slate-500">Độ chính xác</p>
                <p className="mt-1 text-base font-black text-cyan-200 tabular-nums">
                  {stats.averagePercent === null
                    ? "—"
                    : `${stats.averagePercent}%`}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-2.5">
                <p className="text-[10px] text-slate-500">Ngân hàng</p>
                <p className="mt-1 text-base font-black text-white tabular-nums">
                  {stats.questionCount.toLocaleString("vi-VN")}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-300">
                  Tỷ lệ trả lời đúng trung bình
                </span>
                <span className="font-black text-emerald-300 tabular-nums">
                  {stats.averagePercent === null
                    ? "Chưa có"
                    : `${stats.averagePercent}%`}
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label="Tỷ lệ trả lời đúng trung bình"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={stats.averagePercent ?? 0}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                  style={{ width: `${stats.averagePercent ?? 0}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                {userName
                  ? "Lịch sử và điểm số ở đây chỉ thuộc tài khoản của bạn."
                  : "Đăng nhập để lưu lịch sử và theo dõi tiến trình riêng của bạn."}
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section
        aria-label="Thống kê ôn tập"
        className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-white tabular-nums">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
                </div>
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${metric.tint} ${metric.color}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/5 px-4 py-3 text-xs leading-relaxed text-slate-400">
        <Activity className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <p>
          {userName
            ? "Số lượt và điểm trung bình chỉ tính các đề thi thử bạn đã hoàn thành. Các buổi ôn không được lưu vào thống kê."
            : "Đăng nhập để lưu kết quả thi thử và xuất hiện trên bảng xếp hạng. Các buổi ôn không được lưu vào thống kê."}
        </p>
      </div>

      <section className="mt-8 grid items-start gap-6 lg:grid-cols-5">
        <div className="glass rounded-3xl p-5 sm:p-6 lg:col-span-3">
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

          {recentAttempts.length === 0 ? (
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
              {recentAttempts.map((attempt) => {
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
        </div>

        <aside className="space-y-5 lg:col-span-2">
          <section className="glass rounded-3xl p-5 sm:p-6">
            <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-violet-300 uppercase">
              <Target className="h-4 w-4" />
              Năng lực theo chuyên đề
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              Điểm trung bình
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Tỷ lệ câu đúng trung bình trong các lượt đã lưu
            </p>

            {attemptedTopics.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-white/[0.03] p-4 text-sm leading-relaxed text-slate-400">
                Chưa có dữ liệu theo chuyên đề. Hãy làm một bài luyện theo chủ
                đề để bắt đầu theo dõi kết quả.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {topics.map((topic) => {
                  const percent = topic.averagePercent;
                  return (
                    <div key={topic.id}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate font-semibold text-slate-300">
                          {topic.name}
                        </span>
                        {percent === null ? (
                          <span className="shrink-0 text-slate-600">
                            Chưa có lượt
                          </span>
                        ) : (
                          <span
                            className={`shrink-0 font-black ${scoreColor(percent)}`}
                          >
                            {(percent / 10).toFixed(1)}/10
                          </span>
                        )}
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                        {percent !== null && (
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              background: `linear-gradient(90deg, ${topic.colorFrom}, ${topic.colorTo})`,
                            }}
                          />
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {topic.attemptCount > 0
                          ? `${topic.attemptCount} lượt làm`
                          : "Chưa có dữ liệu"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="relative overflow-hidden rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-500/15 to-cyan-500/5 p-5 sm:p-6">
            <Sparkles className="absolute top-5 right-5 h-5 w-5 text-violet-300/60" />
            <p className="text-xs font-bold tracking-wider text-violet-200 uppercase">
              Gợi ý ôn tập
            </p>
            {weakestTopic ? (
              <>
                <h3 className="mt-3 pr-5 text-lg font-black text-white">
                  {weakestTopic.averagePercent}% đúng ở {weakestTopic.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Đây là chuyên đề có điểm trung bình thấp nhất trong các
                  chuyên đề đã làm. Ôn thêm một lượt để củng cố kiến thức nhé.
                </p>
                <TopicsLink
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-ink-950 transition hover:brightness-110"
                >
                  Xem chuyên đề <ArrowRight className="h-4 w-4" />
                </TopicsLink>
              </>
            ) : (
              <>
                <h3 className="mt-3 pr-5 text-lg font-black text-white">
                  Bắt đầu từ một chuyên đề
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Sau khi có kết quả luyện tập, dashboard sẽ gợi ý chuyên đề
                  cần ôn thêm dựa trên điểm trung bình.
                </p>
                <TopicsLink
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-ink-950 transition hover:brightness-110"
                >
                  Xem chuyên đề <ArrowRight className="h-4 w-4" />
                </TopicsLink>
              </>
            )}
          </section>
        </aside>
      </section>

      <section id="chuyen-de" className="mt-12 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wider text-cyan-300 uppercase">
              Lộ trình ôn tập
            </p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Chuyên đề Tin học
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Chọn phần kiến thức muốn luyện tiếp theo.
            </p>
          </div>
          <Link
            href="/tra-cuu"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 transition-colors hover:text-white"
          >
            Tra cứu câu hỏi <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {topics.length === 0 ? (
          <p className="glass mt-5 rounded-2xl p-6 text-sm text-slate-400">
            Chưa có chuyên đề nào trong database.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
