"use client";

import { useEffect, useState } from "react";

type NotificationItem = {
  id: number | null;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  kind?: "reminder" | "exam";
};

export function NotificationsClient() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/notifications");
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Không tải được thông báo.");
      return;
    }
    setItems(data.notifications);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/notifications")
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) {
          setError(data.error ?? "Không tải được thông báo.");
          return;
        }
        setItems(data.notifications);
      })
      .catch(() => {
        if (active) setError("Không thể kết nối máy chủ để tải thông báo.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function markRead(id: number) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      setError("Không thể cập nhật trạng thái thông báo.");
      return;
    }
    await load();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
      <h1 className="text-3xl font-black text-white">Thông báo</h1>
      <p className="mt-2 text-sm text-slate-400">Nhắc lịch thi và cập nhật liên quan đến tài khoản của bạn.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200">{error}</p>}
      <div className="mt-6 space-y-3">
        {items.map((item, index) => (
          <article key={item.id ?? `${item.kind}-${index}`} className={`rounded-2xl border p-5 ${item.readAt ? "border-white/5 bg-ink-900/40" : "border-cyan-300/20 bg-cyan-300/5"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.message}</p>
              </div>
              {item.id && !item.readAt && <button onClick={() => void markRead(item.id!)} className="shrink-0 text-xs font-bold text-cyan-200 hover:text-white">Đã đọc</button>}
            </div>
          </article>
        ))}
        {!error && items.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">Bạn chưa có thông báo mới.</p>}
      </div>
    </main>
  );
}
