/**
 * Danh mục nguồn video hỗ trợ nhập bằng đường link (tải qua yt-dlp, hỗ trợ
 * ~1.800 trang). Dùng chung cho: landing (section Nguồn video), trang upload
 * (nhận diện link) và API import (hiển thị tên nguồn).
 */

export const VIDEO_SOURCE_CATEGORIES = [
  { id: "china", vi: "Trung Quốc", en: "China" },
  { id: "global", vi: "Toàn cầu", en: "Global" },
  { id: "asia", vi: "Châu Á khác", en: "Rest of Asia" },
  { id: "other", vi: "Nga & khác", en: "Russia & others" },
] as const;

export type VideoSourceCategory = (typeof VIDEO_SOURCE_CATEGORIES)[number]["id"];

export interface VideoSource {
  id: string;
  name: string;
  category: VideoSourceCategory;
  /** hostname khớp đuôi 1 trong các mục này → nhận diện nguồn */
  hosts: string[];
  /** nguồn nổi bật — đưa lên đầu danh sách */
  popular?: boolean;
}

export const VIDEO_SOURCES: VideoSource[] = [
  // — Trung Quốc —
  { id: "douyin", name: "Douyin (抖音)", category: "china", hosts: ["douyin.com", "iesdouyin.com"], popular: true },
  { id: "kuaishou", name: "Kuaishou (快手)", category: "china", hosts: ["kuaishou.com", "chenzhongtech.com"], popular: true },
  { id: "bilibili", name: "Bilibili", category: "china", hosts: ["bilibili.com", "b23.tv"], popular: true },
  { id: "xigua", name: "Xigua Video (西瓜)", category: "china", hosts: ["ixigua.com"] },
  { id: "weibo", name: "Weibo Video", category: "china", hosts: ["weibo.com", "weibo.cn"] },
  { id: "xiaohongshu", name: "Xiaohongshu (小红书)", category: "china", hosts: ["xiaohongshu.com", "xhslink.com"] },
  { id: "youku", name: "Youku (优酷)", category: "china", hosts: ["youku.com"] },
  // — Toàn cầu —
  { id: "youtube", name: "YouTube", category: "global", hosts: ["youtube.com", "youtu.be"], popular: true },
  { id: "tiktok", name: "TikTok", category: "global", hosts: ["tiktok.com"], popular: true },
  { id: "facebook", name: "Facebook", category: "global", hosts: ["facebook.com", "fb.watch"] },
  { id: "instagram", name: "Instagram Reels", category: "global", hosts: ["instagram.com"] },
  { id: "x", name: "X (Twitter)", category: "global", hosts: ["x.com", "twitter.com"] },
  { id: "vimeo", name: "Vimeo", category: "global", hosts: ["vimeo.com"] },
  { id: "twitch", name: "Twitch", category: "global", hosts: ["twitch.tv"] },
  { id: "dailymotion", name: "Dailymotion", category: "global", hosts: ["dailymotion.com", "dai.ly"] },
  // — Châu Á khác —
  { id: "niconico", name: "Niconico (ニコニコ)", category: "asia", hosts: ["nicovideo.jp"] },
  { id: "naver", name: "Naver TV", category: "asia", hosts: ["tv.naver.com"] },
  // — Nga & khác —
  { id: "vk", name: "VK Video", category: "other", hosts: ["vk.com", "vkvideo.ru"] },
  { id: "rutube", name: "Rutube", category: "other", hosts: ["rutube.ru"] },
  { id: "okru", name: "OK.ru", category: "other", hosts: ["ok.ru"] },
];

/** hostname khớp đuôi host đã khai báo (vd "m.douyin.com" khớp "douyin.com"). */
function hostMatches(hostname: string, host: string): boolean {
  return hostname === host || hostname.endsWith(`.${host}`);
}

/**
 * Nhận diện nguồn video từ URL. Trả về null nếu URL hỏng hoặc không thuộc
 * danh mục — link lạ vẫn có thể tải được (yt-dlp hỗ trợ ~1.800 trang).
 */
export function detectVideoSource(url: string): VideoSource | null {
  try {
    const { hostname, protocol } = new URL(url.trim());
    if (protocol !== "http:" && protocol !== "https:") return null;
    return (
      VIDEO_SOURCES.find((s) => s.hosts.some((h) => hostMatches(hostname, h))) ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Chuẩn hóa link người dùng dán về link video trực tiếp mà yt-dlp hiểu được.
 * Douyin: trang tìm kiếm/khám phá mở video qua tham số `modal_id`
 * (douyin.com/search/...?modal_id=123) → https://www.douyin.com/video/123.
 */
export function normalizeImportUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    if (hostMatches(u.hostname, "douyin.com")) {
      const modalId = u.searchParams.get("modal_id");
      if (modalId && /^\d+$/.test(modalId)) {
        return `https://www.douyin.com/video/${modalId}`;
      }
    }
    return u.toString();
  } catch {
    return url.trim();
  }
}

/** URL http(s) hợp lệ và không trỏ vào mạng nội bộ (chặn SSRF cơ bản). */
export function isImportableUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url.trim());
    if (protocol !== "http:" && protocol !== "https:") return false;
    if (!hostname.includes(".")) return false; // localhost, tên máy nội bộ
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(hostname)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
    if (hostname.startsWith("[")) return false; // IPv6 literal
    return true;
  } catch {
    return false;
  }
}
