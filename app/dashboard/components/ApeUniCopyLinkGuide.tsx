import { Card } from '@/components/ui';

export default function ApeUniCopyLinkGuide() {
  return (
    <section aria-labelledby="apeuni-copy-link-guide-title">
      <Card className="homework-guide">
        <header className="mb-6">
          <h2 id="apeuni-copy-link-guide-title" className="text-xl sm:text-2xl font-semibold text-primary">
            Hướng dẫn copy link bài tập từ ApeUni
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-700 leading-relaxed">
            Sau khi làm bài trên <strong>ApeUni</strong>, học viên cần lấy link của từng bài để nộp lên hệ thống <strong>My Learning</strong>.
          </p>
        </header>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none">
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 1: Chọn dạng bài cần làm</h3>
            <p>Vào <strong>ApeUni</strong> và chọn đúng dạng bài giáo viên yêu cầu.</p>
            <p>Ví dụ: <code className="homework-guide-example">Read Aloud</code></p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 2: Hoàn thành bài tập</h3>
            <p>Đối với dạng <strong>Speaking</strong> như <strong>Read Aloud</strong>:</p>
            <p>Bấm ghi âm và hoàn thành bài đọc.</p>
            <p>Sau khi ghi âm xong, bấm <strong className="homework-guide-example">Submit</strong>.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 3: Chọn AI chấm điểm</h3>
            <p>Sau khi Submit, chọn:</p>
            <p><strong className="homework-guide-example">AI Score</strong></p>
            <p>để hệ thống ApeUni chấm bài.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 4: Mở kết quả bài làm</h3>
            <p>Sau khi có kết quả, bấm:</p>
            <p><strong className="homework-guide-example">Score Info</strong></p>
            <p>để xem chi tiết kết quả của bài vừa làm.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 5: Chia sẻ bài làm</h3>
            <p>Trong phần kết quả, bấm:</p>
            <p><strong className="homework-guide-example">Share</strong></p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 6: Copy Link</h3>
            <p>Chọn:</p>
            <p><strong className="homework-guide-example">Copy Link</strong></p>
            <p>Link vừa copy chính là link bài tập dùng để nộp lên hệ thống <strong>My Learning</strong> của <strong>PTE Intensive</strong>.</p>
          </li>
        </ol>

        <section aria-labelledby="apeuni-copy-link-guide-summary" className="mt-6 rounded-xl border border-primary-light p-4 sm:p-6">
          <h3 id="apeuni-copy-link-guide-summary" className="font-semibold text-gray-900">Tóm tắt thao tác</h3>
          <p className="mt-3 text-sm sm:text-base font-semibold text-gray-700 leading-relaxed">
            Chọn dạng bài → Ghi âm → Submit → AI Score → Score Info → Share → Copy Link
          </p>
        </section>

        <aside aria-labelledby="apeuni-copy-link-guide-notes" className="mt-6 rounded-xl border border-primary-light bg-primary-light/30 p-4 sm:p-6">
          <h3 id="apeuni-copy-link-guide-notes" className="font-semibold text-gray-900">Lưu ý</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
            <li>Mỗi bài tập sẽ có <strong>một link riêng</strong>.</li>
            <li>Nếu giáo viên yêu cầu làm <strong>10 bài</strong>, học viên cần lấy link của từng bài đã làm.</li>
            <li><strong>Không copy link của trang danh sách bài tập.</strong></li>
            <li>Phải vào <strong>Score Info → Share → Copy Link</strong> để lấy đúng link kết quả bài làm.</li>
            <li>Sau khi copy link, học viên có thể dán các link vào phần <strong>Nộp bài tập</strong> trên My Learning.</li>
          </ul>
        </aside>

        <p className="mt-6 text-center font-semibold text-primary">PTE Intensive – Học là đậu!</p>
      </Card>
    </section>
  );
}