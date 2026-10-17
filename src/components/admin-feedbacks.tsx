"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type FeedbackRecord = {
  id: string;
  type: "bug" | "feature" | "other";
  content: string;
  imageDataUrl: string | null;
  status: "pending" | "resolved";
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

const TYPE_LABELS = { bug: "Báo lỗi", feature: "Góp ý tính năng", other: "Khác" };

export function AdminFeedbacks() {
  const [items, setItems] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/admin/feedbacks", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không tải được phản hồi.");
      setItems(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được phản hồi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/feedbacks", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Không tải được phản hồi.");
        if (active) setItems(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Không tải được phản hồi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function toggleStatus(item: FeedbackRecord) {
    setBusyId(item.id);
    setError("");
    try {
      const status = item.status === "pending" ? "resolved" : "pending";
      const response = await fetch("/api/admin/feedbacks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không cập nhật được trạng thái.");
      setItems((current) => current.map((record) => record.id === item.id ? { ...record, status: result.status } : record));
      if (result.status !== "resolved") {
        setSelectedIds((current) => current.filter((id) => id !== item.id));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không cập nhật được trạng thái.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteFeedbacks(body: { ids?: string[]; allResolved?: boolean }) {
    setDeleteBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/feedbacks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result: { error?: string; deletedIds?: string[]; deletedCount?: number } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không xóa được phản hồi.");
      const deleted = new Set(result.deletedIds ?? []);
      setItems((current) => current.filter((item) => !deleted.has(item.id)));
      setSelectedIds((current) => current.filter((id) => !deleted.has(id)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xóa được phản hồi.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const resolvedIds = items.filter((item) => item.status === "resolved").map((item) => item.id);
  const allVisibleResolvedSelected = resolvedIds.length > 0 && resolvedIds.every((id) => selectedIds.includes(id));

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-bold tracking-[0.2em] text-cyan-300 uppercase">Quản trị</p>
      <h1 className="mt-2 text-3xl font-black text-white">Phản hồi người dùng</h1>
      <p className="mt-2 text-sm text-slate-400">Các phản hồi được lưu trong database; thông báo cũng được gửi tới Discord.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={deleteBusy || selectedIds.length === 0} onClick={() => {
          if (window.confirm(`Xóa ${selectedIds.length} phản hồi đã xử lý đang chọn?`)) {
            void deleteFeedbacks({ ids: selectedIds });
          }
        }} className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-2.5 text-sm font-bold text-rose-200 disabled:opacity-40">
          Xóa mục đã chọn ({selectedIds.length})
        </button>
        <button type="button" disabled={deleteBusy || resolvedIds.length === 0} onClick={() => {
          if (window.confirm(`Xóa tất cả ${resolvedIds.length} phản hồi đã xử lý? Phản hồi đang chờ sẽ được giữ nguyên.`)) {
            void deleteFeedbacks({ allResolved: true });
          }
        }} className="rounded-xl border border-rose-400/25 px-4 py-2.5 text-sm font-bold text-rose-200 disabled:opacity-40">
          Xóa tất cả đã xử lý
        </button>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="p-4"><input type="checkbox" aria-label="Chọn tất cả phản hồi đã xử lý" checked={allVisibleResolvedSelected} disabled={resolvedIds.length === 0} onChange={(event) => setSelectedIds(event.target.checked ? resolvedIds : [])} /></th><th className="p-4">Người gửi</th><th className="p-4">Loại</th><th className="p-4">Nội dung</th><th className="p-4">Thời gian</th><th className="p-4">Trạng thái</th></tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {loading ? <tr><td colSpan={6} className="p-6 text-center text-slate-400">Đang tải...</td></tr> :
              items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="p-4"><input type="checkbox" aria-label={`Chọn phản hồi ${item.id}`} checked={selectedIds.includes(item.id)} disabled={item.status !== "resolved"} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /></td>
                  <td className="p-4"><p className="font-bold text-white">{item.userName ?? "Tài khoản đã xóa"}</p><p className="mt-1 text-xs text-slate-500">{item.userEmail ?? "—"}</p></td>
                  <td className="p-4 text-slate-300">{TYPE_LABELS[item.type]}</td>
                  <td className="max-w-md whitespace-pre-wrap break-words p-4 text-slate-300">{item.content}{item.imageDataUrl && <a href={item.imageDataUrl} target="_blank" rel="noreferrer" className="mt-3 block"><Image src={item.imageDataUrl} alt="Ảnh đính kèm feedback" width={800} height={600} unoptimized className="max-h-48 max-w-full rounded-xl border border-white/10 object-contain" /></a>}</td>
                  <td className="whitespace-nowrap p-4 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="p-4"><button type="button" disabled={busyId === item.id} onClick={() => void toggleStatus(item)} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${item.status === "pending" ? "bg-amber-300/10 text-amber-200" : "bg-emerald-300/10 text-emerald-200"}`}>{busyId === item.id ? "Đang lưu..." : item.status === "pending" ? "Chờ xử lý · Đánh dấu xong" : "Đã xử lý · Mở lại"}</button></td>
                </tr>
              ))}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Chưa có phản hồi.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
