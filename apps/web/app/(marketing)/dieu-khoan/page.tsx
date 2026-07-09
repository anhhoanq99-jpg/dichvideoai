import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = { title: "Điều khoản sử dụng — Dịch Video AI" };

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Dịch vụ",
    body: [
      "Dịch Video AI là công cụ hỗ trợ dịch thuật và lồng tiếng video bằng trí tuệ nhân tạo: tách phụ đề, dịch sang tiếng Việt, che chữ trên hình, gắn phụ đề và tạo giọng đọc.",
      "Kết quả do AI tạo ra có thể chưa hoàn hảo; bạn có công cụ chỉnh sửa trước khi xuất và tự chịu trách nhiệm về nội dung cuối cùng mình phát hành.",
    ],
  },
  {
    title: "2. Trách nhiệm về nội dung",
    body: [
      "Bạn cam kết chỉ tải lên video mà bạn sở hữu hoặc có quyền sử dụng hợp pháp. Nền tảng không cấp cho bạn bất kỳ quyền nào đối với nội dung của bên thứ ba.",
      "Nghiêm cấm dùng dịch vụ cho nội dung vi phạm pháp luật Việt Nam, xâm phạm bản quyền, xúc phạm danh dự cá nhân/tổ chức, hoặc phát tán thông tin sai lệch.",
      "Chúng tôi có quyền tạm ngưng tài khoản vi phạm và phối hợp với cơ quan chức năng khi có yêu cầu hợp pháp.",
    ],
  },
  {
    title: "3. Tài khoản",
    body: [
      "Đăng nhập bằng tài khoản Google. Bạn tự bảo quản quyền truy cập thiết bị/tài khoản của mình và chịu trách nhiệm với các thao tác phát sinh từ tài khoản.",
    ],
  },
  {
    title: "4. Credits và thanh toán",
    body: [
      "Credits là đơn vị trả trước để sử dụng dịch vụ, quy đổi 1.000đ = 1.000 credits, không có giá trị quy đổi ngược thành tiền mặt và không chuyển nhượng giữa các tài khoản.",
      "Job xử lý lỗi do hệ thống được hoàn credits tự động 100%. Credits đã dùng cho job hoàn tất không được hoàn lại.",
      "Nạp qua chuyển khoản ngân hàng với nội dung chứa mã cá nhân; tiền vào tài khoản sẽ được cộng credits tự động.",
    ],
  },
  {
    title: "5. Lưu trữ dữ liệu",
    body: [
      "Video kết quả được lưu tạm và tự xóa sau 7 ngày — hãy tải về máy sau khi xử lý xong.",
      "Bạn có thể xóa video đã tải lên bất cứ lúc nào trong trang quản lý video.",
    ],
  },
  {
    title: "6. Giới hạn trách nhiệm",
    body: [
      "Dịch vụ được cung cấp theo hiện trạng. Chúng tôi nỗ lực đảm bảo hệ thống hoạt động ổn định nhưng không cam kết không gián đoạn tuyệt đối.",
      "Trách nhiệm bồi thường (nếu có) không vượt quá tổng số tiền bạn đã nạp trong 3 tháng gần nhất.",
    ],
  },
  {
    title: "7. Thay đổi điều khoản",
    body: [
      "Điều khoản có thể được cập nhật; thay đổi quan trọng sẽ được thông báo trên trang web. Tiếp tục sử dụng dịch vụ sau khi cập nhật đồng nghĩa với việc chấp nhận điều khoản mới.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0b0d14] text-neutral-200">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-white">Điều khoản sử dụng</h1>
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
