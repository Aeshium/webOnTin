"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { LessonRichTextEditor } from "@/components/lesson-rich-text";
import { QuestionBankPicker, type BankQuestion } from "@/components/question-bank-picker";

export type TeacherLesson = {
  id: number;
  title: string;
  description: string;
  content: string;
  sortOrder: number;
  questionIds: number[];
};

export function TeacherLessonEditor({
  courseId,
  lesson,
  onClose,
  onSaved,
}: {
  courseId: number;
  lesson?: TeacherLesson;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [content, setContent] = useState(lesson?.content ?? "");
  const [questionIds, setQuestionIds] = useState(lesson?.questionIds ?? []);
  const [selectedQuestions, setSelectedQuestions] = useState<BankQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!lesson?.questionIds.length) return;
    const controller = new AbortController();
    fetch(`/api/teacher/question-bank?ids=${lesson.questionIds.join(",")}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result: { items?: BankQuestion[]; error?: string } = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Không tải được câu hỏi đã đính kèm.");
        if (!controller.signal.aborted) setSelectedQuestions(result.items ?? []);
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Không tải được câu hỏi đã đính kèm.");
        }
      });
    return () => controller.abort();
  }, [lesson]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (content.trim().length < 1) {
      setError("Hãy nhập nội dung lý thuyết.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/courses", {
        method: lesson ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "lesson",
          courseId,
          id: lesson?.id,
          title,
          description,
          content,
          questionIds,
        }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không lưu được bài học.");
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được bài học.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="lesson-editor-title" className="flex max-h-[94svh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">{lesson ? "Chỉnh sửa bài học" : "Tạo bài học mới"}</p>
            <h2 id="lesson-editor-title" className="mt-1 text-xl font-black text-white">{lesson ? lesson.title : "Soạn bài học"}</h2>
          </div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Đóng trình soạn bài học" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={(event) => void save(event)} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-7">
          {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
            <label className="text-xs font-bold text-slate-300">Tên bài học
              <input required minLength={2} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Cơ sở dữ liệu và SQL" className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white" />
            </label>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-slate-500">Trạng thái</p>
              <p className="mt-1 text-sm font-bold text-emerald-200">Hiển thị sau khi lưu</p>
            </div>
            <label className="text-xs font-bold text-slate-300 sm:col-span-2">Mô tả ngắn
              <textarea maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Giới thiệu ngắn về nội dung bài học" className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 p-3 text-sm text-white" />
            </label>
          </div>

          <section>
            <h3 className="mb-2 text-sm font-black text-white">1. Nội dung lý thuyết</h3>
            <LessonRichTextEditor
              content={content}
              onChange={setContent}
              availableQuestions={selectedQuestions}
            />
            <p className="mt-2 text-xs text-slate-500">Đặt con trỏ trong phần nội dung, chọn câu đã đính kèm rồi chèn vào sau phần đó. Có thể kéo khối để đổi vị trí; chọn khối và nhấn Delete để gỡ.</p>
          </section>

          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-white">2. Câu hỏi đính kèm</h3>
              <span className="text-xs text-slate-400">Đã chọn {questionIds.length} câu hỏi</span>
            </div>
            <QuestionBankPicker
              selectedIds={questionIds}
              selectedQuestions={selectedQuestions}
              onChange={(questions) => {
                setSelectedQuestions(questions);
                setQuestionIds(questions.map((question) => question.id));
              }}
            />
          </section>
          <footer className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
            <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 disabled:opacity-50">Hủy</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-black text-ink-950 disabled:opacity-50">{busy ? "Đang lưu..." : lesson ? "Lưu thay đổi" : "Tạo bài học"}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
