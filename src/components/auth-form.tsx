"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthMode = "login" | "register" | "forgot" | "reset";

const COPY: Record<AuthMode, { title: string; description: string; action: string }> = {
  login: {
    title: "Chào mừng trở lại",
    description: "Đăng nhập để tiếp tục theo dõi tiến trình ôn tập.",
    action: "Đăng nhập",
  },
  register: {
    title: "Tạo tài khoản ÔnTin",
    description: "Lưu lịch sử làm bài và cá nhân hóa kế hoạch ôn tập.",
    action: "Tạo tài khoản",
  },
  forgot: {
    title: "Quên mật khẩu",
    description: "Nhập email để nhận liên kết đặt lại mật khẩu.",
    action: "Gửi liên kết",
  },
  reset: {
    title: "Đặt mật khẩu mới",
    description: "Chọn mật khẩu mới có ít nhất 10 ký tự.",
    action: "Lưu mật khẩu mới",
  },
};

export function AuthForm({ mode, token }: { mode: AuthMode; token?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const copy = COPY[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const endpoint = {
      login: "/api/auth/login",
      register: "/api/auth/register",
      forgot: "/api/auth/forgot-password",
      reset: "/api/auth/reset-password",
    }[mode];

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, token }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Không thể thực hiện yêu cầu.");
        return;
      }
      if (mode === "login" || mode === "register") {
        window.location.assign("/");
      } else if (mode === "forgot") {
        setNotice(result.message);
      } else {
        setNotice("Mật khẩu đã được cập nhật. Bạn có thể đăng nhập.");
        router.push("/dang-nhap");
      }
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[75vh] max-w-lg items-center px-4 pt-24 pb-16">
      <section className="w-full rounded-3xl border border-white/10 bg-ink-900/80 p-6 shadow-2xl shadow-black/20 sm:p-9">
        <p className="text-xs font-bold tracking-[0.2em] text-cyan-300 uppercase">ÔnTin · Tài khoản</p>
        <h1 className="mt-3 text-3xl font-black text-white">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{copy.description}</p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          {mode === "register" && (
            <Field label="Tên hiển thị" name="name" autoComplete="name" required minLength={2} maxLength={80} />
          )}
          {mode !== "reset" && (
            <Field label="Email" name="email" type="email" autoComplete="email" required />
          )}
          {(mode === "login" || mode === "register" || mode === "reset") && (
            <Field
              label={mode === "reset" ? "Mật khẩu mới" : "Mật khẩu"}
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={10}
              maxLength={128}
            />
          )}
          {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p>}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 font-bold text-ink-950 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Đang xử lý..." : copy.action}
          </button>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-slate-400">
          {mode === "login" && (
            <>
              <Link className="hover:text-cyan-200" href="/quen-mat-khau">Quên mật khẩu?</Link>
              <Link className="hover:text-cyan-200" href="/dang-ky">Tạo tài khoản</Link>
            </>
          )}
          {mode === "register" && <Link className="hover:text-cyan-200" href="/dang-nhap">Đã có tài khoản? Đăng nhập</Link>}
          {mode === "forgot" && <Link className="hover:text-cyan-200" href="/dang-nhap">Quay lại đăng nhập</Link>}
          {mode === "reset" && <Link className="hover:text-cyan-200" href="/dang-nhap">Đăng nhập</Link>}
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <label className="block space-y-2 text-sm font-semibold text-slate-200">
      <span>{label}</span>
      <input
        {...props}
        name={name}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50"
      />
    </label>
  );
}
