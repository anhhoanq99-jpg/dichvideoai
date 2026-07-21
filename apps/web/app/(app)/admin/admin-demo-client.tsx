"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const T = {
  vi: {
    slotGoc: "Video gốc (bên trái)",
    slotBanViet: "Bản tiếng Việt (bên phải)",
    slotHuongDan: "Video hướng dẫn sử dụng (trang Dịch & lồng tiếng)",
    pick: "Chọn video MP4 (tối đa 200MB)…",
    upload: "Cập nhật video này",
    uploading: "Đang tải lên…",
    done: "Đã cập nhật — trang chủ sẽ hiện video mới sau ~5 phút (bộ nhớ đệm).",
    fail: "Tải lên không được — thử lại",
    hint: "Hai video này hiện ở mục “Xem kết quả thực tế” trên trang chủ. Dọc 9:16 hay ngang 16:9 đều được — nhưng nên để CẢ HAI cùng tỉ lệ và ngắn (~10–60 giây) thì hai khung mới cân nhau.",
    current: "Đang hiển thị:",
  },
  en: {
    slotGoc: "Original video (left)",
    slotBanViet: "Vietnamese version (right)",
    slotHuongDan: "Tutorial video (Translate & dub page)",
    pick: "Choose an MP4 video (max 200MB)…",
    upload: "Update this video",
    uploading: "Uploading…",
    done: "Updated — the homepage will show it in ~5 min (cache).",
    fail: "Upload failed — try again",
    hint: "These two videos appear in the “See real results” section on the homepage. Vertical 9:16 or horizontal 16:9 both work — keep BOTH the same ratio and short (~10–60s) so the two frames match.",
    current: "Currently showing:",
  },
} as const;

function DemoSlot({
  slot,
  label,
  lang,
}: {
  slot: "goc" | "ban-viet" | "huong-dan";
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
      // 1. xin URL ký sẵn — file KHÔNG đi qua route Next.js (Vercel chặn body ~4.5MB)
      const contentType = file.type || "video/mp4";
      const res = await fetch("/api/admin/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slot, contentType, sizeBytes: file.size }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        toast(data?.error ?? t.fail, "error");
        return;
      }

      // 2. PUT thẳng lên R2. Gửi `file.slice()` (blob KHÔNG type) để trình duyệt
      // không tự thêm header content-type — thêm header là dính preflight CORS
      // mà bucket chưa chắc mở. Kiểu MIME do route /api/demo ép khi trả về.
      const put = await fetch(data.url, { method: "PUT", body: file.slice() });
      if (!put.ok) {
        toast(`${t.fail} (R2 ${put.status})`, "error");
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
          <Button pill className="px-4" disabled={busy || !file} onClick={() => void upload()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? t.uploading : t.upload}
          </Button>
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
      <DemoSlot slot="huong-dan" label={t.slotHuongDan} lang={lang} />
    </div>
  );
}
