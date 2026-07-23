// Kiem tra Redis co phai thu pham cua loi "Unexpected end of JSON input" khong.
// Nghi van: lib/queue.ts dat maxRetriesPerRequest: null = thu lai VO HAN, nen
// Redis cham/khong toi duoc thi queue.add() treo toi khi Vercel giet ham ->
// phan hoi than RONG -> trinh duyet nem loi JSON.
//
//   cd apps/worker && npx tsx --env-file=../../.env scripts/check-queue-health.ts
import IORedis from "ioredis";

async function main() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("THIEU REDIS_URL");
    process.exitCode = 1;
    return;
  }
  console.log("Redis host:", url.replace(/:[^:@]*@/, ":***@").slice(0, 60));

  const t0 = Date.now();
  // enableOfflineQueue mac dinh (true): lenh cho ket noi xong thay vi nem ngay.
  // Dat false o day se ra ket qua GIA — lenh dau tien luon truot vi socket chua san sang.
  const redis = new IORedis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    commandTimeout: 5000,
  });
  redis.on("error", (e) => console.log("  loi ket noi:", e.message));

  try {
    const pong = await redis.ping();
    const ping = Date.now() - t0;
    console.log(`PING -> ${pong} (${ping}ms ke ca ket noi)`);

    const t1 = Date.now();
    await redis.set("__healthcheck", "1", "EX", 60);
    const got = await redis.get("__healthcheck");
    console.log(`SET+GET -> ${got} (${Date.now() - t1}ms)`);
    await redis.del("__healthcheck");

    // do do tre lenh khi da nong — day moi la con so route thuc su chiu
    const t2 = Date.now();
    for (let i = 0; i < 5; i++) await redis.ping();
    console.log(`5 lenh khi da nong: ${Date.now() - t2}ms`);

    console.log(
      ping > 3000
        ? "\nCHAM BAT THUONG — rat co the la thu pham"
        : "\nRedis phan hoi binh thuong",
    );
  } catch (e) {
    console.log("\nKHONG DUNG DUOC REDIS:", e instanceof Error ? e.message : e);
    console.log("=> Day chinh la nguyen nhan: queue.add() se treo, route tra than rong");
    process.exitCode = 1;
  } finally {
    redis.disconnect();
  }
}

void main();
