"use client";

import { FormEvent, useEffect, useState } from "react";

type AssignmentView = {
  id: number;
  title: string;
  description: string;
  dueAt: string | null;
  courseTitle: string;
  submissionId: number | null;
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
};

export function StudentAssignments() {
  const [items, setItems] = useState<AssignmentView[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/assignments", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không tải được bài tập.");
      setItems(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được bài tập.");
    } finally {
      setLoading(false);
    }
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

  async function submit(event: FormEvent<HTMLFormElement>, item: AssignmentView) {
    event.preventDefault();
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/assignments/${item.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: answers[item.id] ?? "" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không nộp được bài.");
      setNotice("Bài tập đã được nộp.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không nộp được bài.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pt-28 pb-20 sm:px-6">
      <p className="text-xs font-bold tracking-[0.2em] text-cyan-300 uppercase">Học tập</p>
      <h1 className="mt-2 text-3xl font-black text-white">Bài tập được giao</h1>
      <p className="mt-2 text-sm text-slate-400">Nộp bài tại đây và xem điểm, nhận xét của giáo viên.</p>
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-emerald-300">{notice}</p>}
      {loading ? <p className="mt-8 text-sm text-slate-400">Đang tải...</p> : (
        <div className="mt-7 space-y-4">
          {items.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <p className="text-xs font-bold text-cyan-200">{item.courseTitle}</p>
            <h2 className="mt-2 text-lg font-black text-white">{item.title}</h2>
            {item.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">{item.description}</p>}
            {item.dueAt && <p className="mt-3 text-xs text-amber-200">Hạn nộp: {new Date(item.dueAt).toLocaleString("vi-VN")}</p>}
            {item.score !== null && <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/5 p-4">
              <p className="font-bold text-emerald-200">Điểm: {item.score}/100</p>
              {item.feedback && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{item.feedback}</p>}
            </div>}
            <form onSubmit={(event) => void submit(event, item)} className="mt-4 space-y-3">
              <textarea required minLength={1} maxLength={20000} rows={5} value={answers[item.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={item.submissionId ? "Gửi lại bài (thay thế bài nộp trước)" : "Nhập nội dung bài làm"} className="w-full rounded-xl border border-white/10 bg-ink-950 p-3 text-sm text-white outline-none focus:border-cyan-300/50" />
              <button disabled={busyId === item.id} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-ink-950 disabled:opacity-50">{busyId === item.id ? "Đang nộp..." : item.submissionId ? "Nộp lại bài" : "Nộp bài"}</button>
              {item.submittedAt && <span className="ml-3 text-xs text-slate-500">Đã nộp {new Date(item.submittedAt).toLocaleString("vi-VN")}</span>}
            </form>
          </article>)}
          {items.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">Hiện chưa có bài tập được giao.</p>}
        </div>
      )}
    </main>
  );
}
