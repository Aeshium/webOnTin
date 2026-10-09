"use client";
// Client Component của trang Lịch sử:
// - Nhận danh sách lượt làm bài từ Server Component qua props
// - Bấm "Xem lại" → fetch GET /api/attempts/[id] → mở modal xem từng câu
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ClipboardList,
  Eye,
  Loader2,
  X,
  Timer,
  Play,
} from "lucide-react";
import type { AttemptSummary } from "@/lib/queries";
import {
  ResultReview,
  ScoreRing,
  type ReviewItem,
} from "@/components/quiz/result-review";

type AttemptDetail = {
  id: number;
  topicId: string | null;
  topicName: string | null;
  mode: string;
  totalQuestions: number;
  correctCount: number;
  timeTakenSec: number;
  createdAt: string;
  results: ReviewItem[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function HistoryClient({ attempts }: { attempts: AttemptSummary[] }) {
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function openDetail(id: number) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/attempts/${id}`);
      if (res.ok) setDetail(await res.json());
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-28 pb-24 sm:px-6">
      <p className="text-sm font-bold tracking-[0.25em] text-amber-300 uppercase">
        Theo dõi tiến bộ
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
        Lịch sử ôn luyện
      </h1>
      <p className="mt-3 text-sm text-slate-500">
        Chỉ các đề thi thử có tính giờ được lưu — bấm <b className="text-slate-300">Xem lại</b> để xem câu trả lời và giải thích.
      </p>

      {attempts.length === 0 ? (
        <div className="glass mt-10 rounded-3xl p-12 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-slate-500">
            <ClipboardList className="h-7 w-7" />
          </span>
          <p className="mt-5 font-bold text-white">Chưa có lượt làm bài nào</p>
          <p className="mt-1.5 text-sm text-slate-500">
            Làm một đề ngay — kết quả sẽ xuất hiện ở đây.
          </p>
          <Link
            href="/thi-thu"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-3 text-sm font-black text-ink-950"
          >
            <Play className="h-4 w-4" strokeWidth={2.6} />
            Thi thử ngay
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-4">
          {attempts.map((a, i) => {
            const percent = Math.round((a.correctCount / a.totalQuestions) * 100);
            const c1 = a.topicColorFrom ?? "#22d3ee";
            const c2 = a.topicColorTo ?? "#a78bfa";
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="glass flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold"
                      style={{ background: `${c1}1f`, color: c1, border: `1px solid ${c1}40` }}
                    >
                      {a.topicName ?? "Thi thử tổng hợp"}
                    </span>
                    {a.mode === "exam" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-1 text-xs font-bold text-violet-300">
                        <Timer className="h-3 w-3" /> Thi thử
                      </span>
                    ) : a.mode === "study" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-bold text-cyan-300">
                        Ôn tập từng câu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                        Luyện tập
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatDate(a.createdAt)} · {formatTime(a.timeTakenSec)}</p>
                </div>

                {/* Mini progress */}
                <div className="w-full sm:w-40">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">
                      {a.correctCount}/{a.totalQuestions} câu đúng
                    </span>
                    <span className={percent >= 80 ? "text-emerald-300" : percent >= 50 ? "text-amber-300" : "text-rose-300"}>
                      {percent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${c1}, ${c2})` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => openDetail(a.id)}
                  disabled={loadingId === a.id}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/12 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-white/8 disabled:opacity-60"
                >
                  {loadingId === a.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Xem lại
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal xem lại bài làm */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:py-10"
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="glass relative w-full max-w-3xl rounded-[2rem] bg-ink-900/95 p-6 sm:p-9"
            >
              <button
                onClick={() => setDetail(null)}
                className="absolute top-5 right-5 grid h-10 w-10 place-items-center rounded-xl border border-white/12 text-slate-300 transition-colors hover:bg-white/8"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>

              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                {detail.topicName ?? "Thi thử tổng hợp"} · {formatDate(detail.createdAt)}
              </p>
              <div className="mt-4">
                <ScoreRing percent={Math.round((detail.correctCount / detail.totalQuestions) * 100)} />
              </div>
              <p className="mt-4 text-center text-2xl font-black text-white">
                {detail.correctCount}/{detail.totalQuestions} câu đúng
                <span className="ml-2 text-sm font-bold text-slate-500">· {formatTime(detail.timeTakenSec)}</span>
              </p>

              <ResultReview results={detail.results} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
