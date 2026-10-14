"use client";

import { useEffect, useState } from "react";
import { Clock3, Loader2, Play, Trophy } from "lucide-react";
import { QuizExperience, type QuizConfig, type QuizResumeState } from "@/components/quiz/quiz-experience";
import { MOCK_EXAMS, type MockExamDefinition } from "@/lib/mock-exams";
import {
  clearGuestPausedExam,
  getGuestPausedExamSnapshot,
  parseGuestPausedExam,
} from "@/lib/guest-session";
import { readQuizProgress } from "@/lib/quiz-progress";

type ExamStat = { attemptCount: number; averagePercent: number | null };
type ResumedSession = QuizResumeState & { examId: string | null };

const COLORS = {
  basic: { from: "#22d3ee", to: "#0284c7" },
  advanced: { from: "#c084fc", to: "#7c3aed" },
};

function examConfig(exam: MockExamDefinition | null, totalAvailable: number): QuizConfig {
  const color = exam ? COLORS[exam.level] : { from: "#22d3ee", to: "#a78bfa" };
  return {
    topicId: null,
    topicName: exam ? `${exam.name} · ${exam.description}` : "Đề thi thử tổng hợp",
    mode: "exam",
    colorFrom: color.from,
    colorTo: color.to,
    totalAvailable,
    examSeconds: 30 * 60,
    examQuestionCount: 40,
    examId: exam?.id,
  };
}

export function MockExamCatalog({
  totalAvailable,
  stats,
  resumeSessionId,
  resumeGuest = false,
}: {
  totalAvailable: number;
  stats: Record<string, ExamStat>;
  resumeSessionId?: string;
  resumeGuest?: boolean;
}) {
  const [selected, setSelected] = useState<MockExamDefinition | null | undefined>(undefined);
  const [resumed, setResumed] = useState<ResumedSession | null>(null);
  const [resumeError, setResumeError] = useState("");
  const [resuming, setResuming] = useState(Boolean(resumeSessionId || resumeGuest));
  const [checkingActiveExam, setCheckingActiveExam] = useState(true);

  useEffect(() => {
    if (resumeGuest) {
      void Promise.resolve().then(() => {
        const saved = parseGuestPausedExam(getGuestPausedExamSnapshot());
        if (!saved) {
          setResumeError("Không tìm thấy tiến trình Guest trong tab này.");
        } else {
          setResumed({ ...saved, token: null });
          setSelected(saved.examId ? MOCK_EXAMS.find((exam) => exam.id === saved.examId) ?? null : null);
          clearGuestPausedExam();
        }
      }).finally(() => setResuming(false));
      return;
    }
    if (!resumeSessionId) {
      void Promise.resolve().then(() => {
        const saved = readQuizProgress();
        if (saved?.mode === "exam") {
          setSelected(
            saved.examId
              ? MOCK_EXAMS.find((exam) => exam.id === saved.examId) ?? null
              : null
          );
        }
        setCheckingActiveExam(false);
      });
      return;
    }
    void fetch(`/api/mock-exams/sessions/${encodeURIComponent(resumeSessionId)}/resume`, { method: "POST" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Không thể tiếp tục bài thi.");
        setResumed(data as ResumedSession);
        setSelected(data.examId ? MOCK_EXAMS.find((exam) => exam.id === data.examId) ?? null : null);
      })
      .catch((error: unknown) => {
        setResumeError(error instanceof Error ? error.message : "Không thể tiếp tục bài thi.");
      })
      .finally(() => setResuming(false));
  }, [resumeGuest, resumeSessionId]);

  if (checkingActiveExam && !resumeGuest && !resumeSessionId) {
    return (
      <div role="status" className="mx-auto flex min-h-[55vh] max-w-4xl items-center justify-center gap-3 px-4 text-sm font-bold text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" />
        Đang kiểm tra bài thi đang làm...
      </div>
    );
  }
  if (resuming) {
    return <div className="mx-auto flex min-h-[55vh] max-w-4xl items-center justify-center gap-3 px-4 text-sm font-bold text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /> Đang khôi phục bài thi...</div>;
  }
  if (resumed && selected !== undefined) {
    return <QuizExperience config={examConfig(selected, totalAvailable)} resumeState={resumed} />;
  }
  if (selected !== undefined) {
    return (
      <QuizExperience
        config={examConfig(selected, totalAvailable)}
        onBackToCatalog={() => setSelected(undefined)}
      />
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pt-28 pb-24 sm:px-6">
      <p className="text-sm font-bold tracking-[0.25em] text-cyan-300 uppercase">Luyện tập như thi thật</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Chọn đề thi thử</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
        Mỗi đề có 40 câu và thời gian làm bài 30 phút. Kết quả từng đề được thống kê riêng.
      </p>

      {resumeError && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{resumeError}</p>}

      <button
        type="button"
        onClick={() => setSelected(null)}
        className="glass mt-8 flex w-full items-center justify-between gap-4 rounded-2xl border border-cyan-300/30 p-5 text-left transition hover:bg-white/[0.08] sm:p-6"
      >
        <span>
          <span className="block text-lg font-black text-white">Đề thi thử tổng hợp</span>
          <span className="mt-1 block text-sm text-slate-400">Câu hỏi cơ bản và nâng cao từ cả 6 chuyên đề</span>
        </span>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-300/15 text-cyan-200"><Play className="h-5 w-5" /></span>
      </button>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Đề thi tự chọn</h2>
          <p className="mt-1 text-sm text-slate-500">7 đề cơ bản · 8 đề nâng cao</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_EXAMS.map((exam) => {
          const stat = stats[exam.id] ?? { attemptCount: 0, averagePercent: null };
          const color = COLORS[exam.level];
          return (
            <button
              key={exam.id}
              type="button"
              onClick={() => setSelected(exam)}
              className="glass rounded-2xl border border-white/10 p-5 text-left transition hover:-translate-y-0.5 hover:border-white/25"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-lg font-black text-white">{exam.name}</span>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ color: color.from, backgroundColor: `${color.from}1a` }}>{exam.description}</span>
              </span>
              <span className="mt-4 flex items-center gap-2 text-sm text-slate-400"><Clock3 className="h-4 w-4" />40 câu · 30 phút</span>
              <span className="mt-3 flex items-center justify-between border-t border-white/8 pt-3 text-xs text-slate-500">
                <span>{stat.attemptCount} lượt thi</span>
                <span className="inline-flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-amber-300" />{stat.averagePercent === null ? "Chưa có điểm" : `Trung bình ${Math.round(stat.averagePercent)}%`}</span>
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
