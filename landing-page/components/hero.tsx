"use client";

import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center gap-4"
      >
        <Rocket className="h-12 w-12" />
        <h1 className={cn("text-4xl font-bold tracking-tight sm:text-6xl")}>
          Landing Page
        </h1>
        <p className="max-w-md text-lg text-neutral-500 dark:text-neutral-400">
          Next.js + TypeScript + Tailwind CSS + Framer Motion — sẵn sàng để build.
        </p>
      </motion.div>
    </section>
  );
}
