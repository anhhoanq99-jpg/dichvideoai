/**
 * Đọc JSON từ Response mà KHÔNG bao giờ ném "Unexpected end of JSON input".
 *
 * Gọi thẳng `res.json()` là cái bẫy: khi một route chết vì lỗi không bắt được,
 * Next trả thân RỖNG (hoặc HTML), `res.json()` ném, và người dùng nhận đúng câu
 * vô nghĩa "Failed to execute 'json' on 'Response'" — lỗi THẬT bị nuốt sạch,
 * không biết bước nào hỏng hay mã lỗi bao nhiêu.
 *
 * Tách khỏi hook để test được: đây là lớp chắn cuối giữa lỗi máy chủ và thứ
 * khách hàng đọc được, nên phải chắc nó không tự vỡ.
 */

/** Ném Error có nội dung dùng được nếu thân rỗng / không phải JSON. */
export async function readJson<T>(res: Response, what: string): Promise<T> {
  const raw = await res.text();
  if (!raw.trim()) {
    throw new Error(`${what}: máy chủ trả về rỗng (HTTP ${res.status})`);
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `${what}: phản hồi không hợp lệ (HTTP ${res.status}) — ${raw.slice(0, 120)}`,
    );
  }
}

/** Dựng Error từ phản hồi lỗi, ưu tiên trường `error` do máy chủ gửi. */
export async function httpError(res: Response, fallback: string): Promise<Error> {
  const raw = await res.text().catch(() => "");
  if (raw.trim()) {
    try {
      const data = JSON.parse(raw) as { error?: string };
      if (data.error) return new Error(data.error);
    } catch {
      // không phải JSON → dùng nguyên văn bên dưới
    }
    return new Error(`${fallback} (HTTP ${res.status}) — ${raw.slice(0, 120)}`);
  }
  return new Error(`${fallback} (HTTP ${res.status})`);
}
