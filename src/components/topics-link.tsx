"use client";

import Link from "next/link";
import type { MouseEvent, MouseEventHandler, ReactNode } from "react";

type TopicsLinkProps = {
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function TopicsLink({
  children,
  className,
  onClick,
}: TopicsLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (window.location.pathname !== "/") {
      window.sessionStorage.setItem("ontin-scroll-to-topics", "true");
      return;
    }

    event.preventDefault();
    const target = document.getElementById("chuyen-de");
    if (!target) {
      window.location.hash = "chuyen-de";
      return;
    }

    if (window.location.hash !== "#chuyen-de") {
      window.history.pushState(null, "", "/#chuyen-de");
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Link
      href="/#chuyen-de"
      scroll={false}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
