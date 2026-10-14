'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { useLearningAccount } from '@/components/LearningGate';
import { cachedRequest, invalidateCache } from '@/lib/client-cache';
import { learningApi } from '@/lib/learning-api';
import AttendanceRangeStats from '@/components/AttendanceRangeStats';
import { vietnamDate } from '@/lib/attendance-audit';
import type { AuditStaff, AuditStaffPage, AuditDayPage, AuditHomework, AuditDetailPage, FeedbackTiming } from '@/lib/attendance-audit';

const TTL = 60000;
const labels: Record<FeedbackTiming, string> = {
  within: 'Đúng người, trong hạn (tạm tính)', late: 'Quá hạn tính công', missing: 'Chưa có feedback',
  other: 'Feedback của người khác', unknown: 'Thiếu/sai thông tin xác minh',
};
const formatTime = (value: string) => Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Không rõ';
function safeLink(text: string): string | null {
  const value = text.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  if (!value) return null;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

function useAuditPage<T>(path: string | null, refresh: number) {
  const actor = useLearningAccount();
  const allowed = !!actor && ['admin', 'admin_support'].includes(actor.role);
  const key = allowed && path ? `attendance:${actor.id}:${actor.role}:${path}` : '';
  const [state, setState] = useState<{ key: string; data?: T; error?: string; loading: boolean }>({ key: '', loading: false });
  useEffect(() => {
    if (!key || !path) return;
    let active = true;
    setState({ key, loading: true });
    void cachedRequest<T>(key, TTL, () => learningApi<T>(path)).then(data => {
      if (active) setState({ key, data, loading: false });
    }).catch(error => {
      if (active) setState({ key, error: error instanceof Error ? error.message : 'Không thể tải dữ liệu.', loading: false });
    });
    return () => { active = false; };
  }, [key, path, refresh]);
  return state.key === key ? state : { key, loading: !!key };
}

export default function AttendanceAudit() {
  const actor = useLearningAccount();
  const [staffCursors, setStaffCursors] = useState<(string | null)[]>([null]);
  const [selected, setSelected] = useState<AuditStaff | null>(null);
  const [dateInput, setDateInput] = useState(vietnamDate);
  const [date, setDate] = useState('');
  const [dayCursors, setDayCursors] = useState<(string | null)[]>([null]);
  const [detail, setDetail] = useState<{ homework: AuditHomework; type: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(false), TTL); return () => clearTimeout(timer); }, [cooldown]);
  const staffAfter = staffCursors[staffCursors.length - 1];
  const staffResult = useAuditPage<AuditStaffPage>(`attendance?mode=staff${staffAfter ? `&after=${encodeURIComponent(staffAfter)}` : ''}`, refresh);
  const dayAfter = dayCursors[dayCursors.length - 1];
  const dayParams = new URLSearchParams({ mode: 'day', staffId: selected?.id || '', date });
  if (dayAfter) dayParams.set('after', dayAfter);
  const day = useAuditPage<AuditDayPage>(selected && date ? `attendance?${dayParams}` : null, refresh);
  if (!actor || !['admin', 'admin_support'].includes(actor.role)) return <Card>Bạn không có quyền xem đối soát chấm công.</Card>;

  function reload() {
    invalidateCache(`attendance:${actor!.id}:`);
    setDetail(null); setStaffCursors([null]); setDayCursors([null]); setRefresh(value => value + 1); setCooldown(true);
  }
  return <div className="space-y-6">
    <header className="space-y-3">
      <h2 className="text-2xl font-bold text-primary">Chi tiết feedback & đối soát chấm công</h2>
      <p className="text-gray-700">Dữ liệu đọc từ hồ sơ bài nộp, không phải bảng công đã chốt. Chọn nhân sự và ngày để xem; chỉ tải chi tiết bài khi bạn mở.</p>
    </header>
    <Card className="space-y-3">
      <p className="font-semibold text-gray-900">Đối soát tạm tính — chưa xác nhận ngày công</p>
      <p className="text-sm text-gray-700">Sử dụng phân công hiện tại và phiên bản feedback gần nhất. Chưa có lịch sử phân công, sửa feedback hoặc bản chốt công để chứng minh quyền phụ trách trong quá khứ. Không suy ra công cả ngày từ một trang hồ sơ; không cộng dồn các trang thành kết quả chốt.</p>
      <p className="text-sm text-gray-600">10 nhân sự/trang · 5 hồ sơ/ngày/trang · 20 bài/trang chi tiết. Cache tối đa 60 giây, không realtime, không tự tải cả kỳ.</p>
      <Button variant="secondary" disabled={cooldown || staffResult.loading || day.loading} onClick={reload}>{cooldown ? 'Đợi 60 giây trước lần làm mới tiếp theo' : 'Làm mới dữ liệu'}</Button>
    </Card>
    <Card className="space-y-4">
      <h3 className="font-semibold text-gray-900">1. Chọn giáo viên / trợ giảng</h3>
      {staffResult.loading && <p role="status">Đang tải nhân sự...</p>}
      {staffResult.error && <p role="alert" className="text-gray-800">{staffResult.error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">{staffResult.data?.staff.map(staff => <Button key={staff.id} variant={selected?.id === staff.id ? 'primary' : 'secondary'} aria-pressed={selected?.id === staff.id} onClick={() => {
        setSelected(staff); setDate(''); setDayCursors([null]); setDetail(null);
      }}>{staff.name} · {staff.role === 'teacher' ? 'Giáo viên' : 'Trợ giảng'}</Button>)}</div>
      {staffResult.data?.staff.length === 0 && <p>Không có nhân sự trong trang này.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={staffResult.loading || staffCursors.length === 1} onClick={() => setStaffCursors(values => values.slice(0, -1))}>Nhân sự trước</Button>
        <span className="text-sm text-gray-600">Trang {staffCursors.length}</span>
        <Button variant="secondary" disabled={staffResult.loading || !staffResult.data?.nextCursor} onClick={() => setStaffCursors(values => [...values, staffResult.data!.nextCursor])}>Nhân sự sau</Button>
      </div>
    </Card>
    {selected && <AttendanceRangeStats key={`${actor.id}:${selected.id}:${refresh}`} staff={selected} />}
    {selected && <Card className="space-y-4">
      <h3 className="font-semibold text-gray-900">2. Kiểm tra ngày nộp bài · {selected.name}</h3>
      <p className="text-sm text-gray-600">Dạng bài được giao hiện tại: {(day.data?.staff.assignedFeedbackTypes || selected.assignedFeedbackTypes).join(', ') || 'Chưa phân công'}.</p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
        event.preventDefault(); setDate(dateInput); setDayCursors([null]); setDetail(null);
      }}>
        <label className="text-sm text-gray-700">Ngày nộp bài (giờ Việt Nam)<Input required type="date" max={vietnamDate()} value={dateInput} onChange={event => setDateInput(event.target.value)} className="mt-2 block" /></label>
        <Button type="submit" disabled={day.loading || !dateInput}>Xem ngày</Button>
      </form>
    </Card>}
    {day.loading && <p role="status">Đang tải hồ sơ trong ngày...</p>}
    {day.error && <Card role="alert">{day.error}</Card>}
    {day.data && <div className="space-y-4">
      <Card className="space-y-2">
        <h3 className="font-semibold text-gray-900">Ngày {date} · {day.data.staff.name}</h3>
        <p className="text-sm text-gray-700">Kỳ {day.data.window.start} – {day.data.window.end}. Hạn bù: hết {day.data.window.deadlineDate} (giờ Việt Nam).</p>
        <p className="text-sm text-gray-600">Dữ liệu tải lúc {formatTime(day.data.fetchedAt)}. Trang này có {day.data.homework.length} hồ sơ, không phải tổng số học viên trong ngày.</p>
      </Card>
      {day.data.homework.length === 0 && <Card>Không có hồ sơ phù hợp hoặc nhân sự chưa được phân công dạng bài. Không tự phát sinh ngày công.</Card>}
      {day.data.homework.map(homework => <Card key={homework.id} className="space-y-4">
        <h3 className="font-semibold text-gray-900">{homework.student}</h3>
        {homework.groups.length === 0 ? <p className="text-sm text-gray-600">Không có bài thuộc dạng được giao trong hồ sơ này. Có thể còn hồ sơ ở trang sau.</p> : homework.groups.map(group => <div key={group.type} className="space-y-3 rounded-lg border border-primary-light p-4">
          <div className="flex flex-wrap justify-between gap-3"><h4 className="font-semibold text-gray-900">{group.type}</h4><span className="text-sm font-medium text-gray-800">{group.within >= group.minimum ? 'Đủ số lượng trong hồ sơ (tạm tính)' : group.unknown ? 'Cần kiểm tra thông tin thiếu' : 'Chưa đủ số lượng trong hồ sơ'}</span></div>
          <p className="text-sm text-gray-700">{group.total} bài · cần ít nhất {group.minimum} · đúng người/trong hạn: {group.within} ({Math.round(group.within / group.total * 100)}%) · còn thiếu so với ngưỡng: {Math.max(0, group.minimum - group.within)}.</p>
          <p className="text-sm text-gray-600">Trễ: {group.late} · người khác: {group.other} · thiếu thông tin: {group.unknown} · chưa feedback: {group.missing}.</p>
          <Button variant="secondary" onClick={() => setDetail({ homework, type: group.type })}>Xem từng bài · {homework.student} · {group.type}</Button>
          {detail?.homework.id === homework.id && detail.type === group.type && <AuditDetails key={`${homework.id}:${group.type}:${homework.version}`} staffId={selected!.id} date={date} homework={homework} type={group.type} refresh={refresh} onClose={() => setDetail(null)} />}
        </div>)}
      </Card>)}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={day.loading || dayCursors.length === 1} onClick={() => { setDetail(null); setDayCursors(values => values.slice(0, -1)); }}>Hồ sơ trước</Button>
        <span className="text-sm text-gray-600">Trang hồ sơ {dayCursors.length}</span>
        <Button variant="secondary" disabled={day.loading || !day.data.nextCursor} onClick={() => { setDetail(null); setDayCursors(values => [...values, day.data!.nextCursor]); }}>Hồ sơ sau</Button>
      </div>
    </div>}
  </div>;
}

function AuditDetails({ staffId, date, homework, type, refresh, onClose }: {
  staffId: string; date: string; homework: AuditHomework; type: string; refresh: number; onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const params = new URLSearchParams({ mode: 'detail', staffId, date, documentId: homework.id, type, page: String(page), version: homework.version });
  const result = useAuditPage<AuditDetailPage>(`attendance?${params}`, refresh);
  return <section aria-label={`Chi tiết ${type} của ${homework.student}`} className="space-y-4 border-t border-primary-light pt-4">
    <Button variant="secondary" onClick={onClose}>Đóng chi tiết</Button>
    {result.loading && <p role="status">Đang tải tối đa 20 bài...</p>}
    {result.error && <p role="alert">{result.error}</p>}
    {result.data && <>
      <p className="text-sm text-gray-600">Trang {page + 1} · {result.data.total} bài trong hồ sơ/dạng bài này · tải lúc {formatTime(result.data.fetchedAt)}.</p>
      {result.data.submissions.map((sub, index) => {
        const link = safeLink(sub.link);
        return <article key={`${sub.id}:${index}`} className="space-y-3 rounded-lg border border-primary-light bg-white p-4">
          <h5 className="font-semibold text-gray-900">{sub.type} · Bài #{sub.questionNumber}</h5>
          <p className="text-sm font-medium text-primary">{labels[sub.timing]}</p>
          {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="ui-button inline-flex items-center text-primary underline">Mở bài nộp ↗</a> : <p className="break-words text-sm text-gray-600">Link bài không hợp lệ.</p>}
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">{sub.feedback || 'Chưa có nội dung feedback.'}</p>
          <p className="text-sm text-gray-600">Người feedback: {sub.feedbackByName || sub.feedbackBy || 'Không rõ'} · Vai trò: {sub.feedbackByRole || 'Không rõ'}.</p>
          <p className="text-sm text-gray-600">Thời điểm lưu feedback gần nhất: {sub.feedbackAt ? formatTime(sub.feedbackAt) : 'Không rõ'} (giờ Việt Nam).</p>
        </article>;
      })}
    </>}
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" disabled={result.loading || page === 0} onClick={() => setPage(value => value - 1)}>Bài trước</Button>
      <Button variant="secondary" disabled={result.loading || !result.data?.hasNext} onClick={() => setPage(value => value + 1)}>Bài sau</Button>
    </div>
  </section>;
}