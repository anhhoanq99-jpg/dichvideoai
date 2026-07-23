import assert from "node:assert/strict";
import { test } from "node:test";
import { httpError, readJson } from "./http-json";

/**
 * Muc tieu DUY NHAT cua bo test nay: chung minh khong loi nao chui qua duoc
 * thanh "Failed to execute 'json' on 'Response': Unexpected end of JSON input".
 * Do la cau ma khach dang thay khi tai video len, va no khong noi len dieu gi.
 */

const res = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "application/json" } });

test("than RONG -> bao ro la rong + ma HTTP, khong nem loi JSON", async () => {
  await assert.rejects(
    () => readJson(res("", 500), "Không khởi tạo được upload"),
    (e: Error) => {
      assert.match(e.message, /rỗng/);
      assert.match(e.message, /500/);
      assert.doesNotMatch(e.message, /JSON input/);
      return true;
    },
  );
});

test("than la HTML (trang loi cua proxy) -> keo theo noi dung, khong nem loi JSON", async () => {
  await assert.rejects(
    () => readJson(new Response("<html>502 Bad Gateway</html>", { status: 502 }), "Tải lên"),
    (e: Error) => {
      assert.match(e.message, /502/);
      assert.match(e.message, /Bad Gateway/);
      assert.doesNotMatch(e.message, /JSON input/);
      return true;
    },
  );
});

test("than chi co khoang trang cung coi la rong", async () => {
  await assert.rejects(
    () => readJson(res("   \n  ", 200), "Tải lên"),
    (e: Error) => /rỗng/.test(e.message),
  );
});

test("JSON hop le -> tra ve dung du lieu", async () => {
  const data = await readJson<{ videoId: string }>(
    res(JSON.stringify({ videoId: "abc" })),
    "Tải lên",
  );
  assert.equal(data.videoId, "abc");
});

test("httpError uu tien thong bao cua may chu", async () => {
  const e = await httpError(res(JSON.stringify({ error: "Không đủ xu" }), 402), "Tải lên");
  assert.equal(e.message, "Không đủ xu");
});

test("httpError voi than rong van co ma HTTP", async () => {
  const e = await httpError(new Response("", { status: 500 }), "Không hoàn tất được upload");
  assert.match(e.message, /500/);
  assert.doesNotMatch(e.message, /JSON input/);
});

test("httpError voi than khong phai JSON van doc duoc", async () => {
  const e = await httpError(new Response("Request Entity Too Large", { status: 413 }), "Tải lên");
  assert.match(e.message, /413/);
  assert.match(e.message, /Too Large/);
});
