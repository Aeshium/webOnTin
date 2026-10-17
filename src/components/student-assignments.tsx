"use client";

import { useEffect, useState } from "react";

type SubmissionHistory = {
  id: number;
  startedAt: string | null;
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
};
type AssignmentView = {
  id: number;
  title: string;
  description: string;
  dueAt: string | null;
  durationSec: number;
  courseTitle: string;
  latestSubmission: SubmissionHistory | null;
  resultHistory: SubmissionHistory[];
};
type QuizQuestion = {
  id: number;
  content: string;
  options: string[];
  order: number;
  correctIndex?: number;
  explanation?: string;
};
type AssignmentDetail = AssignmentView & {
  questions: QuizQuestion[];
  latestSubmission: (SubmissionHistory & {
    currentIndex: number;
    selectedAnswers: (number | null)[] | null;
  }) | null;
};
type ActiveQuiz = {
  assignment: AssignmentDetail;
  sessionId: number;
  answers: (number | null)[];
  currentIndex: number;
  startedAt: string;
};

function formatDuration(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function StudentAssignments() {
  const [items, setItems] = useState<AssignmentView[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadAssignments() {
    const response = await fetch("/api/assignments", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Không tải được bài tập.");
    setItems(result);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/assignments", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Không tải được bài tập.");
        if (active) setItems(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Không tải được bài tập.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeQuiz) return;
    const startedAt = new Date(activeQuiz.startedAt).getTime();
    const durationEnd = startedAt + activeQuiz.assignment.durationSec * 1000;
    const dueEnd = activeQuiz.assignment.dueAt ? new Date(activeQuiz.assignment.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const expiresAt = Math.min(durationEnd, dueEnd);
    const update = () => setRemainingSec(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [activeQuiz]);

  async function openQuiz(item: AssignmentView) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const startResponse = await fetch(`/api/assignments/${item.id}/start`, { method: "POST" });
      const session = await startResponse.json();
      if (!startResponse.ok) throw new Error(session.error ?? "Không thể bắt đầu bài tập.");
      const detailResponse = await fetch(`/api/assignments/${item.id}`, { cache: "no-store" });
      const detail = await detailResponse.json() as AssignmentDetail & { error?: string };
      if (!detailResponse.ok) throw new Error(detail.error ?? "Không tải được nội dung bài tập.");
      if (!session.startedAt || detail.questions.length === 0) throw new Error("Bài tập chưa có câu hỏi hoặc phiên làm bài không hợp lệ.");
      const latestSubmission = detail.latestSubmission;
      const isResumingSession = latestSubmission !== null && latestSubmission.id === session.id;
      const savedAnswers = isResumingSession ? latestSubmission?.selectedAnswers : null;
      setActiveQuiz({
        assignment: detail,
        sessionId: session.id,
        answers: Array.from({ length: detail.questions.length }, (_, index) => savedAnswers?.[index] ?? null),
        currentIndex: isResumingSession
          ? Math.min(latestSubmission?.currentIndex ?? 0, detail.questions.length - 1)
          : 0,
        startedAt: session.startedAt,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể bắt đầu bài tập.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProgress(answers: (number | null)[], currentIndex: number) {
    if (!activeQuiz) return false;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/assignments/${activeQuiz.assignment.id}/start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeQuiz.sessionId,
          questionIds: activeQuiz.assignment.questions.map((question) => question.id),
          answers,
          currentIndex,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không lưu được tiến trình.");
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được tiến trình.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function chooseAnswer(optionIndex: number) {
    if (!activeQuiz) return;
    const answers = [...activeQuiz.answers];
    answers[activeQuiz.currentIndex] = optionIndex;
    setActiveQuiz({ ...activeQuiz, answers });
    await saveProgress(answers, activeQuiz.currentIndex);
  }

  async function goToQuestion(index: number) {
    if (!activeQuiz || index < 0 || index >= activeQuiz.assignment.questions.length) return;
    setActiveQuiz({ ...activeQuiz, currentIndex: index });
    await saveProgress(activeQuiz.answers, index);
  }

  async function submitQuiz() {
    if (!activeQuiz || busy || remainingSec === 0 && Date.now() > Math.min(
      new Date(activeQuiz.startedAt).getTime() + activeQuiz.assignment.durationSec * 1000,
      activeQuiz.assignment.dueAt ? new Date(activeQuiz.assignment.dueAt).getTime() : Number.POSITIVE_INFINITY
    ) + 15_000) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/assignments/${activeQuiz.assignment.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeQuiz.sessionId,
          questionIds: activeQuiz.assignment.questions.map((question) => question.id),
          answers: activeQuiz.answers,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không nộp được bài.");
      const detailResponse = await fetch(`/api/assignments/${activeQuiz.assignment.id}`, { cache: "no-store" });
      const detail: AssignmentDetail = await detailResponse.json();
      if (!detailResponse.ok) throw new Error("Đã nộp bài nhưng không tải được kết quả.");
      setActiveQuiz({ ...activeQuiz, assignment: detail });
      setNotice(`Đã nộp bài. Kết quả: ${result.correctCount}/${result.totalQuestions} câu đúng.`);
      await loadAssignments();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không nộp được bài.");
    } finally {
      setBusy(false);
    }
  }

  const question = activeQuiz?.assignment.questions[activeQuiz.currentIndex];
  const answer = activeQuiz?.answers[activeQuiz.currentIndex] ?? null;
  const submitted = Boolean(activeQuiz?.assignment.latestSubmission?.submittedAt);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Học tập</p>
      <h1 className="mt-2 text-3xl font-black text-white">Bài tập được giao</h1>
      <p className="mt-2 text-sm text-slate-400">Làm trắc nghiệm có giới hạn thời gian, lưu tiến trình tự động và xem lịch sử kết quả.</p>
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-300/10 p-3 text-sm text-emerald-200">{notice}</p>}

      {activeQuiz ? (
        <section className="mt-7 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-cyan-200">{activeQuiz.assignment.courseTitle}</p>
              <h2 className="mt-2 text-xl font-black text-white">{activeQuiz.assignment.title}</h2>
              {activeQuiz.assignment.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">{activeQuiz.assignment.description}</p>}
            </div>
            {!submitted && <div className={`rounded-xl border px-4 py-3 text-center ${remainingSec <= 60 ? "border-rose-300/30 bg-rose-300/10 text-rose-100" : "border-cyan-300/20 bg-cyan-300/5 text-cyan-100"}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider">Thời gian còn lại</p>
              <p className="mt-1 font-mono text-xl font-black tabular-nums">{formatDuration(remainingSec)}</p>
            </div>}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {activeQuiz.assignment.questions.map((item, index) => (
              <button key={item.id} type="button" disabled={submitted || saving} onClick={() => void goToQuestion(index)} className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-black ${activeQuiz.currentIndex === index ? "bg-cyan-300 text-ink-950" : activeQuiz.answers[index] !== null ? "bg-emerald-300/15 text-emerald-200" : "bg-white/5 text-slate-400"}`}>{index + 1}</button>
            ))}
          </div>
          {question && (
            <article className="mt-5 rounded-2xl border border-white/10 bg-ink-950/60 p-5">
              <p className="text-xs font-bold text-slate-500">Câu {activeQuiz.currentIndex + 1}/{activeQuiz.assignment.questions.length}</p>
              <h3 className="mt-2 text-base font-bold leading-relaxed text-white">{question.content}</h3>
              <div className="mt-4 space-y-2">
                {question.options.map((option, index) => {
                  const correct = submitted && index === question.correctIndex;
                  const incorrectSelected = submitted && answer === index && !correct;
                  const style = correct
                    ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                    : incorrectSelected
                      ? "border-rose-300/40 bg-rose-300/10 text-rose-100"
                      : answer === index
                        ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/30";
                  return <button key={index} type="button" disabled={submitted || saving || remainingSec === 0} onClick={() => void chooseAnswer(index)} className={`w-full rounded-xl border p-3 text-left text-sm disabled:cursor-not-allowed ${style}`}><span className="mr-2 font-black">{String.fromCharCode(65 + index)}.</span>{option}</button>;
                })}
              </div>
              {submitted && question.explanation && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-slate-300">{question.explanation}</p>}
            </article>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button type="button" disabled={activeQuiz.currentIndex === 0 || submitted || saving} onClick={() => void goToQuestion(activeQuiz.currentIndex - 1)} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 disabled:opacity-40">Câu trước</button>
            <div className="flex items-center gap-3">
              {!submitted && <span className="text-xs text-slate-500">{saving ? "Đang lưu..." : "Tiến trình được lưu tự động"}</span>}
              {activeQuiz.currentIndex < activeQuiz.assignment.questions.length - 1 && <button type="button" disabled={submitted || saving} onClick={() => void goToQuestion(activeQuiz.currentIndex + 1)} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-ink-950 disabled:opacity-40">Câu tiếp theo</button>}
              {!submitted && <button type="button" disabled={busy || saving} onClick={() => void submitQuiz()} className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-black text-ink-950 disabled:opacity-50">{busy ? "Đang nộp..." : remainingSec === 0 ? "Nộp bài ngay" : "Nộp bài"}</button>}
            </div>
          </div>
          {submitted && <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4">
            <p className="font-black text-emerald-100">Kết quả: {activeQuiz.assignment.latestSubmission?.score ?? 0}/100</p>
            {activeQuiz.assignment.latestSubmission?.feedback && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{activeQuiz.assignment.latestSubmission.feedback}</p>}
            <button type="button" onClick={() => setActiveQuiz(null)} className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-200">Quay lại danh sách</button>
          </div>}
        </section>
      ) : loading ? <p className="mt-8 text-sm text-slate-400">Đang tải...</p> : (
        <div className="mt-7 space-y-4">
          {items.map((item) => {
            const active = item.latestSubmission && !item.latestSubmission.submittedAt;
            const submittedAt = item.latestSubmission?.submittedAt;
            const expired = currentTime > 0 && item.dueAt !== null && new Date(item.dueAt).getTime() <= currentTime && !active;
            return <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-cyan-200">{item.courseTitle}</p>
                  <h2 className="mt-2 text-lg font-black text-white">{item.title}</h2>
                  {item.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">{item.description}</p>}
                  {item.dueAt && <p className="mt-3 text-xs text-amber-200">Hạn nộp: {new Date(item.dueAt).toLocaleString("vi-VN")}</p>}
                  <p className="mt-1 text-xs text-slate-500">Thời gian làm: {Math.round(item.durationSec / 60)} phút</p>
                </div>
                <button type="button" disabled={busy || expired && !active} onClick={() => void openQuiz(item)} className="shrink-0 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-ink-950 disabled:opacity-40">{busy ? "Đang mở..." : active ? "Tiếp tục làm bài" : submittedAt ? "Làm lại bài" : expired ? "Đã quá hạn" : "Bắt đầu làm bài"}</button>
              </div>
              {item.resultHistory.length > 0 && <div className="mt-5 border-t border-white/8 pt-4">
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-400">Lịch sử kết quả</h3>
                <div className="mt-2 space-y-2">
                  {item.resultHistory.map((result, index) => (
                    <div key={result.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2 text-xs">
                      <span className="text-slate-400">Lần {item.resultHistory.length - index}{result.submittedAt ? ` · ${new Date(result.submittedAt).toLocaleString("vi-VN")}` : " · Đang làm"}</span>
                      <span className="font-bold text-emerald-200">{result.score === null ? "Chưa nộp" : `${result.score}/100`}</span>
                    </div>
                  ))}
                </div>
              </div>}
            </article>;
          })}
          {items.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">Hiện chưa có bài tập được giao.</p>}
        </div>
      )}
    </main>
  );
}
