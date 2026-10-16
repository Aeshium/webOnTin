"use client";

import { FormEvent, useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";

export function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: values.get("type"),
          content: values.get("content"),
        }),
      });
      const result: { error?: string; warning?: string } = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Không gửi được phản hồi.");
        return;
      }
      form.reset();
      setOpen(false);
      setMessage(result.warning ?? "Cảm ơn bạn! Phản hồi đã được gửi.");
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Gửi Feedback
      </button>
      {message && <p role="status" className="mt-3 text-sm text-emerald-300">{message}</p>}
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="feedback-title" className="text-xl font-black text-white">Gửi phản hồi</h2>
                <p className="mt-1 text-sm text-slate-400">Ý kiến của bạn giúp ÔnTin tốt hơn.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} aria-label="Đóng" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block space-y-2 text-sm font-semibold text-slate-200">
                <span>Loại phản hồi</span>
                <select name="type" defaultValue="bug" className="h-11 w-full rounded-xl border border-white/10 bg-ink-950 px-3 text-white">
                  <option value="bug">Báo lỗi</option>
                  <option value="feature">Góp ý tính năng</option>
                  <option value="other">Khác</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm font-semibold text-slate-200">
                <span>Nội dung</span>
                <textarea name="content" required minLength={5} maxLength={4000} rows={6} className="w-full resize-y rounded-xl border border-white/10 bg-ink-950 p-3 text-white outline-none focus:border-cyan-300/50" placeholder="Mô tả chi tiết phản hồi..." />
              </label>
              {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
              <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 font-bold text-ink-950 disabled:opacity-60">
                {busy ? "Đang gửi..." : "Gửi phản hồi"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
