"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

export type BankQuestion = {
  id: number;
  content: string;
  topicName: string;
  topicId: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: string;
};

const MAX_SELECTED_QUESTIONS = 100;

type BankPage = {
  items: BankQuestion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  topics: { id: string; name: string }[];
};

export function QuestionBankPicker({
  selectedQuestions,
  selectedIds,
  onChange,
  label = "Chọn câu hỏi từ ngân hàng",
}: {
  selectedQuestions: BankQuestion[];
  selectedIds: number[];
  onChange: (questions: BankQuestion[]) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState<"all" | "selected" | "unselected">("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<BankPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedById, setSelectedById] = useState<Record<number, BankQuestion>>(
    Object.fromEntries(selectedQuestions.map((question) => [question.id, question]))
  );

  const selectedItems = selectedIds.flatMap((id) => {
    const question = selectedById[id] ?? selectedQuestions.find((item) => item.id === id);
    return question ? [question] : [];
  });

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        q: query.trim(),
        topicId,
        difficulty,
        status,
        selectedIds: selectedIds.join(","),
        page: String(page),
        pageSize: "10",
      });
      try {
        const response = await fetch(`/api/teacher/question-bank?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data: BankPage & { error?: string } = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Không tải được ngân hàng câu hỏi.");
        if (!controller.signal.aborted) setResult(data);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Không tải được ngân hàng câu hỏi.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, topicId, difficulty, status, page, selectedIds]);

  useEffect(() => {
    if (!open || selectedIds.length === 0) return;
    const missingIds = selectedIds.filter((id) => !selectedById[id]);
    if (missingIds.length === 0) return;
    const controller = new AbortController();
    fetch(`/api/teacher/question-bank?ids=${missingIds.join(",")}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data: { items?: BankQuestion[]; error?: string } = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Không tải được câu hỏi đã đính kèm.");
        if (!controller.signal.aborted) {
          setSelectedById((current) => ({
            ...current,
            ...Object.fromEntries((data.items ?? []).map((question) => [question.id, question])),
          }));
        }
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Không tải được câu hỏi đã đính kèm.");
      });
    return () => controller.abort();
  }, [open, selectedIds, selectedById]);

  function updateFilters(update: () => void) {
    update();
    setPage(1);
  }

  function toggle(question: BankQuestion) {
    const updated: Record<number, BankQuestion> = {
      ...Object.fromEntries(selectedQuestions.map((item) => [item.id, item])),
      ...selectedById,
    };
    if (updated[question.id]) delete updated[question.id];
    else {
      if (selectedIds.length >= MAX_SELECTED_QUESTIONS) {
        setError(`Mỗi nội dung chỉ được gắn tối đa ${MAX_SELECTED_QUESTIONS} câu hỏi.`);
        return;
      }
      updated[question.id] = question;
    }
    setSelectedById(updated);
    onChange(Object.values(updated));
  }

  function close() {
    setOpen(false);
    setError("");
  }

  return (
    <>
      <div className="rounded-xl border border-white/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-cyan-200">{label} · {selectedIds.length} đã chọn</p>
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10">
            <Search className="h-3.5 w-3.5" /> Mở ngân hàng câu hỏi
          </button>
        </div>
        {selectedIds.length > 0 && <ul className="mt-3 space-y-1.5">
          {selectedItems.map((question, index) => (
            <li key={question.id} className="flex items-start justify-between gap-3 rounded-lg bg-black/20 px-3 py-2 text-xs">
              <span className="min-w-0"><span className="font-bold text-cyan-100">{index + 1}. {question.topicName}</span><span className="mt-0.5 block text-slate-300">{question.content}</span></span>
              <button type="button" aria-label={`Bỏ câu hỏi ${index + 1}`} onClick={() => toggle(question)} className="shrink-0 rounded p-1 text-rose-200 hover:bg-rose-300/10"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>}
        {selectedIds.length > 0 && selectedItems.length < selectedIds.length && <p className="mt-2 text-xs text-slate-500">Đang tải nội dung câu hỏi đã chọn...</p>}
        {selectedIds.length === 0 && <p className="mt-2 text-xs text-slate-500">Chưa chọn câu hỏi nào.</p>}
      </div>
      {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="question-bank-title" className="flex max-h-[92svh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
            <div><h2 id="question-bank-title" className="text-lg font-black text-white">Chọn câu hỏi từ ngân hàng</h2><p className="mt-1 text-xs text-slate-400">Tìm kiếm và lọc trực tiếp trên ngân hàng dữ liệu; mỗi trang tải 10 câu.</p></div>
            <button type="button" onClick={close} aria-label="Đóng bộ chọn câu hỏi" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
          </header>
          <div className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-2">
            <label className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={(event) => updateFilters(() => setQuery(event.target.value))} placeholder="Tìm theo nội dung câu hỏi..." className="h-10 w-full rounded-lg border border-white/10 bg-ink-950 pl-9 pr-3 text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">Chuyên đề
              <select value={topicId} onChange={(event) => updateFilters(() => setTopicId(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white">
                <option value="">Tất cả chuyên đề</option>
                {result?.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-400">Độ khó
              <select value={difficulty} onChange={(event) => updateFilters(() => setDifficulty(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white">
                <option value="">Tất cả mức độ</option>
                <option value="basic">Cơ bản</option>
                <option value="advanced">Nâng cao</option>
              </select>
            </label>
            <label className="text-xs text-slate-400 md:col-span-2">Trạng thái
              <select value={status} onChange={(event) => updateFilters(() => setStatus(event.target.value as typeof status))} className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white">
                <option value="all">Tất cả câu hỏi</option>
                <option value="selected">Đã chọn</option>
                <option value="unselected">Chưa chọn</option>
              </select>
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 pt-4">
            <p className="text-sm font-bold text-white">Danh sách câu hỏi <span className="ml-1 text-xs font-normal text-slate-400">({result?.total ?? 0})</span></p>
            <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-xs font-bold text-cyan-100">Đã chọn {selectedIds.length}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {error && <p role="alert" className="mb-3 rounded-lg bg-rose-300/10 p-3 text-xs text-rose-200">{error}</p>}
            {loading && <p className="py-3 text-center text-xs text-slate-400">Đang tải câu hỏi...</p>}
            {!loading && result?.items.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Không có câu hỏi phù hợp bộ lọc.</p>}
            <div className="space-y-2">
              {result?.items.map((question, index) => {
                const checked = Boolean(selectedById[question.id]);
                return <label key={question.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? "border-cyan-300/30 bg-cyan-300/5" : "border-white/10 hover:border-white/20"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(question)} className="mt-1 accent-cyan-300" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400"><span>Câu {(page - 1) * 10 + index + 1}</span><span>·</span><span>{question.topicName}</span><span>·</span><span>{question.difficulty === "advanced" ? "Nâng cao" : "Cơ bản"}</span></span>
                    <span className="mt-1 block text-sm text-slate-100">{question.content}</span>
                    <span className="mt-1 block text-xs text-slate-500">{question.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join("　")}</span>
                  </span>
                  {checked && <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />}
                </label>;
              })}
            </div>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4">
            <p className="text-xs text-slate-400">Trang {result?.page ?? page}/{result?.totalPages ?? 1} · {result?.total ?? 0} câu hỏi</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Trước</button>
              <button type="button" disabled={!result || page >= result.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-40">Sau <ChevronRight className="h-4 w-4" /></button>
              <button type="button" onClick={close} className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-black text-ink-950">Xong · {selectedIds.length} câu đã chọn</button>
            </div>
          </footer>
        </section>
      </div>}
    </>
  );
}
