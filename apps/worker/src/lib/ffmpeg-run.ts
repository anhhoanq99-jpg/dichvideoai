import { spawn } from "node:child_process";
import { ffBin } from "./ffmpeg";

export interface FfmpegRunOptions {
  args: string[];
  /** total media duration, for progress % */
  durationSec: number;
  onProgress?: (pct: number) => void;
  /** kill after this many ms (default 2.5× duration, min 10 min) */
  timeoutMs?: number;
}

/**
 * Spawn ffmpeg with `-progress pipe:1`, parse out_time_ms → percent.
 * Args are passed as an array — user input never touches a shell.
 */
export function runFfmpeg(opts: FfmpegRunOptions): Promise<void> {
  const timeoutMs =
    opts.timeoutMs ?? Math.max(10 * 60_000, opts.durationSec * 2500);

  return new Promise((resolve, reject) => {
    const proc = spawn(ffBin("ffmpeg"), [...opts.args, "-progress", "pipe:1", "-nostats"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stderrTail: string[] = [];
    let lastPct = -1;

    const killTimer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`FFmpeg quá thời gian cho phép (${Math.round(timeoutMs / 60000)} phút)`));
    }, timeoutMs);

    proc.stdout.on("data", (buf: Buffer) => {
      const text = buf.toString();
      // -progress emits key=value lines; out_time_us/out_time_ms both appear across versions
      const progressMatch = /out_time_(?:us|ms)=(\d+)/.exec(text);
      if (progressMatch && opts.onProgress && opts.durationSec > 0) {
        const outSec = Number(progressMatch[1]) / 1_000_000;
        const pct = Math.min(99, Math.round((outSec / opts.durationSec) * 100));
        if (pct > lastPct) {
          lastPct = pct;
          opts.onProgress(pct);
        }
      }
    });

    proc.stderr.on("data", (buf: Buffer) => {
      stderrTail.push(buf.toString());
      if (stderrTail.length > 40) stderrTail.shift();
    });

    proc.on("error", (err) => {
      clearTimeout(killTimer);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(killTimer);
      if (code === 0) resolve();
      else {
        const tail = stderrTail.join("").split("\n").slice(-8).join("\n");
        reject(new Error(`FFmpeg exit ${code}:\n${tail}`));
      }
    });
  });
}
