import { Card } from '@/components/ui';

export default function ApeUniAccountGuide() {
  return (
    <section aria-labelledby="apeuni-account-guide-title">
      <Card className="homework-guide">
        <header className="mb-6">
          <h2 id="apeuni-account-guide-title" className="text-xl sm:text-2xl font-semibold text-primary">
            Hướng dẫn tạo tài khoản ApeUni
          </h2>
        </header>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none">
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 1: Truy cập ApeUni</h3>
            <p>Vào trang:</p>
            <a
              href="https://www.apeuni.com/pte/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] max-w-full items-center rounded-lg border border-primary-light px-3 py-2 text-gray-900 underline decoration-primary underline-offset-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light/30 hover:shadow-md active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="break-all">https://www.apeuni.com/pte/login</span>
              <span className="sr-only"> (mở trong tab mới)</span>
            </a>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 2: Đăng ký tài khoản</h3>
            <p>Tại màn hình đăng nhập, chuyển sang mục <strong>Register</strong>.</p>
            <p>Điền đầy đủ các thông tin:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Nickname:</strong> Tên hiển thị</li>
              <li><strong>Email:</strong> Email đang sử dụng</li>
              <li><strong>Password:</strong> Mật khẩu</li>
            </ul>
            <p>Sau khi điền xong, bấm <strong>Register</strong>.</p>
          </li>
          <li className="homework-guide-step md:col-span-2">
            <h3 className="font-semibold text-gray-900">Bước 3: Xác nhận email</h3>
            <p>Mở hộp thư của email vừa đăng ký.</p>
            <p>Tìm email xác nhận từ <strong>ApeUni</strong> và bấm vào đường dẫn xác nhận tài khoản.</p>
            <p>Sau khi xác nhận thành công, quay lại ApeUni và đăng nhập bằng <strong>email + password</strong> vừa đăng ký.</p>
          </li>
        </ol>

        <aside aria-labelledby="apeuni-account-guide-notes" className="mt-6 rounded-xl border border-primary-light bg-primary-light/30 p-4 sm:p-6">
          <h3 id="apeuni-account-guide-notes" className="font-semibold text-gray-900">Lưu ý</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
            <li>Nên sử dụng email thường xuyên sử dụng để tránh quên tài khoản.</li>
            <li>Kiểm tra cả mục <strong>Spam/Junk</strong> nếu chưa thấy email xác nhận.</li>
            <li>Ghi nhớ email và mật khẩu để sử dụng trong quá trình học.</li>
            <li>Sau khi tạo tài khoản thành công, học viên có thể bắt đầu làm bài tập theo hướng dẫn của giáo viên.</li>
          </ul>
        </aside>

        <p className="mt-6 text-center font-semibold text-primary">PTE Intensive – Học là đậu!</p>
      </Card>
    </section>
  );
}