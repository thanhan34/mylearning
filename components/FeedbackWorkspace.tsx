'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input } from '@/components/ui';
import { useLearningAccount } from '@/components/LearningGate';
import { canEditFeedback, EXERCISE_TYPES } from '@/lib/learning-access';
import { learningApi } from '@/lib/learning-api';
import { parseHomeworkLinks } from '@/lib/homework-links';
import { vietnamDate } from '@/lib/attendance-audit';
import type { HomeworkSubmission } from '@/app/firebase/services/types';
import { RiArrowRightUpLine, RiChatCheckLine, RiFileTextLine, RiTimeLine, RiRefreshLine, RiFilterLine, RiTeamLine, RiBookOpenLine, RiArrowRightLine, RiInformationLine } from 'react-icons/ri';

export interface Homework { id: string; userId: string; userName: string; date: string; submissions: HomeworkSubmission[] }
export default function FeedbackWorkspace() {
  const account = useLearningAccount();
  if (!account) return null;
  return <FeedbackWorkspaceContent key={`${account.id}:${account.role}:${account.assignedFeedbackTypes?.join(',')}`} />;
}

function FeedbackWorkspaceContent() {
  const account = useLearningAccount()!;
  const canViewAllTypes = ['admin', 'admin_support', 'student'].includes(account.role);
  const types = canViewAllTypes ? [...EXERCISE_TYPES] : account.assignedFeedbackTypes || [];
  const [homework, setHomework] = useState<Homework[]>([]);
  const [date, setDate] = useState(vietnamDate);
  const [endDate, setEndDate] = useState(date);
  const canFilterDateRange = ['admin', 'admin_support', 'teacher', 'assistant'].includes(account.role);
  const invalidRange = canFilterDateRange && (!date || !endDate || date > endDate);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<(string | null)[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState(() => account.role === 'student' ? '' :
    account.assignedFeedbackTypes?.find(value => types.includes(value)) || types[0] || '');
  const [status, setStatus] = useState(account.role === 'student' ? '' : 'pending');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!account || !date || invalidRange) {
      setHomework([]); setNextCursor(null); setTruncated(false); setLoading(false); setError('');
      return;
    }
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams(canFilterDateRange ? { startDate: date, endDate, paged: '1' } : { date, paged: '1' });
      if (cursor) params.set('after', cursor);
      const result = await learningApi<{ homework: Homework[]; truncated: boolean; nextCursor: string | null }>(`homework?${params}`);
      if (version !== requestVersion.current) return;
      setHomework(result.homework); setTruncated(result.truncated); setNextCursor(result.nextCursor);
    } catch (err) { if (version === requestVersion.current) { setHomework([]); setNextCursor(null); setTruncated(false); setError((err as Error).message); } }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [date, endDate, canFilterDateRange, invalidRange, cursor, account?.id, account?.role, account?.assignedFeedbackTypes?.join(',')]);
  useEffect(() => { void load(); return () => { requestVersion.current++; }; }, [load]);
  function changeDate(value: string, end = false) {
    requestVersion.current++;
    if (end) setEndDate(value); else setDate(value);
    setCursor(null); setPreviousCursors([]); setNextCursor(null);
    setHomework([]); setTruncated(false); setError('');
  }
  function onSaved(documentId: string, original: HomeworkSubmission, saved: HomeworkSubmission) {
    setHomework(items => items.map(item => item.id !== documentId ? item : {
      ...item, submissions: item.submissions.map(sub =>
        (original.id ? sub.id === original.id : sub.type === original.type && sub.questionNumber === original.questionNumber) ? saved : sub),
    }));
  }
  if (!account) return null;
  const rows = homework.flatMap(item => item.submissions.map(sub => ({ item, sub }))).filter(({ item, sub }) =>
    `${item.userName} ${item.userId}`.toLowerCase().includes(search.toLowerCase()) && (!type || sub.type === type) &&
    (!status || (status === 'done' ? !!sub.feedback?.trim() : !sub.feedback?.trim())));
  if (account.role === 'student') {
    const submissions = homework.flatMap(item => item.submissions);
    const reviewed = submissions.filter(sub => sub.feedback?.trim()).length;
    const stats = [
      { label: 'Bài đã nộp', value: submissions.length, icon: RiFileTextLine, detail: 'Bài luyện tập trong trang này', emphasis: false },
      { label: 'Đã có nhận xét', value: reviewed, icon: RiChatCheckLine, detail: 'Sẵn sàng để đọc và luyện lại', emphasis: true },
      { label: 'Chờ phản hồi', value: submissions.length - reviewed, icon: RiTimeLine, detail: 'Bài chưa có nhận xét từ giáo viên', emphasis: false },
    ];
    return <div className="student-feedback space-y-6 py-4 sm:py-6">
      <header className="feedback-hero grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
        <div className="relative min-w-0">
          <p className="feedback-eyebrow mb-4"><span className="feedback-brand-mark" aria-hidden="true"><RiChatCheckLine className="h-4 w-4" /></span> Góc học tập <span className="text-gray-300" aria-hidden="true">/</span> PTE Intensive</p>
          <h1 className="max-w-xl text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">Bài nộp & feedback <span className="feedback-title-accent">của bạn</span></h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-gray-600 sm:text-base">Mỗi nhận xét là một bước tiến. Xem lại bài đã nộp, hiểu điều cần cải thiện và tự tin hơn trong lần luyện tập tiếp theo.</p>
        </div>
        <div className="feedback-journey relative min-w-0">
          <p className="feedback-eyebrow">Vòng lặp tiến bộ</p>
          <ol aria-label="Hành trình luyện tập" className="feedback-journey-steps mt-5">
            {[{ label: 'Nộp bài', icon: RiFileTextLine }, { label: 'Nhận góp ý', icon: RiChatCheckLine }, { label: 'Luyện lại', icon: RiRefreshLine }].map((step, index) => <li key={step.label} className="min-w-0"><span className="feedback-journey-node" data-highlight={index === 1 ? 'true' : undefined}><step.icon aria-hidden="true" className="h-5 w-5" /></span><span className="mt-3 block text-xs font-medium text-gray-700">{step.label}</span></li>)}
          </ol>
          <Link href="/dashboard/submissions" className="ui-button feedback-primary-action mt-6 inline-flex w-full items-center justify-between gap-3 text-sm font-semibold">Nộp bài tập <RiArrowRightUpLine aria-hidden="true" className="h-5 w-5" /></Link>
        </div>
      </header>

      <section aria-label="Thống kê bài nộp trên trang hiện tại">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold text-gray-900">Tổng quan bài luyện tập</h2><span className="feedback-eyebrow">Trang {previousCursors.length + 1}</span></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {stats.map(stat => <Card key={stat.label} className="feedback-surface feedback-stat flex flex-col gap-4" data-emphasis={stat.emphasis ? 'true' : undefined}>
            <div className="flex w-full items-center justify-between gap-3"><p className="text-sm font-medium text-gray-600">{stat.label}</p><span className="feedback-icon"><stat.icon aria-hidden="true" className="h-5 w-5" /></span></div>
            <div><p className="feedback-stat-number text-3xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-4xl">{loading || error || !date ? '—' : stat.value}</p><p className="mt-2 text-xs leading-relaxed text-gray-500">{stat.detail}</p></div>
          </Card>)}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">Thống kê theo ngày nộp trên trang hiện tại, trước khi lọc dạng bài và trạng thái. Mỗi trang tối đa 20 hồ sơ.</p>
      </section>

      <div className="feedback-content-grid">
       <Card className="feedback-surface feedback-filters">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900"><RiFilterLine aria-hidden="true" className="h-5 w-5 text-primary" /> Tìm nhận xét của bạn</h2>
        <p className="mb-6 text-xs leading-6 text-gray-500">Chọn ngày và dạng bài để tập trung vào những nhận xét bạn cần.</p>
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.3fr_1fr_auto]">
          <label className="min-w-0 text-sm font-medium text-gray-700">Ngày nộp<Input type="date" required className="mt-2 block w-full min-w-0" value={date} onChange={e => changeDate(e.target.value)} /></label>
          <label className="min-w-0 text-sm font-medium text-gray-700">Dạng bài<select className="ui-input mt-2 block w-full" value={type} onChange={e => setType(e.target.value)}><option value="">Tất cả dạng bài</option>{types.map(t => <option key={t}>{t}</option>)}</select></label>
          <label className="min-w-0 text-sm font-medium text-gray-700">Trạng thái<select className="ui-input mt-2 block w-full" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="pending">Chờ phản hồi</option><option value="done">Đã có nhận xét</option></select></label>
          <Button variant="secondary" disabled={loading || !date} onClick={load} className="inline-flex items-center justify-center gap-2"><RiRefreshLine aria-hidden="true" className="h-4 w-4" /> Tải lại</Button>
        </div>
        {(type || status) && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4"><p className="text-xs text-gray-500">Bộ lọc áp dụng cho các bài trên trang hiện tại.</p><Button variant="secondary" onClick={() => { setType(''); setStatus(''); }} className="text-sm">Xóa bộ lọc</Button></div>}
        {(type || status) && <Button variant="secondary" className="mt-4 w-full text-sm" onClick={() => { setType(''); setStatus(''); }}>Xóa bộ lọc dạng bài & trạng thái</Button>}
       </Card>

      <section aria-labelledby="student-feedback-results" aria-busy={loading} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="student-feedback-results" className="text-lg font-semibold text-gray-900">Nhận xét bài tập</h2>
          <p role="status" className="text-sm text-gray-500">{loading ? 'Đang tải bài tập...' : error || !date ? 'Chưa có kết quả' : `${rows.length} bài tập phù hợp`}</p>
        </div>
        {error ? <Card className="feedback-surface"><p role="alert" className="text-sm text-gray-700">{error}</p><Button variant="secondary" className="mt-4" onClick={load} disabled={loading}>Thử lại</Button></Card>
          : !date ? <Card className="feedback-surface text-center"><p className="font-semibold text-gray-900">Chọn ngày nộp bài</p><p className="mt-2 text-sm text-gray-600">Chọn một ngày để xem bài tập và nhận xét tương ứng.</p></Card>
          : loading ? <div aria-hidden="true" className="space-y-4">{[0, 1].map(key => <Card key={key} className="feedback-surface space-y-4 motion-safe:animate-pulse"><div className="h-5 w-1/3 rounded bg-gray-100" /><div className="h-20 rounded-xl bg-gray-50" /><div className="h-4 w-1/2 rounded bg-gray-100" /></Card>)}</div>
          : !rows.length ? <Card className="feedback-surface flex flex-col items-center py-8 text-center"><span className="feedback-icon mb-4"><RiFileTextLine aria-hidden="true" className="h-6 w-6" /></span><h3 className="font-semibold text-gray-900">{submissions.length ? 'Không có bài phù hợp với bộ lọc' : 'Chưa có bài tập trên trang này'}</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">{submissions.length ? 'Thử chọn dạng bài hoặc trạng thái khác để xem thêm nhận xét.' : 'Hãy kiểm tra ngày nộp bài hoặc chuyển sang trang tiếp theo nếu có.'}</p><Link href="/dashboard/submissions" className="ui-button mt-4 border border-primary-light text-gray-700 hover:bg-primary-light/30">Đi đến bài nộp</Link></Card>
          : rows.map(({ item, sub }) => <FeedbackEditor key={`${item.id}:${sub.id || `${sub.type}:${sub.questionNumber}`}:${sub.feedbackAt || ''}`} homework={item} submission={sub} onSaved={saved => onSaved(item.id, sub, saved)} />)}
      </section>
      </div>
      <footer className="feedback-pagination flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-medium text-gray-700">Trang {previousCursors.length + 1}</p>{truncated && !error && <p className="mt-1 text-xs text-gray-500">Còn bài nộp ở trang tiếp theo.</p>}</div>
        <nav aria-label="Phân trang feedback" className="flex gap-3"><Button variant="secondary" disabled={loading || !date || !previousCursors.length} onClick={() => { setCursor(previousCursors[previousCursors.length - 1]); setPreviousCursors(values => values.slice(0, -1)); }}>Trang trước</Button><Button variant="secondary" disabled={loading || !date || !!error || !nextCursor} onClick={() => { setPreviousCursors(values => [...values, cursor]); setCursor(nextCursor); }}>Trang sau</Button></nav>
      </footer>
    </div>;
  }
  const teachingStaff = ['teacher', 'assistant'].includes(account.role);
  const submissions = homework.flatMap(item => item.submissions);
  const reviewed = submissions.filter(sub => sub.feedback?.trim()).length;
  const stats = [
    { label: 'Học viên có bài nộp', value: new Set(homework.filter(item => item.submissions.length).map(item => item.userId)).size, icon: RiTeamLine },
    { label: 'Bài tập đã tải', value: submissions.length, icon: RiFileTextLine },
    { label: 'Chưa có feedback', value: submissions.length - reviewed, icon: RiTimeLine },
    { label: 'Đã có feedback', value: reviewed, icon: RiChatCheckLine },
  ];
  return <div className={`teacher-workspace space-y-6 py-4 sm:py-6 ${['teacher', 'assistant'].includes(account.role) ? 'staff-workspace' : ''}`}>
    <header className="teacher-workspace-hero p-6 sm:p-8">
      <div className={teachingStaff ? 'staff-hero-content' : undefined}>
      {['teacher', 'assistant'].includes(account.role) && <span className="staff-workspace-badge"><RiTeamLine aria-hidden="true" className="h-4 w-4 text-primary" />{account.role === 'teacher' ? 'Giảng viên' : 'Trợ giảng'}</span>}
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"><RiBookOpenLine aria-hidden="true" className="h-4 w-4 text-primary" /> Không gian giảng dạy · PTE Intensive</p>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{teachingStaff ? 'Tổng quan giảng dạy' : 'Feedback theo dạng bài'}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">{teachingStaff ? `Xin chào${account.name ? `, ${account.name}` : ''}. Theo dõi bài nộp, ưu tiên bài chưa có nhận xét và phản hồi cho học viên trong phạm vi được phân công.` : 'Theo dõi và quản lý nhận xét bài tập theo học viên, thời gian và dạng bài.'}</p>
      {teachingStaff && <div className="staff-hero-actions mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link href="/dashboard/teacher/students" className="ui-button inline-flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-vivid"><RiTeamLine aria-hidden="true" className="h-4 w-4" /> Danh sách học viên <RiArrowRightLine aria-hidden="true" className="h-4 w-4" /></Link>
        {['teacher', 'assistant'].includes(account.role) && <Link href="/dashboard/teacher/attendance-guide" className="ui-button inline-flex items-center justify-center gap-2 border border-primary-light bg-white text-sm text-gray-700 hover:bg-primary-light/30"><RiBookOpenLine aria-hidden="true" className="h-4 w-4" /> Hướng dẫn feedback & nguyên tắc chấm công →</Link>}
      </div>}
      </div>
      {teachingStaff && <svg aria-hidden="true" focusable="false" viewBox="0 0 240 180" className="staff-hero-illustration">
        <circle cx="126" cy="90" r="78" fill="var(--staff-peach)" opacity=".5" />
        <rect x="32" y="32" width="174" height="118" rx="16" fill="white" stroke="var(--staff-border)" />
        <rect x="48" y="48" width="76" height="8" rx="4" fill="var(--staff-peach)" />
        <rect x="48" y="72" width="42" height="58" rx="8" fill="var(--staff-muted-surface)" />
        <path d="m56 93 8 8 18-20" fill="none" stroke="var(--primary-color)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M105 78h81M105 95h58M105 112h69" stroke="var(--staff-peach)" strokeWidth="7" strokeLinecap="round" />
        <rect x="156" y="126" width="62" height="38" rx="12" fill="var(--primary-color)" />
        <path d="M172 141h30M172 150h19" stroke="white" strokeWidth="4" strokeLinecap="round" />
      </svg>}
    </header>

    <section aria-label="Thống kê bài tập trong trang hiện tại">
      {teachingStaff && <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold text-gray-900">Tổng quan bài tập</h2><span className="text-xs text-gray-500">Dữ liệu trong trang hiện tại</span></div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(stat => <Card key={stat.label} className="teacher-workspace-surface staff-workspace-stat flex items-center gap-3"><span className="teacher-workspace-icon"><stat.icon aria-hidden="true" className="h-5 w-5" /></span><div><p className="text-xs font-medium text-gray-600">{stat.label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{loading || error || invalidRange ? '—' : stat.value}</p></div></Card>)}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">Thống kê theo khoảng ngày đã chọn, trong trang hiện tại và trước bộ lọc. Không phải tổng toàn hệ thống hay kết quả chấm công.</p>
    </section>

    {teachingStaff && <Card className="teacher-workspace-surface staff-workspace-assignment">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-sm font-semibold text-gray-900">Dạng bài được phân công</h2><p className="mt-1 text-xs text-gray-500">Quyền sửa nhận xét được kiểm tra trên từng bài nộp.</p></div><span className="teacher-workspace-chip">{types.length} dạng bài</span></div>
      {!!types.length && <div className="mt-4 flex flex-wrap gap-2">{types.map(value => <span key={value} className="teacher-workspace-chip">{value}</span>)}</div>}
      {!types.length && <p role="status" className="mt-4 text-sm text-gray-600">Bạn chưa được admin phân công dạng bài. Vui lòng liên hệ admin.</p>}
    </Card>}

    <Card className="teacher-workspace-surface staff-filter-panel">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900"><RiFilterLine aria-hidden="true" className="h-5 w-5 text-primary" /> Bộ lọc bài tập</h2>
      {teachingStaff && <div role="group" aria-label="Lọc nhanh trạng thái feedback" className="staff-status-tabs mb-5 flex flex-wrap gap-2">{[{ value: '', label: 'Tất cả feedback' }, { value: 'pending', label: 'Chờ feedback' }, { value: 'done', label: 'Đã có feedback' }].map(tab => <Button key={tab.value} variant={status === tab.value ? 'primary' : 'secondary'} aria-pressed={status === tab.value} onClick={() => setStatus(tab.value)} className="text-sm">{tab.label}</Button>)}</div>}
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="min-w-0 text-sm font-medium text-gray-700">Học viên<Input type="search" className="mt-2 block w-full" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên học viên" /></label>
        <label className="min-w-0 text-sm font-medium text-gray-700">{canFilterDateRange ? 'Ngày nộp từ ngày' : 'Ngày nộp'}<Input type="date" required className="mt-2 block w-full min-w-0" value={date} max={canFilterDateRange ? endDate || undefined : undefined} aria-invalid={invalidRange || undefined} aria-describedby={invalidRange ? 'feedback-date-error' : undefined} onChange={e => changeDate(e.target.value)} /></label>
        {canFilterDateRange && <label className="min-w-0 text-sm font-medium text-gray-700">Đến ngày<Input type="date" required className="mt-2 block w-full min-w-0" value={endDate} min={date || undefined} aria-invalid={invalidRange || undefined} aria-describedby={invalidRange ? 'feedback-date-error' : undefined} onChange={e => changeDate(e.target.value, true)} /></label>}
        <label className="min-w-0 text-sm font-medium text-gray-700">Dạng bài<select className="ui-input mt-2 block w-full" value={type} onChange={e => setType(e.target.value)}><option value="">Tất cả dạng được giao</option>{types.map(t => <option key={t}>{t}</option>)}</select></label>
        <label className="min-w-0 text-sm font-medium text-gray-700">Feedback văn bản<select className="ui-input mt-2 block w-full" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option><option value="pending">Chưa có</option><option value="done">Đã có</option></select></label>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={loading || invalidRange || !date} onClick={load} className="inline-flex items-center justify-center gap-2 text-sm"><RiRefreshLine aria-hidden="true" className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} /> Tải lại</Button>{(search || type || status) && <Button variant="secondary" className="text-sm" onClick={() => { setSearch(''); setType(''); setStatus(''); }}>Xóa bộ lọc</Button>}</div>
      </div>
      <p className="mt-4 flex items-start gap-2 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500"><RiInformationLine aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> Tối đa 20 hồ sơ mỗi trang. Bộ lọc học viên, dạng bài và trạng thái áp dụng trong trang hiện tại. Ngày nộp theo giờ Việt Nam.</p>
      {invalidRange && <p id="feedback-date-error" role="alert" className="mt-4 text-sm text-red-600">Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc. Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>}
    </Card>

    <section aria-labelledby="teacher-feedback-results" aria-busy={loading} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="teacher-feedback-results" className="text-lg font-semibold text-gray-900">Bài tập cần theo dõi</h2><p role="status" className="text-sm text-gray-500">{loading ? 'Đang tải bài tập...' : error || invalidRange ? 'Chưa có kết quả' : `${rows.length} bài tập phù hợp`}</p></div>
      {error ? <Card className="teacher-workspace-surface"><h3 className="font-semibold text-gray-900">Không thể tải bài tập</h3><p role="alert" className="mt-2 break-words text-sm text-gray-600">{error}</p><Button variant="secondary" disabled={loading || invalidRange} onClick={load} className="mt-4">Thử lại</Button></Card>
        : invalidRange ? <Card className="teacher-workspace-surface text-center"><p className="text-sm text-gray-600">Chọn khoảng ngày hợp lệ để xem bài tập.</p></Card>
        : loading ? <div aria-hidden="true" className="space-y-4">{[0, 1].map(key => <Card key={key} className="teacher-workspace-surface space-y-4 motion-safe:animate-pulse"><div className="h-5 w-1/3 rounded bg-gray-100" /><div className="h-24 rounded-xl bg-gray-50" /></Card>)}</div>
        : !rows.length ? <Card className="teacher-workspace-surface flex flex-col items-center py-8 text-center"><span className="teacher-workspace-icon mb-4"><RiFileTextLine aria-hidden="true" className="h-6 w-6" /></span><h3 className="font-semibold text-gray-900">Không có bài tập phù hợp trong trang này</h3><p className="mt-2 max-w-lg text-sm leading-relaxed text-gray-600">Thử thay đổi khoảng ngày hoặc bộ lọc. Nếu còn hồ sơ ở trang sau, hãy chuyển trang để tiếp tục kiểm tra.</p></Card>
        : rows.map(({ item, sub }) => <FeedbackEditor key={`${item.id}:${sub.id || `${sub.type}:${sub.questionNumber}`}:${sub.feedbackAt || ''}`} homework={item} submission={sub} onSaved={saved => onSaved(item.id, sub, saved)} />)}
    </section>
    <footer className="staff-workspace-pagination flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-medium text-gray-700">Trang {previousCursors.length + 1}</p>{truncated && !error && !invalidRange && <p className="mt-1 max-w-lg text-xs leading-relaxed text-gray-500">Còn hồ sơ ở trang tiếp theo, kể cả khi trang này không có dạng bài được phân công.</p>}</div>
      <nav aria-label="Phân trang bài tập giáo viên" className="flex gap-3"><Button variant="secondary" disabled={loading || invalidRange || !previousCursors.length} onClick={() => { setCursor(previousCursors[previousCursors.length - 1]); setPreviousCursors(values => values.slice(0, -1)); }}>Trang trước</Button><Button variant="secondary" disabled={loading || invalidRange || !!error || !nextCursor} onClick={() => { setPreviousCursors(values => [...values, cursor]); setCursor(nextCursor); }}>Trang sau</Button></nav>
    </footer>
  </div>;
}

export function FeedbackEditor({ homework, submission, onSaved }: { homework: Homework; submission: HomeworkSubmission; onSaved: (saved: HomeworkSubmission) => void }) {
  const account = useLearningAccount()!;
  const [text, setText] = useState(submission.feedback || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const editable = canEditFeedback(account, submission);
  const link = parseHomeworkLinks(submission.link)[0];
  async function save() {
    setBusy(true); setMessage('');
    try {
      const result = await learningApi<{ submission: HomeworkSubmission }>('feedback', { method: 'POST', body: JSON.stringify({ documentId: homework.id,
        submissionId: submission.id, type: submission.type, questionNumber: submission.questionNumber,
        feedback: text, expectedFeedback: submission.feedback || '' }) });
      onSaved(result.submission);
    } catch (err) { setMessage((err as Error).message); }
    finally { setBusy(false); }
  }
  if (account.role === 'student') {
    const hasFeedback = !!submission.feedback?.trim();
    const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(homework.date) ? homework.date.split('-').reverse().join('/') : homework.date;
    return <Card className="feedback-surface feedback-entry" data-feedback-status={hasFeedback ? 'reviewed' : 'pending'}>
      <article className="space-y-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3"><span className="feedback-icon"><RiFileTextLine aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0"><h3 className="break-words text-base font-semibold text-gray-900">{submission.type} <span className="text-gray-500">#{submission.questionNumber}</span></h3><p className="mt-1 text-xs text-gray-500">Nộp ngày <time dateTime={homework.date}>{displayDate}</time></p></div></div>
          <span className={`feedback-status ${hasFeedback ? 'feedback-status-done' : ''}`}>{hasFeedback ? <RiChatCheckLine aria-hidden="true" /> : <RiTimeLine aria-hidden="true" />}{hasFeedback ? 'Đã có nhận xét' : 'Chờ phản hồi'}</span>
        </header>
        <div className={`feedback-comment ${hasFeedback ? '' : 'feedback-comment-pending'}`}>
          <h4 className="text-sm font-semibold text-gray-900">{hasFeedback ? 'Nhận xét từ giáo viên' : 'Bài nộp đang chờ nhận xét'}</h4>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">{hasFeedback ? submission.feedback : 'Bạn có thể quay lại trang này để xem nhận xét khi giáo viên phản hồi.'}</p>
        </div>
        <footer className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 break-words text-xs text-gray-500">{hasFeedback ? submission.feedbackByName ? `Người nhận xét: ${submission.feedbackByName}` : 'Nhận xét cho bài tập của bạn' : 'Luyện tập đều đặn để tiến bộ mỗi ngày.'}</p>
          {link?.url && !link.error ? <a href={link.url} target="_blank" rel="noopener noreferrer" className="ui-button inline-flex shrink-0 items-center justify-center gap-2 border border-primary-light text-sm text-gray-700 hover:bg-primary-light/30">Xem bài đã nộp <RiArrowRightUpLine aria-hidden="true" className="h-4 w-4" /><span className="sr-only"> (mở trong tab mới)</span></a> : <p className="text-xs text-gray-500">Liên kết bài nộp không hợp lệ. Vui lòng kiểm tra lại bài đã nộp.</p>}
        </footer>
      </article>
    </Card>;
  }
  return <Card className="staff-feedback-card space-y-4">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><h3 className="break-words font-semibold text-gray-900">{homework.userName}</h3><p className="mt-1 text-xs text-gray-500">Ngày nộp: {homework.date} · {submission.type} #{submission.questionNumber}</p></div><span className="teacher-workspace-chip" data-status={submission.feedback?.trim() ? 'reviewed' : 'pending'}>{submission.feedback?.trim() ? 'Đã có feedback' : 'Chờ feedback'}</span></div>
    {link?.url && !link.error ? <a className="ui-button inline-flex max-w-full items-center gap-2 border border-primary-light text-sm text-gray-700 hover:bg-primary-light/30" href={link.url} target="_blank" rel="noopener noreferrer"><span className="break-all">{link.title || 'Mở bài nộp APEUni'}</span><RiArrowRightUpLine aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="sr-only"> (mở trong tab mới)</span></a> : <p className="break-words text-gray-700">{submission.link}</p>}
    <label className="block text-sm font-medium text-gray-700">Feedback<textarea className="ui-input mt-2 block w-full" rows={5} maxLength={20000} value={text} placeholder="Nhận xét lỗi cần sửa, cách cải thiện và lưu ý cho bài tiếp theo…" disabled={!editable || busy} onChange={e => setText(e.target.value)} /></label>
    {submission.feedbackByName && <p className="text-sm text-gray-600">Người feedback: {submission.feedbackByName}</p>}
    {!editable && <p className="text-sm text-gray-600">Chế độ chỉ xem. Sửa feedback cần đúng dạng bài được phân công và là người viết feedback hiện có, hoặc là admin.</p>}
    <p role="status" className="text-sm text-gray-700">{message}</p>
    {editable && <Button disabled={busy || text === (submission.feedback || '')} onClick={save}>{busy ? 'Đang lưu...' : 'Lưu feedback'}</Button>}
  </Card>;
}