import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, GraduationCap, LayoutDashboard, MessageSquare, Users } from "lucide-react";
import { PortalPageTransition } from "@/components/portal-page-transition";
import { PortalLogoutButton } from "@/components/portal-logout-button";
import type { UserRole } from "@/db/schema";

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
  role,
  children,
}: {
  type: keyof typeof PORTAL_LINKS;
  role: UserRole;
  children: ReactNode;
}) {
  const isAdminPortal = type === "admin";
  const isAdminUser = role === "admin";
  return (
    <div className="min-h-svh bg-slate-900 text-slate-100">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-600/50 bg-gradient-to-b from-slate-800 to-slate-900 px-5 py-7 shadow-2xl lg:block">
      <div className="flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 px-3 py-3 text-xl font-black text-white">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-violet-400 text-slate-950">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span>Ôn<span className="text-cyan-300">Tin</span></span>
      </div>
      <p className="mt-4 px-2 text-[10px] font-bold tracking-[0.2em] text-cyan-200 uppercase">
        {isAdminPortal ? "Quản trị hệ thống" : "Cổng giáo viên"}
      </p>
      <nav className="mt-10 space-y-2">
        {PORTAL_LINKS[type].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-white">
            <Icon className="h-4 w-4 text-cyan-300" />
            {label}
          </Link>
        ))}
      </nav>
      {isAdminUser ? (
        <Link href="/admin" className="absolute bottom-7 left-8 text-xs font-bold text-slate-500 hover:text-white">
          ← Về không gian quản lý
        </Link>
      ) : (
        <div className="absolute bottom-7 left-8">
          <PortalLogoutButton />
        </div>
      )}
    </aside>
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-600/40 bg-slate-800/95 px-5 py-4 shadow-lg backdrop-blur lg:ml-64 lg:px-10">
        <div>
          <p className="text-sm font-black text-white">{isAdminPortal ? "Admin Portal" : "Teacher Portal"}</p>
          <p className="mt-0.5 text-xs text-slate-500">ÔnTin · Không gian quản lý</p>
        </div>
        <div className="flex gap-2 lg:hidden">
          {PORTAL_LINKS[type].map(({ href, label }) => (
            <Link key={href} href={href} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">{label}</Link>
          ))}
          {isAdminUser
            ? <Link href="/admin" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">Về không gian quản lý</Link>
            : <PortalLogoutButton compact />}
        </div>
      </header>
      <main className="min-h-[calc(100svh-72px)] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-4 py-8 sm:px-7 lg:ml-64 lg:px-10">
        <PortalPageTransition>{children}</PortalPageTransition>
      </main>
    </div>
  );
}
