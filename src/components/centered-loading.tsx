import { LoaderCircle } from "lucide-react";

export function CenteredLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-[70vh] place-items-center px-4 text-sm font-semibold text-slate-300"
    >
      <span className="inline-flex items-center gap-3">
        <LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" />
        Đang tải...
      </span>
    </div>
  );
}
