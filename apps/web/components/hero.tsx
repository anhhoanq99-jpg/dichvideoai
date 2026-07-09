"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Languages, Mic, ScanText, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: ScanText,
    title: "Trích xuất phụ đề",
    desc: "AI nhận diện lời nói và chữ trên video nước ngoài, tự tạo phụ đề gốc kèm mốc thời gian.",
  },
  {
    icon: Languages,
    title: "Dịch chuẩn văn nói",
    desc: "Dịch sang tiếng Việt tự nhiên như người bản xứ nói chuyện — không cứng nhắc kiểu máy dịch.",
  },
  {
    icon: Mic,
    title: "Che chữ gốc & xuất video",
    desc: "Làm mờ phụ đề nước ngoài, chèn phụ đề Việt đúng chỗ cũ. Lồng tiếng AI sắp ra mắt.",
  },
];

export function Hero() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-12 px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center gap-5"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" /> Việt hóa video bằng AI
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Dịch video nước ngoài sang{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
            tiếng Việt
          </span>{" "}
          trong vài phút
        </h1>
        <p className="max-w-xl text-lg text-neutral-500 dark:text-neutral-400">
          Upload video — AI tự trích phụ đề, dịch chuẩn văn nói, che chữ gốc và xuất
          video có phụ đề Việt. Không cần biết edit.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Bắt đầu miễn phí <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-6 py-3 text-sm font-semibold transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Đăng nhập
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="grid w-full max-w-4xl gap-4 sm:grid-cols-3"
      >
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className="rounded-xl border border-neutral-200 bg-white p-5 text-left dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center gap-2">
              <s.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold text-neutral-400">Bước {i + 1}</span>
            </div>
            <h3 className="mt-2 text-sm font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{s.desc}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
