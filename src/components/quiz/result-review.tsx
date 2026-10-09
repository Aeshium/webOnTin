"use client";
// Các mảnh dùng chung cho trang KẾT QUẢ và trang LỊCH SỬ:
// - ScoreRing: vòng tròn điểm số chạy hiệu ứng
// - ResultReview: danh sách từng câu + đáp án đúng/sai + giải thích
import { useId } from "react";
import { motion } from "framer-motion";
import { Check, X, Lightbulb } from "lucide-react";

export type ReviewItem = {
  content: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
  isCorrect: boolean;
  explanation: string;
  topicName?: string | null;
};

const LETTERS = ["A", "B", "C", "D"];

export function ScoreRing({
  percent,
  colorFrom = "#22d3ee",
  colorTo = "#a78bfa",
}: {
  percent: number;
  colorFrom?: string;
  colorTo?: string;
}) {
  const gradientId = useId(); // id duy nhất tránh trùng khi có nhiều vòng trên 1 trang
  const R = 58;
  const C = 2 * Math.PI * R;

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 140 140" className="h-full w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
        </defs>
        {/* Vòng nền mờ */}
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        {/* Vòng điểm chạy dần */}
        <motion.circle
          cx="70"
          cy="70"
          r={R}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (C * Math.min(percent, 100)) / 100 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.25 }}
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <span className="text-4xl font-black text-white">{percent}</span>
          <span className="text-lg font-bold text-slate-500">%</span>
        </div>
      </div>
    </div>
  );
}

export function ResultReview({ results }: { results: ReviewItem[] }) {
  return (
    <div className="mt-10">
      <h3 className="text-lg font-extrabold text-white">
        Giải thích từng câu
      </h3>

      <div className="mt-4 space-y-4">
        {results.map((r, idx) => (
          <div key={idx} className="glass rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Câu {idx + 1}
              </span>
              {r.topicName && (
                <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                  {r.topicName}
                </span>
              )}
              {r.isCorrect ? (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} /> Đúng
                </span>
              ) : (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-400/10 px-3 py-1 text-xs font-bold text-rose-300">
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                  {r.selectedIndex === null ? "Bỏ trống" : "Sai"}
                </span>
              )}
            </div>

            <p className="mt-2.5 font-bold text-white">{r.content}</p>

            <div className="mt-3 grid gap-2 text-sm">
              {r.options.map((opt, i) => {
                const isCorrect = i === r.correctIndex;
                const isChosen = i === r.selectedIndex;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
                      isCorrect
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                        : isChosen
                          ? "border-rose-400/50 bg-rose-400/10 text-rose-200"
                          : "border-white/8 text-slate-500"
                    }`}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-current/30 text-xs font-black">
                      {LETTERS[i]}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {isCorrect && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
                    {!isCorrect && isChosen && <X className="h-4 w-4 shrink-0" strokeWidth={3} />}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3.5 text-sm leading-relaxed text-slate-300">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>{r.explanation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
