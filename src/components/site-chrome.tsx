"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteAccessGate } from "@/components/site-access-gate";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSignInPage = pathname === "/dang-nhap";
  const isPortalPage = pathname === "/admin" || pathname.startsWith("/admin/") ||
    pathname === "/teacher" || pathname.startsWith("/teacher/");

  useEffect(() => {
    let observer: MutationObserver | null = null;

    const stopObserving = () => {
      observer?.disconnect();
      observer = null;
    };

    function scrollToTopicsWhenReady() {
      if (pathname !== "/" || window.location.hash !== "#chuyen-de") {
        stopObserving();
        return;
      }
      const scrollTo = (target: HTMLElement) => {
        stopObserving();
        window.requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      };

      const target = document.getElementById("chuyen-de");
      if (target) {
        scrollTo(target);
        return;
      }

      if (!observer) {
        observer = new MutationObserver(() => {
          const renderedTarget = document.getElementById("chuyen-de");
          if (renderedTarget) scrollTo(renderedTarget);
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }
    window.addEventListener("hashchange", scrollToTopicsWhenReady);
    let hashWaitFrame = 0;
    const pendingNavigation =
      pathname === "/" &&
      window.sessionStorage.getItem("ontin-scroll-to-topics") === "true";
    if (pendingNavigation) {
      window.sessionStorage.removeItem("ontin-scroll-to-topics");
      let attempts = 0;
      const waitForHash = () => {
        if (window.location.hash === "#chuyen-de") {
          scrollToTopicsWhenReady();
          return;
        }
        if (attempts++ < 300) {
          hashWaitFrame = window.requestAnimationFrame(waitForHash);
        }
      };
      waitForHash();
    } else {
      scrollToTopicsWhenReady();
    }
    return () => {
      stopObserving();
      window.cancelAnimationFrame(hashWaitFrame);
      window.removeEventListener("hashchange", scrollToTopicsWhenReady);
    };
  }, [pathname]);

  return (
    <>
      {!isSignInPage && !isPortalPage && <SiteNavbar />}
      <SiteAccessGate>
        {children}
      </SiteAccessGate>
      {!isSignInPage && !isPortalPage && <SiteFooter />}
    </>
  );
}
