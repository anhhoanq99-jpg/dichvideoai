"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { LOGO_POSITIONS, type LogoPosition } from "@dichvideo/shared";
import {
  colorInputClass,
  fieldLabelClass,
  inputClass,
  selectClass,
} from "@/components/ui/form-styles";
import { useToast } from "@/components/ui/toaster";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { RenderSettings } from "./render-settings";

const T = {
  vi: {
    uploadFail: "Không tải được logo lên",
    uploadRetry: "Không tải được logo lên — thử lại",
    uploaded: "Đã tải logo lên — kéo logo trên video để đặt vị trí",
    enable: "Bật chèn logo/watermark vào video",
    logoType: "Loại logo:",
    typeText: "Chữ (Text)",
    typeImage: "Hình ảnh (Image)",
    changeImage: "Đổi ảnh khác…",
    pickImage: "Chọn file ảnh…",
    imageHint: "PNG / JPG / WebP, tối đa 2MB — PNG nền trong suốt cho đẹp nhất.",
    position: "Vị trí hiển thị",
    scale: "Kích thước (Scale)",
    opacityLong: "Độ hiện (Opacity)",
    textContent: "Nội dung chữ",
    textPh: "Tên kênh của bạn",
    positionShort: "Vị trí",
    fontSize: "Cỡ chữ",
    textColor: "Màu chữ",
    opacityShort: "Độ hiện",
    tip: "Mẹo: kéo logo ngay trên khung video để đổi vị trí, kéo ô vuông ở góc logo để đổi kích thước.",
  },
  en: {
    uploadFail: "Could not upload logo",
    uploadRetry: "Could not upload logo — try again",
    uploaded: "Logo uploaded — drag it on the video to position it",
    enable: "Add a logo/watermark to the video",
    logoType: "Logo type:",
    typeText: "Text",
    typeImage: "Image",
    changeImage: "Change image…",
    pickImage: "Choose image file…",
    imageHint: "PNG / JPG / WebP, up to 2MB — transparent PNG looks best.",
    position: "Position",
    scale: "Size (Scale)",
    opacityLong: "Opacity",
    textContent: "Text content",
    textPh: "Your channel name",
    positionShort: "Position",
    fontSize: "Font size",
    textColor: "Text color",
    opacityShort: "Opacity",
    tip: "Tip: drag the logo on the video to move it, drag the corner square to resize.",
  },
} as const;

interface LogoFieldsProps {
  settings: RenderSettings;
  onChange: (patch: Partial<RenderSettings>) => void;
  lang?: Lang;
}

/** Khối bật/tắt + tùy chỉnh logo (chữ hoặc hình ảnh) chèn vào video. */
export function LogoFields({ settings, onChange, lang = "vi" }: LogoFieldsProps) {
  const t = T[lang];
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/logo-upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? t.uploadFail);
        toast(data.error ?? t.uploadFail, "error");
        return;
      }
      onChange({ logoImageKey: data.r2Key, logoImageUrl: data.url, logoOn: true });
      toast(t.uploaded);
    } catch {
      setUploadError(t.uploadRetry);
      toast(t.uploadRetry, "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={settings.logoOn}
          onChange={(e) => onChange({ logoOn: e.target.checked })}
        />
        {t.enable}
      </label>

      <div className="mt-3 space-y-3">
          {/* loại logo: chữ hoặc hình ảnh */}
          <div className="flex items-center gap-4 text-sm">
            <span className={fieldLabelClass}>{t.logoType}</span>
            {(["text", "image"] as const).map((type) => (
              <label key={type} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="logo-type"
                  checked={settings.logoType === type}
                  onChange={() => onChange({ logoType: type })}
                />
                {type === "text" ? t.typeText : t.typeImage}
              </label>
            ))}
          </div>

          {settings.logoType === "image" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {settings.logoImageKey ? t.changeImage : t.pickImage}
                </button>
                {settings.logoImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.logoImageUrl}
                    alt="logo"
                    className="h-10 max-w-24 rounded border border-neutral-200 object-contain dark:border-neutral-700"
                  />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadLogo(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <p className="text-xs text-neutral-400">
                {t.imageHint}
              </p>
              {uploadError && (
                <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  <span className={fieldLabelClass}>{t.position}</span>
                  <select
                    value={settings.logoPosition}
                    onChange={(e) =>
                      onChange({ logoPosition: e.target.value as LogoPosition, logoFx: null, logoFy: null })
                    }
                    className={cn(selectClass, "mt-1 w-full")}
                  >
                    {LOGO_POSITIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass}>
                    {t.scale}: {settings.logoScale}%
                  </span>
                  <input
                    type="range"
                    min={3}
                    max={60}
                    value={settings.logoScale}
                    onChange={(e) => onChange({ logoScale: Number(e.target.value) })}
                    className="mt-2 w-full"
                  />
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass}>
                    {t.opacityLong}: {settings.logoOpacity}%
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={settings.logoOpacity}
                    onChange={(e) => onChange({ logoOpacity: Number(e.target.value) })}
                    className="mt-2 w-full"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm sm:col-span-2 lg:col-span-1">
                <span className={fieldLabelClass}>{t.textContent}</span>
                <input
                  value={settings.logoText}
                  onChange={(e) => onChange({ logoText: e.target.value.slice(0, 60), ...(e.target.value.trim() ? { logoOn: true } : {}) })}
                  placeholder={t.textPh}
                  className={cn(inputClass, "mt-1 w-full")}
                />
              </label>
              <label className="text-sm">
                <span className={fieldLabelClass}>{t.positionShort}</span>
                <select
                  value={settings.logoPosition}
                  onChange={(e) =>
                    onChange({ logoPosition: e.target.value as LogoPosition, logoFx: null, logoFy: null })
                  }
                  className={cn(selectClass, "mt-1 w-full")}
                >
                  {LOGO_POSITIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className={fieldLabelClass}>{t.fontSize}: {settings.logoSize}px</span>
                <input
                  type="range"
                  min={12}
                  max={96}
                  value={settings.logoSize}
                  onChange={(e) => onChange({ logoSize: Number(e.target.value) })}
                  className="mt-2 w-full"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className={fieldLabelClass}>{t.textColor}</span>
                <input
                  type="color"
                  value={settings.logoColor}
                  onChange={(e) => onChange({ logoColor: e.target.value.toUpperCase() })}
                  className={colorInputClass}
                />
              </label>
              <label className="text-sm">
                <span className={fieldLabelClass}>{t.opacityShort}: {settings.logoOpacity}%</span>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={settings.logoOpacity}
                  onChange={(e) => onChange({ logoOpacity: Number(e.target.value) })}
                  className="mt-2 w-full"
                />
              </label>
            </div>
          )}

          <p className="text-xs text-neutral-400">
            {t.tip}
          </p>
        </div>
    </div>
  );
}
