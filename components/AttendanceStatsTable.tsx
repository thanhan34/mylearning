import type { AuditDailyRow, AuditRangeRow } from '@/lib/attendance-audit';

const percentage = (count: number, total: number) => total ? `${(100 * count / total).toFixed(1)}%` : '—';
const formatDate = (date: string) => date.split('-').reverse().join('/');

export default function AttendanceStatsTable({ rows, daily = false, staffName }: {
  rows: (AuditRangeRow | AuditDailyRow)[]; daily?: boolean; staffName: string;
}) {
  return <div className="attendance-stats-table overflow-x-auto rounded-admin border border-admin-border" role="region" aria-label={daily ? 'Chi tiết feedback từng ngày và dạng bài' : 'Tổng hợp feedback theo dạng bài'} tabIndex={0}>
    <table className="w-full min-w-[720px] text-left text-sm">
      <caption className="p-4 text-left font-medium text-admin-text">{daily ? 'Chi tiết từng ngày, từng dạng bài' : 'Tổng hợp theo dạng bài'} · {staffName}</caption>
      <thead className="bg-admin-soft text-admin-text"><tr>
        {(daily ? ['Ngày nộp bài', 'Dạng bài', 'Tổng bài', 'Đã feedback', '% feedback thực hiện', 'Đạt 30%', 'Trong hạn (tạm tính)', '% trong hạn'] : ['Dạng bài', 'Tổng bài', 'Đã feedback', '% feedback thực hiện', 'Đạt 30%', 'Trong hạn (tạm tính)', '% trong hạn']).map(text => <th key={text} scope="col" className="whitespace-nowrap p-3">{text}</th>)}
      </tr></thead>
      <tbody>{rows.map(row => <tr key={JSON.stringify(['date' in row ? row.date : '', row.type])} className="border-t border-admin-border">
        {daily && <th scope="row" className="whitespace-nowrap p-3 font-medium text-admin-text">{'date' in row ? formatDate(row.date) : '—'}</th>}
        {daily ? <td className="p-3 text-admin-body">{row.type}</td> : <th scope="row" className="p-3 font-medium text-admin-text">{row.type}</th>}
        <td className="p-3 tabular-nums">{row.total}</td><td className="p-3 tabular-nums">{row.feedback}</td>
        <td className="p-3 font-semibold tabular-nums text-primary">{percentage(row.feedback, row.total)}</td>
        <td className="whitespace-nowrap p-3">{row.total ? <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${row.feedback * 100 >= row.total * 30 ? 'border-primary-light bg-admin-soft text-primary' : 'border-admin-border bg-admin-surface text-admin-body'}`}>
          {row.feedback * 100 >= row.total * 30 ? 'Đạt' : 'Không đạt'}
        </span> : '—'}</td>
        <td className="p-3 tabular-nums">{row.within}</td><td className="p-3 tabular-nums">{percentage(row.within, row.total)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}