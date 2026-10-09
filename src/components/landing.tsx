"use client";
// ============================================================================
// Các mảnh giao diện trang chủ: Hero, Marquee, Features, CTA cuối trang.
// Đây là Client Component vì dùng framer-motion (hiệu ứng chuyển động).
// ============================================================================
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDown,
  Timer,
  Zap,
  ListChecks,
  History,
  Check,
  Keyboard,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// --- Hiệu ứng xuất hiện dùng chung ---
const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

const KEYCAPS = [
  { label: "F5", top: "18%", left: "5%", rot: "-10deg", delay: "0s" },
  { label: "Ctrl", top: "64%", left: "9%", rot: "7deg", delay: "1.2s" },
  { label: "Enter", top: "30%", left: "88%", rot: "8deg", delay: "0.6s" },
  { label: "A", top: "70%", left: "84%", rot: "-6deg", delay: "1.8s" },
  { label: "Alt + Tab", top: "12%", left: "70%", rot: "-4deg", delay: "2.4s" },
];

export function Hero({
  questionCount,
  topicCount,
  attemptCount,
}: {
  questionCount: number;
  topicCount: number;
  attemptCount: number;
}) {
  return (
    <section className="relative overflow-hidden">
      {/* Vệt sáng màu ở nền */}
      <div className="pointer-events-none absolute inset-0 bg-grid" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/12 blur-[130px]" />
      <div className="pointer-events-none absolute top-32 right-[-120px] h-[360px] w-[360px] rounded-full bg-violet-500/12 blur-[110px]" />
      <div className="pointer-events-none absolute top-72 left-[-140px] h-[300px] w-[300px] rounded-full bg-pink-500/10 blur-[100px]" />

      {/* Phím bàn phím bay lơ lửng (chỉ hiện trên màn hình lớn) */}
      {KEYCAPS.map((k) => (
        <span
          key={k.label}
          className="keycap animate-floaty pointer-events-none absolute z-0 hidden opacity-70 lg:inline-flex"
          style={{
            top: k.top,
            left: k.left,
            ["--rot" as string]: k.rot,
            animationDelay: k.delay,
          }}
        >
          {k.label}
        </span>
      ))}

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-36 pb-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-44 lg:pb-28">
        {/* Cột chữ */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300"
          >
            <span className="animate-pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
            {questionCount} câu hỏi · {topicCount} chuyên đề · giải thích từng câu
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-6 text-5xl leading-[1.05] font-black tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            F5 lại điểm
            <br />
            <span className="text-gradient">Tin học</span> của bạn
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
          >
            Luyện trắc nghiệm theo từng chuyên đề — từ phần cứng, hệ điều hành
            tới Word, Excel và cả SQL. Chấm điểm tức thì, giải thích dễ hiểu,
            lưu lại toàn bộ lịch sử ôn luyện.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <a
              href="#chuyen-de"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-7 py-3.5 text-sm font-bold text-ink-950 shadow-xl shadow-cyan-500/25 transition-all hover:shadow-cyan-400/45"
            >
              Bắt đầu ôn luyện
              <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" strokeWidth={2.5} />
            </a>
            <Link
              href="/thi-thu"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition-colors hover:border-white/30 hover:bg-white/10"
            >
              <Timer className="h-4 w-4 text-cyan-300" strokeWidth={2.5} />
              Thi thử · 40 câu
            </Link>
          </motion.div>

          {/* Hàng thống kê lấy số thật từ database */}
          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-12 flex divide-x divide-white/10"
          >
            {[
              { n: `${questionCount}+`, label: "Câu trắc nghiệm" },
              { n: `${topicCount}`, label: "Chuyên đề" },
              { n: `${attemptCount}`, label: "Lượt làm bài" },
            ].map((s, i) => (
              <div key={s.label} className={i === 0 ? "pr-8" : "px-8"}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-2xl font-black text-white sm:text-3xl">{s.n}</dd>
                <dd className="mt-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
                  {s.label}
                </dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* Cột card xem trước một câu hỏi */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 6 }}
          animate={{ opacity: 1, y: 0, rotate: 3 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="animate-floaty relative mx-auto hidden w-full max-w-sm sm:block"
          style={{ ["--rot" as string]: "3deg" }}
        >
          <div className="glass rounded-3xl p-6 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-300/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              <span className="ml-3 text-xs font-semibold text-slate-500">de-thi-tin-hoc.exe</span>
            </div>

            <p className="mt-5 text-xs font-bold tracking-widest text-emerald-300 uppercase">
              Câu 03 · Excel &amp; Bảng tính
            </p>
            <p className="mt-2 font-bold text-white">
              Hàm SUM trong Excel dùng để làm gì?
            </p>

            <div className="mt-4 space-y-2.5 text-sm">
              <div className="rounded-xl border border-white/10 px-4 py-3 text-slate-400">
                Tính trung bình cộng
              </div>
              <div className="flex items-center justify-between rounded-xl border border-emerald-400/50 bg-emerald-400/10 px-4 py-3 font-semibold text-emerald-300">
                Tính tổng các giá trị
                <Check className="h-4 w-4" strokeWidth={3} />
              </div>
              <div className="rounded-xl border border-white/10 px-4 py-3 text-slate-400">
                Đếm số ô có dữ liệu
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
              <span>Đã trả lờat 3/10</span>
              <span className="font-bold text-emerald-300">+1 điểm</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div className="h-full w-[30%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function TopicMarquee({ names }: { names: string[] }) {
  const items = [...names, ...names, "Chấm điểm tức thì", "Giải thích chi tiết"];
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-white/8 bg-ink-900/60 py-4">
      <div className="animate-marquee flex w-max items-center gap-10">
        {doubled.map((name, i) => (
          <span
            key={i}
            className="flex items-center gap-10 text-sm font-bold tracking-[0.25em] whitespace-nowrap text-slate-600 uppercase"
          >
            {name}
            <Sparkles className="h-3.5 w-3.5 text-slate-700" />
          </span>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: ListChecks,
    color: "#22d3ee",
    title: "Trắc nghiệm theo chuyên đề",
    desc: "Học đâu chắc đó: 6 chuyên đề bám sát chương trình thi, mỗi lần làm là một đề được trộn ngẫu nhiên.",
  },
  {
    icon: Zap,
    color: "#fbbf24",
    title: "Chấm điểm & giải thích tức thì",
    desc: "Nộp bài xong biết ngay đúng sai từng câu, kèm giải thích dễ nhớ để không mắc lại lỗi cũ.",
  },
  {
    icon: Timer,
    color: "#a78bfa",
    title: "Chế độ thi thử có giờ",
    desc: "Đề tổng hợp 40 câu từ 6 chuyên đề, gồm cơ bản và nâng cao, 30 phút và tự nộp khi hết giờ.",
  },
  {
    icon: History,
    color: "#f472b6",
    title: "Lịch sử lưu trong database",
    desc: "Các đề thi thử được lưu bằng PostgreSQL — xem lại bất cứ lúc nào để theo dõi tiến bộ.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <motion.div {...fadeUp} className="max-w-2xl">
        <p className="text-sm font-bold tracking-[0.25em] text-cyan-300 uppercase">
          Vì sao nên ôn ở đây
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Làm bài, hiểu bài, nhớ bài
        </h2>
      </motion.div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: i * 0.08 }}
            className="glass card-glow rounded-3xl p-7"
            style={{ ["--c1" as string]: f.color }}
          >
            <span
              className="grid h-12 w-12 place-items-center rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${f.color}26, transparent)`,
                color: f.color,
                border: `1px solid ${f.color}40`,
              }}
            >
              <f.icon className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <h3 className="mt-5 text-lg font-extrabold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Mẹo phím tắt */}
      <motion.div
        {...fadeUp}
        className="glass mt-8 flex flex-col items-start gap-4 rounded-3xl border-cyan-400/20 p-6 sm:flex-row sm:items-center"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <Keyboard className="h-5 w-5" />
        </span>
        <p className="text-sm leading-relaxed text-slate-300">
          <b className="text-white">Mẹo thao tác nhanh:</b> khi làm bài, bấm{" "}
          <span className="keycap mx-0.5">1</span>
          <span className="keycap mx-0.5">2</span>
          <span className="keycap mx-0.5">3</span>
          <span className="keycap mx-0.5">4</span> để chọn đáp án,{" "}
          <span className="keycap mx-0.5">←</span>
          <span className="keycap mx-0.5">→</span> để chuyển câu — lướt đề nhanh như gõ văn bản.
        </p>
      </motion.div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <motion.div
        {...fadeUp}
        className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-cyan-500/15 via-violet-500/12 to-pink-500/15 px-6 py-16 text-center sm:px-12"
      >
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">
            Sẵn sàng bấm <span className="text-gradient">F5</span> chưa?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-400 sm:text-base">
            Mỗi đề chỉ mất vài phút. Là mỗi ngày một chút, điểm Tin học sẽ tự biết đường mà tăng.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#chuyen-de"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-7 py-3.5 text-sm font-bold text-ink-950 shadow-xl shadow-cyan-500/25 transition-all hover:shadow-cyan-400/45"
            >
              Chọn chuyên đề ngay
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </a>
            <Link
              href="/thi-thu"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              <Timer className="h-4 w-4 text-cyan-300" strokeWidth={2.5} />
              Vào thi thử
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
