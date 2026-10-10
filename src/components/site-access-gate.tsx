"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { hasValidGuestSession, safeNextPath } from "@/lib/guest-session";

const AUTH_PATHS = new Set([
  "/dang-nhap",
  "/dang-ky",
  "/quen-mat-khau",
  "/dat-lai-mat-khau",
]);

export function SiteAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const isAuthPage = AUTH_PATHS.has(pathname);

  useEffect(() => {
    let active = true;
    let guestAccess = false;

    async function checkAccess() {
      setAllowed(false);
      try {
        const response = await fetch("/api/auth/session");
        const { user } = await response.json();
        if (!active) return;
        if (user) {
          if (isAuthPage) {
            const next = new URLSearchParams(window.location.search).get("next");
            router.replace(safeNextPath(next));
          } else {
            setAllowed(true);
          }
          return;
        }

        guestAccess = hasValidGuestSession();
        if (isAuthPage) {
          setAllowed(true);
          return;
        }
        if (guestAccess) {
          setAllowed(true);
          return;
        }
        const next = `${pathname}${window.location.search}`;
        router.replace(`/dang-nhap?next=${encodeURIComponent(next)}`);
      } catch (error) {
        console.error("Không kiểm tra được phiên truy cập:", error);
        if (active) {
          if (isAuthPage) setAllowed(true);
          else router.replace("/dang-nhap");
        }
      }
    }

    void checkAccess();

    const checkGuestExpiry = () => {
      if (guestAccess && !hasValidGuestSession()) {
        guestAccess = false;
        if (!isAuthPage) {
          setAllowed(false);
          window.location.assign("/dang-nhap");
        }
      }
    };
    const interval = window.setInterval(checkGuestExpiry, 15_000);
    window.addEventListener("focus", checkGuestExpiry);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", checkGuestExpiry);
    };
  }, [isAuthPage, pathname, router]);

  if (!allowed) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 text-sm text-slate-400">
        Đang kiểm tra phiên truy cập…
      </div>
    );
  }
  return <>{children}</>;
}
