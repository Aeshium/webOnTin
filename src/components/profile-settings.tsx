"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { PublicUser } from "@/lib/auth";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { validatePassword } from "@/lib/password-policy";
import { FeedbackModal } from "@/components/feedback-modal";

const PRESETS = [
  { id: "aurora", name: "Cực quang", style: "from-cyan-500/60 via-violet-500/50 to-pink-500/40" },
  { id: "ocean", name: "Đại dương", style: "from-blue-600/70 via-cyan-500/50 to-teal-400/40" },
  { id: "sunset", name: "Hoàng hôn", style: "from-orange-500/60 via-rose-500/50 to-violet-500/40" },
  { id: "forest", name: "Rừng xanh", style: "from-emerald-600/60 via-teal-500/50 to-lime-400/30" },
  { id: "rose", name: "Hồng đào", style: "from-rose-500/70 via-pink-500/50 to-orange-400/40" },
  { id: "lavender", name: "Tím lavender", style: "from-violet-600/70 via-purple-500/50 to-fuchsia-400/40" },
  { id: "midnight", name: "Xanh đêm", style: "from-slate-700/80 via-blue-900/70 to-cyan-700/50" },
];

export function ProfileSettings({
  user,
  achievements,
}: {
  user: PublicUser;
  achievements: { earnedKeys: string[]; equippedKey: string | null };
}) {
  const [name, setName] = useState(user.name);
  const [schoolName, setSchoolName] = useState(user.schoolName ?? "");
  const [className, setClassName] = useState(user.className ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [background, setBackground] = useState(user.background);
  const [examDate, setExamDate] = useState(user.examDate?.toISOString().slice(0, 10) ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [equippedKey, setEquippedKey] = useState(achievements.equippedKey);
  const [badgeMessage, setBadgeMessage] = useState("");
  const [badgeError, setBadgeError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          schoolName,
          className,
          background,
          examDate: examDate || null,
        }),
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

  async function uploadAvatar(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    setAvatarError("");
    const data = new FormData();
    data.set("avatar", file);
    try {
      const response = await fetch("/api/profile/avatar", { method: "POST", body: data });
      const result: { avatarUrl?: string; error?: string } = await response.json();
      if (!response.ok || !result.avatarUrl) {
        setAvatarError(result.error ?? "Không thể cập nhật ảnh đại diện.");
        return;
      }
      setAvatarUrl(result.avatarUrl);
      window.dispatchEvent(new Event("ontin-profile-updated"));
    } catch {
      setAvatarError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setAvatarBusy(false);
      input.value = "";
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

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordBusy(true);
    setPasswordMessage("");
    setPasswordError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    const policyError = validatePassword(newPassword);
    if (policyError) {
      setPasswordError(policyError);
      setPasswordBusy(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      setPasswordBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword,
          confirmPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setPasswordError(result.error ?? "Không thể đổi mật khẩu.");
        return;
      }
      form.reset();
      setPasswordMessage("Đổi mật khẩu thành công. Các thiết bị khác đã được đăng xuất.");
    } catch {
      setPasswordError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
      <div className={`rounded-3xl bg-gradient-to-br ${PRESETS.find((item) => item.id === background)?.style ?? PRESETS[0].style} p-8`}>
        <div className="rounded-2xl border border-white/15 bg-ink-950/60 p-5 backdrop-blur">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // Firebase photo URLs and uploaded data URLs are both supported.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={`Ảnh đại diện của ${name}`} className="h-20 w-20 rounded-full border-2 border-white/30 object-cover" />
            ) : (
              <span aria-hidden="true" className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 border-white/30 bg-white/10 text-3xl font-black text-white">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
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
        </div>
      </div>

      <form onSubmit={save} className="mt-6 space-y-7 rounded-3xl border border-white/10 bg-ink-900/70 p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-black text-white">Hồ sơ và kế hoạch ôn tập</h2>
          <p className="mt-1 text-sm text-slate-400">Thiết lập hiển thị và ngày thi dự kiến của riêng bạn.</p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200" htmlFor="profile-avatar">Ảnh đại diện</label>
          <input
            id="profile-avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void uploadAvatar(event)}
            disabled={avatarBusy}
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-white/15 disabled:opacity-60"
          />
          <p className="text-xs text-slate-500">JPEG, PNG hoặc WebP, tối đa 1 MB. Ảnh Google được dùng tự động nếu chưa tải ảnh riêng lên.</p>
          {avatarError && <p role="alert" className="text-sm text-rose-300">{avatarError}</p>}
          {avatarBusy && <p role="status" className="text-sm text-slate-400">Đang tải ảnh lên...</p>}
        </div>
        <label className="block space-y-2 text-sm font-semibold text-slate-200">
          <span>Tên hiển thị</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/50" />
        </label>
        <label className="block space-y-2 text-sm font-semibold text-slate-200">
          <span>Tên trường</span>
          <input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} maxLength={120} className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/50" />
        </label>
        <label className="block space-y-2 text-sm font-semibold text-slate-200">
          <span>Tên lớp</span>
          <input value={className} onChange={(event) => setClassName(event.target.value)} maxLength={80} className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/50" />
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
      <form
        onSubmit={changePassword}
        className="mt-6 space-y-5 rounded-3xl border border-white/10 bg-ink-900/70 p-6 sm:p-8"
      >
        <div>
          <h2 className="text-xl font-black text-white">Đổi mật khẩu</h2>
          <p className="mt-1 text-sm text-slate-400">Xác nhận mật khẩu hiện tại trước khi đặt mật khẩu mới.</p>
        </div>
        <PasswordInput
          label="Mật khẩu hiện tại"
          name="currentPassword"
          autoComplete="current-password"
          required
        />
        <PasswordInput
          label="Mật khẩu mới"
          name="newPassword"
          autoComplete="new-password"
          minLength={5}
          maxLength={20}
          required
        />
        <PasswordInput
          label="Xác nhận mật khẩu mới"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={5}
          maxLength={20}
          required
        />
        <p className="-mt-3 text-xs leading-relaxed text-slate-500">
          Mật khẩu mới gồm 5–20 ký tự, có ít nhất một chữ hoa, một số và một ký tự đặc biệt.
        </p>
        {passwordError && <p role="alert" className="text-sm text-rose-300">{passwordError}</p>}
        {passwordMessage && <p role="status" className="text-sm text-emerald-300">{passwordMessage}</p>}
        <button
          disabled={passwordBusy}
          className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 font-bold text-ink-950 disabled:opacity-60"
        >
          {passwordBusy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
        </button>
      </form>
      <div className="mt-6 rounded-3xl border border-white/10 bg-ink-900/70 p-6 sm:p-8">
        <h2 className="text-xl font-black text-white">Góp ý cho ÔnTin</h2>
        <p className="mt-1 text-sm text-slate-400">Gửi báo lỗi hoặc đề xuất để giúp chúng tôi cải thiện hệ thống.</p>
        <FeedbackModal />
      </div>
      <Link href="/thong-bao" className="mt-5 inline-block text-sm font-semibold text-cyan-200 hover:text-white">Xem thông báo tài khoản →</Link>
    </main>
  );
}

function PasswordInput({
  label,
  name,
  autoComplete,
  required,
  minLength,
  maxLength,
}: {
  label: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block space-y-2 text-sm font-semibold text-slate-200">
      <span>{label}</span>
      <span className="relative block">
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-12 text-white outline-none focus:border-cyan-300/50"
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-3 grid place-items-center text-slate-400 hover:text-white"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}
