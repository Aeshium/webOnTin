"use client";
// Client Component của trang Tra cứu:
// - Gõ từ khóa / chọn chuyên đề → debounce 300ms → fetch GET /api/bank → hiển thị.
// - Bấm vào câu hỏi để xổ đáp án đúng + giải thích (accordion).
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, ChevronDown, Check, Lightbulb } from "lucide-react";

type BankTopic = { id: string; name: string; colorFrom: string; colorTo: string };

type BankItem = {
  id: number;
  content: string;
  options: string[];
  difficulty: string;
  correctIndex: number;
  explanation: string;
  topicName: string;
  colorFrom: string;
  colorTo: string;
};

const LETTERS = ["A", "B", "C", "D"];

export function BankClient({
  topics,
  initialQuery = "",
}: {
  topics: BankTopic[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [topic, setTopic] = useState("");
  const [items, setItems] = useState<BankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const activeController = useRef<AbortController | null>(null);

  // Hàm gọi API — ở client KHÔNG query DB trực tiếp được, phải đi qua API route.
  const load = useCallback(async (
    keyword: string,
    topicId: string,
    offset: number,
    append: boolean,
    signal: AbortSignal
  ) => {
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setItems([]);
      setHasMore(false);
      setLoadingMore(false);
    }
    setError("");
    try {
      const res = await fetch(
        `/api/bank?q=${encodeURIComponent(keyword)}&topic=${encodeURIComponent(topicId)}&offset=${offset}`,
        { signal }
      );
      if (!res.ok) throw new Error("Không tải được ngân hàng câu hỏi.");
      const result: { items: BankItem[]; hasMore: boolean } = await res.json();
      setItems((current) => append ? [...current, ...result.items] : result.items);
      setHasMore(result.hasMore);
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      setError("Không tải được câu hỏi. Kiểm tra kết nối rồi thử lại.");
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Debounce: chờ ngừng gõ 300ms mới gọi API — đỡ spam server.
  useEffect(() => {
    const controller = new AbortController();
    activeController.current = controller;
    const t = setTimeout(() => {
      void load(q, topic, 0, false, controller.signal);
    }, 300);
    return () => {
      clearTimeout(t);
      activeController.current?.abort();
      activeController.current = null;
    };
  }, [q, topic, load]);

  const loadMore = useCallback(() => {
    const controller = new AbortController();
    activeController.current = controller;
    void load(q, topic, items.length, true, controller.signal);
  }, [items.length, load, q, topic]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-28 pb-24 sm:px-6">
      <p className="text-sm font-bold tracking-[0.25em] text-emerald-300 uppercase">
        Học trước khi làm
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
        Tra cứu ngân hàng câu hỏi
      </h1>
      <p className="mt-3 text-sm text-slate-500">
        Toàn bộ câu hỏi trong database, kèm đáp án và giải thích — dùng để ôn lý thuyết trước khi luyện đề.
      </p>

      {/* Ô tìm kiếm */}
      <div className="relative mt-8">
        <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gõ từ khóa... ví dụ: RAM, Ctrl, SELECT, Excel"
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pr-4 pl-12 text-sm text-white placeholder-slate-500 backdrop-blur transition-colors outline-none focus:border-cyan-400/50 focus:bg-white/8"
        />
      </div>

      {/* Bộ lọc chuyên đề */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setTopic("")}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
            topic === ""
              ? "bg-gradient-to-r from-cyan-400 to-violet-500 text-ink-950"
              : "border border-white/12 text-slate-400 hover:border-white/30"
          }`}
        >
          Tất cả
        </button>
        {topics.map((t) => (
          <button
            key={t.id}
            onClick={() => setTopic(topic === t.id ? "" : t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              topic === t.id ? "text-ink-950" : "border border-white/12 text-slate-400 hover:border-white/30"
            }`}
            style={topic === t.id ? { background: `linear-gradient(90deg, ${t.colorFrom}, ${t.colorTo})` } : undefined}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Kết quả */}
      <p
        role={loading ? "status" : undefined}
        aria-live="polite"
        className="mt-8 text-xs font-bold tracking-wider text-slate-500 uppercase"
      >
        {loading ? "Đang tìm..." : `${items.length} câu đã tải`}
        {loading && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />}
      </p>

      <div className="mt-4 space-y-3">
        {error && (
          <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}
        {loading && items.length === 0 && (
          <div role="status" aria-label="Đang tải câu hỏi" className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} aria-hidden="true" className="glass h-24 animate-pulse rounded-2xl border border-white/5" />
            ))}
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-sm text-slate-500">
            Không tìm thấy câu hỏi nào khớp từ khóa &quot;{q}&quot;. Thử từ khóa khác xem!
          </div>
        )}

        {items.map((item) => {
          const open = expanded === item.id;
          return (
            <div key={item.id} className="glass overflow-hidden rounded-2xl">
              <button
                onClick={() => setExpanded(open ? null : item.id)}
                className="flex w-full items-start gap-3 px-5 py-4 text-left"
              >
                <span
                  className="mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  style={{
                    background: `${item.colorFrom}1c`,
                    color: item.colorFrom,
                    border: `1px solid ${item.colorFrom}3d`,
                  }}
                >
                  {item.topicName}
                </span>
                <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${item.difficulty === "advanced" ? "bg-violet-300/10 text-violet-200" : "bg-cyan-300/10 text-cyan-200"}`}>
                  {item.difficulty === "advanced" ? "Nâng cao" : "Cơ bản"}
                </span>
                <span className="flex-1 text-sm leading-relaxed font-semibold text-slate-200">
                  {item.content}
                </span>
                <ChevronDown
                  className={`mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open && (
                <div className="border-t border-white/8 px-5 pt-4 pb-5">
                  <div className="grid gap-2 text-sm">
                    {item.options.map((opt, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
                          i === item.correctIndex
                            ? "border-emerald-400/50 bg-emerald-400/10 font-semibold text-emerald-200"
                            : "border-white/8 text-slate-500"
                        }`}
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/15 text-xs font-black">
                          {LETTERS[i]}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {i === item.correctIndex && <Check className="h-4 w-4" strokeWidth={3} />}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3.5 text-sm leading-relaxed text-slate-300">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <span>{item.explanation}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            {loadingMore ? "Đang tải thêm..." : "Tải thêm 50 câu"}
          </button>
        )}
      </div>
    </div>
  );
}
