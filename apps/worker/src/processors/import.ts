import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { Job } from "bullmq";
import { UnrecoverableError } from "bullmq";
import { eq } from "drizzle-orm";
import { createDb, videos } from "@dichvideo/db";
import {
  UPLOAD_MAX_BYTES,
  isImportableUrl,
  type JobPayload,
} from "@dichvideo/shared";
import { chainJob } from "../lib/chain";
import { cleanupJobDir, jobTempDir, uploadToR2 } from "../lib/r2";
import { logger } from "../logger";

/** yt-dlp: YTDLP_PATH cho Windows dev, tên trần trên Linux (PATH). */
function ytdlpBin(): string {
  return process.env.YTDLP_PATH || "yt-dlp";
}

const CONTENT_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
};

/** Chạy yt-dlp, parse % tải về từ stdout; trả về stdout (chứa tiêu đề video). */
function runYtdlp(input: {
  args: string[];
  onProgress?: (pct: number) => void;
  timeoutMs?: number;
}): Promise<string> {
  const timeoutMs = input.timeoutMs ?? 20 * 60_000; // video 2GB trên mạng chậm
  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpBin(), input.args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    const stderrTail: string[] = [];
    let lastPct = -1;

    const killTimer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`Tải video quá thời gian cho phép (${Math.round(timeoutMs / 60000)} phút)`));
    }, timeoutMs);

    proc.stdout.on("data", (buf: Buffer) => {
      const text = buf.toString();
      stdout += text;
      // dòng tiến độ dạng "[download]  42.1% of ..."
      const m = /\[download\]\s+(\d+(?:\.\d+)?)%/.exec(text);
      if (m && input.onProgress) {
        const pct = Math.min(99, Math.round(Number(m[1])));
        if (pct > lastPct) {
          lastPct = pct;
          input.onProgress(pct);
        }
      }
    });
    proc.stderr.on("data", (buf: Buffer) => {
      stderrTail.push(buf.toString());
      if (stderrTail.length > 40) stderrTail.shift();
    });

    proc.on("error", (err) => {
      clearTimeout(killTimer);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            "Chưa cài yt-dlp trên máy chủ xử lý (worker). Cài đặt: winget install yt-dlp (Windows) / apt install yt-dlp (Linux), hoặc đặt YTDLP_PATH.",
          ),
        );
      } else reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(killTimer);
      if (code === 0) resolve(stdout);
      else if (code === 3221225794) {
        // 0xC0000142 (Windows): yt-dlp không khởi động được (thường sau khi vừa cài/cập nhật)
        reject(
          new Error(
            "yt-dlp không khởi động được trên máy chủ xử lý — khởi động lại worker (pnpm dev) rồi thử lại.",
          ),
        );
      } else {
        const tail = stderrTail.join("").split("\n").filter(Boolean).slice(-4).join("\n");
        reject(new Error(`yt-dlp exit ${code}:\n${tail}`));
      }
    });
  });
}

/**
 * Job "import" — tải video từ đường link (Douyin, Bilibili, YouTube, TikTok…
 * yt-dlp hỗ trợ ~1.800 trang) → đưa lên R2 → nối tiếp probe như video upload tay.
 */
export async function importProcessor(job: Job<JobPayload>) {
  const url = String(job.data.params.url ?? "");
  if (!isImportableUrl(url)) {
    throw new UnrecoverableError("Đường link không hợp lệ");
  }

  const db = createDb();
  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, job.data.videoId));
  if (!video) throw new UnrecoverableError(`Video ${job.data.videoId} không tồn tại`);

  const dir = await jobTempDir(job.data.jobId);
  try {
    // --print after_move: in "tiêu đề|||đường dẫn file cuối" SAU khi tải + merge xong
    const stdout = await runYtdlp({
      args: [
        url,
        "--format",
        // ƯU TIÊN H.264 (avc1): YouTube phục vụ AV1/VP9 cho 1080p+, mà AV1 KHÔNG
        // phát được trên Safari/iPhone → khung xem trước đen. avc1 phát mọi nơi.
        // Rơi dần: avc1 mp4 → avc1 bất kỳ → mp4 bất kỳ → tốt nhất.
        "bv*[vcodec^=avc1][ext=mp4]+ba[ext=m4a]/b[vcodec^=avc1][ext=mp4]/bv*[vcodec^=avc1]+ba/bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b",
        "--merge-output-format",
        "mp4",
        "--max-filesize",
        String(UPLOAD_MAX_BYTES),
        "--no-playlist",
        "--no-warnings",
        "--newline",
        // yt-dlp nhận THƯ MỤC chứa ffmpeg/ffprobe; thiếu nó merge fail → ra file chỉ có tiếng
        ...(process.env.FFMPEG_DIR ? ["--ffmpeg-location", process.env.FFMPEG_DIR] : []),
        // file cookies.txt (Netscape) — cần cho Douyin và video giới hạn đăng nhập
        ...(process.env.YTDLP_COOKIES ? ["--cookies", process.env.YTDLP_COOKIES] : []),
        "--output",
        path.join(dir, "source.%(ext)s"),
        "--no-simulate",
        "--print",
        "after_move:%(title)s|||%(filepath)s",
      ],
      onProgress: (pct) => void job.updateProgress(Math.min(80, pct)),
    }).catch((err: Error) => {
      // các lỗi retry cũng vô ích → báo tiếng Việt rõ ràng, fail ngay
      if (/Fresh cookies|cookies.*needed/i.test(err.message)) {
        throw new UnrecoverableError(
          "Trang nguồn (Douyin) đang yêu cầu cookie trình duyệt. Cách bật: mở douyin.com trên trình duyệt, xuất file cookies.txt (tiện ích “Get cookies.txt LOCALLY”), rồi đặt YTDLP_COOKIES=<đường dẫn file> trong .env của worker. Hoặc dùng link TikTok/YouTube/Bilibili…",
        );
      }
      if (/geo.?restricted|not available in your|region/i.test(err.message)) {
        throw new UnrecoverableError(
          "Video bị giới hạn khu vực — trang nguồn không cho tải từ IP Việt Nam.",
        );
      }
      if (/Unsupported URL|Unable to extract|HTTP Error 4|Private video|not available/i.test(err.message)) {
        throw new UnrecoverableError(
          `Không tải được video từ link này — hãy dán link trang XEM video (không phải trang tìm kiếm/kênh) và kiểm tra video còn xem được. Chi tiết: ${err.message.split("\n").pop()}`,
        );
      }
      throw err;
    });

    // dòng cuối stdout = "tiêu đề|||filepath" (các dòng trước là tiến độ tải)
    const lastLine = stdout.trim().split("\n").pop()?.trim() ?? "";
    const [title, localPath] = lastLine.split("|||");
    const fileOk =
      localPath &&
      (await stat(localPath).then((s) => s.size > 0).catch(() => false));
    if (!fileOk) {
      throw new UnrecoverableError(
        "Video vượt giới hạn 2GB hoặc trang không cho tải — thử video khác.",
      );
    }
    const ext = path.extname(localPath).slice(1).toLowerCase();
    await job.updateProgress(85);

    const key = `uploads/${job.data.userId}/${video.id}/source.${ext}`;
    const { sizeBytes } = await uploadToR2(
      key,
      localPath,
      CONTENT_TYPES[ext] ?? "video/mp4",
    );
    await job.updateProgress(95);

    await db
      .update(videos)
      .set({
        r2Key: key,
        sizeBytes,
        ...(title?.trim() ? { originalName: title.trim().slice(0, 255) } : {}),
      })
      .where(eq(videos.id, video.id));

    logger.info({ videoId: video.id, key, sizeBytes, title }, "import done");

    // nối tiếp pipeline y như upload tay: probe (kèm chain trích xuất/dịch nếu có)
    const chain = job.data.params.chain;
    const probeId = await chainJob({
      videoId: video.id,
      userId: job.data.userId,
      type: "probe",
      params: chain ? { chain } : {},
    });
    return { sizeBytes, title, probeJobId: probeId };
  } catch (err) {
    // hết đường cứu → đánh dấu video failed để UI báo ngay
    if (err instanceof UnrecoverableError) {
      await db
        .update(videos)
        .set({ status: "failed" })
        .where(eq(videos.id, video.id));
    }
    throw err;
  } finally {
    await cleanupJobDir(job.data.jobId);
  }
}
