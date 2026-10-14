'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input } from '@/components/ui';
import { useLearningAccount } from '@/components/LearningGate';
import { FeedbackEditor, Homework } from '@/components/FeedbackWorkspace';
import { learningApi } from '@/lib/learning-api';
import { EXERCISE_TYPES } from '@/lib/learning-access';
import { RiTeamLine, RiArrowRightLine, RiMailLine, RiRefreshLine, RiSearchLine, RiFileTextLine, RiChatCheckLine, RiInformationLine, RiDashboardLine, RiBookOpenLine, RiCalendarCheckLine, RiMenuLine, RiCloseLine } from 'react-icons/ri';

export interface Student { id: string; name: string; email: string }
interface Page { students?: Student[]; student?: Student; homework?: Homework[]; nextCursor: string | null }

export function StudentTableRow({ student, onSelect }: { student: Student; onSelect: (student: Student) => void }) {
  const initials = student.name.trim().split(/\s+/).slice(-2).map(part => part.charAt(0)).join('').toUpperCase() || 'HV';
  return <tr className="directory-student-row">
    <th scope="row"><div className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="directory-avatar">{initials}</span>
      <div className="min-w-0"><h3 className="break-words text-base font-semibold leading-relaxed text-gray-900">{student.name || 'Học viên'}</h3><span className="mt-1 inline-block text-xs text-gray-500">Học viên PTE Intensive</span></div>
    </div></th>
    <td className="directory-email" data-label="Email"><span className="break-all">{student.email || 'Chưa có email'}</span></td>
    <td className="directory-row-action"><Button variant="secondary" onClick={() => onSelect(student)} aria-label={`Xem bài tập của ${student.name}`} className="directory-homework-action inline-flex items-center justify-center gap-2 text-sm">Xem bài tập <RiArrowRightLine aria-hidden="true" className="h-4 w-4" /></Button></td>
  </tr>;
}

function DirectorySidebar() {
  const account = useLearningAccount()!;
  const feedbackRoute = account.role === 'assistant' ? '/dashboard/assistant/feedback' : '/dashboard/teacher/feedback';
  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: RiDashboardLine },
    { href: '/dashboard/teacher/students', label: 'Danh sách học viên', icon: RiTeamLine },
    { href: '/dashboard/teacher/assignments', label: 'Bài tập', icon: RiBookOpenLine },
    { href: feedbackRoute, label: 'Feedback', icon: RiChatCheckLine },
    { href: '/dashboard/teacher/attendance-guide', label: 'Hướng dẫn chấm công', icon: RiCalendarCheckLine },
  ];
  return <aside className="directory-sidebar"><details open className="directory-sidebar-menu">
    <summary><RiMenuLine aria-hidden="true" className="h-5 w-5" /> Không gian học tập</summary>
    <div><p className="directory-sidebar-eyebrow">Không gian giảng dạy</p><nav aria-label="Điều hướng quản lý học viên" className="space-y-2">{links.map(link => <Link key={link.href} href={link.href} aria-current={link.href === '/dashboard/teacher/students' ? 'page' : undefined} className="directory-sidebar-link"><link.icon aria-hidden="true" className="h-5 w-5 shrink-0" /><span>{link.label}</span></Link>)}</nav>
    <p className="directory-sidebar-help"><RiInformationLine aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" /><span>Chọn học viên để xem bài tập. Quyền sửa nhận xét vẫn theo phân công của bạn.</span></p></div>
  </details></aside>;
}

export default function StudentDirectory() {
  const account = useLearningAccount();
  const allowed = !!account && ['admin', 'teacher', 'assistant'].includes(account.role);
  // Remount on account/permission changes so another account never inherits data.
  if (!allowed) return <p role="alert">Chỉ giáo viên, trợ giảng và admin được xem học viên.</p>;
  return <Directory key={`${account.id}:${account.role}:${account.assignedFeedbackTypes?.join(',')}`} />;
}

function Directory() {
  const [student, setStudent] = useState<Student | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [previous, setPrevious] = useState<(string | null)[]>([]);
  const [page, setPage] = useState<Page | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  const load = useCallback(async () => {
    const current = ++version.current;
    setLoading(true); setError(''); setPage(null);
    try {
      const params = new URLSearchParams();
      if (student) params.set('studentId', student.id);
      if (cursor) params.set('after', cursor);
      const result = await learningApi<Page>(`students?${params}`);
      if (version.current === current) setPage(result);
    } catch (err) { if (version.current === current) setError((err as Error).message); }
    finally { if (version.current === current) setLoading(false); }
  }, [student?.id, cursor]);
  useEffect(() => { void load(); return () => { version.current++; }; }, [load]);

  function navigate(next: Student | null) {
    version.current++; setPage(null); setLoading(true); setError('');
    setStudent(next); setCursor(null); setPrevious([]); setSearch(''); setType('');
  }
  function changePage(next: string | null) {
    version.current++; setPage(null); setLoading(true); setCursor(next);
  }
  const students = (page?.students || []).filter(item => `${item.name} ${item.email}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const rows = (page?.homework || []).flatMap(item => item.submissions.map(sub => ({ item, sub }))).filter(({ sub }) => !type || sub.type === type);
  const submissions = (page?.homework || []).flatMap(item => item.submissions);
  const stats = student ? [
    { label: 'Hồ sơ ngày đã tải', value: page?.homework?.length || 0, icon: RiFileTextLine },
    { label: 'Bài tập trong trang', value: submissions.length, icon: RiFileTextLine },
    { label: 'Bài đã có nhận xét', value: submissions.filter(sub => sub.feedback?.trim()).length, icon: RiChatCheckLine },
  ] : [
    { label: 'Học viên trong trang', value: page?.students?.length || 0, icon: RiTeamLine },
    { label: 'Phù hợp tìm kiếm', value: students.length, icon: RiSearchLine },
    { label: 'Trang đang xem', value: previous.length + 1, icon: RiFileTextLine },
  ];
  return <div className="student-directory directory-layout"><DirectorySidebar /><div className="directory-main min-w-0 space-y-6">
    {student && <Button variant="secondary" onClick={() => navigate(null)} className="text-sm">← Danh sách học viên</Button>}
    <header className="directory-hero relative overflow-hidden p-6">
      <div className="relative z-10 md:pr-40"><p className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Học tập <span aria-hidden="true" className="text-primary">/</span> Danh sách học viên</p>
      <h1 className="break-words text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{student ? `Bài tập của ${page?.student?.name || student.name}` : 'Danh sách học viên'}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">{student ? 'Theo dõi lịch sử bài nộp và phản hồi cho học viên. Bài tập được sắp xếp mới nhất trước; quyền sửa feedback vẫn theo phân công.' : 'Tìm học viên, xem lịch sử bài tập và theo dõi nhận xét trong một không gian thống nhất.'}</p>
      {student && <p className="mt-4 flex items-start gap-2 text-sm text-gray-600"><RiMailLine aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" /><span className="break-all">{page?.student?.email || student.email}</span></p>}</div>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 160 140" className="directory-illustration"><circle cx="85" cy="75" r="62" fill="var(--directory-peach)" opacity=".5" /><rect x="36" y="46" width="96" height="78" rx="12" fill="white" stroke="var(--directory-peach)" /><circle cx="62" cy="76" r="12" fill="var(--directory-peach)" /><path d="M46 102q16-24 32 0" fill="var(--primary-color)" /><path d="M89 75h27M89 86h20M48 113h65" stroke="var(--directory-peach)" strokeWidth="5" strokeLinecap="round" /><path d="m22 34 45-19 45 19-45 20Z" fill="var(--primary-color)" /><path d="M42 44v15q25 18 50 0V44" fill="var(--directory-peach)" /><path d="M112 34v30" stroke="var(--primary-color)" strokeWidth="3" /></svg>
    </header>
    <div aria-label="Thống kê trên trang hiện tại" className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
      {stats.map(stat => <Card key={stat.label} className="directory-surface flex items-center gap-4"><span className="directory-avatar"><stat.icon aria-hidden="true" className="h-5 w-5" /></span><div><p className="text-sm text-gray-600">{stat.label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{loading || error ? '—' : stat.value}</p></div></Card>)}
    </div>
    <Card className="directory-surface directory-search-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {student ? <label className="min-w-0 flex-1 text-sm font-medium text-gray-700">Dạng bài trong trang<select className="ui-input mt-2 block w-full" value={type} onChange={event => setType(event.target.value)}><option value="">Tất cả dạng bài</option>{EXERCISE_TYPES.map(value => <option key={value}>{value}</option>)}</select></label>
          : <label className="min-w-0 flex-1 text-sm font-medium text-gray-700">Tìm học viên trong trang<span className="relative mt-2 block"><RiSearchLine aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><Input type="search" className="block w-full pl-10 pr-12" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nhập tên hoặc email học viên..." aria-describedby="directory-filter-help" />{search && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setSearch('')} className="directory-clear-search absolute right-0 top-0 flex h-11 w-11 items-center justify-center"><RiCloseLine aria-hidden="true" className="h-5 w-5" /></button>}</span></label>}
        {type && <Button variant="secondary" onClick={() => setType('')} className="text-sm">Xóa bộ lọc</Button>}
        <Button variant="secondary" disabled={loading} onClick={load} className="inline-flex items-center justify-center gap-2 text-sm"><RiRefreshLine aria-hidden="true" className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} />Tải lại trang</Button>
      </div>
      <p id="directory-filter-help" className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-gray-500"><RiInformationLine aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>{student ? 'Tối đa 20 hồ sơ ngày mỗi trang. Thống kê tính trước bộ lọc. Xem được tất cả dạng bài; quyền sửa feedback vẫn theo phân công.' : '20 học viên mỗi trang. Chỉ tải bài tập khi bạn chọn học viên. Tìm kiếm theo tên hoặc email chỉ áp dụng trong trang hiện tại.'}</span></p>
    </Card>
    <section aria-labelledby="directory-results-title" aria-busy={loading} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="directory-results-title" className="text-lg font-semibold text-gray-900">{student ? 'Lịch sử bài tập' : 'Học viên'}</h2><p role="status" className="text-sm text-gray-500">{loading ? `Đang tải ${student ? 'bài tập' : 'học viên'}...` : error ? 'Chưa thể tải dữ liệu' : `${student ? rows.length : students.length} ${student ? 'bài tập' : 'học viên'} phù hợp trong trang`}</p></div>
      {error && <Card className="directory-surface"><h3 className="font-semibold text-gray-900">Không thể tải dữ liệu</h3><p role="alert" className="mt-2 break-words text-sm text-gray-600">{error}</p><Button variant="secondary" onClick={load} disabled={loading} className="mt-4">Thử lại</Button></Card>}
      {loading && <div aria-hidden="true" className="directory-loading directory-surface">{[0, 1, 2, 3, 4].map(key => <div key={key} className="flex items-center gap-4 border-b border-gray-100 p-4 motion-safe:animate-pulse"><div className="h-12 w-12 shrink-0 rounded-full bg-gray-100" /><div className="h-4 w-1/3 rounded bg-gray-100" /><div className="ml-auto h-10 w-28 rounded-xl bg-gray-50" /></div>)}</div>}
      {!loading && !error && !(student ? rows.length : students.length) && <Card className="directory-surface flex flex-col items-center py-8 text-center"><span className="directory-avatar mb-4"><RiSearchLine aria-hidden="true" className="h-6 w-6" /></span><h3 className="font-semibold text-gray-900">{student ? 'Không có bài tập phù hợp trong trang này.' : 'Không tìm thấy học viên phù hợp.'}</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">{search || type ? 'Thử xóa bộ lọc để xem lại dữ liệu trong trang.' : 'Bạn có thể tải lại hoặc chuyển trang nếu còn dữ liệu.'}</p>{(search || type) && <Button variant="secondary" onClick={() => { setSearch(''); setType(''); }} className="mt-4">Xóa bộ lọc</Button>}</Card>}
    {!loading && !error && !student && students.length > 0 && <div className="directory-table-container directory-surface">
      <table className="directory-table"><caption className="sr-only">Danh sách học viên trong trang hiện tại</caption><thead><tr><th scope="col">Học viên</th><th scope="col">Email</th><th scope="col" className="text-right">Thao tác</th></tr></thead><tbody>{students.map(item => <StudentTableRow key={item.id} student={item} onSelect={navigate} />)}</tbody></table>
    </div>}
    {!loading && !error && student && <div className="directory-homework space-y-4">
      {rows.map(({ item, sub }, index) => <FeedbackEditor key={`${item.id}:${sub.id || index}:${sub.feedbackAt || ''}`} homework={item} submission={sub} onSaved={saved => setPage(current => current ? {
        ...current, homework: current.homework?.map(doc => doc.id !== item.id ? doc : { ...doc, submissions: doc.submissions.map(original => original === sub ? saved : original) }),
      } : current)} />)}
    </div>}
    </section>
    <footer className="directory-pagination flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-gray-700">Trang {previous.length + 1}</p>{!loading && !error && page?.nextCursor && <p className="mt-1 text-xs text-gray-500">{student ? 'Còn lịch sử ở trang sau.' : 'Còn học viên ở trang sau.'}</p>}</div><nav className="flex flex-wrap items-center gap-3" aria-label="Phân trang">
      <Button variant="secondary" disabled={loading || !previous.length} onClick={() => { changePage(previous[previous.length - 1]); setPrevious(values => values.slice(0, -1)); }}>Trang trước</Button>
      <span aria-current="page" aria-label={`Trang hiện tại: ${previous.length + 1}`} className="directory-page-number">{previous.length + 1}</span>
      <Button variant="secondary" disabled={loading || !!error || !page?.nextCursor} onClick={() => { setPrevious(values => [...values, cursor]); changePage(page!.nextCursor); }}>Trang sau</Button>
    </nav></footer>
  </div></div>;
}