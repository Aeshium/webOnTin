"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Menu, X } from "lucide-react";
import { LessonRichTextContent } from "@/components/lesson-rich-text";
import { getLessonContentBlocks, getLessonHeadings } from "@/lib/lesson-content";

type LessonSummary = { id: number; title: string; description: string; questionCount: number };
type CourseSummary = { id: number; title: string; lessons: LessonSummary[] };
type LessonQuestion = {
  id: number;
  content: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topicName: string;
};
type LessonDetail = { id: number; title: string; description: string; content: string; questions: LessonQuestion[] };
type CourseDetail = { courseTitle: string; lessons: LessonDetail[] };
const COMPLETED_LESSONS_KEY = "ontin:completed-lessons:v1";
type CompletionState = { completed: Record<number, boolean>; error: string };

function readCompletionState(): CompletionState {
  if (typeof window === "undefined") return { completed: {}, error: "" };
  try {
    const stored = sessionStorage.getItem(COMPLETED_LESSONS_KEY);
    if (!stored) return { completed: {}, error: "" };
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Tiến độ bài học đã lưu không hợp lệ.");
    }
    return {
      completed: Object.fromEntries(
        Object.entries(parsed).filter(([id, value]) => /^\d+$/.test(id) && Number(id) > 0 && value === true)
      ),
      error: "",
    };
  } catch (caught) {
    console.error("Không thể khôi phục tiến độ bài học:", caught);
    return { completed: {}, error: "Không thể khôi phục tiến độ bài học đã lưu trong tab này." };
  }
}

function InlineLessonQuestion({
  question,
  selectedAnswer,
  onAnswer,
}: {
  question: LessonQuestion;
  selectedAnswer: number | undefined;
  onAnswer: (optionIndex: number) => void;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-ink-950/60 p-4 sm:p-5">
      <p className="text-xs font-bold text-slate-500">{question.topicName}</p>
      <h4 className="mt-2 text-sm font-bold leading-relaxed text-white">{question.content}</h4>
      <div className="mt-4 space-y-2">
        {question.options.map((option, index) => {
          const answered = selectedAnswer !== undefined;
          const isCorrect = index === question.correctIndex;
          const isSelected = selectedAnswer === index;
          const color = answered && isCorrect
            ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
            : answered && isSelected
              ? "border-rose-300/40 bg-rose-300/10 text-rose-100"
              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/30";
          return (
            <button key={index} type="button" onClick={() => onAnswer(index)} className={`w-full rounded-lg border p-2.5 text-left text-sm ${color}`}>
              <span className="mr-2 font-black">{String.fromCharCode(65 + index)}.</span>{option}
            </button>
          );
        })}
      </div>
      {selectedAnswer !== undefined && (
        <div className={`mt-3 rounded-lg p-3 text-sm ${selectedAnswer === question.correctIndex ? "bg-emerald-300/10 text-emerald-100" : "bg-rose-300/10 text-rose-100"}`}>
          <p className="font-black">{selectedAnswer === question.correctIndex ? "Chính xác!" : `Chưa chính xác. Đáp án đúng: ${String.fromCharCode(65 + question.correctIndex)}.`}</p>
          {question.explanation && <p className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-300">{question.explanation}</p>}
        </div>
      )}
    </article>
  );
}

export function StudentLessons() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [lessonMenuOpen, setLessonMenuOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<number, Record<number, number>>>({});
  const [completionState, setCompletionState] = useState<CompletionState>(readCompletionState);
  const completedLessons = completionState.completed;
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

  function toggleLessonCompletion(lessonId: number) {
    const completed = { ...completedLessons, [lessonId]: !completedLessons[lessonId] };
    try {
      sessionStorage.setItem(COMPLETED_LESSONS_KEY, JSON.stringify(completed));
      setCompletionState({ completed, error: "" });
    } catch (caught) {
      console.error("Không thể lưu tiến độ bài học:", caught);
      setCompletionState({ completed, error: "Không thể lưu tiến độ bài học trong tab này." });
    }
  }

  const activeLesson = useMemo(
    () => course?.lessons.find((lesson) => lesson.id === activeLessonId) ?? null,
    [course, activeLessonId]
  );
  const lessonContentBlocks = useMemo(
    () => activeLesson ? getLessonContentBlocks(activeLesson.content) : [],
    [activeLesson]
  );
  const lessonHeadings = useMemo(
    () => activeLesson ? getLessonHeadings(activeLesson.content) : [],
    [activeLesson]
  );
  const placedQuestionIds = useMemo(
    () => new Set(lessonContentBlocks.flatMap((block) => block.type === "question" ? [block.questionId] : [])),
    [lessonContentBlocks]
  );
  const practiceQuestions = activeLesson?.questions.filter((question) => !placedQuestionIds.has(question.id)) ?? [];
  const activeQuestion = practiceQuestions[questionIndex] ?? null;
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
      setLessonMenuOpen(true);
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
    setLessonMenuOpen(false);
  }

  const completedLessonCount = course?.lessons.filter((lesson) => completedLessons[lesson.id]).length ?? 0;
  const activeLessonIndex = course?.lessons.findIndex((lesson) => lesson.id === activeLessonId) ?? -1;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Học tập</p>
      <h1 className="mt-2 text-3xl font-black text-white">Học Bài</h1>
      <p className="mt-2 text-sm text-slate-400">Đọc theo từng phần và kiểm tra mức độ hiểu ngay trong bài học.</p>
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {completionState.error && <p role="alert" className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">{completionState.error}</p>}
      {loading ? <p className="mt-8 text-sm text-slate-400">Đang tải bài học...</p> : (
        <>
        <button type="button" onClick={() => setLessonMenuOpen((open) => !open)} aria-expanded={lessonMenuOpen} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 lg:hidden">
          {lessonMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          {activeLesson?.title ?? (activeCourseId !== null ? "Chọn bài học" : "Chọn khóa học")}
        </button>
        <div className="mt-4 grid gap-5 lg:mt-7 lg:grid-cols-[280px_1fr]">
          <aside className={`space-y-3 ${lessonMenuOpen ? "block" : "hidden lg:block"}`}>
            {course && activeCourseId !== null && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Tiến độ khóa học</p>
                <p className="mt-2 text-sm font-bold text-white">{completedLessonCount}/{course.lessons.length} bài đã hoàn thành</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-300 transition-[width]" style={{ width: `${course.lessons.length ? completedLessonCount / course.lessons.length * 100 : 0}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Tiến độ chỉ lưu trong tab này.</p>
              </section>
            )}
            {activeCourseId !== null && (
              <button type="button" onClick={() => { setActiveCourseId(null); setCourse(null); setActiveLessonId(null); setLessonMenuOpen(false); }} className="w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm font-bold text-cyan-200 hover:bg-white/5">
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
                    const isComplete = completedLessons[lesson.id] === true;
                    return (
                      <div key={lesson.id} className={`flex items-start gap-2 rounded-lg p-2.5 text-xs ${activeLessonId === lesson.id ? "bg-cyan-300/10 text-cyan-100" : "text-slate-300 hover:bg-white/5"}`}>
                        <button type="button" onClick={() => openLesson(lesson.id)} aria-current={activeLessonId === lesson.id ? "page" : undefined} className="min-w-0 flex-1 text-left">
                          <span className="block font-bold">{lesson.title}</span>
                          <span className="mt-1 block text-[11px] text-slate-500">{isComplete ? "Đã hoàn thành" : `${completeCount}/${summary?.questionCount ?? lesson.questions.length} câu đã ôn`}</span>
                        </button>
                        {isComplete && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-label="Bài học đã hoàn thành" />}
                      </div>
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
                {activeLesson.description && <p className="mt-2 text-sm text-slate-400">{activeLesson.description}</p>}
                {lessonHeadings.length > 1 && (
                  <nav aria-label="Mục lục bài học" className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-300">Mục lục bài học</p>
                    <ol className="mt-2 space-y-1.5">
                      {lessonHeadings.map((heading) => (
                        <li key={heading.id} className={heading.level === 1 ? "" : heading.level === 2 ? "pl-3" : "pl-6"}>
                          <a href={`#${heading.id}`} className="block rounded-md py-1 text-sm text-slate-400 hover:text-cyan-200">{heading.title}</a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                )}
                <div className="mt-5 space-y-5">
                  {lessonContentBlocks.map((block, index) => {
                    if (block.type === "content") {
                      return (
                        <article key={`content-${index}`} className="rounded-xl border border-white/8 bg-black/20 p-4 sm:p-6">
                          <LessonRichTextContent content={block.content} />
                        </article>
                      );
                    }
                    const question = activeLesson.questions.find((item) => item.id === block.questionId);
                    if (!question) {
                      return <p key={`missing-${index}`} role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">Câu hỏi được chèn tại vị trí này hiện không còn được đính kèm vào bài học.</p>;
                    }
                    return (
                      <section key={`question-${index}`} className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-3 sm:p-4">
                        <p className="mb-3 flex items-center gap-2 text-sm font-black text-cyan-100">
                          <span aria-hidden="true">ⓘ</span> Kiểm tra nhanh
                        </p>
                        <InlineLessonQuestion
                          question={question}
                          selectedAnswer={answers[activeLesson.id]?.[question.id]}
                          onAnswer={(optionIndex) => chooseAnswer(question.id, optionIndex)}
                        />
                      </section>
                    );
                  })}
                </div>
                {practiceQuestions.length > 0 ? (
                  <div className="mt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-black text-white">Luyện tập thêm ({practiceQuestions.length})</h3>
                      <p className="text-xs text-slate-400">{Object.keys(answers[activeLesson.id] ?? {}).length}/{activeLesson.questions.length} đã trả lời</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Chọn câu hỏi">
                      {practiceQuestions.map((question, index) => (
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
                      <button type="button" disabled={questionIndex >= practiceQuestions.length - 1} onClick={() => setQuestionIndex((index) => index + 1)} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-ink-950 disabled:opacity-40">Câu tiếp theo</button>
                    </div>
                  </div>
                ) : activeLesson.questions.length === 0 ? <p className="mt-5 rounded-xl bg-amber-300/5 p-4 text-sm text-amber-100">Bài học này chưa có câu hỏi ôn tập.</p> : null}
                <footer className="mt-8 grid gap-2 border-t border-white/10 pt-5 sm:grid-cols-3">
                  <button type="button" disabled={activeLessonIndex <= 0} onClick={() => course?.lessons[activeLessonIndex - 1] && openLesson(course.lessons[activeLessonIndex - 1].id)} className="rounded-lg border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 disabled:opacity-40">← Bài trước</button>
                  <button type="button" onClick={() => toggleLessonCompletion(activeLesson.id)} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold ${completedLessons[activeLesson.id] ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-cyan-300/25 text-cyan-100 hover:bg-cyan-300/10"}`}>
                    <CheckCircle2 className="h-4 w-4" />{completedLessons[activeLesson.id] ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
                  </button>
                  <button type="button" disabled={!course || activeLessonIndex < 0 || activeLessonIndex >= course.lessons.length - 1} onClick={() => course?.lessons[activeLessonIndex + 1] && openLesson(course.lessons[activeLessonIndex + 1].id)} className="rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-ink-950 disabled:opacity-40">{activeLessonIndex === (course?.lessons.length ?? 0) - 1 ? "Đã hết bài" : "Bài tiếp theo →"}</button>
                </footer>
              </>
            )}
          </section>
        </div>
        </>
      )}
    </main>
  );
}
