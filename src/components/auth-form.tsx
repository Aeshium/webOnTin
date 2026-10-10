"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { GoogleAuthProvider, signInWithPopup } from "@firebase/auth";
import { validatePassword } from "@/lib/password-policy";
import { clearGuestSession, safeNextPath, startGuestSession } from "@/lib/guest-session";
import { getFirebaseAuth } from "@/lib/firebase-client";

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
    description: "Nhập mật khẩu mới và xác nhận lại để hoàn tất.",
    action: "Lưu mật khẩu mới",
  },
};

export function AuthForm({
  mode,
  token,
  nextPath = "/",
  googleError,
}: {
  mode: AuthMode;
  token?: string;
  nextPath?: string;
  googleError?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleLoginError, setGoogleLoginError] = useState("");
  const copy = COPY[mode];

  async function signInWithGoogle() {
    setBusy(true);
    setGoogleLoginError("");
    try {
      const credential = await signInWithPopup(
        getFirebaseAuth(),
        new GoogleAuthProvider()
      );
      const response = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: await credential.user.getIdToken(),
          next: safeNextPath(nextPath),
        }),
      });
      const result: { next?: string; error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Không thể đăng nhập bằng Google.");
      }
      clearGuestSession();
      window.location.assign(safeNextPath(result.next));
    } catch (signInError) {
      const code =
        typeof signInError === "object" && signInError !== null && "code" in signInError
          ? String(signInError.code)
          : "";
      setGoogleLoginError(
        signInError instanceof Error && signInError.message === "Firebase chưa được cấu hình."
          ? "Firebase chưa được cấu hình. Hãy thêm các biến NEXT_PUBLIC_FIREBASE_* vào .env.local."
          : code === "auth/popup-closed-by-user"
            ? "Bạn đã đóng cửa sổ đăng nhập Google."
            : signInError instanceof Error
              ? signInError.message
              : "Không thể đăng nhập bằng Google. Hãy thử lại."
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (
      (mode === "reset" || mode === "register") &&
      data.password !== data.confirmPassword
    ) {
      setError("Mật khẩu xác nhận không khớp.");
      setBusy(false);
      return;
    }
    if (
      (mode === "reset" || mode === "register") &&
      typeof data.password === "string"
    ) {
      const passwordError = validatePassword(data.password);
      if (passwordError) {
        setError(passwordError);
        setBusy(false);
        return;
      }
    }
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
        clearGuestSession();
        window.location.assign(safeNextPath(nextPath));
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
        {mode === "login" && (
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => {
                startGuestSession();
                window.location.assign(safeNextPath(nextPath));
              }}
              className="w-full rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-left transition hover:bg-cyan-300/15"
            >
              <span className="block text-sm font-bold text-cyan-100">Vào với tư cách Guest</span>
              <span className="mt-1 block text-xs font-medium text-cyan-100/60">
                Điểm chỉ lưu trong tab này, không lên bảng xếp hạng.
              </span>
            </button>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              <GoogleMark />
              Tiếp tục với Google
            </button>
            {(googleError || googleLoginError) && (
              <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">
                {googleLoginError || googleError}
              </p>
            )}
            <div className="flex items-center gap-3 py-1 text-[10px] font-semibold tracking-widest text-slate-600 uppercase">
              <span className="h-px flex-1 bg-white/10" />
              Hoặc đăng nhập bằng email
              <span className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        )}
        <form className="mt-7 space-y-4" onSubmit={submit}>
          {mode === "register" && (
            <Field label="Tên hiển thị" name="name" autoComplete="name" required minLength={2} maxLength={80} />
          )}
          {mode !== "reset" && (
            <Field label="Email" name="email" type="email" autoComplete="email" required />
          )}
          {(mode === "login" || mode === "register" || mode === "reset") && (
            <PasswordField
              label={mode === "reset" ? "Mật khẩu mới" : "Mật khẩu"}
              name="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "login" ? undefined : 5}
              maxLength={mode === "login" ? undefined : 20}
            />
          )}
          {(mode === "register" || mode === "reset") && (
            <PasswordField
              label={mode === "reset" ? "Xác nhận mật khẩu mới" : "Xác nhận mật khẩu"}
              name="confirmPassword"
              autoComplete="new-password"
              required
              minLength={5}
              maxLength={20}
            />
          )}
          {(mode === "register" || mode === "reset") && (
            <p className="-mt-2 text-xs leading-relaxed text-slate-500">
              Mật khẩu gồm 5–20 ký tự, có ít nhất một chữ hoa, một số và một ký tự đặc biệt.
            </p>
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
              <Link className="hover:text-cyan-200" href={`/dang-ky?next=${encodeURIComponent(safeNextPath(nextPath))}`}>Tạo tài khoản</Link>
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

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.64 5.93c4.46-4.12 7.14-10.2 7.14-17.58Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.44 14.44 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.92 23.92 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19Z" transform="translate(0 0)" />
      <path fill="#34A853" d="M24 48c6.48 0 11.94-2.13 15.92-5.87l-7.64-5.93c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
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

function PasswordField({
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
          className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50"
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
