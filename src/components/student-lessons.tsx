"use client";

import { useEffect, useMemo, useState } from "react";

type LessonSummary = { id: number; title: string; questionCount: number };
type CourseSummary = { id: number; title: string; lessons: LessonSummary[] };
type LessonQuestion = {
  id: number;
  content: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topicName: string;
};
type LessonDetail = { id: number; title: string; content: string; questions: LessonQuestion[] };
type CourseDetail = { courseTitle: string; lessons: LessonDetail[] };

export function StudentLessons() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Record<number, number>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/lessons", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Không tải được danh sách bài học.");
        if (active) setCourses(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Không tải được danh sách bài học.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeLesson = useMemo(
    () => course?.lessons.find((lesson) => lesson.id === activeLessonId) ?? null,
    [course, activeLessonId]
  );
  const activeQuestion = activeLesson?.questions[questionIndex] ?? null;
  const selectedAnswer = activeLesson && activeQuestion
    ? answers[activeLesson.id]?.[activeQuestion.id]
    : undefined;

  async function openCourse(courseId: number) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/lessons?courseId=${courseId}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không tải được nội dung khóa học.");
      setCourse(result);
      setActiveCourseId(courseId);
      setActiveLessonId(null);
      setQuestionIndex(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được nội dung khóa học.");
    } finally {
      setBusy(false);
    }
  }

  function chooseAnswer(questionId: number, optionIndex: number) {
    if (!activeLesson) return;
    setAnswers((current) => ({
      ...current,
      [activeLesson.id]: { ...current[activeLesson.id], [questionId]: optionIndex },
    }));
  }

  function openLesson(lessonId: number) {
    setActiveLessonId(lessonId);
    setQuestionIndex(0);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Học tập</p>
      <h1 className="mt-2 text-3xl font-black text-white">Bài học</h1>
      <p className="mt-2 text-sm text-slate-400">Ôn từng câu hỏi và xem giải thích ngay sau khi chọn đáp án.</p>
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {loading ? <p className="mt-8 text-sm text-slate-400">Đang tải bài học...</p> : (
        <div className="mt-7 grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-3">
            {activeCourseId !== null && (
              <button type="button" onClick={() => { setActiveCourseId(null); setCourse(null); setActiveLessonId(null); }} className="w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm font-bold text-cyan-200 hover:bg-white/5">
                ← Tất cả khóa học
              </button>
            )}
            {(activeCourseId === null ? courses : courses.filter((item) => item.id === activeCourseId)).map((item) => (
              <section key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                {activeCourseId === null
                  ? <button type="button" disabled={busy} onClick={() => void openCourse(item.id)} className="w-full text-left text-sm font-black text-white hover:text-cyan-200 disabled:opacity-50">{item.title}<span className="mt-1 block text-xs font-normal text-slate-500">{item.lessons.length} bài học</span></button>
                  : <h2 className="px-2 py-2 text-sm font-black text-white">{course?.courseTitle ?? item.title}</h2>}
                {activeCourseId !== null && <nav className="mt-2 space-y-1">
                  {course?.lessons.map((lesson) => {
                    const summary = item.lessons.find((entry) => entry.id === lesson.id);
                    const completeCount = Object.keys(answers[lesson.id] ?? {}).length;
                    return (
                      <button key={lesson.id} type="button" onClick={() => openLesson(lesson.id)} className={`w-full rounded-lg p-2.5 text-left text-xs ${activeLessonId === lesson.id ? "bg-cyan-300/10 text-cyan-100" : "text-slate-300 hover:bg-white/5"}`}>
                        <span className="block font-bold">{lesson.title}</span>
                        <span className="mt-1 block text-[11px] text-slate-500">{completeCount}/{summary?.questionCount ?? lesson.questions.length} câu đã ôn</span>
                      </button>
                    );
                  })}
                </nav>}
              </section>
            ))}
            {courses.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-500">Bạn chưa tham gia khóa học nào.</p>}
          </aside>

          <section className="min-h-[360px] rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
            {!course && <div className="grid min-h-[300px] place-items-center text-center text-sm text-slate-500">Chọn một khóa học để bắt đầu ôn tập.</div>}
            {course && !activeLesson && <div className="grid min-h-[300px] place-items-center text-center text-sm text-slate-500">Chọn bài học trong danh sách.</div>}
            {activeLesson && (
              <>
                <p className="text-xs font-bold text-cyan-200">{course?.courseTitle}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{activeLesson.title}</h2>
                <article className="mt-5 whitespace-pre-wrap rounded-xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-slate-300">{activeLesson.content}</article>
                {activeLesson.questions.length > 0 ? (
                  <div className="mt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-black text-white">Luyện câu hỏi ({activeLesson.questions.length})</h3>
                      <p className="text-xs text-slate-400">{Object.keys(answers[activeLesson.id] ?? {}).length}/{activeLesson.questions.length} đã trả lời</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Chọn câu hỏi">
                      {activeLesson.questions.map((question, index) => (
                        <button key={question.id} type="button" onClick={() => setQuestionIndex(index)} aria-label={`Câu ${index + 1}`} className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-black ${questionIndex === index ? "bg-cyan-300 text-ink-950" : answers[activeLesson.id]?.[question.id] !== undefined ? "bg-emerald-300/15 text-emerald-200" : "bg-white/5 text-slate-400"}`}>{index + 1}</button>
                      ))}
                    </div>
                    {activeQuestion && (
                      <article className="mt-4 rounded-2xl border border-white/10 bg-ink-950/60 p-5">
                        <p className="text-xs font-bold text-slate-500">Câu {questionIndex + 1} · {activeQuestion.topicName}</p>
                        <h4 className="mt-2 text-base font-bold leading-relaxed text-white">{activeQuestion.content}</h4>
                        <div className="mt-4 space-y-2">
                          {activeQuestion.options.map((option, index) => {
                            const answered = selectedAnswer !== undefined;
                            const isCorrect = index === activeQuestion.correctIndex;
                            const isSelected = selectedAnswer === index;
                            const color = answered && isCorrect
                              ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                              : answered && isSelected
                                ? "border-rose-300/40 bg-rose-300/10 text-rose-100"
                                : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/30";
                            return <button key={index} type="button" onClick={() => chooseAnswer(activeQuestion.id, index)} className={`w-full rounded-xl border p-3 text-left text-sm ${color}`}><span className="mr-2 font-black">{String.fromCharCode(65 + index)}.</span>{option}</button>;
                          })}
                        </div>
                        {selectedAnswer !== undefined && <div className={`mt-4 rounded-xl p-4 text-sm ${selectedAnswer === activeQuestion.correctIndex ? "bg-emerald-300/10 text-emerald-100" : "bg-rose-300/10 text-rose-100"}`}>
                          <p className="font-black">{selectedAnswer === activeQuestion.correctIndex ? "Chính xác!" : `Chưa chính xác. Đáp án đúng: ${String.fromCharCode(65 + activeQuestion.correctIndex)}.`}</p>
                          {activeQuestion.explanation && <p className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-300">{activeQuestion.explanation}</p>}
                        </div>}
                      </article>
                    )}
                    <div className="mt-4 flex justify-between">
                      <button type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => index - 1)} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 disabled:opacity-40">Câu trước</button>
                      <button type="button" disabled={questionIndex >= activeLesson.questions.length - 1} onClick={() => setQuestionIndex((index) => index + 1)} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-ink-950 disabled:opacity-40">Câu tiếp theo</button>
                    </div>
                  </div>
                ) : <p className="mt-5 rounded-xl bg-amber-300/5 p-4 text-sm text-amber-100">Bài học này chưa có câu hỏi ôn tập.</p>}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
