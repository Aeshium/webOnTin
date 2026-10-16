"use client";

import { FormEvent, useEffect, useState } from "react";

type Lesson = { id: number; title: string; content: string; sortOrder: number };
type Assignment = { id: number; title: string; description: string; dueAt: string | null };
type EnrolledStudent = { id: number; name: string; email: string };
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
  assignmentTitle: string;
  courseTitle: string;
  studentName: string;
  studentEmail: string;
  content: string;
  score: number | null;
  feedback: string | null;
};

export function TeacherPortal() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [grades, setGrades] = useState<Record<number, { score: string; feedback: string }>>({});

  async function load() {
    setError("");
    try {
      const [courseResponse, submissionResponse] = await Promise.all([
        fetch("/api/teacher/courses", { cache: "no-store" }),
        fetch("/api/teacher/submissions", { cache: "no-store" }),
      ]);
      const [courseResult, submissionResult] = await Promise.all([courseResponse.json(), submissionResponse.json()]);
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
        const [courseResult, submissionResult] = await Promise.all([courseResponse.json(), submissionResponse.json()]);
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

  async function sendCourseRequest(url: string, method: "POST" | "PATCH" | "DELETE", body?: object) {
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không cập nhật được nội dung.");
    } finally {
      setBusy(false);
    }
  }

  async function addContent(event: FormEvent<HTMLFormElement>, courseId: number, kind: "lesson" | "assignment") {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    await sendCourseRequest("/api/teacher/courses", "POST", { ...values, courseId, kind });
    form.reset();
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
        void sendCourseRequest("/api/teacher/courses", "POST", { ...values, kind: "course" }).then(() => form.reset());
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
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-200">{lesson.title}</p><p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-slate-500">{lesson.content}</p></div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => {
                          const title = window.prompt("Tên bài học", lesson.title);
                          if (title === null) return;
                          const content = window.prompt("Nội dung bài học", lesson.content);
                          if (content !== null) void sendCourseRequest("/api/teacher/courses", "PATCH", { kind: "lesson", id: lesson.id, title, content });
                        }} className="text-xs text-cyan-200">Sửa</button>
                        <button type="button" onClick={() => {
                          if (window.confirm("Xóa bài học này?")) void sendCourseRequest(`/api/teacher/courses?kind=lesson&id=${lesson.id}`, "DELETE");
                        }} className="text-xs text-rose-200">Xóa</button>
                      </div>
                    </article>)}
                  </div>
                  <form onSubmit={(event) => void addContent(event, course.id, "lesson")} className="mt-3 space-y-2 rounded-xl border border-white/8 p-3">
                    <input name="title" required minLength={2} maxLength={160} placeholder="Tên bài học mới" className="h-10 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white" />
                    <textarea name="content" required maxLength={20000} rows={3} placeholder="Nội dung bài học" className="w-full rounded-lg border border-white/10 bg-ink-950 p-3 text-sm text-white" />
                    <button disabled={busy} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white">Thêm bài học</button>
                  </form>
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
                  <form onSubmit={(event) => void addContent(event, course.id, "assignment")} className="mt-3 space-y-2 rounded-xl border border-white/8 p-3">
                    <input name="title" required minLength={2} maxLength={160} placeholder="Tên bài tập mới" className="h-10 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white" />
                    <textarea name="description" maxLength={5000} rows={2} placeholder="Mô tả yêu cầu" className="w-full rounded-lg border border-white/10 bg-ink-950 p-3 text-sm text-white" />
                    <input name="dueAt" type="datetime-local" className="h-10 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white" />
                    <button disabled={busy} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white">Thêm bài tập</button>
                  </form>
                </div>
              </div>
              <div className="mt-5 border-t border-white/8 pt-4">
                <h3 className="font-bold text-white">Danh sách học sinh</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {course.enrolledStudents.map((student) => <span key={student.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-300">
                    {student.name} · {student.email}
                    <button type="button" aria-label={`Xóa ${student.email} khỏi khóa học`} onClick={() => {
                      const enrollment = course.enrolledStudents.find((item) => item.id === student.id);
                      if (enrollment && window.confirm(`Xóa ${student.name} khỏi khóa học?`)) {
                        void sendCourseRequest(`/api/teacher/courses?kind=enrollment&id=${student.id}`, "DELETE");
                      }
                    }} className="font-black text-rose-300">×</button>
                  </span>)}
                  {course.enrolledStudents.length === 0 && <p className="text-xs text-slate-500">Chưa có học sinh tham gia.</p>}
                </div>
                <form onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = Object.fromEntries(new FormData(form));
                  void sendCourseRequest("/api/teacher/courses", "POST", { ...data, courseId: course.id, kind: "enrollment" }).then(() => form.reset());
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
              <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-black/20 p-4 text-sm text-slate-300">{submission.content}</p>
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
    </div>
  );
}
