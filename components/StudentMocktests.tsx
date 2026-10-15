'use client';

import { useState } from 'react';
import { RiArrowRightUpLine, RiChatCheckLine, RiFileTextLine, RiLinksLine, RiRefreshLine, RiSendPlaneLine, RiTimeLine } from 'react-icons/ri';
import { Button, Card, Input, Tabs } from './ui';

export interface MocktestRecord {
  id: string;
  studentId: string;
  studentName?: string;
  date?: string;
  submittedAt?: string;
  link?: string;
  feedback?: string;
  feedbackByName?: string;
  recordVersion?: string;
}

export function mocktestUrl(value?: string) {
  try {
    const url = new URL(value || '');
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function mocktestDate(record: MocktestRecord) {
  const value = record.submittedAt || record.date;
  if (!value) return 'Chưa có ngày nộp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có ngày nộp';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function MocktestCard({ record }: { record: MocktestRecord }) {
  const reviewed = !!record.feedback?.trim();
  const url = mocktestUrl(record.link);
  return <Card className="mocktest-surface mocktest-entry" data-feedback-status={reviewed ? 'reviewed' : 'pending'}>
    <article className="space-y-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mocktest-icon"><RiFileTextLine aria-hidden="true" className="h-5 w-5" /></span>
          <div><h3 className="font-semibold text-gray-900">Bài Mocktest tổng hợp</h3><p className="mt-1 text-xs text-gray-500">{mocktestDate(record)}</p></div>
        </div>
        <span className={`mocktest-badge ${reviewed ? 'mocktest-badge-reviewed' : ''}`}>
          {reviewed ? <RiChatCheckLine aria-hidden="true" /> : <RiTimeLine aria-hidden="true" />}
          {reviewed ? 'Đã có nhận xét' : 'Chờ phản hồi'}
        </span>
      </header>
      <div className={`mocktest-comment ${reviewed ? 'mocktest-comment-reviewed' : ''}`}>
        <h4 className="text-sm font-semibold text-gray-900">{reviewed ? 'Nhận xét từ admin' : 'Bài nộp đang chờ nhận xét'}</h4>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">{reviewed ? record.feedback : 'Admin sẽ phản hồi bài Mocktest tổng hợp của bạn tại đây. Bạn có thể quay lại để xem nhận xét sau.'}</p>
        {reviewed && record.feedbackByName && <p className="mt-4 border-t border-primary-light/50 pt-3 text-xs text-gray-500">Người nhận xét: {record.feedbackByName}</p>}
      </div>
      <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 break-all text-xs text-gray-500">{url ? new URL(url).hostname : 'Liên kết bài nộp không hợp lệ. Vui lòng liên hệ admin để kiểm tra.'}</p>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="ui-button inline-flex shrink-0 items-center justify-center gap-2 border border-primary-light text-sm text-gray-700 hover:bg-primary-light/30">Xem bài Mocktest <RiArrowRightUpLine aria-hidden="true" className="h-4 w-4" /><span className="sr-only"> (mở trong tab mới)</span></a>}
      </footer>
    </article>
  </Card>;
}

interface Props {
  records: MocktestRecord[];
  loading: boolean;
  busy: boolean;
  error: string;
  message: string;
  text: string;
  onTextChange: (value: string) => void;
  onSubmit: (link: string) => Promise<void>;
  onReload: () => Promise<unknown>;
}

export default function StudentMocktests({ records, loading, busy, error, message, text, onTextChange, onSubmit, onReload }: Props) {
  const [status, setStatus] = useState('all');
  const [validation, setValidation] = useState('');
  const reviewed = records.filter(record => record.feedback?.trim()).length;
  const filtered = records.filter(record => status === 'all' || (status === 'done' ? !!record.feedback?.trim() : !record.feedback?.trim()))
    .sort((a, b) => (b.submittedAt || b.date || '').localeCompare(a.submittedAt || a.date || ''));
  const stats = [
    { label: 'Bài đã nộp', value: records.length, icon: RiFileTextLine, emphasis: false },
    { label: 'Đã có nhận xét', value: reviewed, icon: RiChatCheckLine, emphasis: true },
    { label: 'Chờ phản hồi', value: records.length - reviewed, icon: RiTimeLine, emphasis: false },
  ];

  return <div className="student-mocktests space-y-6 py-4 sm:py-6">
    <header className="mocktest-hero p-6 sm:p-8">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500"><RiFileTextLine aria-hidden="true" className="h-4 w-4 text-primary" /> Góc học tập · PTE Intensive</p>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Mocktest của bạn</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">Lưu lại bài thi thử, theo dõi phản hồi và chuẩn bị tốt hơn cho kỳ thi PTE. Mỗi bài Mocktest là một cơ hội nhìn lại quá trình luyện tập.</p>
      <span className="mocktest-badge mt-4 border-primary-light bg-white">Mocktest tổng hợp · Admin phụ trách nhận xét</span>
    </header>

    <section aria-label="Thống kê Mocktest">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map(stat => <Card key={stat.label} className="mocktest-surface mocktest-stat flex items-center gap-4" data-emphasis={stat.emphasis ? 'true' : undefined}><span className="mocktest-icon"><stat.icon aria-hidden="true" className="h-5 w-5" /></span><div><p className="text-sm text-gray-600">{stat.label}</p><p className="mocktest-stat-number mt-1 text-2xl font-bold tabular-nums text-gray-900">{loading || error ? '—' : stat.value}</p></div></Card>)}
      </div>
      <p className="mt-3 text-xs text-gray-500">Thống kê trên danh sách đã tải, tối đa 500 bài. Bộ lọc bên dưới chỉ áp dụng cho danh sách này.</p>
    </section>

    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-4">
        <Card className="mocktest-surface">
          <div className="mb-4 flex items-center gap-3"><span className="mocktest-icon"><RiSendPlaneLine aria-hidden="true" className="h-5 w-5" /></span><h2 className="text-lg font-semibold text-gray-900">Nộp Mocktest mới</h2></div>
          <p id="mocktest-link-help" className="mb-6 text-sm leading-relaxed text-gray-600">Dán đường dẫn kết quả bài Mocktest đã hoàn thành để admin xem và nhận xét.</p>
          <form className="space-y-4" onSubmit={event => {
            event.preventDefault();
            if (busy || loading) return;
            const link = mocktestUrl(text.trim());
            if (!link || link.length > 10000) { setValidation('Vui lòng nhập link http:// hoặc https:// hợp lệ, không quá 10.000 ký tự.'); return; }
            setValidation('');
            void onSubmit(link);
          }}>
            <label className="block text-sm font-medium text-gray-700">Link kết quả Mocktest<Input type="url" required maxLength={10000} disabled={busy} value={text} onChange={event => { onTextChange(event.target.value); setValidation(''); }} placeholder="https://…" aria-describedby={`mocktest-link-help${validation ? ' mocktest-link-error' : ''}`} aria-invalid={!!validation} className="mt-2 block w-full min-w-0" /></label>
            {validation && <p id="mocktest-link-error" role="alert" className="text-sm text-gray-700">{validation}</p>}
            <Button type="submit" disabled={busy || loading || !text.trim()} className="inline-flex w-full items-center justify-center gap-2"><RiSendPlaneLine aria-hidden="true" className="h-4 w-4" />{busy ? 'Đang gửi…' : 'Gửi bài Mocktest'}</Button>
            {message && <p role="status" className="rounded-xl border border-primary-light bg-primary-light/20 p-3 text-sm leading-relaxed text-gray-700">{message}</p>}
          </form>
        </Card>
        <div className="mocktest-guide rounded-xl border border-primary-light/60 bg-primary-light/10 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><RiLinksLine aria-hidden="true" className="h-4 w-4 text-primary" /> Trước khi gửi bài</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-600"><li>Hoàn thành bài Mocktest và mở kết quả.</li><li>Kiểm tra link dẫn đúng đến bài của bạn.</li><li>Gửi link và xem phản hồi trong lịch sử bên cạnh.</li></ol>
        </div>
      </aside>

      <section aria-labelledby="mocktest-history-title" aria-busy={loading} className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="mocktest-history-title" className="text-lg font-semibold text-gray-900">Lịch sử Mocktest</h2><p className="mt-1 text-xs text-gray-500">Sắp xếp theo ngày nộp mới nhất trong danh sách đã tải</p></div><Button variant="secondary" onClick={onReload} disabled={loading || busy} className="inline-flex items-center gap-2 text-sm"><RiRefreshLine aria-hidden="true" className="h-4 w-4" /> Tải lại</Button></div>
        <Tabs label="Lọc trạng thái Mocktest" value={status} onChange={setStatus} items={[{ value: 'all', label: 'Tất cả' }, { value: 'pending', label: 'Chờ phản hồi' }, { value: 'done', label: 'Đã có nhận xét' }]} />
        <p role="status" className="text-sm text-gray-500">{loading ? 'Đang tải Mocktest…' : error ? 'Chưa thể cập nhật danh sách' : `${filtered.length} bài phù hợp`}</p>
        {loading ? <div aria-hidden="true" className="space-y-4">{[0, 1].map(key => <Card key={key} className="mocktest-surface space-y-4 motion-safe:animate-pulse"><div className="h-5 w-1/2 rounded bg-gray-100" /><div className="h-24 rounded-xl bg-gray-50" /></Card>)}</div>
          : error ? <Card className="mocktest-surface"><h3 className="font-semibold text-gray-900">Không thể tải danh sách</h3><p role="alert" className="mt-2 break-words text-sm text-gray-600">{error}</p><Button variant="secondary" className="mt-4" disabled={busy} onClick={onReload}>Thử lại</Button></Card>
          : filtered.length ? filtered.map(record => <MocktestCard key={record.id} record={record} />)
          : <Card className="mocktest-surface flex flex-col items-center py-8 text-center"><span className="mocktest-icon mb-4"><RiFileTextLine aria-hidden="true" className="h-6 w-6" /></span><h3 className="font-semibold text-gray-900">{records.length ? 'Chưa có bài ở trạng thái này' : 'Bắt đầu với bài Mocktest đầu tiên'}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600">{records.length ? 'Chọn trạng thái khác để xem các bài đã nộp.' : 'Sau khi hoàn thành bài thi thử, gửi link kết quả bằng biểu mẫu nộp bài. Bài của bạn sẽ xuất hiện tại đây.'}</p>{status !== 'all' && <Button variant="secondary" className="mt-4" onClick={() => setStatus('all')}>Xem tất cả</Button>}</Card>}
      </section>
    </div>
  </div>;
}