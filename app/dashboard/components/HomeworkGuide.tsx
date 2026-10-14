import { Card } from '@/components/ui';

export default function HomeworkGuide() {
  return (
    <section aria-labelledby="homework-guide-title">
      <Card className="homework-guide">
        <header className="mb-6">
          <h2 id="homework-guide-title" className="text-xl sm:text-2xl font-semibold text-primary">
            Hướng dẫn làm bài tập về nhà
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-700 leading-relaxed">
            Học viên thực hiện bài tập trên <strong>ApeUni</strong> theo đúng các bước sau:
          </p>
        </header>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none">
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 1: Chọn dạng bài</h3>
            <p>Vào <strong>ApeUni</strong> → chọn đúng dạng bài mà giáo viên yêu cầu.</p>
            <p><strong>Ví dụ:</strong> <code className="homework-guide-example">Read Aloud</code></p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 2: Chọn Priority</h3>
            <p>Tại mục <strong>Priority</strong>, chọn bộ đề ưu tiên của tháng hiện tại theo hướng dẫn của giáo viên.</p>
            <p><strong>Ví dụ:</strong> <code className="homework-guide-example">Sep P</code></p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 3: Chọn trạng thái bài</h3>
            <p>Tại mục <strong>Prac Status</strong>, chọn:</p>
            <p><strong className="homework-guide-example">Unpracticed</strong></p>
            <p>Mục đích là để hệ thống chỉ hiển thị những câu <strong>chưa luyện tập</strong>.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">Bước 4: Làm bài theo thứ tự</h3>
            <p>Bắt đầu làm <strong>từ trên xuống dưới</strong>, theo đúng thứ tự ApeUni hiển thị.</p>
            <p>Làm <strong>đủ số lượng câu mà giáo viên yêu cầu</strong>.</p>
            <p><strong>Ví dụ:</strong> Giáo viên giao <code className="homework-guide-example">30 câu Read Aloud</code> → học viên làm <strong>30 câu đầu tiên từ trên xuống dưới</strong> sau khi đã lọc đúng <strong>Priority</strong> và <strong>Unpracticed</strong>.</p>
          </li>
        </ol>

        <aside aria-labelledby="homework-guide-notes" className="mt-6 rounded-xl border border-primary-light bg-primary-light/30 p-4 sm:p-6">
          <h3 id="homework-guide-notes" className="font-semibold text-gray-900">Lưu ý</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
            <li>Luôn chọn đúng <strong>dạng bài</strong> được giao.</li>
            <li>Luôn kiểm tra đúng <strong>Priority của tháng</strong>.</li>
            <li>Chọn <strong>Prac Status → Unpracticed</strong> trước khi bắt đầu.</li>
            <li>Không tự ý chọn câu ở giữa hoặc làm ngẫu nhiên.</li>
            <li>Làm <strong>từ trên xuống dưới</strong> cho đến khi đủ số lượng giáo viên yêu cầu.</li>
            <li>Sau khi hoàn thành, thực hiện theo hướng dẫn của giáo viên để <strong>nộp kết quả bài tập</strong>.</li>
          </ul>
        </aside>

        <p className="mt-6 text-center font-semibold text-primary">PTE Intensive – Học là đậu!</p>
      </Card>
    </section>
  );
}