"use client";
// ============================================================================
// QUIZ ENGINE — "bộ máy" của toàn bộ web, một Client Component duy nhất xử lý
// trọn luồng:  CHỌN CẤU HÌNH → LÀM BÀI → NỘP & CHẤM ĐIỂM → XEM KẾT QUẢ.
//
// Luồng dữ liệu (đọc là hiểu cách một web fullstack hoạt động):
//   1. fetch GET /api/questions  → server rút ngẫu nhiên câu hỏi (không đáp án)
//   2. Ngườat dùng làm bài → đáp án lưu trong useState ở trình duyệt
//   3. fetch POST /api/attempts  → server chấm điểm + lưu DB + trả kết quả
//   4. Hiển thị kết quả + giải thích
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  AlarmClock,
  BookOpenCheck,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  RotateCcw,
  History,
  ListChecks,
  Timer,
  AlarmClockOff,
  Trophy,
  TriangleAlert,
  ShieldCheck,
  Lightbulb,
  House,
  LogOut,
} from "lucide-react";
import type { PublicQuestion } from "@/lib/queries";
import {
  addGuestExamResult,
  clearGuestPausedExam,
  hasValidGuestSession,
  saveGuestPausedExam,
} from "@/lib/guest-session";
import {
  clearQuizProgress,
  QUIZ_PROGRESS_KEY,
  readQuizProgress,
} from "@/lib/quiz-progress";
import {
  ScoreRing,
  ResultReview,
  type ReviewItem,
} from "@/components/quiz/result-review";

export type QuizConfig = {
  topicId: string | null; // null = đề thi thử tổng hợp
  topicName: string;
  mode: "practice" | "study" | "exam";
  colorFrom: string;
  colorTo: string;
  totalAvailable: number; // số câu hiện có trong DB
  examSeconds?: number; // thờat gian đếm ngược (chế độ thi thử)
  examQuestionCount?: number; // số câu của đề thi thử
  examId?: string;
};

type GradeResponse = {
  attemptId?: number | null;
  correctCount: number;
  total: number;
  results: ReviewItem[];
};

type QuizQuestion = PublicQuestion & {
  correctIndex?: number;
  explanation?: string;
};

export type QuizResumeState = {
  token: string | null;
  questions: PublicQuestion[];
  answers: (number | null)[];
  markedForReview: boolean[];
  currentIndex: number;
  elapsedSec: number;
};

const LETTERS = ["A", "B", "C", "D"];

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function QuizExperience({
  config,
  resumeState,
  onBackToCatalog,
}: {
  config: QuizConfig;
  resumeState?: QuizResumeState;
  onBackToCatalog?: () => void;
}) {
  const [activeMode, setActiveMode] = useState<QuizConfig["mode"]>(config.mode);
  const isExam = activeMode === "exam";
  const isStudy = activeMode === "study";
  const examSeconds = config.examSeconds ?? 900;
  const examCount = config.examQuestionCount ?? 20;

  // Các lựa chọn số câu cho chế độ luyện tập
  const countChoices = [
    ...new Set(
      [5, 10, 20, 40, 80, config.totalAvailable].filter(
        (n) => n > 0 && n <= config.totalAvailable
      )
    ),
  ];

  const [phase, setPhase] = useState<"setup" | "playing" | "result">(resumeState ? "playing" : "setup");
  const [selectedCount, setSelectedCount] = useState(
    countChoices.includes(10) ? 10 : countChoices[0]
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>(resumeState?.questions ?? []);
  const [answers, setAnswers] = useState<(number | null)[]>(resumeState?.answers ?? []);
  const [markedForReview, setMarkedForReview] = useState<boolean[]>(resumeState?.markedForReview ?? []);
  const [current, setCurrent] = useState(resumeState?.currentIndex ?? 0);
  const [direction, setDirection] = useState(1);
  const [elapsed, setElapsed] = useState(resumeState?.elapsedSec ?? 0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [examSessionToken, setExamSessionToken] = useState<string | null>(resumeState?.token ?? null);
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [restoringProgress, setRestoringProgress] = useState(true);

  const submittingRef = useRef(false);
  const restoredRef = useRef(false);
  const elapsedRef = useRef(elapsed);
  const configKey = JSON.stringify([
    config.topicId,
    config.topicName,
    config.mode,
    config.examId ?? null,
  ]);

  const answeredCount = answers.filter((a) => a !== null).length;
  const markedCount = markedForReview.filter(Boolean).length;

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (resumeState) {
        clearQuizProgress();
        restoredRef.current = true;
        setRestoringProgress(false);
        return;
      }

      const saved = readQuizProgress();
      if (saved?.configKey === configKey) {
        const elapsedSinceSave =
          saved.mode === "exam"
            ? Math.floor((Date.now() - saved.savedAt) / 1000)
            : 0;
        setActiveMode(saved.mode);
        setSelectedCount(saved.selectedCount);
        setQuestions(saved.questions);
        setAnswers(saved.answers);
        setMarkedForReview(saved.markedForReview);
        setCurrent(saved.currentIndex);
        setElapsed(
          Math.min(
            config.examSeconds ?? 30 * 60,
            saved.elapsedSec + elapsedSinceSave
          )
        );
        setExamSessionToken(saved.examSessionToken);
        setPhase("playing");
      } else {
        clearQuizProgress();
      }
      restoredRef.current = true;
      setRestoringProgress(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [config.examSeconds, configKey, resumeState]);

  useEffect(() => {
    if (!restoredRef.current) return;
    if (phase !== "playing" || questions.length === 0) {
      clearQuizProgress();
      return;
    }
    try {
      sessionStorage.setItem(
        QUIZ_PROGRESS_KEY,
        JSON.stringify({
          configKey,
          examId: config.examId ?? null,
          mode: activeMode,
          selectedCount,
          questions,
          answers,
          markedForReview,
          currentIndex: current,
          elapsedSec: elapsedRef.current,
          examSessionToken,
          savedAt: Date.now(),
        })
      );
    } catch (caught) {
      console.error("Không thể lưu tiến trình bài làm trong tab này:", caught);
    }
  }, [
    activeMode,
    answers,
    config.examId,
    configKey,
    current,
    examSessionToken,
    markedForReview,
    phase,
    questions,
    selectedCount,
  ]);

  // ---------------- Đồng hồ ----------------
  useEffect(() => {
    if (phase !== "playing" || !isExam) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase, isExam]);

  // ---------------- Nộp bài ----------------
  const doSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: config.topicId,
          mode: activeMode,
          examSessionToken: isExam ? examSessionToken : undefined,
          answers: questions.map((q, i) => ({
            questionId: q.id,
            selectedIndex: answers[i],
          })),
        }),
      });
      if (!res.ok) throw new Error("submit failed");
      const data: GradeResponse = await res.json();
      clearQuizProgress();
      if (!examSessionToken && hasValidGuestSession()) clearGuestPausedExam();
      if (isExam && !examSessionToken && hasValidGuestSession()) {
        addGuestExamResult({
          correctCount: data.correctCount,
          totalQuestions: data.total,
          timeTakenSec: Math.min(elapsed, examSeconds),
        });
      }
      setResult(data);
      setPhase("result");
      window.scrollTo({ top: 0 });
    } catch {
      setError("Không gửi được bài. Kiểm tra mạng rồi thử lại nhé!");
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }, [answers, questions, config, isExam, examSessionToken, activeMode, elapsed, examSeconds]);

  // Hết giờ (thi thử) → tự động nộp
  useEffect(() => {
    if (phase === "playing" && isExam && elapsed >= examSeconds) {
      const timeout = window.setTimeout(() => void doSubmit(), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [elapsed, phase, isExam, examSeconds, doSubmit]);

  // ---------------- Bắt đầu làm bài ----------------
  async function startQuiz() {
    setLoading(true);
    setError(null);
    try {
      const limit = isExam ? examCount : selectedCount;
      const params = new URLSearchParams({ limit: String(limit), mode: activeMode });
      if (config.topicId) params.set("topic", config.topicId);
      if (config.examId) params.set("examId", config.examId);
      const url = `/api/questions?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const sessionToken = isExam
        ? res.headers.get("X-Ontin-Exam-Session")
        : null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error();

      setQuestions(data);
      setAnswers(Array(data.length).fill(null));
      setMarkedForReview(Array(data.length).fill(false));
      setCurrent(0);
      setDirection(1);
      setElapsed(0);
      setExamSessionToken(sessionToken);
      setResult(null);
      setPhase("playing");
      window.scrollTo({ top: 0 });
    } catch {
      setError("Không tải được đề. Thử lại sau vài giây nhé!");
    } finally {
      setLoading(false);
    }

  }

  async function pauseExam() {
    setPausing(true);
    setError(null);
    try {
      if (!examSessionToken && hasValidGuestSession()) {
        saveGuestPausedExam({
          examId: config.examId ?? null,
          questions,
          answers,
          markedForReview,
          currentIndex: current,
          elapsedSec: Math.min(elapsed, examSeconds),
        });
        clearQuizProgress();
        window.location.assign("/lich-su");
        return;
      }
      if (!examSessionToken) throw new Error("Phiên thi không hợp lệ. Vui lòng đăng nhập lại.");
      const response = await fetch("/api/mock-exams/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: examSessionToken,
          answers,
          markedForReview,
          currentIndex: current,
        }),
      });
      const data: { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thể lưu tiến trình bài thi.");
      clearQuizProgress();
      window.location.assign("/lich-su");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu tiến trình bài thi.");
      setPauseConfirmOpen(false);
      setPausing(false);
    }
  }

  function choose(optionIndex: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = optionIndex;
      return next;
    });
  }

  function goTo(index: number) {
    if (index < 0 || index >= questions.length || index === current) return;
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  }

  function toggleReviewMark() {
    setMarkedForReview((prev) => {
      const next = [...prev];
      next[current] = !next[current];
      return next;
    });
  }

  // ---------------- Phím tắt ----------------
  useEffect(() => {
    if (phase !== "playing" || confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const q = questions[current];
      if (!q) return;
      const asNum = Number(e.key);
      if (asNum >= 1 && asNum <= q.options.length) {
        choose(asNum - 1);
        return;
      }
      const asLetter = ["a", "b", "c", "d"].indexOf(e.key.toLowerCase());
      if (asLetter >= 0 && asLetter < q.options.length) {
        choose(asLetter);
        return;
      }
      if (e.key === "ArrowRight") goTo(current + 1);
      if (e.key === "ArrowLeft") goTo(current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current, questions, confirmOpen]);

  // ==========================================================================
  // MÀN HÌNH 1: CHỌN CẤU HÌNH
  // ==========================================================================
  if (phase === "setup") {
    if (restoringProgress) {
      return (
        <div role="status" className="mx-auto flex min-h-[55vh] max-w-4xl items-center justify-center gap-3 px-4 text-sm font-bold text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang kiểm tra tiến trình bài làm...
        </div>
      );
    }
    return (
      <div className="relative mx-auto max-w-2xl px-4 pt-28 pb-24 sm:px-6 lg:pt-36">
        <div className="pointer-events-none absolute top-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-[110px]" style={{ background: `${config.colorFrom}26` }} />

        {onBackToCatalog && (
          <button
            type="button"
            onClick={onBackToCatalog}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-white/30 hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" />
            Quay lại chọn đề thi thử
          </button>
        )}

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass relative rounded-[2rem] p-7 sm:p-10"
        >
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase"
            style={{
              background: `linear-gradient(90deg, ${config.colorFrom}22, ${config.colorTo}22)`,
              color: config.colorFrom,
              border: `1px solid ${config.colorFrom}44`,
            }}
          >
            {isExam ? (
              <Timer className="h-3.5 w-3.5" />
            ) : isStudy ? (
              <BookOpenCheck className="h-3.5 w-3.5" />
            ) : (
              <ListChecks className="h-3.5 w-3.5" />
            )}
            {isExam ? "Chế độ thi thử" : isStudy ? "Ôn tập từng câu" : "Luyện tập"}
          </span>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {config.topicName}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Câu hỏi là tài liệu tham khảo do hệ thống biên soạn; hãy đối chiếu với giáo trình và hướng dẫn ôn thi chính thức.
          </p>

          {config.mode !== "exam" && (
            <div className="mt-6">
              <p className="text-sm font-bold text-slate-200">Chọn cách học</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setActiveMode("study")}
                  aria-pressed={isStudy}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    isStudy
                      ? "border-cyan-300/50 bg-cyan-300/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="flex items-center gap-2 font-black text-white">
                    <BookOpenCheck className="h-4 w-4 text-cyan-300" />
                    Ôn tập từng câu
                  </span>
                  <span className="mt-2 block text-xs leading-relaxed text-slate-400">
                    Chọn đáp án xong xem ngay đáp án đúng và giải thích chi tiết.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode("practice")}
                  aria-pressed={!isStudy}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    !isStudy
                      ? "border-violet-300/50 bg-violet-300/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="flex items-center gap-2 font-black text-white">
                    <ListChecks className="h-4 w-4 text-violet-300" />
                    Luyện tập
                  </span>
                  <span className="mt-2 block text-xs leading-relaxed text-slate-400">
                    Không tính giờ, không lưu lượt làm; hoàn thành để xem đáp án và số câu đúng.
                  </span>
                </button>
              </div>
            </div>
          )}

          {isExam ? (
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-3">
                <ListChecks className="h-4.5 w-4.5 shrink-0 text-cyan-300" />
                <span><b className="text-white">{examCount} câu</b> trộn ngẫu nhiên từ 6 chuyên đề, gồm cơ bản và nâng cao</span>
              </li>
              <li className="flex items-center gap-3">
                <AlarmClock className="h-4.5 w-4.5 shrink-0 text-violet-300" />
                <span><b className="text-white">{formatTime(examSeconds)}</b> đồng hồ đếm ngược như thi thật</span>
              </li>
              <li className="flex items-center gap-3">
                <AlarmClockOff className="h-4.5 w-4.5 shrink-0 text-pink-300" />
                <span>Hết giờ hệ thống <b className="text-white">tự nộp bài</b> — đừng lo lưu lại tay</span>
              </li>
            </ul>
          ) : (
            <>
              <p className="mt-5 text-sm text-slate-400">
                Chọn số câu hỏi cho buổi ôn hôm nay (có sẵn{" "}
                <b className="text-slate-200">{config.totalAvailable} câu</b>, mỗi lần làm đều được trộn mới):
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {countChoices.map((n) => {
                  const isAll = n === config.totalAvailable && n !== 5 && n !== 10;
                  const active = selectedCount === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setSelectedCount(n)}
                      className={`rounded-xl px-5 py-3 text-sm font-bold transition-all ${
                        active
                          ? "text-ink-950"
                          : "border border-white/12 text-slate-300 hover:border-white/30"
                      }`}
                      style={
                        active
                          ? { background: `linear-gradient(90deg, ${config.colorFrom}, ${config.colorTo})` }
                          : undefined
                      }
                    >
                      {isAll ? `Tất cả (${n})` : `${n} câu`}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <p className="mt-6 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            Mẹo: bấm
            <span className="keycap">1</span>–<span className="keycap">4</span> để chọn đáp án,
            <span className="keycap">←</span><span className="keycap">→</span> để chuyển câu
          </p>

          {error && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-300">
              <TriangleAlert className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <button
            onClick={startQuiz}
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-base font-black text-ink-950 shadow-xl transition-all hover:brightness-110 disabled:opacity-60"
            style={{
              background: `linear-gradient(90deg, ${config.colorFrom}, ${config.colorTo})`,
              boxShadow: `0 18px 44px -14px ${config.colorFrom}80`,
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.6} />
                Đang trộn đề...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" strokeWidth={2.8} />
                Bắt đầu làm bài
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  // ==========================================================================
  // MÀN HÌNH 2: ĐANG LÀM BÀI
  // ==========================================================================
  if (phase === "playing") {
    const q = questions[current];
    const remaining = Math.max(0, examSeconds - elapsed);
    const lowTime = isExam && remaining <= 60;

    return (
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6">
        {/* Thanh trạng thái */}
        <div className="glass sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${config.colorFrom}33, ${config.colorTo}22)`,
                color: config.colorFrom,
              }}
            >
              <ListChecks className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white sm:text-base">
                {isExam ? "Đề thi thử mô phỏng" : isStudy ? "Ôn tập từng câu" : "Luyện tập theo chuyên đề"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {config.topicName} · {isExam ? `${examCount} câu · ${formatTime(examSeconds)}` : `${questions.length} câu`}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isExam && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-black tabular-nums ${
                  lowTime
                    ? "animate-pulse border-rose-400/40 bg-rose-400/10 text-rose-300"
                    : "border-white/10 bg-white/5 text-white"
                }`}
              >
                <AlarmClock className="h-4 w-4" />
                {formatTime(remaining)}
              </span>
            )}
            {isExam && (
              <button
                type="button"
                onClick={() => setPauseConfirmOpen(true)}
                disabled={pausing || submitting}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-black text-white transition hover:bg-white/10 disabled:opacity-60"
              >
                <LogOut className="h-3.5 w-3.5" />
                Thoát & tạm dừng
              </button>
            )}
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black text-ink-950 transition-all hover:brightness-110 disabled:opacity-60"
              style={{ background: `linear-gradient(90deg, ${config.colorFrom}, ${config.colorTo})` }}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" strokeWidth={2.6} />}
              {isExam ? "Nộp bài" : "Hoàn thành"}
            </button>
          </div>
        </div>

        {/* Thanh tiến độ */}
        <div className="glass mt-3 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-300">
              Tiến độ bài làm: {answeredCount}/{questions.length} câu ({Math.round((answeredCount / questions.length) * 100)}%)
            </span>
            <span className="hidden text-[11px] text-slate-500 sm:inline">
              Câu trả lời được giữ trong lượt làm bài hiện tại
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(answeredCount / questions.length) * 100}%`,
                background: `linear-gradient(90deg, ${config.colorFrom}, ${config.colorTo})`,
              }}
            />
          </div>
          <span className="mt-2 block text-[11px] text-slate-500 sm:hidden">
            Câu trả lời được giữ trong lượt làm bài hiện tại
          </span>
        </div>

        {error && (
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-300">
            <TriangleAlert className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {/* Thẻ câu hỏi */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
            key={current}
            initial={{ opacity: 0, x: 48 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -48 * direction }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="glass rounded-3xl p-5 sm:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl text-sm font-black text-ink-950"
                  style={{ background: `linear-gradient(135deg, ${config.colorFrom}, ${config.colorTo})` }}
                >
                  {String(current + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                    Câu {String(current + 1).padStart(2, "0")} / {questions.length}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {isStudy ? "Ôn tập · Xem giải thích sau khi chọn" : "Trắc nghiệm · Chọn một đáp án"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleReviewMark}
                aria-pressed={markedForReview[current]}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                  markedForReview[current]
                    ? "border-violet-400/40 bg-violet-400/15 text-violet-200"
                    : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Bookmark className="h-4 w-4" fill={markedForReview[current] ? "currentColor" : "none"} />
                {markedForReview[current] ? "Đã đánh dấu" : "Đánh dấu xem lại"}
              </button>
            </div>
            <h2 className="mt-5 text-lg leading-relaxed font-extrabold text-white sm:text-xl">
              {q.content}
            </h2>
            <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${q.difficulty === "advanced" ? "bg-violet-300/10 text-violet-200" : "bg-cyan-300/10 text-cyan-200"}`}>
              {q.difficulty === "advanced" ? "Nâng cao" : "Cơ bản"}
            </span>

            <div className="mt-6 grid gap-2.5">
              {q.options.map((opt, i) => {
                const active = answers[current] === i;
                const revealed = isStudy && answers[current] !== null;
                const correct = revealed && q.correctIndex === i;
                const wrongSelection = revealed && active && !correct;
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={revealed}
                    className={`group flex min-h-14 items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left text-sm transition-all sm:text-base ${
                      correct
                        ? "border-emerald-400/50 bg-emerald-400/10 font-semibold text-emerald-100"
                        : wrongSelection
                          ? "border-rose-400/50 bg-rose-400/10 font-semibold text-rose-100"
                          : active
                            ? "font-semibold text-white"
                            : "border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/[0.03]"
                    }`}
                    style={
                      active && !revealed
                        ? {
                            borderColor: `${config.colorFrom}99`,
                            background: `linear-gradient(90deg, ${config.colorFrom}1f, ${config.colorTo}14)`,
                            boxShadow: `0 0 0 1px ${config.colorFrom}55`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-xs font-black transition-all ${
                        active ? "text-ink-950" : "border-white/15 text-slate-400 group-hover:border-white/30"
                      }`}
                      style={
                        active && !revealed
                          ? { background: `linear-gradient(135deg, ${config.colorFrom}, ${config.colorTo})`, borderColor: "transparent" }
                          : undefined
                      }
                    >
                      {LETTERS[i]}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {isStudy &&
              answers[current] !== null &&
              q.correctIndex !== undefined &&
              q.explanation !== undefined && (
              <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4 sm:p-5">
                <p className="flex items-center gap-2 text-sm font-black text-cyan-200">
                  <Lightbulb className="h-4 w-4" />
                  Đáp án và giải thích
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  Đáp án đúng: {LETTERS[q.correctIndex]}. {q.options[q.correctIndex]}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {q.explanation}
                </p>
              </div>
            )}

            {/* Nút trước / sau */}
            <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5">
              <button
                onClick={() => goTo(current - 1)}
                disabled={current === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 px-4 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} /> Trước
              </button>
              {current === questions.length - 1 ? (
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-ink-950 transition-all hover:brightness-110"
                  style={{ background: `linear-gradient(90deg, ${config.colorFrom}, ${config.colorTo})` }}
                >
                  {isExam ? "Nộp bài" : "Hoàn thành"} <Send className="h-4 w-4" strokeWidth={2.6} />
                </button>
              ) : (
                <button
                  onClick={() => goTo(current + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-black text-ink-950 transition-all hover:brightness-110"
                  style={{ background: `linear-gradient(90deg, ${config.colorFrom}, ${config.colorTo})` }}
                >
                  Câu tiếp <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </motion.div>
            </AnimatePresence>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-40">
            {/* Ma trận câu hỏi */}
            <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-xs font-bold tracking-wider text-slate-300 uppercase">
              Ma trận câu hỏi
            </p>
            <p className="text-xs text-slate-500">
              {answeredCount} đã làm · {questions.length - answeredCount} chưa làm · {markedCount} xem lại
            </p>
          </div>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 px-1 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: config.colorFrom }} />
              Đã trả lời
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-white/20" />
              Chưa làm
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Bookmark className="h-3 w-3 text-violet-300" />
              Cần xem lại
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, i) => {
              const answered = answers[i] !== null;
              const isCurrent = i === current;
              const marked = markedForReview[i];
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Câu ${i + 1}${answered ? ", đã trả lời" : ", chưa làm"}${marked ? ", đánh dấu xem lại" : ""}${isCurrent ? ", câu hiện tại" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`relative grid h-11 place-items-center rounded-lg text-xs font-black transition-all ${
                    marked
                      ? "bg-violet-400/20 text-violet-200 hover:bg-violet-400/30"
                      : answered
                        ? "text-ink-950"
                        : "border border-white/10 text-slate-400 hover:border-white/30 hover:text-white"
                  } ${isCurrent ? "ring-2 ring-white ring-offset-2 ring-offset-ink-950" : ""}`}
                  style={answered && !marked ? { background: `linear-gradient(135deg, ${config.colorFrom}, ${config.colorTo})` } : undefined}
                >
                  {i + 1}
                  {marked && <Bookmark className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-ink-900 p-0.5 text-violet-300" fill="currentColor" />}
                </button>
              );
            })}
          </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={submitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-ink-950 transition hover:brightness-110 disabled:opacity-60"
                style={{ background: `linear-gradient(90deg, ${config.colorFrom}, ${config.colorTo})` }}
              >
                <Send className="h-4 w-4" />
                {isExam ? "Hoàn thành & nộp bài" : "Hoàn thành buổi ôn"}
              </button>
            </div>

            <div className="glass rounded-2xl p-4 sm:p-5">
              <p className="flex items-center gap-2 text-sm font-black text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Quy chế phòng thi
              </p>
              <ul className="mt-3 space-y-3 text-xs leading-relaxed text-slate-400">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  Chọn một phương án cho mỗi câu; có thể đổi đáp án trước khi nộp.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  Dùng ma trận để chuyển nhanh và đánh dấu câu muốn xem lại.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  {isExam
                    ? "Khi hết giờ, bài thi sẽ được tự động nộp."
                    : isStudy
                      ? "Đáp án hiện ngay sau khi chọn; kết quả không được lưu."
                      : "Hoàn thành để xem đáp án và số câu đúng; kết quả không được lưu."}
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  {isStudy
                    ? "Mỗi câu hiện đáp án và giải thích ngay sau khi chọn."
                    : "Đáp án và giải thích hiện sau khi hoàn thành buổi luyện."}
                </li>
              </ul>
              <div className="mt-4 flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[10px]">
                <span className="text-slate-500">
                  {isExam ? "Chế độ thi có giới hạn thời gian" : "Không tính thời gian · Không lưu tiến trình"}
                </span>
                <span className="font-bold text-emerald-300">Đang làm bài</span>
              </div>
            </div>
          </aside>
        </div>

        {/* Modal xác nhận nộp bài */}
        <AnimatePresence>
          {confirmOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
              onClick={() => setConfirmOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="glass w-full max-w-md rounded-3xl bg-ink-900/90 p-7"
              >
                <h3 className="text-xl font-black text-white">
                  {isExam ? "Nộp bài ngay?" : "Hoàn thành buổi ôn?"}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Bạn đã làm <b className="text-white">{answeredCount}/{questions.length}</b> câu.
                  {answeredCount < questions.length && (
                    <> Còn <b className="text-amber-300">{questions.length - answeredCount} câu chưa trả lời</b>.</>
                  )}
                </p>
                {!isExam && (
                  <p className="mt-2 text-sm text-slate-400">
                    Kết quả chỉ hiển thị cho buổi này; không tính vào điểm trung bình hoặc lịch sử.
                  </p>
                )}
                {markedCount > 0 && (
                  <p className="mt-2 text-sm text-slate-400">
                    Bạn đã đánh dấu <b className="text-violet-300">{markedCount} câu</b> để xem lại.
                  </p>
                )}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfirmOpen(false)}
                    className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-white/5"
                  >
                    Làm tiếp
                  </button>
                  <button
                    onClick={doSubmit}
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-ink-950 transition-all hover:brightness-110 disabled:opacity-60"
                    style={{ background: `linear-gradient(90deg, ${config.colorFrom}, ${config.colorTo})` }}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2.6} />}
                    {isExam ? "Nộp bài" : "Hoàn thành"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pauseConfirmOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
              onClick={() => !pausing && setPauseConfirmOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(event) => event.stopPropagation()}
                className="glass w-full max-w-md rounded-3xl bg-ink-900/90 p-7"
              >
                <h3 className="text-xl font-black text-white">Tạm dừng bài thi?</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Tiến trình {answeredCount}/{questions.length} câu và thời gian còn lại sẽ được lưu vào Lịch sử. Đồng hồ dừng cho đến khi bạn tiếp tục.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPauseConfirmOpen(false)}
                    disabled={pausing}
                    className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/5 disabled:opacity-60"
                  >
                    Làm tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => void pauseExam()}
                    disabled={pausing}
                    className="flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-ink-950 disabled:opacity-60"
                  >
                    {pausing && <Loader2 className="h-4 w-4 animate-spin" />}
                    {pausing ? "Đang lưu..." : "Tạm dừng"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ==========================================================================
  // MÀN HÌNH 3: KẾT QUẢ + GIẢI THÍCH
  // ==========================================================================
  if (!result) return null;
  const percent = Math.round((result.correctCount / result.total) * 100);
  const score10 = ((result.correctCount / result.total) * 10).toFixed(1);
  const praise =
    percent >= 80
      ? "Xuất sắc! Kiến thức của bạn rất chắc."
      : percent >= 50
        ? "Khá ổn! Ôn lại các câu sai bên dưới là đẹp."
        : "Chưa cao lắm — đọc kỹ giải thích rồi làm lại nhé, bạn làm được!";

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass rounded-[2rem] p-7 text-center sm:p-10"
      >
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase"
          style={{
            background: `linear-gradient(90deg, ${config.colorFrom}22, ${config.colorTo}22)`,
            color: config.colorFrom,
            border: `1px solid ${config.colorFrom}44`,
          }}
        >
          <Trophy className="h-3.5 w-3.5" />
          Kết quả · {config.topicName}
        </span>

        {isExam ? (
          <>
            <div className="mt-7">
              <ScoreRing percent={percent} colorFrom={config.colorFrom} colorTo={config.colorTo} />
            </div>
            <p className="mt-5 text-4xl font-black text-white">
              {score10}
              <span className="text-xl font-bold text-slate-500"> / 10 điểm</span>
            </p>
            <p className="mt-2 text-sm text-slate-400">{praise}</p>
          </>
        ) : (
          <div className="mt-7">
            <p className="text-3xl font-black text-white">
              Đúng {result.correctCount} / {result.total} câu
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {isStudy
                ? "Kết quả chỉ dành cho buổi ôn này; không được lưu vào điểm trung bình hoặc lịch sử."
                : "Đáp án được hiển thị sau khi hoàn thành; buổi luyện này không được lưu."}
            </p>
          </div>
        )}

        <div className={`mx-auto mt-7 grid max-w-md divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] py-4 ${isExam ? "grid-cols-3" : "grid-cols-2"}`}>
          <div>
            <p className="text-xl font-black text-emerald-300">{result.correctCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Câu đúng</p>
          </div>
          <div>
            <p className="text-xl font-black text-rose-300">{result.total - result.correctCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Sai / bỏ trống</p>
          </div>
          {isExam && (
            <div>
              <p className="text-xl font-black text-white tabular-nums">{formatTime(Math.min(elapsed, examSeconds))}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">Thời gian</p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setPhase("setup")}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black text-ink-950 transition-all hover:brightness-110"
            style={{
              background: `linear-gradient(90deg, ${config.colorFrom}, ${config.colorTo})`,
              boxShadow: `0 14px 36px -12px ${config.colorFrom}80`,
            }}
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.6} />
            Làm đề mới
          </button>
          {isExam && <Link
            href="/lich-su"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            <History className="h-4 w-4 text-cyan-300" />
            Xem lịch sử thi thử
          </Link>}
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            <House className="h-4 w-4 text-cyan-300" />
            Về trang chủ
          </Link>
        </div>
      </motion.div>

      <ResultReview results={result.results} />
    </div>
  );
}
