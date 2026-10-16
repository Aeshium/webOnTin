import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, LayoutDashboard, MessageSquare, Users } from "lucide-react";

const PORTAL_LINKS = {
  admin: [
    { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/admin/users", label: "Tài khoản", icon: Users },
    { href: "/admin/feedbacks", label: "Phản hồi", icon: MessageSquare },
  ],
  teacher: [
    { href: "/teacher", label: "Khóa học", icon: BookOpen },
  ],
} as const;

export function PortalShell({
  type,
  children,
}: {
  type: keyof typeof PORTAL_LINKS;
  children: ReactNode;
}) {
  const isAdmin = type === "admin";
  return (
    <div className="min-h-svh bg-ink-950 text-slate-200">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/8 bg-ink-950/95 px-5 py-7 lg:block">
        <Link href="/" className="text-xl font-black text-white">
          Ôn<span className="text-cyan-300">Tin</span>
          <span className="mt-1 block text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
            {isAdmin ? "Quản trị hệ thống" : "Cổng giáo viên"}
          </span>
        </Link>
        <nav className="mt-10 space-y-2">
          {PORTAL_LINKS[type].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/8 hover:text-white">
              <Icon className="h-4 w-4 text-cyan-300" />
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="absolute bottom-7 left-8 text-xs font-bold text-slate-500 hover:text-white">
          ← Về trang học tập
        </Link>
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/8 bg-ink-950/90 px-5 py-4 backdrop-blur lg:ml-64 lg:px-10">
        <div>
          <p className="text-sm font-black text-white">{isAdmin ? "Admin Portal" : "Teacher Portal"}</p>
          <p className="mt-0.5 text-xs text-slate-500">ÔnTin · Không gian quản lý</p>
        </div>
        <div className="flex gap-2 lg:hidden">
          {PORTAL_LINKS[type].map(({ href, label }) => (
            <Link key={href} href={href} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">{label}</Link>
          ))}
        </div>
      </header>
      <main className="px-4 py-8 sm:px-7 lg:ml-64 lg:px-10">{children}</main>
    </div>
  );
}
