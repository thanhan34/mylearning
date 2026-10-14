'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getHomeworkSubmissions, saveHomeworkSubmission, getUserByEmail } from '../../firebase/services';
import { sendHomeworkNotification } from '../../firebase/services/discord';
import { isApproved } from '@/lib/learning-access';
import { Button, Card, Input } from '@/components/ui';
import { homeworkLinkKey, parseHomeworkLinks } from '@/lib/homework-links';
import type { HomeworkSubmission } from '../../firebase/services/types';
import type { User } from '../../firebase/services/user';

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function SubmitPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(today);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [message, setMessage] = useState('');
  const parsed = useMemo(() => parseHomeworkLinks(text), [text]);
  const invalid = parsed.some(item => item.error);
  const unique = useMemo(() => {
    const seen = new Set<string>();
    return parsed.filter(item => {
      if (!item.type || item.error) return false;
      const key = homeworkLinkKey(item.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [parsed]);
  const duplicates = parsed.filter(item => !item.error).length - unique.length;

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current || invalid || !unique.length || !session?.user?.email) return;
    savingRef.current = true;
    setSaving(true);
    setMessage('');
    try {
      const user = await getUserByEmail(session.user.email) as User | null;
      if (!user) throw new Error('User not found');
      if (!isApproved(user)) throw new Error('Tài khoản đang chờ admin duyệt.');
      const existing = await getHomeworkSubmissions(user.id, selectedDate, true);
      const seen = new Set(existing.filter(item => item.link).map(item => homeworkLinkKey(item.link)));
      const numbers: Record<string, number> = {};
      existing.forEach(item => {
        numbers[item.type] = Math.max(numbers[item.type] || 0, item.questionNumber);
      });
      const additions: HomeworkSubmission[] = [];
      unique.forEach(item => {
        const key = homeworkLinkKey(item.url);
        if (seen.has(key) || !item.type) return;
        seen.add(key);
        numbers[item.type] = (numbers[item.type] || 0) + 1;
        additions.push({ id: crypto.randomUUID(), type: item.type,
          questionNumber: numbers[item.type], link: item.title ? `${item.title} ${item.url}` : item.url, date: selectedDate });
      });
      if (!additions.length) {
        setMessage('Tất cả link này đã được nộp trong ngày đã chọn. Không tạo bài trùng.');
        return;
      }
      const name = session.user.name || user.name || session.user.email;
      const success = await saveHomeworkSubmission(user.id, additions, name);
      if (!success) throw new Error('Failed to save submissions');
      setText('');
      setMessage(`Đã nộp ${additions.length} bài. Các bài cũ và feedback được giữ nguyên.${unique.length > additions.length ? ` Bỏ qua ${unique.length - additions.length} link đã nộp.` : ''}`);
      await Promise.allSettled(Array.from(new Set(additions.map(item => item.type))).map(type => {
        const links = additions.filter(item => item.type === type).map(item => item.link);
        return sendHomeworkNotification(name, type, selectedDate, links, links.length);
      }));
      router.refresh();
    } catch (error) {
      console.error('Error saving submissions:', error);
      setMessage('Không thể nộp bài. Nội dung đã dán được giữ lại, vui lòng thử lại.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (status !== 'authenticated') return <p className="p-6 text-gray-600">Đang tải...</p>;

  return (
    <div className="min-h-screen bg-white px-4 py-6 sm:px-6">
      <Card className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Nộp bài mới</h1>
          <Button variant="secondary" disabled={saving} onClick={() => router.push('/dashboard/submissions')}>Quay lại</Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="submission-date" className="mb-2 block font-medium text-gray-700">Ngày nộp bài</label>
            <Input id="submission-date" type="date" required value={selectedDate} disabled={saving}
              onChange={event => { setSelectedDate(event.target.value); setMessage(''); }} />
          </div>
          <div>
            <label htmlFor="homework-links" className="mb-2 block font-medium text-gray-700">Dán link bài tập</label>
            <p id="homework-help" className="mb-3 text-sm text-gray-600">
              Copy link hoặc toàn bộ nội dung chia sẻ từ APEUni rồi dán vào đây. Có thể dán nhiều dạng bài cùng lúc, mỗi link là một bài riêng. Hệ thống tự nhận diện, không cần chọn dạng bài.
            </p>
            <textarea id="homework-links" rows={8} className="ui-input w-full resize-y" disabled={saving}
              aria-describedby="homework-help" aria-invalid={invalid} value={text}
              placeholder={'Dán link APEUni tại đây, mỗi link một dòng.\nBạn cũng có thể dán nội dung chia sẻ RA#..., RS#..., DI#... kèm link.'}
              onChange={event => { setText(event.target.value); setMessage(''); }} />
          </div>
          {parsed.length > 0 && (
            <section aria-label="Kết quả nhận diện" className="space-y-3">
              <h2 className="font-semibold text-gray-900">Đã nhận diện {unique.length} bài</h2>
              {duplicates > 0 && <p className="text-sm text-gray-600">Có {duplicates} link trùng, mỗi link chỉ được nộp một lần.</p>}
              <ul className="max-h-96 space-y-3 overflow-y-auto">
                {parsed.map((item, index) => (
                  <li key={`${index}-${item.url}`} className="rounded-lg border border-primary-light p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-600">Bài {index + 1}</span>
                      <span className="rounded-full bg-primary-light px-3 py-1 text-sm font-medium text-gray-900">{item.type || 'Chưa nhận diện'}</span>
                    </div>
                    {item.type && !item.error ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="block break-words text-primary hover:text-primary-vivid hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        {item.title || `${item.type} — chưa có nội dung chia sẻ`}
                      </a>
                    ) : <p className="break-all text-sm text-gray-600">{item.url}</p>}
                    {item.error && <p className="mt-2 text-sm text-red-600">{item.error}</p>}
                  </li>
                ))}
              </ul>
              {invalid && <p role="alert" className="text-sm text-red-600">Vui lòng sửa hoặc xóa các link chưa hợp lệ trước khi nộp.</p>}
            </section>
          )}
          <p role="status" aria-live="polite" className="text-sm text-gray-700">{message}</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-600">Bài nộp thêm không thay thế bài và feedback cũ.</p>
            <Button type="submit" disabled={saving || invalid || !unique.length}>{saving ? 'Đang nộp...' : `Nộp ${unique.length || ''} bài`}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}