import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = { title: "Chính sách bảo mật — Dịch Video AI" };

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Dữ liệu chúng tôi thu thập",
    body: [
      "Thông tin tài khoản Google khi đăng nhập: tên, email, ảnh đại diện.",
      "Nội dung bạn tải lên: video, phụ đề, từ điển thuật ngữ — chỉ dùng để thực hiện đúng yêu cầu xử lý của bạn.",
      "Dữ liệu vận hành: lịch sử job, số credits, nhật ký lỗi và địa chỉ IP khi tải lên (phục vụ chống lạm dụng).",
    ],
  },
  {
    title: "2. Dữ liệu được dùng thế nào",
    body: [
      "Video/phụ đề được gửi tới các nhà cung cấp AI (Google Gemini, Groq) chỉ để tách phụ đề, dịch và tạo giọng đọc theo yêu cầu của bạn.",
      "Chúng tôi không bán dữ liệu của bạn, không dùng nội dung của bạn để quảng cáo, không chia sẻ cho bên thứ ba ngoài các đơn vị hạ tầng liệt kê bên dưới.",
    ],
  },
  {
    title: "3. Đơn vị hạ tầng",
    body: [
      "Lưu trữ file: Cloudflare R2. Cơ sở dữ liệu: Neon (PostgreSQL). Hàng đợi xử lý: Upstash (Redis). Xử lý AI: Google Gemini, Groq, Microsoft Edge TTS. Đối soát thanh toán: SePay.",
      "Mỗi đơn vị chỉ nhận đúng phần dữ liệu cần cho chức năng của họ.",
    ],
  },
  {
    title: "4. Thời gian lưu trữ",
    body: [
      "Video kết quả tự xóa sau 7 ngày. Video nguồn và phụ đề bị xóa khi bạn xóa video khỏi tài khoản.",
      "Lịch sử giao dịch credits được lưu để phục vụ đối soát và theo quy định kế toán.",
    ],
  },
  {
    title: "5. Quyền của bạn",
    body: [
      "Bạn có quyền xem, tải về và xóa dữ liệu của mình bất cứ lúc nào trong trang quản lý.",
      "Muốn xóa toàn bộ tài khoản và dữ liệu liên quan, hãy liên hệ email hỗ trợ — chúng tôi xử lý trong tối đa 7 ngày làm việc.",
    ],
  },
  {
    title: "6. Bảo mật",
    body: [
      "Kết nối được mã hóa TLS toàn tuyến; khóa API và thông tin nhạy cảm được tách khỏi mã nguồn; quyền truy cập hệ thống giới hạn tối thiểu.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0b0d14] text-neutral-200">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-white">Chính sách bảo mật</h1>
        <p className="mt-2 text-sm text-neutral-400">Cập nhật: 10/07/2026</p>
        <div className="mt-8 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-white">{s.title}</h2>
              {s.body.map((p) => (
                <p key={p} className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
