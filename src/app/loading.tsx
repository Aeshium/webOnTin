import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto min-h-[70vh] max-w-7xl px-4 pt-32 pb-20 sm:px-6"
    >
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
        <LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" />
        Đang tải nội dung...
      </div>
      <div
        aria-hidden="true"
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="glass h-48 animate-pulse rounded-3xl border border-white/5 p-6"
          >
            <div className="h-12 w-12 rounded-2xl bg-white/10" />
            <div className="mt-6 h-4 w-2/3 rounded bg-white/10" />
            <div className="mt-3 h-3 w-full rounded bg-white/5" />
            <div className="mt-2 h-3 w-4/5 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
