"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  isActive: boolean;
  createdAt: string;
};

export function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const [createMessage, setCreateMessage] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không tải được tài khoản.");
      setUsers(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được tài khoản.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Không tải được tài khoản.");
        if (active) setUsers(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Không tải được tài khoản.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) =>
      (roleFilter === "all" || user.role === roleFilter) &&
      (!normalized || `${user.name} ${user.email}`.toLowerCase().includes(normalized))
    );
  }, [users, query, roleFilter]);

  async function updateUser(id: number, update: { role?: ManagedUser["role"]; isActive?: boolean; password?: string }) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...update }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không cập nhật được tài khoản.");
      setUsers((current) => current.map((user) => user.id === id ? { ...user, ...result } : user));
      if (update.password !== undefined) {
        setPasswords((current) => ({ ...current, [id]: "" }));
        setCreateMessage(`Đã đặt lại mật khẩu cho ${result.email}.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không cập nhật được tài khoản.");
    } finally {
      setBusyId(null);
    }
  }

  async function createTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    setCreateMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không tạo được giáo viên.");
      form.reset();
      setCreateMessage(`Đã tạo tài khoản giáo viên ${result.email}.`);
      await loadUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tạo được giáo viên.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-bold tracking-[0.2em] text-cyan-300 uppercase">Quản trị</p>
      <h1 className="mt-2 text-3xl font-black text-white">Tài khoản người dùng</h1>
      <form onSubmit={createTeacher} className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5 md:grid-cols-4">
        <h2 className="md:col-span-4 text-lg font-black text-white">Tạo tài khoản giáo viên</h2>
        <input name="name" required minLength={2} maxLength={80} placeholder="Họ tên" className="h-11 rounded-xl border border-white/10 bg-ink-950 px-3 text-sm text-white" />
        <input name="email" required type="email" placeholder="Email" className="h-11 rounded-xl border border-white/10 bg-ink-950 px-3 text-sm text-white" />
        <input name="password" required type="password" minLength={5} maxLength={20} placeholder="Mật khẩu ban đầu" className="h-11 rounded-xl border border-white/10 bg-ink-950 px-3 text-sm text-white" />
        <button className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-ink-950">Tạo giáo viên</button>
        <p className="md:col-span-4 text-xs text-slate-500">Mật khẩu cần 5–20 ký tự, có chữ hoa, chữ số và ký tự đặc biệt.</p>
      </form>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc email" className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white" />
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-ink-900 px-3 text-sm text-white">
          <option value="all">Tất cả vai trò</option>
          <option value="student">Học sinh</option>
          <option value="teacher">Giáo viên</option>
          <option value="admin">Quản trị</option>
        </select>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {createMessage && <p role="status" className="mt-4 text-sm text-emerald-300">{createMessage}</p>}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[850px] border-collapse text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="p-4">Người dùng</th><th className="p-4">Vai trò</th><th className="p-4">Trạng thái</th><th className="p-4">Đặt lại mật khẩu</th></tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {loading ? <tr><td colSpan={4} className="p-6 text-center text-slate-400">Đang tải...</td></tr> :
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="p-4"><p className="font-bold text-white">{user.name}</p><p className="mt-1 text-xs text-slate-500">{user.email}</p></td>
                  <td className="p-4"><select value={user.role} disabled={busyId === user.id} onChange={(event) => void updateUser(user.id, { role: event.target.value as ManagedUser["role"] })} className="rounded-lg border border-white/10 bg-ink-900 px-2 py-2 text-xs text-white">
                    <option value="student">Học sinh</option><option value="teacher">Giáo viên</option><option value="admin">Quản trị</option>
                  </select></td>
                  <td className="p-4"><button type="button" disabled={busyId === user.id} onClick={() => void updateUser(user.id, { isActive: !user.isActive })} className={`rounded-lg px-3 py-2 text-xs font-bold ${user.isActive ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{user.isActive ? "Đang hoạt động · Khóa" : "Đã khóa · Mở"}</button></td>
                  <td className="p-4"><div className="flex gap-2"><input type="password" value={passwords[user.id] ?? ""} onChange={(event) => setPasswords((current) => ({ ...current, [user.id]: event.target.value }))} placeholder="Mật khẩu mới" className="min-w-36 rounded-lg border border-white/10 bg-ink-950 px-2 py-2 text-xs text-white" /><button type="button" disabled={busyId === user.id || !(passwords[user.id] ?? "")} onClick={() => void updateUser(user.id, { password: passwords[user.id] })} className="rounded-lg border border-white/10 px-3 text-xs font-bold text-white disabled:opacity-40">Lưu</button></div></td>
                </tr>
              ))}
            {!loading && filteredUsers.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">Không tìm thấy tài khoản.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
