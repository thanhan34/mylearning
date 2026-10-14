import { Card } from '@/components/ui';

export default function ZoomGuide() {
  return (
    <section aria-labelledby="zoom-guide-title">
      <Card className="homework-guide">
        <header className="mb-6">
          <h2 id="zoom-guide-title" className="text-xl sm:text-2xl font-semibold text-primary">
            Hướng dẫn cài đặt Zoom để học
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-700 leading-relaxed">
            Học viên cần cài đặt Zoom trước buổi học để tham gia lớp online.
          </p>
        </header>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none">
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 1: Tải Zoom</h3>
            <p>Truy cập:</p>
            <a
              href="https://zoom.us/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] max-w-full items-center rounded-lg border border-primary-light px-3 py-2 text-gray-900 underline decoration-primary underline-offset-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light/30 hover:shadow-md active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="break-all">https://zoom.us/download</span>
              <span className="sr-only"> (mở trong tab mới)</span>
            </a>
            <p>Chọn <strong>Zoom Workplace</strong> và tải phiên bản phù hợp với thiết bị.</p>
            <p>Zoom có thể sử dụng trên:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Windows</li>
              <li>MacBook</li>
              <li>iPhone/iPad</li>
              <li>Điện thoại Android</li>
            </ul>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 2: Cài đặt Zoom</h3>
            <p>Sau khi tải xong:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Mở file vừa tải.</li>
              <li>Tiến hành cài đặt theo hướng dẫn.</li>
              <li>Sau khi hoàn tất, mở ứng dụng <strong>Zoom Workplace</strong>.</li>
            </ol>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 3: Tham gia lớp học</h3>
            <p>Khi giáo viên gửi <strong>Zoom Link</strong>, học viên chỉ cần bấm vào đường link để tham gia lớp.</p>
            <p>Nếu Zoom yêu cầu nhập thông tin:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Meeting ID:</strong> Nhập mã phòng học.</li>
              <li><strong>Passcode:</strong> Nhập mật khẩu phòng học.</li>
            </ul>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 4: Kiểm tra Micro và Loa</h3>
            <p>Trước khi vào học, học viên cần kiểm tra:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Speaker:</strong> Có nghe được âm thanh hay không.</li>
              <li><strong>Microphone:</strong> Zoom có nhận được giọng nói hay không.</li>
            </ul>
            <p>Khuyến khích sử dụng <strong>tai nghe có microphone</strong> để âm thanh rõ hơn và hạn chế tiếng vọng.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 5: Đặt tên đúng quy định</h3>
            <p>Học viên <strong>bắt buộc đặt tên Zoom</strong> theo cú pháp:</p>
            <p><strong className="homework-guide-example">Họ tên + Target PTE</strong></p>
            <p>Ví dụ:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><code className="homework-guide-example">An Doan PTE79</code></li>
              <li><code className="homework-guide-example">Nguyen Minh Hang PTE65</code></li>
              <li><code className="homework-guide-example">Tran Van A PTE50</code></li>
            </ul>
            <p>Việc đặt tên đúng giúp giáo viên:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Dễ điểm danh.</li>
              <li>Nhận biết đúng học viên.</li>
              <li>Biết target điểm của từng học viên.</li>
              <li>Hỗ trợ và theo dõi quá trình học phù hợp hơn.</li>
            </ul>
            <p><strong>Không đặt tên</strong> dạng:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>iPhone</li>
              <li>Samsung</li>
              <li>User</li>
            </ul>
            <p>hoặc nickname không xác định được học viên.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 6: Chuẩn bị trước giờ học</h3>
            <p>Trước buổi học khoảng <strong>5–10 phút</strong>, học viên nên:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Mở Zoom.</li>
              <li>Kiểm tra Internet.</li>
              <li>Kiểm tra tai nghe.</li>
              <li>Kiểm tra Micro.</li>
              <li>Chuẩn bị tài liệu học.</li>
              <li>Vào phòng học đúng giờ.</li>
            </ul>
          </li>
        </ol>

        <aside aria-labelledby="zoom-guide-notes" className="mt-6 rounded-xl border border-primary-light bg-primary-light/30 p-4 sm:p-6">
          <h3 id="zoom-guide-notes" className="font-semibold text-gray-900">Lưu ý khi học Zoom</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
            <li>Ưu tiên sử dụng máy tính hoặc laptop.</li>
            <li>Nên sử dụng tai nghe có microphone.</li>
            <li>Chọn nơi học yên tĩnh.</li>
            <li>Hạn chế tiếng ồn xung quanh.</li>
            <li>Tắt microphone khi không cần phát biểu.</li>
            <li>Nếu gặp lỗi kỹ thuật, chụp màn hình và gửi cho giáo viên hoặc bộ phận hỗ trợ.</li>
          </ul>
        </aside>

        <p className="mt-6 text-center font-semibold text-primary">PTE Intensive – Học là đậu!</p>
      </Card>
    </section>
  );
}