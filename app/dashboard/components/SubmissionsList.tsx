'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { HomeworkSubmission } from '@/app/firebase/services/types';
import { getUserByEmail } from '@/app/firebase/services/user';
import { updateStudentHomeworkLink } from '@/app/firebase/services/homework';
import { convertUrlsToLinks } from '@/app/utils/textFormatting';
import { parseHomeworkLinks } from '@/lib/homework-links';
import { Button, Card } from '@/components/ui';

interface SubmissionsListProps {
  selectedDate: string;
  submissionDates: { [key: string]: number };
  submissions: HomeworkSubmission[];
}

export default function SubmissionsList({ selectedDate, submissions }: SubmissionsListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [localSubmissions, setLocalSubmissions] = useState(submissions);
  const [editing, setEditing] = useState<HomeworkSubmission | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const dateRef = useRef(selectedDate);
  dateRef.current = selectedDate;

  useEffect(() => { setLocalSubmissions(submissions); }, [submissions, selectedDate]);
  useEffect(() => { setEditing(null); setError(''); }, [selectedDate]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || savingRef.current || !session?.user?.email) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    const original = editing;
    const date = selectedDate;
    try {
      const user = await getUserByEmail(session.user.email);
      if (!user) throw new Error('Không tìm thấy tài khoản học viên.');
      const link = await updateStudentHomeworkLink(user.id, original, draft);
      if (dateRef.current === date) {
        setLocalSubmissions(current => current.map(item =>
          (original.id ? item.id === original.id : item.type === original.type && item.questionNumber === original.questionNumber)
            ? { ...item, link } : item));
        setEditing(null);
      }
      router.refresh();
    } catch (err) {
      console.error('Error editing homework:', err);
      if (dateRef.current === date) setError(err instanceof Error && !('code' in err)
        ? err.message : 'Không thể lưu bài. Vui lòng kiểm tra quyền truy cập hoặc thử lại.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!selectedDate) return null;
  const visible = localSubmissions.filter(item => item.link && item.date === selectedDate);
  if (!visible.length) return <p className="py-6 text-center text-gray-500">Không có bài tập nào cho ngày này</p>;
  const groups = visible.reduce<Record<string, HomeworkSubmission[]>>((result, item) => {
    (result[item.type] ||= []).push(item);
    return result;
  }, {});

  return (
    <div className="min-w-0 flex-1 space-y-4">
      {Object.entries(groups).map(([type, items]) => (
        <Card key={type} className="submission-group">
          <h4 className="bg-primary-light px-4 py-3 text-lg font-medium text-primary sm:px-6 sm:text-2xl">{type}</h4>
          <div className="px-4 pb-6 sm:px-6">
            {items.sort((a, b) => a.questionNumber - b.questionNumber).map(submission => {
              const parsed = parseHomeworkLinks(submission.link)[0];
              const title = parsed?.title || submission.link.split(/https?:\/\//i)[0].trim() || `${submission.type} — thiếu nội dung chia sẻ`;
              const href = parsed?.url.startsWith('https://') || parsed?.url.startsWith('http://') ? parsed.url : undefined;
              const isEditing = editing?.type === submission.type && editing?.questionNumber === submission.questionNumber;
              return (
                <div key={submission.id || `${type}_${submission.questionNumber}`} className="border-b border-gray-100 py-6 sm:py-8">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base sm:text-xl">
                    <span className="shrink-0 font-medium text-black">Câu {submission.questionNumber}</span>
                    {href ? <a href={href} target="_blank" rel="noopener noreferrer"
                      className="min-w-0 break-words text-primary transition-colors hover:text-primary-vivid hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      {title}
                    </a> : <span className="break-words text-gray-600">{title}</span>}
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3 pl-3 sm:pl-6">
                    <div className="min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-gray-700 sm:text-xl">
                      <span className="text-primary">Feedback: </span>
                      {submission.feedback?.trim() ? convertUrlsToLinks(submission.feedback) : 'Chưa có nhận xét'}
                    </div>
                    <button type="button" disabled={saving} aria-label={`Edit câu ${submission.questionNumber} ${type}`}
                      className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg px-2 text-primary transition-all hover:-translate-y-0.5 hover:bg-primary-light active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
                      onClick={() => { setEditing(submission); setDraft(submission.link); setError(''); }}>Edit</button>
                  </div>
                  {isEditing && (
                    <form onSubmit={save} className="mt-4 space-y-3 rounded-lg bg-primary-light/20 p-4">
                      <label htmlFor="edit-homework-link" className="block text-sm font-medium text-gray-700">Link hoặc nội dung chia sẻ bài tập</label>
                      <textarea autoFocus id="edit-homework-link" className="ui-input w-full" rows={4} required disabled={saving}
                        value={draft} onChange={event => setDraft(event.target.value)} aria-describedby="edit-homework-help" />
                      <p id="edit-homework-help" className="text-sm text-gray-600">Dán một bài cùng dạng. Feedback của giáo viên được giữ nguyên.</p>
                      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" disabled={saving} onClick={() => setEditing(null)}>Hủy</Button>
                        <Button type="submit" disabled={saving || !draft.trim()}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}