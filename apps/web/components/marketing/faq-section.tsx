"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n";
import { StaggerGroup, StaggerItem } from "./reveal";
import { SectionHeading } from "./section-heading";
import { FAQ_T } from "./faq-data";

/** Phần 6 — FAQ: các câu hiện so le, mở/gập câu trả lời bằng grid-rows (CSS). */
export function FaqSection({ lang = "vi" }: { lang?: Lang }) {
  const t = FAQ_T[lang];
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16">
      <SectionHeading title={t.h2} />
      <StaggerGroup className="mt-8 space-y-3">
        {t.faqs.map((f, i) => {
          const isOpen = openIdx === i;
          return (
            <StaggerItem
              key={f.q}
              className="rounded-xl border border-white/5 bg-white/[0.03] px-5 transition-colors duration-300 hover:border-white/15"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-white"
              >
                {f.q}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-300",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <p className="pb-4 text-sm leading-relaxed text-neutral-400">{f.a}</p>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </section>
  );
}
