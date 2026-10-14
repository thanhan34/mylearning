'use client';

import { useState } from 'react';
import { Button, Card, Input, Tabs } from './ui';
import { mocktestDate, mocktestUrl, type MocktestRecord } from './StudentMocktests';
import { RiArrowRightUpLine, RiChatCheckLine, RiFileTextLine, RiInformationLine, RiRefreshLine, RiSearchLine, RiTimeLine } from 'react-icons/ri';

interface Props {
  records: MocktestRecord[];
  students: { id: string; name: string }[];
  search: string;
  onSearch: (value: string) => void;
  loading: boolean;
  busy: boolean;
  error: string;
  onReload: () => Promise<boolean>;
}

export default function TeacherMocktests({ records, students, search, onSearch, loading, busy, error, onReload }: Props) {
  const [status, setStatus] = useState('all');
  const studentName = (record: MocktestRecord) => record.studentName || students.find(student => student.id === record.studentId)?.name || record.studentId;
  const reviewed = records.filter(record => record.feedback?.trim()).length;
  const visible = records.filter(record => `${studentName(record)} ${record.studentId}`.toLowerCase().includes(search.toLowerCase()) &&
    (status === 'all' || (status === 'done' ? !!record.feedback?.trim() : !record.feedback?.trim())))
    .sort((a, b) => (b.date || b.submittedAt || '').localeCompare(a.date || a.submittedAt || ''));
  const stats = [
    { label: 'Mocktest đã tải', value: records.length, icon: RiFileTextLine },
    { label: 'Chờ phản hồi', value: records.length - reviewed, icon: RiTimeLine },
    { label: 'Đã có nhận xét', value: reviewed, icon: RiChatCheckLine },
  ];
  return <div className="teacher-mocktests min-w-0 space-y-6">
    <header className="teacher-mocktest-hero relative overflow-hidden rounded-2xl border p-6 sm:p-8">
      <div className="relative z-10 max-w-3xl lg:pr-44"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Học tập <span aria-hidden="true" className="mx-2 text-primary">/</span> Mocktest</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mocktest theo học viên</h1>
        <p className="mt-3 text-sm leading-7 text-gray-600">Xem bài thi thử và theo dõi nhận xét trong phạm vi dữ liệu tài khoản được phép truy cập.</p>
      </div>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 180 140" className="pointer-events-none absolute right-8 top-6 hidden w-40 lg:block"><circle cx="100" cy="70" r="62" fill="var(--staff-peach)" opacity=".5" /><rect x="47" y="17" width="85" height="108" rx="12" fill="white" stroke="var(--staff-peach)" /><path d="M65 40h47M65 56h32M65 73h42" stroke="var(--staff-peach)" strokeWidth="6" strokeLinecap="round" /><circle cx="126" cy="105" r="25" fill="var(--primary-color)" /><path d="m115 105 8 8 15-17" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </header>
    <div><div aria-label="Thống kê Mocktest đã tải" className="grid grid-cols-1 gap-4 md:grid-cols-3">{stats.map(stat => <Card key={stat.label} className="teacher-mocktest-surface flex items-center gap-4"><span className="teacher-mocktest-icon"><stat.icon aria-hidden="true" className="h-5 w-5" /></span><div><p className="text-xs font-medium text-gray-600">{stat.label}</p><p className="mt-1 text-3xl font-bold tabular-nums">{loading || error ? '—' : stat.value}</p></div></Card>)}</div><p className="mt-3 text-xs text-gray-500">Thống kê trước bộ lọc, chỉ từ danh sách đã tải; không phải tổng toàn hệ thống.</p></div>
    <Card className="teacher-mocktest-surface space-y-4">
      <p className="teacher-mocktest-notice flex items-start gap-3 rounded-xl p-3 text-xs leading-relaxed text-gray-600"><RiInformationLine aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span>Mocktest tổng hợp không thuộc một dạng bài riêng; admin phụ trách feedback. Dữ liệu cũ được giữ nguyên. Trang này chỉ xem nhận xét, không cấp thêm quyền truy cập.</span></p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-sm font-medium text-gray-700">Tìm học viên<span className="relative mt-2 block"><RiSearchLine aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><Input type="search" placeholder="Tên hoặc mã học viên" value={search} onChange={event => onSearch(event.target.value)} className="block w-full pl-10" /></span></label><Button variant="secondary" disabled={loading || busy} onClick={onReload} className="inline-flex items-center justify-center gap-2 text-sm"><RiRefreshLine aria-hidden="true" className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} />Tải lại danh sách</Button></div>
      <Tabs label="Lọc trạng thái Mocktest giáo viên" value={status} onChange={setStatus} items={[{ value: 'all', label: 'Tất cả' }, { value: 'pending', label: 'Chờ phản hồi' }, { value: 'done', label: 'Đã có nhận xét' }]} />
      <p className="text-xs text-gray-500">Tìm kiếm và bộ lọc chỉ áp dụng cho danh sách đã tải. API hiện trả tối đa 500 bài, không cung cấp phân trang.</p>
    </Card>
    <section aria-labelledby="teacher-mocktest-results" aria-busy={loading} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="teacher-mocktest-results" className="text-lg font-semibold">Danh sách Mocktest</h2><p role="status" className="text-sm text-gray-500">{loading ? 'Đang tải Mocktest...' : error ? 'Chưa thể tải dữ liệu' : `${visible.length} bài phù hợp`}</p></div>
      {loading ? <div aria-hidden="true" className="space-y-4">{[0, 1].map(key => <Card key={key} className="teacher-mocktest-surface space-y-4 motion-safe:animate-pulse"><div className="h-5 w-1/3 rounded bg-gray-100" /><div className="h-24 rounded-xl bg-gray-50" /></Card>)}</div>
        : error ? <Card className="teacher-mocktest-surface"><h3 className="font-semibold">Không thể tải Mocktest</h3><p role="alert" className="mt-2 break-words text-sm text-gray-600">{error}</p><Button variant="secondary" disabled={busy} onClick={onReload} className="mt-4">Thử lại</Button></Card>
        : visible.length ? visible.map(record => {
          const hasFeedback = !!record.feedback?.trim();
          const url = mocktestUrl(record.link);
          const name = studentName(record);
          return <Card key={record.id} className="teacher-mocktest-surface teacher-mocktest-record space-y-4"><article className="space-y-4">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span aria-hidden="true" className="teacher-mocktest-icon rounded-full font-semibold">{name.trim().charAt(0).toUpperCase() || 'HV'}</span><div className="min-w-0"><h3 className="break-words font-semibold">{name}</h3><p className="mt-1 text-xs text-gray-500">Ngày nộp: {mocktestDate({ ...record, submittedAt: record.date || record.submittedAt })}</p></div></div><span className={`teacher-mocktest-status ${hasFeedback ? 'teacher-mocktest-reviewed' : ''}`}>{hasFeedback ? <RiChatCheckLine aria-hidden="true" /> : <RiTimeLine aria-hidden="true" />}{hasFeedback ? 'Đã có nhận xét' : 'Chờ phản hồi'}</span></header>
            <div className="teacher-mocktest-comment rounded-xl p-4"><h4 className="text-sm font-semibold">Nhận xét từ admin</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">{hasFeedback ? record.feedback : 'Chưa có nhận xét cho bài Mocktest này.'}</p>{hasFeedback && record.feedbackByName && <p className="mt-3 text-xs text-gray-500">Người nhận xét: {record.feedbackByName}</p>}</div>
            <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="min-w-0 break-all text-xs text-gray-500">{url ? new URL(url).hostname : 'Không có liên kết bài nộp hợp lệ.'}</p>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="ui-button teacher-mocktest-open inline-flex shrink-0 items-center justify-center gap-2 text-sm">Mở mocktest <RiArrowRightUpLine aria-hidden="true" className="h-4 w-4" /><span className="sr-only"> (mở trong tab mới)</span></a>}</footer>
          </article></Card>;
        }) : <Card className="teacher-mocktest-surface py-8 text-center"><h3 className="font-semibold">{records.length ? 'Không tìm thấy Mocktest phù hợp' : 'Chưa có dữ liệu Mocktest'}</h3><p className="mt-2 text-sm leading-relaxed text-gray-600">{records.length ? 'Thử đổi từ khóa hoặc xóa bộ lọc.' : 'Chưa có bài được API trả về cho tài khoản của bạn. Chỉ admin có quyền xem toàn bộ mocktest.'}</p>{(search || status !== 'all') && <Button variant="secondary" onClick={() => { onSearch(''); setStatus('all'); }} className="mt-4">Xóa bộ lọc</Button>}</Card>}
    </section>
  </div>;
}