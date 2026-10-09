import Link from "next/link";
import {
  BookOpen,
  Database,
  GraduationCap,
  ListChecks,
  Search,
  ShieldCheck,
  Timer,
  Trophy,
} from "lucide-react";

const footerLinkClass =
  "transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 bg-ink-900/70">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-violet-400 to-pink-400 text-ink-950">
                <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="text-lg font-black tracking-tight text-white">
                Ôn<span className="text-gradient">Tin</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Cổng ôn luyện Tin học trực tuyến với câu hỏi trắc nghiệm theo
              chuyên đề, thi thử có thời gian và giải thích đáp án.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Công cụ luyện tập tham khảo
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
              Học phần ôn tập
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/luyen-thi/phan-cung" className={footerLinkClass}>
                  Phần cứng máy tính
                </Link>
              </li>
              <li>
                <Link href="/luyen-thi/he-dieu-hanh" className={footerLinkClass}>
                  Hệ điều hành
                </Link>
              </li>
              <li>
                <Link href="/luyen-thi/mang-internet" className={footerLinkClass}>
                  Mạng &amp; Internet
                </Link>
              </li>
              <li>
                <Link href="/luyen-thi/word-soan-thao" className={footerLinkClass}>
                  Word &amp; Soạn thảo
                </Link>
              </li>
              <li>
                <Link href="/luyen-thi/excel-bang-tinh" className={footerLinkClass}>
                  Excel &amp; Bảng tính
                </Link>
              </li>
              <li>
                <Link href="/luyen-thi/co-so-du-lieu" className={footerLinkClass}>
                  Cơ sở dữ liệu &amp; SQL
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
              Công cụ học tập
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>
                <Link
                  href="/#chuyen-de"
                  className={`inline-flex items-center gap-2 ${footerLinkClass}`}
                >
                  <BookOpen className="h-4 w-4 text-cyan-300" />
                  Luyện theo chuyên đề
                </Link>
              </li>
              <li>
                <Link
                  href="/thi-thu"
                  className={`inline-flex items-center gap-2 ${footerLinkClass}`}
                >
                  <Timer className="h-4 w-4 text-violet-300" />
                  Thi thử trực tuyến
                </Link>
              </li>
              <li>
                <Link
                  href="/bang-xep-hang"
                  className={`inline-flex items-center gap-2 ${footerLinkClass}`}
                >
                  <Trophy className="h-4 w-4 text-amber-300" />
                  Bảng xếp hạng thi thử
                </Link>
              </li>
              <li>
                <Link
                  href="/tra-cuu"
                  className={`inline-flex items-center gap-2 ${footerLinkClass}`}
                >
                  <Search className="h-4 w-4 text-amber-300" />
                  Tra cứu câu hỏi
                </Link>
              </li>
              <li>
                <Link
                  href="/lich-su"
                  className={`inline-flex items-center gap-2 ${footerLinkClass}`}
                >
                  <ListChecks className="h-4 w-4 text-pink-300" />
                  Lịch sử làm bài
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
              Thông tin hệ thống
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Website hỗ trợ tự ôn tập và tham khảo. Nội dung không thay thế
              giáo trình, quy chế thi hoặc thông tin từ đơn vị tổ chức khảo
              thí.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/8 pt-5 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} ÔnTin. Công cụ ôn tập Tin học.</p>
          <p>
            Dữ liệu học tập được dùng để hiển thị lịch sử và thống kê trên hệ
            thống.
          </p>
        </div>
      </div>
    </footer>
  );
}
