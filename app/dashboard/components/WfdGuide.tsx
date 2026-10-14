import { Card } from '@/components/ui';

export default function WfdGuide() {
  return (
    <section aria-labelledby="wfd-guide-title">
      <Card className="homework-guide">
        <header className="mb-6">
          <h2 id="wfd-guide-title" className="text-xl sm:text-2xl font-semibold text-primary">Hướng dẫn học bộ tủ WFD</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="homework-guide-example">2 Topic / tuần</span>
            <span className="homework-guide-example">Mỗi câu 5 lần</span>
          </div>
        </header>

        <ol className="grid grid-cols-1 gap-4 list-none">
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">1. Truy cập bộ WFD</h3>
            <p>Vào trang:</p>
            <a href="https://study.pteintensive.com/writefromdictation" target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-[44px] max-w-full items-center rounded-lg border border-primary-light px-3 py-2 text-gray-900 underline decoration-primary underline-offset-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light/30 hover:shadow-md active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <span className="break-all">https://study.pteintensive.com/writefromdictation</span>
              <span className="sr-only"> (mở trong tab mới)</span>
            </a>
            <p>Sau đó chọn <strong>Topic</strong> để bắt đầu học theo từng chủ đề.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">2. Học theo từng chủ đề</h3>
            <p>Học viên nên học WFD <strong>theo Topic</strong>, không học lẫn quá nhiều chủ đề cùng lúc.</p>
            <h4 className="font-semibold text-gray-900">Vì sao nên học theo chủ đề?</h4>
            <p>Khi học các câu có từ vựng cùng một chủ đề:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Dễ ghi nhớ từ vựng hơn.</li>
              <li>Dễ nhận diện các từ thường xuất hiện cùng nhau.</li>
              <li>Giảm tình trạng học quá nhiều từ rời rạc cùng lúc.</li>
              <li>Giúp nhớ câu WFD lâu hơn.</li>
              <li>Khi gặp lại từ vựng tương tự trong bài thi, khả năng nhận diện sẽ nhanh hơn.</li>
            </ul>
            <p>Trên hệ thống đã có sẵn <strong>nghĩa tiếng Việt của từng câu</strong>, giúp học viên:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Hiểu nội dung câu.</li>
              <li>Dễ liên tưởng và ghi nhớ hơn.</li>
              <li>Học từ vựng theo ngữ cảnh thay vì học thuộc máy móc.</li>
              <li>Ghi nhớ câu lâu hơn.</li>
            </ul>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">3. Tiến độ học</h3>
            <p>Mỗi tuần học: <strong className="homework-guide-example">2 Topic</strong></p>
            <p>Học viên cần hoàn thành đủ 2 chủ đề được giao trong tuần.</p>
            <p>Nên chia đều số câu để học mỗi ngày, tránh dồn toàn bộ bài vào cuối tuần.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">4. Quy định học mỗi câu</h3>
            <p><strong className="homework-guide-example">Mỗi câu WFD phải chép 5 lần.</strong></p>
            <p>Mục tiêu là giúp học viên ghi nhớ:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Cấu trúc câu</li><li>Chính tả</li><li>Từ vựng</li><li>Các cụm từ thường đi cùng nhau</li>
              <li>Số ít / số nhiều</li><li>Giới từ</li><li>Mạo từ</li><li>Đuôi từ</li>
            </ul>
            <p>Không nên chỉ nhìn đáp án rồi đọc qua một lần.</p>
          </li>
          <li className="homework-guide-step">
            <h3 className="font-semibold text-gray-900">5. Có 2 cách học</h3>
            <div className="space-y-4">
              <section aria-labelledby="wfd-handwriting-title" className="rounded-lg border border-primary-light p-4">
                <h4 id="wfd-handwriting-title" className="mb-3 font-semibold text-gray-900">Cách 1: Chép tay</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Mở câu WFD trên hệ thống.</li>
                  <li>Nghe câu.</li>
                  <li>Xem và hiểu <strong>nghĩa tiếng Việt</strong>.</li>
                  <li>Kiểm tra câu tiếng Anh.</li>
                  <li>Chép lại <strong>mỗi câu 5 lần</strong> vào vở.</li>
                  <li>Chú ý những từ dễ sai chính tả.</li>
                  <li>Sau khi hoàn thành, <strong>chụp hình bài viết tay và gửi vào nhóm học</strong>.</li>
                </ul>
              </section>
              <section aria-labelledby="wfd-typing-title" className="rounded-lg border border-primary-light p-4">
                <h4 id="wfd-typing-title" className="mb-3 font-semibold text-gray-900">Cách 2: Đánh máy</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Mở câu WFD trên hệ thống.</li>
                  <li>Nghe câu.</li>
                  <li>Xem và hiểu <strong>nghĩa tiếng Việt</strong>.</li>
                  <li>Gõ lại câu trên máy tính hoặc thiết bị đang sử dụng.</li>
                  <li><strong>Mỗi câu đánh lại 5 lần.</strong></li>
                  <li>Kiểm tra và sửa những lỗi sai.</li>
                  <li>Sau khi hoàn thành, <strong>chụp màn hình kết quả và gửi vào nhóm học</strong>.</li>
                </ul>
              </section>
            </div>
          </li>
        </ol>

        <aside aria-labelledby="wfd-guide-notes" className="mt-6 rounded-xl border border-primary-light bg-primary-light/30 p-4 sm:p-6">
          <h3 id="wfd-guide-notes" className="font-semibold text-gray-900">Lưu ý</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
            <li>Học đúng <strong>Topic giáo viên giao</strong>.</li>
            <li>Mỗi tuần hoàn thành <strong>2 Topic</strong>.</li>
            <li><strong>Mỗi câu phải chép hoặc đánh máy 5 lần.</strong></li>
            <li>Đọc và hiểu nghĩa tiếng Việt trước khi cố gắng học thuộc câu.</li>
            <li>Không học thuộc một cách máy móc mà không hiểu nội dung.</li>
            <li>Những câu thường xuyên sai cần ôn lại nhiều hơn.</li>
            <li>Đặc biệt chú ý:
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Chính tả</li><li>Thiếu từ</li><li>Số ít / số nhiều</li>
                <li><code>a / an / the</code></li><li>Giới từ</li><li>Đuôi <code>-s</code>, <code>-ed</code></li>
              </ul>
            </li>
            <li>Sau khi hoàn thành bài, <strong>chụp hình hoặc chụp màn hình và gửi vào nhóm</strong> để giáo viên theo dõi tiến độ.</li>
          </ul>
        </aside>
        <p className="mt-6 text-center font-semibold text-primary">PTE Intensive – Học là đậu!</p>
      </Card>
    </section>
  );
}