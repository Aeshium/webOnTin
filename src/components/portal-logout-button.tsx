"use client";

import { useState } from "react";

export function PortalLogoutButton({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không thể đăng xuất. Vui lòng thử lại.");
      window.location.assign("/dang-nhap");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đăng xuất. Vui lòng thử lại.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void logout()}
        disabled={busy}
        className={`${compact ? "rounded-lg border border-white/10 px-3 py-2 text-xs" : "text-xs"} font-bold text-slate-400 transition hover:text-white disabled:opacity-50`}
      >
        {busy ? "Đang đăng xuất..." : "Đăng xuất"}
      </button>
      {error && <p role="alert" className="mt-2 max-w-52 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
