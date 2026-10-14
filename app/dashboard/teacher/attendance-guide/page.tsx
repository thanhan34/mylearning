import Link from 'next/link';
import { Card } from '@/components/ui';
import { RiArrowRightLine, RiBookOpenLine, RiCalendarCheckLine, RiChatCheckLine, RiTimeLine, RiInformationLine } from 'react-icons/ri';

const topics = [
  ['feedback-rules', 'Nguyên tắc feedback bài'],
  ['workday-rules', 'Nguyên tắc tính ngày công'],
  ['makeup-feedback', 'Feedback bù'],
  ['attendance-period', 'Kỳ chấm công'],
  ['feedback-deadlines', 'Quy tắc 3 ngày và ngày chốt công'],
  ['examples', 'Một số trường hợp cụ thể'],
] as const;

const deadlines = [
  ['05/09', '08/09', '08/09'],
  ['10/09', '13/09', '13/09'],
  ['15/09', '18/09', '18/09'],
  ['18/09', '21/09', '20/09'],
  ['20/09', '23/09', '20/09'],
  ['21/09', '24/09', '24/09 – thuộc kỳ công tiếp theo'],
];

export default function AttendanceGuidePage() {
  return <div id="attendance-guide-top" className="attendance-guide mx-auto max-w-7xl space-y-6">
    <header className="attendance-guide-hero">
      <div className="attendance-guide-hero-copy max-w-3xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Không gian giảng dạy <span aria-hidden="true" className="mx-2 text-primary">/</span> Hướng dẫn chấm công</p>
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"><RiBookOpenLine aria-hidden="true" className="h-4 w-4 text-primary" /> Dành cho giảng viên và trợ giảng</p>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">Hướng dẫn giáo viên feedback bài & nguyên tắc chấm công</h1>
        <p className="mt-4 text-sm leading-relaxed text-gray-600 sm:text-base">Áp dụng cho cả giảng viên và trợ giảng trong phạm vi học viên và dạng bài được phân công. Các mốc thời gian dưới đây đều theo giờ Việt Nam.</p>
      </div>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 200 170" className="attendance-guide-illustration">
        <circle cx="104" cy="85" r="76" fill="var(--attendance-guide-peach)" opacity=".5" />
        <rect x="34" y="30" width="132" height="118" rx="16" fill="white" stroke="var(--attendance-guide-peach)" />
        <path d="M34 63h132" stroke="var(--attendance-guide-border)" /><path d="M65 22v20M135 22v20" stroke="var(--primary-color)" strokeWidth="7" strokeLinecap="round" />
        <path d="M56 82h15M91 82h15M126 82h15M56 106h15M91 106h15M56 130h15M91 130h15" stroke="var(--attendance-guide-peach)" strokeWidth="7" strokeLinecap="round" />
        <circle cx="143" cy="126" r="25" fill="var(--primary-color)" /><path d="m132 126 8 8 15-17" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="attendance-guide-badge"><RiTimeLine aria-hidden="true" className="h-4 w-4" /> Múi giờ Việt Nam · UTC+7</span>
        <Link href="/dashboard/teacher/feedback" className="ui-button inline-flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-vivid">Đi đến Feedback <RiArrowRightLine aria-hidden="true" className="h-4 w-4" /></Link>
      </div>
    </header>

    <div aria-label="Các mốc quan trọng" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        { value: '30%', label: 'Tỷ lệ feedback tối thiểu', detail: 'Tính riêng từng học viên và từng dạng bài được giao.', icon: RiChatCheckLine },
        { value: '3 ngày', label: 'Thời gian feedback bù tối đa', detail: 'Không vượt qua ngày chốt công của kỳ tương ứng.', icon: RiTimeLine },
        { value: 'Ngày 20', label: 'Chốt công hằng tháng', detail: '23:59, giờ Việt Nam. Kỳ công bắt đầu từ ngày 21 tháng trước.', icon: RiCalendarCheckLine },
      ].map(item => <Card key={item.value} className="attendance-guide-stat">
        <div className="flex items-center justify-between gap-3"><p className="text-2xl font-bold tracking-tight text-gray-900">{item.value}</p><span className="attendance-guide-icon"><item.icon aria-hidden="true" className="h-5 w-5" /></span></div>
        <h2 className="mt-3 text-sm font-semibold text-gray-900">{item.label}</h2><p className="mt-2 text-xs leading-relaxed text-gray-500">{item.detail}</p>
      </Card>)}
    </div>

    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-24">
        <Card className="attendance-guide-directory"><details open className="attendance-guide-menu"><summary>Nội dung hướng dẫn <RiBookOpenLine aria-hidden="true" className="h-5 w-5 text-primary" /></summary><div>
          <h2 className="text-base font-semibold text-gray-900">Nội dung hướng dẫn</h2>
          <p className="mb-4 mt-1 text-xs text-gray-500">6 chủ đề · Chọn để xem nhanh</p>
          <nav aria-label="Mục lục hướng dẫn chấm công">
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{topics.map(([id, title], index) => <li key={id}>
              <a href={`#${id}`} className="attendance-guide-topic"><span aria-hidden="true" className="attendance-guide-number">{String(index + 1).padStart(2, '0')}</span><span>{title}</span></a>
            </li>)}</ol>
          </nav>
        </div></details></Card>
        <div className="attendance-guide-tip rounded-xl border p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900"><RiInformationLine aria-hidden="true" className="h-5 w-5 text-primary" /> Lưu ý khi tra cứu</p>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">Hạn feedback bù là mốc đến trước giữa hạn 3 ngày và ngày chốt công. Xem bảng ví dụ để đối chiếu từng trường hợp.</p>
          <a href="#feedback-deadlines" className="ui-button mt-3 inline-flex items-center gap-2 border border-primary-light bg-white text-sm text-gray-700 hover:bg-primary-light/30">Xem bảng thời hạn <RiArrowRightLine aria-hidden="true" /></a>
        </div>
      </aside>

      <div className="attendance-guide-reader min-w-0 space-y-6">
        <Card className="attendance-guide-summary space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Quy tắc cần nhớ</h2>
          <p className="font-semibold leading-relaxed text-gray-900">30% tính trên từng học viên – được feedback bù tối đa 3 ngày – nhưng tuyệt đối không vượt qua ngày chốt công 20 hàng tháng.</p>
          <p className="text-sm leading-relaxed text-gray-600">Kiểm tra riêng từng dạng bài được giao mà học viên có nộp. Công được ghi nhận về ngày học viên nộp bài, không phải ngày feedback bù.</p>
        </Card>

    <section id="feedback-rules" aria-labelledby="feedback-rules-title" className="scroll-mt-24">
      <Card className="space-y-4 text-gray-700">
        <h2 id="feedback-rules-title" className="text-xl font-semibold text-gray-900">1. Nguyên tắc feedback bài</h2>
        <p>Giáo viên có trách nhiệm kiểm tra và feedback bài tập của học viên được phân công phụ trách. Mỗi ngày, giáo viên cần đảm bảo:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Feedback ít nhất <strong>30% số bài của từng học viên</strong> có phát sinh bài trong ngày.</li>
          <li>30% được tính riêng cho từng học viên, không cộng dồn tổng bài của tất cả học viên.</li>
          <li>Đảm bảo feedback đủ các dạng bài được phân công nếu học viên có nộp các dạng bài đó. Mức 30% được kiểm tra riêng cho từng học viên và từng dạng bài.</li>
          <li>Số bài tối thiểu được làm tròn lên: 4 bài cần ít nhất 2 feedback.</li>
        </ul>
        <div className="homework-guide-step">
          <h3 className="font-semibold text-gray-900">Feedback cần có nội dung rõ ràng</h3>
          <ul className="list-disc space-y-2 pl-6"><li>Sai ở đâu.</li><li>Cần sửa gì.</li><li>Cách cải thiện.</li><li>Những lỗi cần tránh ở các bài sau.</li></ul>
        </div>
        <p><strong>Ví dụ trong cùng dạng bài được giao:</strong> Học viên A nộp 10 bài → tối thiểu 3 feedback. Học viên B nộp 20 bài → tối thiểu 6 feedback.</p>
        <p>Không được áp dụng theo kiểu A và B có tổng 30 bài → chỉ feedback 9 bài của một học viên để đủ 30%.</p>
      </Card>
    </section>

    <section id="workday-rules" aria-labelledby="workday-rules-title" className="scroll-mt-24">
      <Card className="space-y-4 text-gray-700">
        <h2 id="workday-rules-title" className="text-xl font-semibold text-gray-900">2. Nguyên tắc tính ngày công</h2>
        <p>Một ngày được tính công khi giáo viên đáp ứng đầy đủ yêu cầu feedback đối với những học viên và dạng bài được phân công trong ngày đó. Đạt đủ các yêu cầu thì được ghi nhận 1 ngày công, không cộng thêm công theo số dạng bài.</p>
        <p><strong>Nếu ngày đó không có học viên nộp bài thuộc các dạng bài được giao phụ trách, hệ thống không tự động phát sinh ngày công.</strong></p>
        <div className="homework-guide-step">
          <h3 className="font-semibold text-gray-900">Ví dụ về phạm vi phân công</h3>
          <p>Giáo viên được phân công feedback: Read Aloud – Repeat Sentence – Write From Dictation.</p>
          <p>Nếu trong ngày học viên chỉ nộp Essay và SWT thì những bài này không thuộc phạm vi giáo viên phụ trách và không được dùng để xác định ngày công của giáo viên đó.</p>
          <p className="text-sm">Đây là ví dụ minh họa quy tắc; danh sách dạng bài thực tế phụ thuộc vào phân công của admin.</p>
        </div>
      </Card>
    </section>

    <section id="makeup-feedback" aria-labelledby="makeup-feedback-title" className="scroll-mt-24">
      <Card className="space-y-4 text-gray-700">
        <h2 id="makeup-feedback-title" className="text-xl font-semibold text-gray-900">3. Feedback bù</h2>
        <p>Trong trường hợp chưa hoàn thành feedback đúng ngày học viên nộp bài, giảng viên và trợ giảng được phép feedback bù tối đa trong vòng 3 ngày, nhưng không vượt ngày chốt kỳ công.</p>
        <p><strong>Ví dụ:</strong> Học viên nộp bài ngày 05/09. Giảng viên và trợ giảng được phép hoàn thành feedback bù chậm nhất vào hết ngày 08/09.</p>
        <p>Sau thời hạn 3 ngày, giảng viên và trợ giảng vẫn có thể feedback bài cho học viên nếu cần, nhưng bài đó không còn được sử dụng để tính công cho ngày phát sinh ban đầu.</p>
      </Card>
    </section>

    <section id="attendance-period" aria-labelledby="attendance-period-title" className="scroll-mt-24">
      <Card className="space-y-4 text-gray-700">
        <h2 id="attendance-period-title" className="text-xl font-semibold text-gray-900">4. Kỳ chấm công</h2>
        <p>Kỳ công được tính <strong>từ ngày 21 tháng trước đến hết ngày 20 tháng hiện tại.</strong></p>
        <p>Ví dụ: kỳ công tháng 9 từ 21/08 đến hết 20/09.</p>
        <p>Hệ thống chốt công vào cuối ngày 20 hàng tháng, theo giờ Việt Nam. Sau khi kỳ công đã được chốt, giáo viên không được feedback bù để hồi tố công cho kỳ đã chốt.</p>
      </Card>
    </section>

    <section id="feedback-deadlines" aria-labelledby="feedback-deadlines-title" className="scroll-mt-24">
      <Card className="space-y-4 text-gray-700">
        <h2 id="feedback-deadlines-title" className="text-xl font-semibold text-gray-900">5. Quy tắc 3 ngày và ngày chốt công</h2>
        <p>Thời hạn feedback bù được xác định theo <strong>mốc nào đến trước</strong>: hết ngày nộp bài + 3 ngày hoặc cuối ngày 20 của kỳ công (23:59, giờ Việt Nam).</p>
        <p className="text-xs text-gray-500 sm:hidden">Vuốt ngang bảng để xem đầy đủ các mốc thời hạn.</p>
        <div className="attendance-deadline-table overflow-x-auto rounded-xl border border-primary-light" role="region" aria-label="Bảng hạn feedback bù" tabIndex={0}>
          <table className="w-full min-w-[480px] text-left text-sm">
            <caption className="p-3 text-left text-gray-600">Ví dụ các ngày trong tháng 9; hạn cuối đều tính đến hết ngày được ghi.</caption>
            <thead className="bg-primary-light/20 text-gray-900"><tr>
              <th scope="col" className="p-3">Ngày học viên nộp bài</th><th scope="col" className="p-3">Hạn 3 ngày</th><th scope="col" className="p-3">Hạn cuối để được tính công</th>
            </tr></thead>
            <tbody>{deadlines.map(([submitted, threeDays, final]) => <tr key={submitted} className="border-t border-primary-light">
              <th scope="row" className="p-3 font-medium">{submitted}</th><td className="p-3">{threeDays}</td><td className="p-3 font-medium">{final}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="font-semibold text-primary">Bài nộp càng gần ngày 20 thì thời gian feedback bù càng ngắn.</p>
      </Card>
    </section>

    <section id="examples" aria-labelledby="examples-title" className="scroll-mt-24">
      <Card className="space-y-4 text-gray-700">
        <h2 id="examples-title" className="text-xl font-semibold text-gray-900">6. Một số trường hợp cụ thể</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="homework-guide-step"><h3 className="font-semibold text-gray-900">Trường hợp 1 – Đủ điều kiện</h3><p>Học viên nộp 10 bài RA trong ngày. Giáo viên feedback 3 bài → đạt 30%.</p><p>Nếu không còn yêu cầu nào khác chưa hoàn thành và feedback trong hạn thì ngày đó được ghi nhận đủ điều kiện chấm công.</p></article>
          <article className="homework-guide-step"><h3 className="font-semibold text-gray-900">Trường hợp 2 – Không đủ 30%</h3><p>Học viên nộp 10 bài nhưng giáo viên chỉ feedback 2 bài → chưa đạt yêu cầu.</p><p>Giáo viên có thể tiếp tục feedback bù trong thời hạn cho phép.</p></article>
          <article className="homework-guide-step"><h3 className="font-semibold text-gray-900">Trường hợp 3 – Nhiều học viên</h3><p>Học viên A: 10 bài → tối thiểu 3 bài. Học viên B: 20 bài → tối thiểu 6 bài.</p><p>Giáo viên feedback A: 9 bài, B: 0 bài → không đạt, mặc dù tổng số bài feedback bằng 30% tổng bài. Lý do: 30% được tính theo từng học viên.</p></article>
          <article className="homework-guide-step"><h3 className="font-semibold text-gray-900">Trường hợp 4 – Feedback sau ngày chốt công</h3><p>Học viên nộp bài ngày 18/09. Ngày 22/09 giáo viên mới feedback.</p><p>Giáo viên vẫn có thể feedback để hỗ trợ học viên, nhưng không được hồi tố công cho kỳ 21/08–20/09.</p></article>
        </div>
      </Card>
    </section>
    <Card className="attendance-guide-purpose space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Mục tiêu của quy định</h2>
      <p className="leading-relaxed text-gray-700">Đảm bảo học viên được giáo viên theo dõi và feedback đều đặn, tránh tình trạng dồn bài nhiều ngày hoặc đến cuối kỳ mới xử lý.</p>
    </Card>
        <footer className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <a href="#attendance-guide-top" className="ui-button inline-flex items-center justify-center border border-primary-light bg-white text-sm text-gray-700 hover:bg-primary-light/30">↑ Về đầu hướng dẫn</a>
          <Link href="/dashboard/teacher/feedback" className="ui-button inline-flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-vivid">Bắt đầu feedback <RiArrowRightLine aria-hidden="true" className="h-4 w-4" /></Link>
        </footer>
      </div>
    </div>
  </div>;
}