'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Input } from './ui';
import { useLearningAccount } from './LearningGate';
import { learningApi } from '@/lib/learning-api';
import StudentMocktests, { type MocktestRecord } from './StudentMocktests';
import TeacherMocktests from './TeacherMocktests';
import { usePathname } from 'next/navigation';

type RecordItem = MocktestRecord;
export default function StudentRecords({ kind }: { kind: 'mocktests' }) {
  const account = useLearningAccount()!;
  // Remount all request/form state on identity or role changes; never share data/drafts.
  return <AccountStudentRecords key={`${account.id}:${account.role}:${kind}`} kind={kind} />;
}
function AccountStudentRecords({ kind }: { kind: 'mocktests' }) {
  const account = useLearningAccount()!;
  const pathname = usePathname();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const saving = useRef(false);
  const active = useRef(true);
  const load = useCallback(async (afterSubmission = false) => {
    if ((saving.current && afterSubmission !== true) || !active.current) return false;
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const result = await learningApi<{ records: RecordItem[]; students: { id: string; name: string }[] }>(`records?kind=${kind}`);
      if (version !== requestVersion.current) return false;
      setRecords(result.records); setStudents(result.students);
      return true;
    } catch (err) {
      if (version === requestVersion.current) setError((err as Error).message);
      return false;
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [kind, account.id, account.role]);
  useEffect(() => { active.current = true; setRecords([]); setStudents([]); void load(); return () => { active.current = false; requestVersion.current++; }; }, [load]);
  async function save(extra: { id?: string; feedback?: FormDataEntryValue | null; expectedVersion?: string; link?: string }) {
    if (saving.current || !active.current) return;
    saving.current = true;
    const version = ++requestVersion.current;
    setLoading(false);
    setBusy(true); setMessage('');
    try {
      const result = await learningApi<{ success: boolean; record?: RecordItem }>('records', { method: 'POST', body: JSON.stringify({ kind, ...extra }) });
      if (!active.current || version !== requestVersion.current) return;
      if (extra.id) {
        if (!result.success || !result.record || result.record.id !== extra.id) throw new Error('Chưa nhận được Mocktest đã xác nhận. Bấm Tải lại để kiểm tra.');
        const record = result.record;
        setRecords(items => items.map(item => item.id === record.id ? record : item));
        setMessage('Đã lưu thành công.');
        return;
      }
      setText('');
      // Submission keeps the existing server-selected limit/order by refreshing.
      const refreshed = await load(true);
      if (active.current) setMessage(refreshed ? 'Đã lưu thành công.' : 'Đã lưu bài, nhưng chưa tải lại được danh sách. Bấm Tải lại, không cần gửi lại bài.');
    }
    catch (err) { if (active.current && version === requestVersion.current) setMessage((err as Error).message); }
    finally { saving.current = false; if (active.current) setBusy(false); }
  }
  const canCreate = account.role === 'student';
  if (canCreate) return <StudentMocktests records={records} loading={loading} busy={busy} error={error} message={message} text={text} onTextChange={setText} onSubmit={link => save({ link })} onReload={() => load()} />;
  if (pathname === '/dashboard/mocktest/teacher' && ['teacher', 'assistant'].includes(account.role)) return <TeacherMocktests records={records} students={students} search={search} onSearch={setSearch} loading={loading} busy={busy} error={error} onReload={() => load()} />;
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold text-primary">Mocktest theo học viên</h1>
    <p className="text-gray-600">Mocktest tổng hợp không thuộc một dạng bài riêng; admin phụ trách feedback. Dữ liệu cũ được giữ nguyên.</p>
    <Input placeholder="Tìm học viên" aria-label="Tìm học viên" value={search} onChange={e => setSearch(e.target.value)} />
    {canCreate && <Card><form className="space-y-4" onSubmit={e => { e.preventDefault(); void save({ link: text }); }}>
      <label className="block text-gray-700">Link mocktest<Input className="mt-2 block w-full" type="url" required value={text} maxLength={20000} onChange={e => setText(e.target.value)} /></label>
      <Button disabled={busy} type="submit">Lưu</Button>
    </form></Card>}
    <p role="status" className="text-gray-700">{message}</p>
    {error && <p role="alert" className="text-gray-700">{error}</p>}
    {loading && <p role="status" className="text-gray-600">Đang tải Mocktest...</p>}
    <Button variant="secondary" disabled={busy || loading} onClick={() => load()}>Tải lại</Button>
    {records.filter(r => `${r.studentName || students.find(s => s.id === r.studentId)?.name || ''} ${r.studentId}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (b.date || b.submittedAt || '').localeCompare(a.date || a.submittedAt || '')).map(record => <Card key={record.id} className="space-y-3">
      <h2 className="font-semibold text-gray-900">{record.studentName || students.find(s => s.id === record.studentId)?.name || record.studentId}</h2>
      <p className="text-sm text-gray-600">{record.date || record.submittedAt?.slice(0, 10)}</p>
      {record.link && /^https?:\/\//i.test(record.link) && <a href={record.link} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">Mở mocktest</a>}
      <p className="whitespace-pre-wrap text-gray-800">{record.feedback || ''}</p>
      {account.role === 'admin' && <form onSubmit={e => { e.preventDefault(); void save({ id: record.id, expectedVersion: record.recordVersion, feedback: new FormData(e.currentTarget).get('feedback') }); }} className="space-y-3"><textarea key={record.recordVersion || record.feedback} aria-label="Feedback mocktest" name="feedback" maxLength={20000} defaultValue={record.feedback || ''} className="ui-input w-full" /><Button type="submit" disabled={busy}>Lưu feedback</Button></form>}
    </Card>)}
    {!loading && !error && !records.length && <p className="text-gray-600">Chưa có dữ liệu.</p>}
  </div>;
}