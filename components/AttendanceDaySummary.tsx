import { summarizeAttendanceDays } from '@/lib/attendance-range-loader';
import type { AuditDailyRow } from '@/lib/attendance-audit';

export default function AttendanceDaySummary({ rows }: { rows: AuditDailyRow[] }) {
  const summary = summarizeAttendanceDays(rows);
  return <section aria-label="Thống kê ngày đạt và không đạt" className="space-y-3">
    <h4 className="font-semibold text-admin-text">Kết quả theo ngày · {summary.total} ngày trong khoảng đã chọn</h4>
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        { label: 'Ngày đạt', count: summary.passed },
        { label: 'Ngày không đạt', count: summary.failed },
        { label: 'Ngày không có bài', count: summary.noSubmissions },
      ].map(item => <div key={item.label} className="rounded-admin border border-admin-border bg-admin-soft p-4">
        <dt className="text-sm text-admin-body">{item.label}</dt>
        <dd className="mt-2 text-2xl font-bold tabular-nums text-admin-text">{item.count}</dd>
      </div>)}
    </dl>
    <p className="text-sm leading-relaxed text-admin-body">Một ngày đạt khi tất cả dạng bài có bài nộp trong ngày đều đạt ít nhất 30% feedback thực hiện. Chỉ một dạng bài dưới 30% thì ngày đó không đạt. Dạng bài không có bài nộp không xét; ngày không có bài được thống kê riêng. Kết quả này bao gồm feedback trễ hạn, không tự xác nhận ngày công.</p>
  </section>;
}