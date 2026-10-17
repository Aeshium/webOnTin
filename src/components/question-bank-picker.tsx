"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type BankQuestion = {
  id: number;
  content: string;
  topicName: string;
  topicId: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export function QuestionBankPicker({
  questions,
  selectedIds,
  onChange,
}: {
  questions: BankQuestion[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [remoteQuestions, setRemoteQuestions] = useState<BankQuestion[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchController = useRef<AbortController | null>(null);

  function updateSearch(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchController.current?.abort();
    const term = value.trim();
    if (!term) {
      setRemoteQuestions(null);
      setSearchError("");
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    searchController.current = controller;
    setSearching(true);
    setSearchError("");
    setRemoteQuestions(null);
    searchTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/teacher/question-bank?q=${encodeURIComponent(term)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Không tìm được câu hỏi.");
        if (!controller.signal.aborted) setRemoteQuestions(result);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setSearchError(caught instanceof Error ? caught.message : "Không tìm được câu hỏi.");
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
  }

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchController.current?.abort();
    };
  }, []);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const source = remoteQuestions ?? questions;
    return term
      ? source.filter((question) => `${question.content} ${question.topicName}`.toLowerCase().includes(term))
      : source;
  }, [questions, remoteQuestions, search]);

  return (
    <fieldset className="rounded-xl border border-white/10 p-3">
      <legend className="px-1 text-xs font-bold text-cyan-200">Chọn từ ngân hàng chung ({selectedIds.length} đã chọn)</legend>
      <input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Tìm câu hỏi hoặc chuyên đề" className="mb-2 h-9 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-xs text-white" />
      {searchError && <p role="alert" className="mb-2 text-xs text-rose-200">{searchError}</p>}
      <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
        {filtered.map((question) => (
          <label key={question.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-xs hover:bg-white/5">
            <input
              type="checkbox"
              checked={selectedIds.includes(question.id)}
              onChange={(event) => onChange(event.target.checked
                ? [...selectedIds, question.id]
                : selectedIds.filter((id) => id !== question.id))}
              className="mt-0.5 accent-cyan-300"
            />
            <span className="min-w-0">
              <span className="block font-bold text-cyan-100">{question.topicName}</span>
              <span className="mt-0.5 block text-slate-300">{question.content}</span>
            </span>
          </label>
        ))}
        {searching && <p className="p-3 text-xs text-slate-500">Đang tìm...</p>}
        {!searching && filtered.length === 0 && <p className="p-3 text-xs text-slate-500">Không tìm thấy câu hỏi.</p>}
      </div>
    </fieldset>
  );
}
