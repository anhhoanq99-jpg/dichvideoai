"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    slotGoc: "Video gốc (bên trái)",
    slotBanViet: "Bản tiếng Việt (bên phải)",
    pick: "Chọn video MP4 (tối đa 50MB)…",
    upload: "Cập nhật video này",
    uploading: "Đang tải lên…",
    done: "Đã cập nhật — trang chủ sẽ hiện video mới sau ~5 phút (bộ nhớ đệm).",
    fail: "Tải lên không được — thử lại",
    hint: "Hai video này hiện ở mục “Xem kết quả thực tế” trên trang chủ. Nên dùng video dọc 9:16 ngắn (~10–60 giây) để cân đối.",
    current: "Đang hiển thị:",
  },
  en: {
    slotGoc: "Original video (left)",
    slotBanViet: "Vietnamese version (right)",
    pick: "Choose an MP4 video (max 50MB)…",
    upload: "Update this video",
    uploading: "Uploading…",
    done: "Updated — the homepage will show it in ~5 min (cache).",
    fail: "Upload failed — try again",
    hint: "These two videos appear in the “See real results” section on the homepage. Use short 9:16 vertical clips (~10–60s).",
    current: "Currently showing:",
  },
} as const;

function DemoSlot({
  slot,
  label,
  lang,
}: {
  slot: "goc" | "ban-viet";
  label: string;
  lang: Lang;
}) {
  const t = T[lang];
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  // đổi sau khi upload để buộc <video> tải lại (bỏ qua cache)
  const [version, setVersion] = useState(0);

  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("slot", slot);
      form.append("file", file);
      const res = await fetch("/api/admin/demo", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error ?? t.fail, "error");
        return;
      }
      toast(t.done);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setVersion((v) => v + 1);
    } catch {
      toast(t.fail, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex justify-center">
          <video
            key={version}
            src={`/api/demo/${slot}?v=${version}`}
            controls
            playsInline
            preload="metadata"
            className="max-h-64 w-auto rounded-lg bg-black"
          />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs text-neutral-400">{t.current}</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm dark:border-neutral-700"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span className={cn("truncate", file ? "" : "text-neutral-400")}>
              {file ? file.name : t.pick}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={busy || !file}
            onClick={() => void upload()}
            className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? t.uploading : t.upload}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Khu quản trị video demo trang chủ (chỉ admin thấy trang này). */
export function AdminDemoClient({ lang = "vi" }: { lang?: Lang }) {
  const t = T[lang];
  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-400">{t.hint}</p>
      <DemoSlot slot="goc" label={t.slotGoc} lang={lang} />
      <DemoSlot slot="ban-viet" label={t.slotBanViet} lang={lang} />
    </div>
  );
}
