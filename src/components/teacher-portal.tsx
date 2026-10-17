"use client";

import { FormEvent, useEffect, useState } from "react";
import { QuestionBankPicker, type BankQuestion } from "@/components/question-bank-picker";
import { TeacherLessonEditor, type TeacherLesson } from "@/components/teacher-lesson-editor";
import { getLessonContentPreview } from "@/lib/lesson-content";

type Lesson = TeacherLesson;
type Assignment = { id: number; title: string; description: string; dueAt: string | null; durationSec: number };
type CustomQuestionDraft = {
  content: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};
type EnrolledStudent = {
  id: number;
  userId: number;
  name: string;
  email: string;
  schoolName: string | null;
  className: string | null;
  lastLoginAt: string;
  loginCount: number;
  isActive: boolean;
  createdAt: string;
};
type Course = {
  id: number;
  title: string;
  description: string;
  lessons: Lesson[];
  assignments: Assignment[];
  enrolledStudents: EnrolledStudent[];
  enrolledCount: number;
  completionPercent: number;
};
type Submission = {
  id: number;
  assignmentId: number;
  assignmentTitle: string;
  courseTitle: string;
  studentName: string;
  studentEmail: string;
  content: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
  reviewQuestions: {
    id: number;
    content: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    selectedAnswer: number | null;
    isCorrect: boolean;
  }[];
};

export function TeacherPortal() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [lessonEditor, setLessonEditor] = useState<{ courseId: number; lesson?: Lesson } | null>(null);
  const [grades, setGrades] = useState<Record<number, { score: string; feedback: string }>>({});
  const [assignmentQuestionIds, setAssignmentQuestionIds] = useState<Record<number, number[]>>({});
  const [assignmentSelectedQuestions, setAssignmentSelectedQuestions] = useState<Record<number, BankQuestion[]>>({});
  const [assignmentQuestionMode, setAssignmentQuestionMode] = useState<Record<number, "bank" | "custom">>({});
  const [customQuestions, setCustomQuestions] = useState<Record<number, CustomQuestionDraft[]>>({});

  async function load() {
    setError("");
    try {
      const [courseResponse, submissionResponse] = await Promise.all([
        fetch("/api/teacher/courses", { cache: "no-store" }),
        fetch("/api/teacher/submissions", { cache: "no-store" }),
      ]);
      const [courseResult, submissionResult] = await Promise.all([
        courseResponse.json(),
        submissionResponse.json(),
      ]);
      if (!courseResponse.ok) throw new Error(courseResult.error ?? "Không tải được khóa học.");
      if (!submissionResponse.ok) throw new Error(submissionResult.error ?? "Không tải được bài nộp.");
      setCourses(courseResult);
      setSubmissions(submissionResult);
      setGrades(Object.fromEntries(submissionResult.map((item: Submission) => [
        item.id,
        { score: item.score === null ? "" : String(item.score), feedback: item.feedback ?? "" },
      ])));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/teacher/courses", { cache: "no-store" }),
      fetch("/api/teacher/submissions", { cache: "no-store" }),
    ])
      .then(async ([courseResponse, submissionResponse]) => {
        const [courseResult, submissionResult] = await Promise.all([
          courseResponse.json(),
          submissionResponse.json(),
        ]);
        if (!courseResponse.ok) throw new Error(courseResult.error ?? "Không tải được khóa học.");
        if (!submissionResponse.ok) throw new Error(submissionResult.error ?? "Không tải được bài nộp.");
        if (!active) return;
        setCourses(courseResult);
        setSubmissions(submissionResult);
        setGrades(Object.fromEntries(submissionResult.map((item: Submission) => [
          item.id,
          { score: item.score === null ? "" : String(item.score), feedback: item.feedback ?? "" },
        ])));
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Không tải được dữ liệu.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function sendCourseRequest(url: string, method: "POST" | "PATCH" | "DELETE", body?: object): Promise<boolean> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không cập nhật được nội dung.");
      setNotice("Đã lưu thay đổi.");
      await load();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không cập nhật được nội dung.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addContent(event: FormEvent<HTMLFormElement>, courseId: number) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const durationMinutes = Number(values.durationMinutes);
    const dueAt = typeof values.dueAt === "string" ? new Date(values.dueAt).toISOString() : null;
    const questionMode = assignmentQuestionMode[courseId] ?? "bank";
    const saved = await sendCourseRequest("/api/teacher/courses", "POST", {
      ...values,
      courseId,
      kind: "assignment",
      dueAt,
      durationSec: durationMinutes * 60,
      questionIds: questionMode === "bank" ? (assignmentSelectedQuestions[courseId] ?? []).map((question) => question.id) : [],
      customQuestions: questionMode === "custom" ? customQuestions[courseId] ?? [] : [],
    });
    if (!saved) return;
    setAssignmentQuestionIds((current) => ({ ...current, [courseId]: [] }));
    setAssignmentSelectedQuestions((current) => ({ ...current, [courseId]: [] }));
    setCustomQuestions((current) => ({ ...current, [courseId]: [] }));
    form.reset();
  }

  function addCustomQuestion(courseId: number) {
    const blank: CustomQuestionDraft = {
      content: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
    };
    setCustomQuestions((current) => ({
      ...current,
      [courseId]: [...(current[courseId] ?? []), blank],
    }));
  }

  function updateCustomQuestion(
    courseId: number,
    index: number,
    update: Partial<CustomQuestionDraft>
  ) {
    setCustomQuestions((current) => ({
      ...current,
      [courseId]: (current[courseId] ?? []).map((question, itemIndex) =>
        itemIndex === index ? { ...question, ...update } : question
      ),
    }));
  }

  async function gradeSubmission(event: FormEvent<HTMLFormElement>, submissionId: number) {
    event.preventDefault();
    const values = grades[submissionId];
    if (!values) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: submissionId, score: Number(values.score), feedback: values.feedback }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không chấm được bài.");
      setNotice("Đã lưu điểm và nhận xét.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không chấm được bài.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-bold tracking-[0.2em] text-cyan-300 uppercase">Cổng giáo viên</p>
      <h1 className="mt-2 text-3xl font-black text-white">Khóa học & bài tập</h1>
      <p className="mt-2 text-sm text-slate-400">Tạo nội dung giảng dạy, xem bài học sinh nộp và nhập điểm.</p>
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-emerald-300">{notice}</p>}

      <form onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form));
        void sendCourseRequest("/api/teacher/courses", "POST", { ...values, kind: "course" }).then((saved) => {
          if (saved) form.reset();
        });
      }} className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5 md:grid-cols-[1fr_2fr_auto]">
        <input name="title" required minLength={2} maxLength={160} placeholder="Tên khóa học" className="h-11 rounded-xl border border-white/10 bg-ink-950 px-3 text-sm text-white" />
        <input name="description" maxLength={5000} placeholder="Mô tả khóa học" className="h-11 rounded-xl border border-white/10 bg-ink-950 px-3 text-sm text-white" />
        <button disabled={busy} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-ink-950 disabled:opacity-50">Tạo khóa học</button>
      </form>

      {loading ? <p className="mt-8 text-sm text-slate-400">Đang tải...</p> : (
        <div className="mt-6 space-y-5">
          {courses.map((course) => (
            <section key={course.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="text-xl font-black text-white">{course.title}</h2><p className="mt-1 text-sm text-slate-400">{course.description || "Chưa có mô tả"}</p></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => {
                    const title = window.prompt("Tên khóa học", course.title);
                    if (title === null) return;
                    const description = window.prompt("Mô tả khóa học", course.description);
                    if (description !== null) void sendCourseRequest("/api/teacher/courses", "PATCH", { kind: "course", id: course.id, title, description });
                  }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200">Sửa</button>
                  <button type="button" onClick={() => {
                    if (window.confirm("Xóa khóa học cùng toàn bộ bài học, bài tập và bài nộp liên quan?")) void sendCourseRequest(`/api/teacher/courses?kind=course&id=${course.id}`, "DELETE");
                  }} className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs font-bold text-rose-200">Xóa</button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-xs text-slate-500">Học sinh đã tham gia</p>
                  <p className="mt-1 text-lg font-black text-white">{course.enrolledCount}</p>
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-xs text-slate-500">Tỷ lệ bài tập đã nộp</p>
                  <p className="mt-1 text-lg font-black text-cyan-200">{course.completionPercent}%</p>
                </div>
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <div>
                  <h3 className="font-bold text-white">Bài học ({course.lessons.length})</h3>
                  <div className="mt-2 space-y-2">
                    {course.lessons.map((lesson) => <article key={lesson.id} className="flex items-center justify-between gap-2 rounded-xl bg-black/20 p-3">
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-200">{lesson.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{lesson.description || getLessonContentPreview(lesson.content) || "Chưa có mô tả"}</p><p className="mt-1 text-[11px] text-slate-600">{lesson.questionIds.length} câu hỏi đính kèm</p></div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => setLessonEditor({ courseId: course.id, lesson })} className="text-xs text-cyan-200">Sửa</button>
                        <button type="button" onClick={() => {
                          if (window.confirm("Xóa bài học này?")) void sendCourseRequest(`/api/teacher/courses?kind=lesson&id=${lesson.id}`, "DELETE");
                        }} className="text-xs text-rose-200">Xóa</button>
                      </div>
                    </article>)}
                  </div>
                  <button type="button" onClick={() => setLessonEditor({ courseId: course.id })} className="mt-3 w-full rounded-xl border border-dashed border-cyan-300/20 px-3 py-3 text-left text-xs font-bold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/5">+ Thêm bài học mới</button>
                </div>
                <div>
                  <h3 className="font-bold text-white">Bài tập ({course.assignments.length})</h3>
                  <div className="mt-2 space-y-2">
                    {course.assignments.map((assignment) => <article key={assignment.id} className="flex items-center justify-between gap-2 rounded-xl bg-black/20 p-3">
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-200">{assignment.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{assignment.description || "Chưa có mô tả"}</p></div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => {
                          const title = window.prompt("Tên bài tập", assignment.title);
                          if (title === null) return;
                          const description = window.prompt("Mô tả", assignment.description);
                          if (description !== null) void sendCourseRequest("/api/teacher/courses", "PATCH", { kind: "assignment", id: assignment.id, title, description, dueAt: assignment.dueAt });
                        }} className="text-xs text-cyan-200">Sửa</button>
                        <button type="button" onClick={() => {
                          if (window.confirm("Xóa bài tập và bài nộp liên quan?")) void sendCourseRequest(`/api/teacher/courses?kind=assignment&id=${assignment.id}`, "DELETE");
                        }} className="text-xs text-rose-200">Xóa</button>
                      </div>
                    </article>)}
                  </div>
                  <form onSubmit={(event) => void addContent(event, course.id)} className="mt-3 space-y-2 rounded-xl border border-white/8 p-3">
                    <input name="title" required minLength={2} maxLength={160} placeholder="Tên bài tập mới" className="h-10 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white" />
                    <textarea name="description" maxLength={5000} rows={2} placeholder="Mô tả yêu cầu" className="w-full rounded-lg border border-white/10 bg-ink-950 p-3 text-sm text-white" />
                    <label className="block text-xs font-bold text-slate-300">Hạn nộp
                      <input name="dueAt" required type="datetime-local" className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white" />
                    </label>
                    <label className="block text-xs font-bold text-slate-300">Thời gian làm bài (phút)
                      <input name="durationMinutes" required type="number" min={1} max={120} defaultValue={30} className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white" />
                    </label>
                    <div role="tablist" aria-label="Phương thức chọn câu hỏi" className="grid grid-cols-2 gap-2">
                      <button type="button" role="tab" aria-selected={(assignmentQuestionMode[course.id] ?? "bank") === "bank"} onClick={() => setAssignmentQuestionMode((current) => ({ ...current, [course.id]: "bank" }))} className={`rounded-lg px-3 py-2 text-xs font-bold ${(assignmentQuestionMode[course.id] ?? "bank") === "bank" ? "bg-cyan-300 text-ink-950" : "border border-white/10 text-slate-300"}`}>Tab 1 · Chọn từ kho</button>
                      <button type="button" role="tab" aria-selected={assignmentQuestionMode[course.id] === "custom"} onClick={() => setAssignmentQuestionMode((current) => ({ ...current, [course.id]: "custom" }))} className={`rounded-lg px-3 py-2 text-xs font-bold ${assignmentQuestionMode[course.id] === "custom" ? "bg-violet-300 text-ink-950" : "border border-white/10 text-slate-300"}`}>Tab 2 · Tự soạn</button>
                    </div>
                    {(assignmentQuestionMode[course.id] ?? "bank") === "bank" ? (
                      <QuestionBankPicker
                        selectedQuestions={assignmentSelectedQuestions[course.id] ?? []}
                        selectedIds={assignmentQuestionIds[course.id] ?? []}
                        onChange={(questions) => {
                          setAssignmentSelectedQuestions((current) => ({ ...current, [course.id]: questions }));
                          setAssignmentQuestionIds((current) => ({ ...current, [course.id]: questions.map((question) => question.id) }));
                        }}
                      />
                    ) : <div className="space-y-3 rounded-xl border border-white/8 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-violet-200">Tự soạn câu hỏi</p>
                        <button type="button" onClick={() => addCustomQuestion(course.id)} className="rounded-lg border border-violet-300/20 px-3 py-1.5 text-xs font-bold text-violet-200">Thêm câu hỏi mới</button>
                      </div>
                      {(customQuestions[course.id] ?? []).map((question, index) => (
                        <fieldset key={index} className="space-y-2 rounded-xl bg-black/20 p-3">
                          <legend className="px-1 text-xs font-bold text-slate-300">Câu tự soạn {index + 1}</legend>
                          <textarea required minLength={3} maxLength={2000} value={question.content} onChange={(event) => updateCustomQuestion(course.id, index, { content: event.target.value })} rows={2} placeholder="Nội dung câu hỏi" className="w-full rounded-lg border border-white/10 bg-ink-950 p-2.5 text-sm text-white" />
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <input type="radio" name={`correct-${course.id}-${index}`} checked={question.correctIndex === optionIndex} onChange={() => updateCustomQuestion(course.id, index, { correctIndex: optionIndex })} aria-label={`Đặt phương án ${String.fromCharCode(65 + optionIndex)} làm đáp án đúng`} className="accent-cyan-300" />
                              <input required maxLength={500} value={option} onChange={(event) => {
                                const options = [...question.options] as CustomQuestionDraft["options"];
                                options[optionIndex] = event.target.value;
                                updateCustomQuestion(course.id, index, { options });
                              }} placeholder={`Đáp án ${String.fromCharCode(65 + optionIndex)}`} className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-950 px-2.5 text-xs text-white" />
                            </div>
                          ))}
                          <textarea maxLength={2000} value={question.explanation} onChange={(event) => updateCustomQuestion(course.id, index, { explanation: event.target.value })} rows={2} placeholder="Giải thích đáp án" className="w-full rounded-lg border border-white/10 bg-ink-950 p-2.5 text-xs text-white" />
                          <button type="button" onClick={() => setCustomQuestions((current) => ({ ...current, [course.id]: (current[course.id] ?? []).filter((_, itemIndex) => itemIndex !== index) }))} className="text-xs font-bold text-rose-200">Xóa câu này</button>
                        </fieldset>
                      ))}
                    </div>}
                    <button disabled={busy} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white">Thêm bài tập</button>
                  </form>
                </div>
              </div>
              <div className="mt-5 border-t border-white/8 pt-4">
                <h3 className="font-bold text-white">Danh sách học sinh</h3>
                <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full min-w-[900px] text-left text-xs">
                    <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="p-3">Tên hiển thị / Email</th>
                        <th className="p-3">Trường</th>
                        <th className="p-3">Lớp</th>
                        <th className="p-3">Lần đăng nhập gần nhất</th>
                        <th className="p-3">Số lần đăng nhập</th>
                        <th className="p-3">Ngày tạo tài khoản</th>
                        <th className="p-3">Trạng thái</th>
                        <th className="p-3">Quản lý</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8">
                      {course.enrolledStudents.map((student) => {
                        const lastSeen = new Date(student.lastLoginAt);
                        const online = Date.now() - lastSeen.getTime() < 15 * 60 * 1000;
                        return (
                          <tr key={student.id} className="text-slate-300">
                            <td className="p-3"><p className="font-bold text-white">{student.name}</p><p className="mt-1 text-slate-500">{student.email}</p></td>
                            <td className="p-3">{student.schoolName || "—"}</td>
                            <td className="p-3">{student.className || "—"}</td>
                            <td className="whitespace-nowrap p-3">{lastSeen.toLocaleString("vi-VN")}</td>
                            <td className="p-3">{student.loginCount} lần</td>
                            <td className="whitespace-nowrap p-3">{new Date(student.createdAt).toLocaleDateString("vi-VN")}</td>
                            <td className={`p-3 font-bold ${!student.isActive ? "text-rose-300" : online ? "text-emerald-300" : "text-slate-500"}`}>{!student.isActive ? "Đã khóa" : online ? "Đang hoạt động" : "Offline"}</td>
                            <td className="p-3">
                              <button type="button" aria-label={`Xóa ${student.email} khỏi khóa học`} onClick={() => {
                                if (window.confirm(`Xóa ${student.name} khỏi khóa học?`)) {
                                  void sendCourseRequest(`/api/teacher/courses?kind=enrollment&id=${student.id}`, "DELETE");
                                }
                              }} className="rounded-lg border border-rose-400/20 px-2.5 py-1.5 font-bold text-rose-200">Bỏ khỏi lớp</button>
                            </td>
                          </tr>
                        );
                      })}
                      {course.enrolledStudents.length === 0 && <tr><td colSpan={8} className="p-5 text-center text-slate-500">Chưa có học sinh tham gia.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <form onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = Object.fromEntries(new FormData(form));
                  void sendCourseRequest("/api/teacher/courses", "POST", { ...data, courseId: course.id, kind: "enrollment" }).then((saved) => {
                    if (saved) form.reset();
                  });
                }} className="mt-3 flex max-w-lg gap-2">
                  <input name="email" required type="email" placeholder="Email tài khoản học sinh" className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white" />
                  <button disabled={busy} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white">Thêm học sinh</button>
                </form>
              </div>
            </section>
          ))}
          {courses.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">Bạn chưa tạo khóa học nào.</p>}
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-black text-white">Bài học sinh đã nộp</h2>
        <div className="mt-4 space-y-4">
          {submissions.map((submission) => {
            const grade = grades[submission.id] ?? { score: "", feedback: "" };
            return <article key={submission.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <p className="text-xs font-bold text-cyan-200">{submission.courseTitle} · {submission.assignmentTitle}</p>
              <p className="mt-2 font-bold text-white">{submission.studentName} <span className="font-normal text-slate-500">· {submission.studentEmail}</span></p>
              {submission.submittedAt && <p className="mt-1 text-xs text-slate-500">Nộp lúc {new Date(submission.submittedAt).toLocaleString("vi-VN")}</p>}
              {submission.reviewQuestions.length > 0 ? <details className="mt-3 rounded-xl bg-black/20 p-4">
                <summary className="cursor-pointer text-sm font-bold text-cyan-100">Xem đáp án từng câu ({submission.reviewQuestions.filter((question) => question.isCorrect).length}/{submission.reviewQuestions.length} đúng)</summary>
                <div className="mt-4 space-y-4">
                  {submission.reviewQuestions.map((question, index) => <div key={question.id} className="border-t border-white/8 pt-3">
                    <p className="text-sm font-bold text-white">Câu {index + 1}. {question.content}</p>
                    <p className={`mt-2 text-xs ${question.isCorrect ? "text-emerald-200" : "text-rose-200"}`}>Học sinh chọn: {question.selectedAnswer === null ? "Bỏ trống" : `${String.fromCharCode(65 + question.selectedAnswer)}. ${question.options[question.selectedAnswer]}`} {question.isCorrect ? "✓" : ""}</p>
                    {!question.isCorrect && <p className="mt-1 text-xs text-cyan-100">Đáp án đúng: {String.fromCharCode(65 + question.correctIndex)}. {question.options[question.correctIndex]}</p>}
                    {question.explanation && <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{question.explanation}</p>}
                  </div>)}
                </div>
              </details> : <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-black/20 p-4 text-sm text-slate-300">{submission.content}</p>}
              <form onSubmit={(event) => void gradeSubmission(event, submission.id)} className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input required type="number" min={0} max={100} value={grade.score} onChange={(event) => setGrades((current) => ({ ...current, [submission.id]: { ...grade, score: event.target.value } }))} placeholder="Điểm 0–100" className="h-10 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white sm:w-32" />
                <input maxLength={2000} value={grade.feedback} onChange={(event) => setGrades((current) => ({ ...current, [submission.id]: { ...grade, feedback: event.target.value } }))} placeholder="Nhận xét" className="h-10 flex-1 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white" />
                <button disabled={busy} className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-black text-ink-950">Lưu điểm</button>
              </form>
            </article>;
          })}
          {!loading && submissions.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">Chưa có bài nộp nào.</p>}
        </div>
      </section>
      {lessonEditor && <TeacherLessonEditor
        key={`${lessonEditor.courseId}-${lessonEditor.lesson?.id ?? "new"}`}
        courseId={lessonEditor.courseId}
        lesson={lessonEditor.lesson}
        onClose={() => setLessonEditor(null)}
        onSaved={async () => {
          await load();
          setNotice(lessonEditor.lesson ? "Đã cập nhật bài học." : "Đã tạo bài học.");
        }}
      />}
    </div>
  );
}
