"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/** Ease chung cho toàn landing — mượt kiểu "trượt ra rồi hãm lại". */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

interface BoxProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** Hiện dần + trượt lên khi cuộn tới (chạy 1 lần, chỉ transform/opacity — không reflow). */
export function Reveal({ children, className, delay = 0 }: BoxProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Nhóm con xuất hiện so le khi cuộn tới. */
export function StaggerGroup({ children, className }: BoxProps) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

/** Phần tử con trong StaggerGroup; lift=true → nâng nhẹ khi rê chuột. */
export function StaggerItem({
  children,
  className,
  lift = false,
}: BoxProps & { lift?: boolean }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      {...(lift
        ? { whileHover: { y: -5, transition: { duration: 0.2, ease: "easeOut" } } }
        : {})}
    >
      {children}
    </motion.div>
  );
}
