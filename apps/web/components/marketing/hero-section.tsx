"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { EASE, fadeUp } from "./motion";

const STATS = [
  { value: "322+", label: "giọng lồng tiếng" },
  { value: "12", label: "phong cách dịch" },
  { value: "2GB", label: "mỗi video, tới 60 phút" },
];

/** Phần 2 — hero: các phần tử hiện so le, glow "thở" chậm, CTA có phản hồi chạm. */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:pt-28">
      {/* glow nền — phập phồng rất chậm, chỉ opacity/scale nên không giật */}
      <motion.div
        aria-hidden
        animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl"
      />

      <motion.div
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
        initial="hidden"
        animate="show"
        className="relative mx-auto flex max-w-3xl flex-col items-center text-center"
      >
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300"
        >
          <Sparkles className="h-3.5 w-3.5" /> Việt hóa video bằng AI — trọn gói một chạm
        </motion.span>

        <motion.h1
          variants={fadeUp}
          className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl"
        >
          Biến video nước ngoài thành{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            video tiếng Việt
          </span>{" "}
          trong vài phút
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-5 max-w-xl text-base text-neutral-400 sm:text-lg"
        >
          Thả video vào — AI tự đọc phụ đề gốc, dịch chuẩn văn nói, che chữ nước ngoài,
          gắn phụ đề Việt và lồng tiếng. Không cần biết edit video.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:scale-[1.03] hover:bg-indigo-500 hover:shadow-indigo-500/40 active:scale-95"
          >
            Bắt đầu miễn phí — tặng 10.000 credits <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#cach-hoat-dong"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-7 py-3.5 text-sm font-semibold text-neutral-200 transition-all duration-200 hover:scale-[1.03] hover:bg-white/5 active:scale-95"
          >
            <PlayCircle className="h-4 w-4" /> Xem cách hoạt động
          </a>
        </motion.div>

        <motion.dl
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } } }}
          className="mt-12 grid w-full grid-cols-3 gap-4"
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: EASE } }}
              className="rounded-xl border border-white/5 bg-white/[0.03] p-3 sm:p-4"
            >
              <dt className="text-xl font-bold text-white sm:text-2xl">{s.value}</dt>
              <dd className="mt-1 text-[11px] text-neutral-400 sm:text-xs">{s.label}</dd>
            </motion.div>
          ))}
        </motion.dl>
      </motion.div>
    </section>
  );
}
