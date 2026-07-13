import type { Lang } from "@/lib/i18n";

/**
 * Nhãn loại job dùng chung cho trang Lịch sử, danh sách Video…
 * Trước đây mỗi trang tự định nghĩa một bản sao — sửa nhãn phải sửa nhiều nơi.
 */
export const JOB_TYPE_LABELS: Record<Lang, Record<string, string>> = {
  vi: {
    probe: "Đọc thông số",
    stt: "Tách phụ đề (giọng nói)",
    ocr: "Tách phụ đề (trên hình)",
    translate: "Dịch AI",
    render: "Render video",
    dub: "Lồng tiếng",
  },
  en: {
    probe: "Read metadata",
    stt: "Extract subtitles (speech)",
    ocr: "Extract subtitles (on-screen)",
    translate: "AI translation",
    render: "Render video",
    dub: "Dubbing",
  },
};

/** Nhãn dạng "đang chạy…" hiển thị khi job còn trong pipeline. */
export const JOB_TYPE_PROGRESS_LABELS: Record<Lang, Record<string, string>> = {
  vi: {
    probe: "Đang đọc thông số video…",
    stt: "Đang trích phụ đề từ giọng nói…",
    ocr: "Đang trích phụ đề trên hình…",
    translate: "Đang dịch sang tiếng Việt…",
    render: "Đang render video…",
    dub: "Đang lồng tiếng…",
  },
  en: {
    probe: "Reading video metadata…",
    stt: "Extracting subtitles from speech…",
    ocr: "Extracting on-screen subtitles…",
    translate: "Translating…",
    render: "Rendering video…",
    dub: "Dubbing…",
  },
};
