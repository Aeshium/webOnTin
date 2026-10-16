"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CenteredLoading } from "@/components/centered-loading";
import { hasValidGuestSession, safeNextPath } from "@/lib/guest-session";
import { roleHomePath } from "@/lib/role-access";

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
        const { user }: { user?: { role?: "student" | "teacher" | "admin" } | null } = await response.json();
        if (!active) return;
        if (user) {
          if (isAuthPage) {
            router.replace(
              user.role === "teacher" || user.role === "admin"
                ? roleHomePath(user.role)
                : safeNextPath(new URLSearchParams(window.location.search).get("next"))
            );
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
    return <CenteredLoading />;
  }
  return <>{children}</>;
}
