"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { PublicUser } from "@/lib/auth";
import { ACHIEVEMENTS } from "@/lib/achievements";

const PRESETS = [
  { id: "aurora", name: "Cực quang", style: "from-cyan-500/60 via-violet-500/50 to-pink-500/40" },
  { id: "ocean", name: "Đại dương", style: "from-blue-600/70 via-cyan-500/50 to-teal-400/40" },
  { id: "sunset", name: "Hoàng hôn", style: "from-orange-500/60 via-rose-500/50 to-violet-500/40" },
  { id: "forest", name: "Rừng xanh", style: "from-emerald-600/60 via-teal-500/50 to-lime-400/30" },
];

export function ProfileSettings({
  user,
  achievements,
}: {
  user: PublicUser;
  achievements: { earnedKeys: string[]; equippedKey: string | null };
}) {
  const [name, setName] = useState(user.name);
  const [background, setBackground] = useState(user.background);
  const [examDate, setExamDate] = useState(user.examDate?.toISOString().slice(0, 10) ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [equippedKey, setEquippedKey] = useState(achievements.equippedKey);
  const [badgeMessage, setBadgeMessage] = useState("");
  const [badgeError, setBadgeError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, background, examDate: examDate || null }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Không lưu được cài đặt.");
      } else {
        setMessage("Cài đặt tài khoản đã được lưu.");
        window.dispatchEvent(new Event("ontin-profile-updated"));
      }
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function equipAchievement(key: string | null) {
    setBadgeMessage("");
    setBadgeError("");
    try {
      const response = await fetch("/api/achievements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementKey: key }),
      });
      const result = await response.json();
      if (!response.ok) {
        setBadgeError(result.error ?? "Không thể thay đổi danh hiệu.");
        return;
      }
      setEquippedKey(key);
      setBadgeMessage("Danh hiệu đang đeo đã được cập nhật.");
      window.dispatchEvent(new Event("ontin-profile-updated"));
    } catch {
      setBadgeError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
      <div className={`rounded-3xl bg-gradient-to-br ${PRESETS.find((item) => item.id === background)?.style ?? PRESETS[0].style} p-8`}>
        <div className="rounded-2xl border border-white/15 bg-ink-950/60 p-5 backdrop-blur">
          <p className="text-sm text-slate-300">Tài khoản của</p>
          <h1 className="mt-1 text-3xl font-black text-white">{name}</h1>
          <p className="mt-2 text-sm text-slate-300">{user.email}</p>
          {equippedKey && (
            <p className="mt-3 inline-flex rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-bold text-amber-100">
              {ACHIEVEMENTS.find((item) => item.key === equippedKey)?.name}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={save} className="mt-6 space-y-7 rounded-3xl border border-white/10 bg-ink-900/70 p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-black text-white">Hồ sơ và kế hoạch ôn tập</h2>
          <p className="mt-1 text-sm text-slate-400">Thiết lập hiển thị và ngày thi dự kiến của riêng bạn.</p>
        </div>
        <label className="block space-y-2 text-sm font-semibold text-slate-200">
          <span>Tên hiển thị</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/50" />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-200">Hình nền tài khoản</legend>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setBackground(preset.id)}
                aria-pressed={background === preset.id}
                className={`rounded-xl border p-2 text-left transition ${background === preset.id ? "border-cyan-300 ring-2 ring-cyan-300/30" : "border-white/10"}`}
              >
                <span className={`block h-16 rounded-lg bg-gradient-to-br ${preset.style}`} />
                <span className="mt-2 block text-xs font-bold text-white">{preset.name}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block space-y-2 text-sm font-semibold text-slate-200">
          <span>Ngày thi dự kiến</span>
          <input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/50" />
          <span className="block text-xs font-normal text-slate-500">Để trống nếu bạn chưa có lịch thi.</span>
        </label>
        <section aria-labelledby="achievements-title">
          <h2 id="achievements-title" className="text-lg font-black text-white">Danh hiệu</h2>
          <p className="mt-1 text-sm text-slate-400">Hoàn thành mục tiêu để mở khóa và chọn danh hiệu muốn đeo.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ACHIEVEMENTS.map((achievement) => {
              const earned = achievements.earnedKeys.includes(achievement.key);
              const equipped = equippedKey === achievement.key;
              return (
                <div key={achievement.key} className={`rounded-2xl border p-4 ${earned ? "border-amber-200/20 bg-amber-200/5" : "border-white/8 bg-white/[0.02]"}`}>
                  <p className={`font-bold ${earned ? "text-amber-100" : "text-slate-400"}`}>{achievement.name}</p>
                  <p className="mt-1 min-h-10 text-xs leading-relaxed text-slate-400">{achievement.description}</p>
                  <button
                    type="button"
                    disabled={!earned}
                    onClick={() => void equipAchievement(equipped ? null : achievement.key)}
                    className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:text-slate-600"
                  >
                    {!earned ? "Chưa đạt" : equipped ? "Đang đeo · Bỏ đeo" : "Đeo danh hiệu"}
                  </button>
                </div>
              );
            })}
          </div>
          {badgeError && <p role="alert" className="mt-3 text-sm text-rose-300">{badgeError}</p>}
          {badgeMessage && <p role="status" className="mt-3 text-sm text-emerald-300">{badgeMessage}</p>}
        </section>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
        <button disabled={busy} className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 font-bold text-ink-950 disabled:opacity-60">
          {busy ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
      <Link href="/thong-bao" className="mt-5 inline-block text-sm font-semibold text-cyan-200 hover:text-white">Xem thông báo tài khoản →</Link>
    </main>
  );
}
