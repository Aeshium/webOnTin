"use client";

import { BookOpen } from "lucide-react";

export function ScrollToTopicsButton() {
  function scrollToTopics() {
    document.getElementById("chuyen-de")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <button
      type="button"
      onClick={scrollToTopics}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
    >
      <BookOpen className="h-4 w-4 text-cyan-300" />
      Chọn Chuyên Đề
    </button>
  );
}
