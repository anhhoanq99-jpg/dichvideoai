/**
 * Lấy danh sách giọng THẬT từ Viettel AI và FPT.AI, đồng thời sinh thử 1 câu
 * để nghe chất lượng trước khi đưa vào catalog cho khách.
 *
 * Chạy:  cd apps/worker && npx tsx scripts/list-tts-voices.ts
 * Cần:   VIETTEL_TTS_TOKEN và/hoặc FPT_TTS_API_KEY trong .env gốc repo.
 *
 * File nghe thử ghi ra apps/worker/tts-samples/ — mở nghe rồi chọn giọng ưng ý,
 * sau đó dán id vào VIETTEL_VOICES / FPT_VOICES trong packages/shared/src/dub-presets.ts
 */
import { config } from "dotenv";
config();
config({ path: "../../.env" });

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../tts-samples",
);
const SAMPLE =
  "Chào mừng các bạn quay trở lại với kênh review phim. Hôm nay chúng ta sẽ cùng khám phá một bộ phim cực kỳ hấp dẫn.";

async function viettel() {
  const token = process.env.VIETTEL_TTS_TOKEN;
  if (!token) {
    console.log("\n[Viettel] bỏ qua — chưa có VIETTEL_TTS_TOKEN trong .env");
    return;
  }
  console.log("\n=== VIETTEL AI ===");
  const res = await fetch("https://viettelgroup.ai/voice/api/tts/v1/rest/voices", {
    headers: { token },
  });
  if (!res.ok) {
    console.log(`  lỗi lấy danh sách giọng: ${res.status} ${(await res.text()).slice(0, 200)}`);
    return;
  }
  const voices = (await res.json()) as unknown;
  console.log("  Danh sách giọng THẬT:");
  console.log(JSON.stringify(voices, null, 2).slice(0, 4000));

  // sinh thử tối đa 6 giọng đầu để nghe
  const list = (Array.isArray(voices) ? voices : []) as { code?: string; name?: string }[];
  for (const v of list.slice(0, 6)) {
    const code = v.code;
    if (!code) continue;
    const r = await fetch("https://viettelgroup.ai/voice/api/tts/v1/rest/syn", {
      method: "POST",
      headers: { "content-type": "application/json", token },
      body: JSON.stringify({
        text: SAMPLE,
        voice: code,
        id: "2",
        without_filter: false,
        speed: 1.0,
        tts_return_option: 3,
      }),
    });
    if (!r.ok) {
      console.log(`  ✗ ${code}: ${r.status}`);
      continue;
    }
    const file = path.join(OUT_DIR, `viettel-${code}.wav`);
    await writeFile(file, Buffer.from(await r.arrayBuffer()));
    console.log(`  ✓ ${code} (${v.name ?? ""}) → ${file}`);
  }
}

async function fpt() {
  const apiKey = process.env.FPT_TTS_API_KEY;
  if (!apiKey) {
    console.log("\n[FPT] bỏ qua — chưa có FPT_TTS_API_KEY trong .env");
    return;
  }
  console.log("\n=== FPT.AI ===");
  // FPT không có endpoint liệt kê — 7 giọng này lấy từ tài liệu chính thức
  const voices = ["banmai", "thuminh", "leminh", "giahuy", "myan", "lannhi", "linhsan"];
  for (const voice of voices) {
    const res = await fetch("https://api.fpt.ai/hmi/tts/v5", {
      method: "POST",
      headers: {
        api_key: apiKey,
        voice,
        speed: "0",
        format: "mp3",
        "content-type": "text/plain; charset=utf-8",
      },
      body: SAMPLE,
    });
    const data = (await res.json().catch(() => null)) as { async?: string; message?: string } | null;
    if (!data?.async) {
      console.log(`  ✗ ${voice}: ${data?.message ?? res.status}`);
      continue;
    }
    // link trả về chưa sẵn sàng ngay — chờ tối đa 2 phút
    let ok = false;
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      const got = await fetch(data.async);
      if (got.ok) {
        const buf = await got.arrayBuffer();
        if (buf.byteLength > 1024) {
          await writeFile(path.join(OUT_DIR, `fpt-${voice}.mp3`), Buffer.from(buf));
          ok = true;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    console.log(ok ? `  ✓ ${voice} → tts-samples/fpt-${voice}.mp3` : `  ✗ ${voice}: chờ quá lâu`);
  }
}

await mkdir(OUT_DIR, { recursive: true });
await viettel();
await fpt();
console.log(`\nNghe thử các file trong: ${OUT_DIR}`);
process.exit(0);
