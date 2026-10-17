"use client";
// "use client" = component này cần chạy ở trình duyệt (vì có state, sự kiện scroll).
// "app" ở Next.js: mọi file app/api/.../route.ts là một endpoint.
// Route này trả về JSON danh sách chuyên đề — client sẽ fetch nó.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Menu,
  X,
  Timer,
  Search,
  UserRound,
  Bell,
  LogOut,
  Award,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getAchievement } from "@/lib/achievements";
import { clearGuestSession } from "@/lib/guest-session";
import { TopicsLink } from "@/components/topics-link";

type NotificationItem = {
  id: number | null;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  kind?: "reminder" | "exam";
};

const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/#chuyen-de", label: "Chuyên đề" },
  { href: "/hoc-tap", label: "Học Tập" },
  { href: "/bang-xep-hang", label: "Xếp hạng" },
  { href: "/tra-cuu", label: "Tra cứu câu hỏi" },
];

export function SiteNavbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activePopover, setActivePopover] = useState<"notifications" | "account" | null>(null);
  const [latestNotifications, setLatestNotifications] = useState<NotificationItem[]>([]);
  const [notificationError, setNotificationError] = useState("");
  const desktopNotificationPopoverRef = useRef<HTMLDivElement>(null);
  const desktopAccountPopoverRef = useRef<HTMLDivElement>(null);
  const mobileNotificationPopoverRef = useRef<HTMLDivElement>(null);
  const mobileAccountPopoverRef = useRef<HTMLDivElement>(null);
  const [account, setAccount] = useState<{
    name: string;
    examDate: string | null;
    equippedAchievementKey: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<{
    id: number;
    title: string;
    message: string;
  } | null>(null);
  const seenNotifications = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    let firstNotificationLoad = true;

    async function loadNotifications() {
      const response = await fetch("/api/notifications");
      if (!response.ok) return;
      const data: {
        unreadCount: number;
        notifications: NotificationItem[];
      } = await response.json();
      if (!active) return;

      setLatestNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      if (firstNotificationLoad) {
        firstNotificationLoad = false;
        for (const notification of data.notifications) {
          seenNotifications.current.add(notificationKey(notification));
        }
        const unread = data.notifications.find((notification) => !notification.readAt);
        if (unread) {
          setToast({ id: Date.now(), title: unread.title, message: unread.message });
        }
        return;
      }

      const newNotifications = data.notifications.filter((notification) => {
        const key = notificationKey(notification);
        if (seenNotifications.current.has(key)) return false;
        seenNotifications.current.add(key);
        return true;
      });
      const newest = newNotifications[0];
      if (newest) {
        setToast({ id: Date.now(), title: newest.title, message: newest.message });
      }
    }

    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/session");
        const { user } = await response.json();
        if (!active) return;
        setAccount(
          user
            ? {
                name: user.name,
                examDate: user.examDate,
                equippedAchievementKey: user.equippedAchievementKey ?? null,
                avatarUrl: user.avatarUrl ?? null,
              }
            : null
        );
        if (!user) {
          setUnreadCount(0);
          return;
        }

        await loadNotifications();
      } catch (error) {
        console.error("Không tải được trạng thái tài khoản:", error);
      }
    }

    const onProfileUpdated = () => void loadAccount();
    void loadAccount();
    window.addEventListener("ontin-profile-updated", onProfileUpdated);
    const poll = window.setInterval(() => void loadAccount(), 30_000);
    return () => {
      active = false;
      window.clearInterval(poll);
      window.removeEventListener("ontin-profile-updated", onProfileUpdated);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!activePopover) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        desktopNotificationPopoverRef.current?.contains(target) ||
        desktopAccountPopoverRef.current?.contains(target) ||
        mobileNotificationPopoverRef.current?.contains(target) ||
        mobileAccountPopoverRef.current?.contains(target)
      ) {
        return;
      }
      setActivePopover(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActivePopover(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activePopover]);

  async function markLatestNotificationsRead() {
    const visible = latestNotifications.slice(0, 5);
    const unread = visible.filter((notification) => !notification.readAt);
    if (unread.length === 0) return;
    const readAt = new Date().toISOString();
    const ids = unread
      .map((notification) => notification.id)
      .filter((id): id is number => id !== null);
    setLatestNotifications((items) =>
      items.map((item) =>
        unread.some((notification) => notificationKey(notification) === notificationKey(item))
          ? { ...item, readAt }
          : item
      )
    );
    setUnreadCount((count) => Math.max(0, count - unread.length));
    setNotificationError("");
    if (ids.length === 0) return;
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error("Không thể cập nhật trạng thái thông báo.");
    } catch (error) {
      console.error("Đánh dấu thông báo đã đọc thất bại:", error);
      setNotificationError("Không thể cập nhật trạng thái thông báo. Hãy thử lại.");
      setLatestNotifications((items) =>
        items.map((item) =>
          unread.some((notification) => notificationKey(notification) === notificationKey(item))
            ? { ...item, readAt: null }
            : item
        )
      );
      setUnreadCount((count) => count + unread.length);
    }
  }

  function togglePopover(popover: "notifications" | "account") {
    if (activePopover === popover) {
      setActivePopover(null);
      return;
    }
    setActivePopover(popover);
    if (popover === "notifications") void markLatestNotificationsRead();
  }

  async function signOut() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      console.error("Đăng xuất thất bại.");
      return;
    }
    setAccount(null);
    setUnreadCount(0);
    clearGuestSession();
    window.location.assign("/dang-nhap");
  }

  // Đổi nền navbar khi cuộn xuống — JS thuần quen thuộc.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/8 bg-ink-950/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-violet-400 to-pink-400 text-ink-950 shadow-lg shadow-cyan-500/20 transition-transform duration-300 group-hover:-rotate-6">
              <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="text-lg font-black tracking-tight text-white">
              Ôn<span className="text-gradient">Tin</span>
            </span>
          </Link>

          <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((l) => (
              l.href === "/#chuyen-de" ? (
                <TopicsLink
                  key={l.href}
                  className="rounded-full px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {l.label}
                </TopicsLink>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {l.label}
                </Link>
              )
            ))}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <form action="/tra-cuu" role="search" className="hidden md:block">
            <label className="flex h-10 w-48 items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 text-slate-400 transition-colors focus-within:border-cyan-300/40 lg:w-56">
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <input
                type="search"
                name="q"
                placeholder="Tìm câu hỏi..."
                aria-label="Tìm câu hỏi trong ngân hàng"
                className="w-full min-w-0 bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
              />
            </label>
          </form>

          {account?.examDate && (
            <CountdownTimer examDate={account.examDate} />
          )}

          <Link
            href="/thi-thu"
            className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2.5 text-sm font-bold text-ink-950 shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-400/40 xl:inline-flex"
          >
            <Timer className="h-4 w-4" strokeWidth={2.5} />
            Thi thử
          </Link>

          {account ? (
            <div className="hidden items-center gap-2 sm:flex">
              <div ref={desktopNotificationPopoverRef} className="relative">
                <button
                  type="button"
                  onClick={() => togglePopover("notifications")}
                  aria-expanded={activePopover === "notifications"}
                  aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ""}`}
                  title="Thông báo"
                  className="relative grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-cyan-200"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-400 px-1 text-[9px] font-black text-ink-950">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </button>
                {activePopover === "notifications" && (
                  <div className="absolute top-full right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl shadow-black/40">
                    <div className="border-b border-white/8 px-4 py-3">
                      <p className="font-bold text-white">Thông báo gần đây</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationError && <p role="alert" className="px-4 py-3 text-xs text-rose-300">{notificationError}</p>}
                      {latestNotifications.slice(0, 5).map((notification, index) => (
                        <article
                          key={notification.id ?? `${notification.kind}-${notification.title}-${index}`}
                          className="flex gap-3 border-b border-white/5 px-4 py-3 last:border-b-0"
                        >
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-transparent" : "bg-rose-400"}`} aria-label={notification.readAt ? undefined : "Chưa đọc"} />
                          <div className="min-w-0">
                            <p className={`text-sm font-bold ${notification.readAt ? "text-slate-300" : "text-white"}`}>{notification.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{notification.message}</p>
                          </div>
                        </article>
                      ))}
                      {latestNotifications.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-slate-400">Bạn chưa có thông báo.</p>
                      )}
                    </div>
                    <Link
                      href="/thong-bao"
                      onClick={() => setActivePopover(null)}
                      className="block border-t border-white/8 px-4 py-3 text-center text-xs font-bold text-cyan-200 hover:bg-white/5"
                    >
                      Đến trang thông báo
                    </Link>
                  </div>
                )}
              </div>
              <div ref={desktopAccountPopoverRef} className="relative">
                <button
                  type="button"
                  onClick={() => togglePopover("account")}
                  aria-expanded={activePopover === "account"}
                  aria-label={`Tài khoản ${account.name}${getAchievement(account.equippedAchievementKey) ? `, danh hiệu ${getAchievement(account.equippedAchievementKey)?.name}` : ""}`}
                  title={getAchievement(account.equippedAchievementKey)?.name ?? account.name}
                  className="relative grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-violet-400/15 text-violet-200 hover:bg-violet-400/25"
                >
                  {account.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={account.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <UserRound className="h-4 w-4" />
                  )}
                  {getAchievement(account.equippedAchievementKey) && <Award className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full bg-ink-950 text-amber-300" />}
                </button>
                {activePopover === "account" && (
                  <div className="absolute top-full right-0 z-30 mt-2 w-48 rounded-2xl border border-white/10 bg-ink-900 p-2 shadow-2xl">
                    <Link href="/tai-khoan" onClick={() => setActivePopover(null)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-white hover:bg-white/5">Hồ sơ tài khoản</Link>
                    <button onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white">
                    <LogOut className="h-4 w-4" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link href="/dang-nhap" className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pr-3 pl-2 text-xs font-bold text-slate-300 hover:text-white sm:flex">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-400/15 text-violet-200">
                <UserRound className="h-4 w-4" />
              </span>
              Đăng nhập
            </Link>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300 md:hidden"
            aria-label={open ? "Đóng menu" : "Mở menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-cyan-300/25 bg-ink-900/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
            <Bell className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white">{toast.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {open && (
        <div className="border-t border-white/8 bg-ink-950/95 px-4 py-3 backdrop-blur-xl md:hidden">
          <form action="/tra-cuu" role="search" className="mb-2">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-slate-400">
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <input
                type="search"
                name="q"
                placeholder="Tìm câu hỏi..."
                aria-label="Tìm câu hỏi trong ngân hàng"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </label>
          </form>
          {account?.examDate && (
            <CountdownTimer examDate={account.examDate} mobile />
          )}
          <nav aria-label="Điều hướng chính trên di động">
            {NAV_LINKS.map((l) => (
              l.href === "/#chuyen-de" ? (
                <TopicsLink
                  key={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5"
                >
                  {l.label}
                </TopicsLink>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5"
                >
                  {l.label}
                </Link>
              )
            ))}
          </nav>
          <Link
            href="/thi-thu"
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-sm font-bold text-ink-950"
          >
            <Timer className="h-4 w-4" strokeWidth={2.5} />
            Thi thử · 40 câu
          </Link>
          {account ? (
            <div className="mt-3 flex items-center justify-between px-4 text-xs">
              <div ref={mobileAccountPopoverRef} className="relative">
                <button
                  type="button"
                  onClick={() => togglePopover("account")}
                  aria-expanded={activePopover === "account"}
                  className="flex items-center gap-2 text-slate-300"
                >
                  {account.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={account.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <UserRound className="h-4 w-4" />
                  )}
                  {account.name}
                  {getAchievement(account.equippedAchievementKey) && <Award className="h-4 w-4 text-amber-300" />}
                </button>
                {activePopover === "account" && (
                  <div className="absolute top-full left-0 z-30 mt-2 w-48 rounded-2xl border border-white/10 bg-ink-900 p-2 shadow-2xl">
                    <Link href="/tai-khoan" onClick={() => { setOpen(false); setActivePopover(null); }} className="block rounded-xl px-3 py-2 text-sm font-semibold text-white hover:bg-white/5">Hồ sơ tài khoản</Link>
                    <button onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white">
                    <LogOut className="h-3.5 w-3.5" />Đăng xuất
                    </button>
                  </div>
                )}
              </div>
              <div ref={mobileNotificationPopoverRef} className="relative">
                <button
                  type="button"
                  onClick={() => togglePopover("notifications")}
                  aria-expanded={activePopover === "notifications"}
                  aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ""}`}
                  className="relative flex items-center gap-2 text-cyan-200"
                >
                  <Bell className="h-4 w-4" />Thông báo
                  {unreadCount > 0 && <span className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-rose-400" />}
                </button>
                {activePopover === "notifications" && (
                  <div className="absolute top-full right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-ink-900 text-left shadow-2xl shadow-black/40">
                    <div className="border-b border-white/8 px-4 py-3 text-sm font-bold text-white">Thông báo gần đây</div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationError && <p role="alert" className="px-4 py-3 text-xs text-rose-300">{notificationError}</p>}
                      {latestNotifications.slice(0, 5).map((notification, index) => (
                        <article key={notification.id ?? `${notification.kind}-${notification.title}-${index}`} className="flex gap-3 border-b border-white/5 px-4 py-3 last:border-b-0">
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-transparent" : "bg-rose-400"}`} />
                          <div className="min-w-0">
                            <p className={`text-sm font-bold ${notification.readAt ? "text-slate-300" : "text-white"}`}>{notification.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{notification.message}</p>
                          </div>
                        </article>
                      ))}
                      {latestNotifications.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Bạn chưa có thông báo.</p>}
                    </div>
                    <Link href="/thong-bao" onClick={() => { setOpen(false); setActivePopover(null); }} className="block border-t border-white/8 px-4 py-3 text-center text-xs font-bold text-cyan-200 hover:bg-white/5">Đến trang thông báo</Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link href="/dang-nhap" onClick={() => setOpen(false)} className="mt-3 flex items-center gap-2 px-4 text-xs text-slate-300">
              <UserRound className="h-4 w-4" />Đăng nhập / Tạo tài khoản
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

function notificationKey(notification: {
  id: number | null;
  title: string;
  message: string;
  kind?: string;
}) {
  return notification.id !== null
    ? `notification-${notification.id}`
    : `${notification.kind ?? "reminder"}-${notification.title}-${notification.message}`;
}

function CountdownTimer({
  examDate,
  mobile = false,
}: {
  examDate: string;
  mobile?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const [year, month, day] = examDate.slice(0, 10).split("-").map(Number);
  const target = new Date(year, month - 1, day).getTime();
  const remainingSeconds = Math.max(0, Math.floor((target - now) / 1000));
  const remainingDays = Math.floor(remainingSeconds / 86400);

  return (
    <Link
      href="/tai-khoan"
      aria-label={`Còn ${remainingDays} ngày đến ngày thi`}
      title="Thời gian còn lại đến ngày thi"
      className={`flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-300/15 bg-amber-300/5 px-2.5 py-1.5 text-amber-100 transition hover:border-amber-300/30 ${
        mobile ? "mb-3 w-full justify-center" : "hidden xl:flex"
      }`}
    >
      <Timer className="h-4 w-4 shrink-0 text-amber-300" />
      <span className="flex items-baseline gap-1">
        <span className="font-mono text-sm font-black tabular-nums">{String(remainingDays).padStart(2, "0")}</span>
        <span className="text-[9px] text-amber-200/70">ngày</span>
      </span>
    </Link>
  );
}
