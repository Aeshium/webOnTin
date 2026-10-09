"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Crown, Medal, Search, Timer, Trophy } from "lucide-react";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/lib/queries";

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  week: "7 ngày qua",
  month: "30 ngày qua",
  all: "Mọi thời điểm",
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} phút ${String(seconds % 60).padStart(2, "0")} giây`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

export function LeaderboardClient({
  period,
  entries,
  examCount,
  learnerCount,
}: {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  examCount: number;
  learnerCount: number;
}) {
  const [search, setSearch] = useState("");
  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        entry.name.toLocaleLowerCase("vi-VN").includes(search.trim().toLocaleLowerCase("vi-VN"))
      ),
    [entries, search]
  );
  const podium = entries.slice(0, 3);
  const podiumPositions = [
    { entry: podium[1], place: 2, style: "mt-10 border-slate-400/20" },
    { entry: podium[0], place: 1, style: "border-amber-300/30 bg-amber-300/[0.06]" },
    { entry: podium[2], place: 3, style: "mt-14 border-orange-300/20" },
  ].filter((item) => item.entry);

  return (
    <main className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/15 via-ink-900 to-cyan-400/10 p-6 sm:p-9">
        <div className="pointer-events-none absolute -top-28 right-8 h-72 w-72 rounded-full bg-violet-500/15 blur-[100px]" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-violet-200 uppercase">
              <Trophy className="h-4 w-4" /> Thi thử có tính giờ
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Bảng xếp hạng thi thử
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
              Thành tích được tổng hợp từ các đề thi thử đã hoàn thành. Các buổi ôn tập không tính vào bảng xếp hạng.
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-white/10 rounded-2xl border border-white/10 bg-ink-950/60 px-5 py-4">
            <div className="pr-5 text-center">
              <p className="text-2xl font-black text-violet-200 tabular-nums">{examCount.toLocaleString("vi-VN")}</p>
              <p className="mt-1 text-[11px] text-slate-400">Đề thi đã làm</p>
            </div>
            <div className="pl-5 text-center">
              <p className="text-2xl font-black text-emerald-200 tabular-nums">{learnerCount.toLocaleString("vi-VN")}</p>
              <p className="mt-1 text-[11px] text-slate-400">Người học</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" aria-label="Lọc khoảng thời gian">
          {(Object.keys(PERIOD_LABELS) as LeaderboardPeriod[]).map((value) => (
            <Link
              key={value}
              href={`/bang-xep-hang?period=${value}`}
              aria-current={period === value ? "page" : undefined}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                period === value
                  ? "border-violet-300/40 bg-violet-400/15 text-violet-100"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              {PERIOD_LABELS[value]}
            </Link>
          ))}
        </div>
        <label className="flex h-10 w-full max-w-xs items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-slate-400 focus-within:border-cyan-300/40">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên người học..."
            aria-label="Tìm theo tên người học"
            className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
          />
        </label>
      </div>

      {podium.length > 0 && !search && (
        <section aria-label="Ba vị trí dẫn đầu" className="mt-8 grid items-end gap-4 sm:grid-cols-3">
          {podiumPositions.map(({ entry, place, style }) => (
            <article key={entry!.userId} className={`relative rounded-2xl border bg-ink-900/75 p-5 text-center ${style}`}>
              <span className={`mx-auto grid h-11 w-11 place-items-center rounded-full ${place === 1 ? "bg-amber-300/15 text-amber-200" : "bg-white/5 text-slate-300"}`}>
                {place === 1 ? <Crown className="h-5 w-5" /> : <Medal className="h-5 w-5" />}
              </span>
              <p className="mt-3 text-xs font-bold text-slate-400">#{place}</p>
              <h2 className="mt-1 truncate text-lg font-black text-white">{entry!.name}</h2>
              <p className="mt-1 text-xs text-slate-500">{entry!.examCount} đề thi thử</p>
              <div className="mt-4 grid grid-cols-2 divide-x divide-white/10 rounded-xl bg-white/[0.04] py-3">
                <div>
                  <p className="text-2xl font-black text-violet-200">{(entry!.averagePercent / 10).toFixed(1)}</p>
                  <p className="text-[10px] text-slate-500">Điểm TB / 10</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-cyan-200">{entry!.totalCorrect}</p>
                  <p className="text-[10px] text-slate-500">Câu đúng</p>
                </div>
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Timer className="h-3.5 w-3.5" /> TB {formatTime(entry!.averageTimeSec)} / đề
              </p>
            </article>
          ))}
        </section>
      )}

      <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
          <div>
            <h2 className="font-black text-white">Bảng thành tích chi tiết</h2>
            <p className="mt-1 text-xs text-slate-500">
              {PERIOD_LABELS[period]} · Xếp theo điểm trung bình, số đề và thời gian làm.
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-slate-400">
            {filteredEntries.length} người học
          </span>
        </div>
        {filteredEntries.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            {entries.length === 0
              ? "Chưa có thành tích thi thử từ tài khoản người học trong khoảng thời gian này."
              : "Không tìm thấy người học phù hợp."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-white/[0.03] text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Hạng</th>
                  <th className="px-5 py-3">Người học</th>
                  <th className="px-5 py-3 text-right">Số đề</th>
                  <th className="px-5 py-3 text-right">Điểm TB</th>
                  <th className="px-5 py-3 text-right">Độ chính xác</th>
                  <th className="px-5 py-3 text-right">Câu đúng</th>
                  <th className="px-5 py-3 text-right">Thời gian TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {filteredEntries.map((entry) => {
                  const rank = entries.findIndex((item) => item.userId === entry.userId) + 1;
                  return (
                    <tr key={entry.userId} className="transition hover:bg-white/[0.03]">
                      <td className="px-5 py-4 font-black text-cyan-200">#{String(rank).padStart(2, "0")}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-300/10 text-xs font-black text-violet-200">{initials(entry.name)}</span>
                          <span className="font-bold text-white">{entry.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-slate-300">{entry.examCount}</td>
                      <td className="px-5 py-4 text-right font-black text-violet-200">{(entry.averagePercent / 10).toFixed(1)}/10</td>
                      <td className="px-5 py-4 text-right text-sm font-bold text-emerald-200">{entry.averagePercent}%</td>
                      <td className="px-5 py-4 text-right text-sm text-slate-300">{entry.totalCorrect}/{entry.totalQuestions}</td>
                      <td className="px-5 py-4 text-right text-xs text-slate-400">{formatTime(entry.averageTimeSec)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-xs text-slate-400">
        <p>Chỉ kết quả thi thử đã xác thực từ tài khoản mới được đưa vào bảng xếp hạng.</p>
        <Link href="/thi-thu" className="font-bold text-cyan-200 hover:text-white">Vào thi thử →</Link>
      </div>
    </main>
  );
}
