import { Card } from '@/components/ui';

export default function SubmissionGuide() {
  return (
    <section aria-labelledby="submission-guide-title">
      <Card className="homework-guide">
        <header className="mb-6">
          <h2 id="submission-guide-title" className="text-xl sm:text-2xl font-semibold text-primary">
            Hướng dẫn nộp bài tập
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-700 leading-relaxed">
            Sau khi hoàn thành bài tập trên <strong>ApeUni</strong>, học viên thực hiện các bước sau để nộp bài trên hệ thống <strong>My Learning</strong>.
          </p>
        </header>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none">
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 1: Đăng nhập hệ thống My Learning</h3>
            <p>Truy cập:</p>
            <a
              href="https://mylearning.pteintensive.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] max-w-full items-center rounded-lg border border-primary-light px-3 py-2 text-gray-900 underline decoration-primary underline-offset-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light/30 hover:shadow-md active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="break-all">https://mylearning.pteintensive.com/dashboard</span>
              <span className="sr-only"> (mở trong tab mới)</span>
            </a>
            <p>Đăng nhập bằng tài khoản học viên của <strong>PTE Intensive</strong>.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 2: Vào mục Nộp bài tập</h3>
            <p>Tại thanh <strong>Navigation</strong>, chọn <strong>Nộp bài tập</strong>.</p>
            <p>Sau đó chọn <strong>Nộp bài mới</strong> để mở chức năng nộp bài tập.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 3: Copy link bài tập từ ApeUni</h3>
            <p>Sau khi làm xong bài trên <strong>ApeUni</strong>, copy <strong>link của bài tập</strong> để nộp vào hệ thống.</p>
            <h4 className="font-semibold text-gray-900">Quy định khi nộp bài:</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Mỗi bài tập tương ứng với 1 link ApeUni.</strong></li>
              <li>Học viên có thể nộp <strong>nhiều bài tập cùng lúc</strong>.</li>
              <li>Có thể nộp nhiều dạng bài khác nhau trong một lần.</li>
            </ul>
            <p className="rounded-lg border border-primary-light bg-primary-light/30 p-3">
              <strong>Quan trọng:</strong> Mỗi link phải được đặt trên <strong>một dòng riêng biệt</strong>.
            </p>
            <p>Ví dụ:</p>
            <pre className="whitespace-pre-wrap break-words rounded-lg bg-primary-light/30 p-4 text-sm text-gray-900"><code>{'Link bài Read Aloud\nLink bài Repeat Sentence\nLink bài Write From Dictation'}</code></pre>
            <p>Không dán nhiều link chung trên cùng một dòng.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 4: Nộp bài</h3>
            <p>Sau khi đã dán đầy đủ các link bài tập, kiểm tra lại một lần nữa.</p>
            <p>Sau đó bấm <strong>Nộp bài</strong> để hoàn tất.</p>
            <p>Trên giao diện, nút hiển thị số bài được nhận diện, ví dụ: <strong>Nộp 3 bài</strong>.</p>
          </li>
        </ol>

        <aside aria-labelledby="submission-guide-notes" className="mt-6 rounded-xl border border-primary-light bg-primary-light/30 p-4 sm:p-6">
          <h3 id="submission-guide-notes" className="font-semibold text-gray-900">Lưu ý</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
            <li>Chỉ nộp link của những bài đã hoàn thành trên ApeUni.</li>
            <li>Mỗi bài phải có <strong>một link riêng</strong>.</li>
            <li>Nếu nộp nhiều bài, mỗi link phải <strong>xuống dòng</strong>.</li>
            <li>Kiểm tra kỹ các link trước khi bấm <strong>Nộp bài</strong>.</li>
            <li>Nếu nộp sai link hoặc gặp lỗi, liên hệ giáo viên hoặc bộ phận hỗ trợ.</li>
          </ul>
        </aside>

        <p className="mt-6 text-center font-semibold text-primary">PTE Intensive – Học là đậu!</p>
      </Card>
    </section>
  );
}