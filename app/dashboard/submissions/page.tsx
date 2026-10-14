'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useLearningAccount } from '@/components/LearningGate';
import { Button, Card } from '@/components/ui';
import { getHomeworkSubmissions } from '@/app/firebase/services/homework';
import { getHomeworkProgress } from '@/app/firebase/services/progress';
import type { HomeworkSubmission } from '@/app/firebase/services/types';
import SubmissionsCalendar from '../components/SubmissionsCalendar';
import SubmissionsList from '../components/SubmissionsList';

export default function SubmissionsPage() {
  const account = useLearningAccount();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [submissionDates, setSubmissionDates] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ userId: string; date: string; submissions: HomeworkSubmission[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!account || account.role !== 'student') return;
    let cancelled = false;
    setSubmissionDates({});
    getHomeworkProgress(account.id, 45).then(progress => {
      if (!cancelled) setSubmissionDates(Object.fromEntries(progress.map(item => [item.date, item.completed])));
    }).catch(error => console.error('Error loading submission calendar:', error));
    return () => { cancelled = true; };
  }, [account?.id, account?.role, retry]);

  useEffect(() => {
    if (!account || account.role !== 'student') return;
    let cancelled = false;
    setLoading(true);
    setError('');
    getHomeworkSubmissions(account.id, selectedDate).then(submissions => {
      if (!cancelled) {
        setResult({ userId: account.id, date: selectedDate, submissions });
        setSubmissionDates(current => ({ ...current, [selectedDate]: submissions.filter(item => item.link?.trim()).length }));
      }
    }).catch(() => {
      if (!cancelled) setError('Không thể tải bài đã nộp. Vui lòng thử lại.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [account?.id, account?.role, selectedDate, retry]);

  if (!account) return <p role="status" className="p-6 text-gray-600">Đang tải...</p>;
  if (account.role !== 'student') return <p className="p-6 text-gray-600">Trang này dành cho học viên.</p>;

  const currentResult = result?.userId === account.id && result.date === selectedDate ? result : null;
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">Nộp bài tập</h1>
            <p className="mt-2 text-sm text-gray-700">Chọn ngày để xem bài đã nộp và feedback. Lịch đánh dấu bài nộp trong 45 ngày gần đây.</p>
          </div>
          <Link href="/dashboard/submit" className="ui-button shrink-0 bg-primary text-center text-white hover:bg-primary-vivid">Nộp bài mới</Link>
        </header>
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="max-w-full shrink-0 overflow-x-auto">
            <SubmissionsCalendar selectedDate={selectedDate} submissionDates={submissionDates} onDateChange={setSelectedDate} />
          </div>
          <div className="min-w-0 flex-1">
            {error ? <div role="alert" className="space-y-3 text-gray-700">
              <p>{error}</p><Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Thử lại</Button>
            </div> : loading || !currentResult ? <p role="status" className="py-6 text-gray-600">Đang tải bài đã nộp...</p> : (
              <SubmissionsList key={`${account.id}:${selectedDate}`} selectedDate={selectedDate} submissionDates={submissionDates} submissions={currentResult.submissions} />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}