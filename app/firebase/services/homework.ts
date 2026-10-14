import { learningApi } from '@/lib/learning-api';
import { collection, getDocs, query, where, orderBy, limit } from '@/app/firebase/firestore';
import { cachedRequest } from '@/lib/client-cache';
import { db } from '../config';

import { HomeworkSubmission } from './types';

// Update only the student's link while preserving the latest teacher feedback.
export async function updateStudentHomeworkLink(userId: string, original: HomeworkSubmission, text: string): Promise<string> {
  const result = await learningApi<{ link: string }>('homework', { method: 'PATCH', body: JSON.stringify({
    ...original, originalLink: original.link, link: text,
  }) });
  return result.link;
}

export async function getHomeworkSubmissions(userId: string, date?: string, throwOnError = false): Promise<HomeworkSubmission[]> {
  try {
    const constraints = [where('userId', '==', userId), ...(date ? [where('date', '==', date)] : [orderBy('date', 'desc')])];
    return await cachedRequest(`homework:submissions:${userId}:${date || 'latest'}`, 120000, async () => {
      const snapshot = await getDocs(query(collection(db, 'homework'), ...constraints, limit(1)));
      return snapshot.docs[0]?.data().submissions || [];
    });
  } catch (error) {
    if (throwOnError) throw error;
    console.error('Error getting homework:', error);
    return [];
  }
}

export async function saveHomeworkSubmission(userId: string, submissions: HomeworkSubmission[], userName: string): Promise<boolean> {
  await learningApi('homework', { method: 'POST', body: JSON.stringify({ date: submissions[0]?.date, submissions }) });
  return true;
}

export async function updateHomeworkFeedback(documentId: string, submissionType: string, questionNumber: number, feedback: string, feedbackBy?: string, feedbackByName?: string): Promise<boolean> {
  await learningApi('feedback', { method: 'POST', body: JSON.stringify({ documentId, type: submissionType, questionNumber, feedback }) });
  return true;
}

// Legacy callers must resolve one exact student, never an ambiguous partial-name match.
export async function updateHomeworkFeedbackByName(studentName: string, date: string, submissionType: string, questionNumber: number, feedback: string, feedbackBy?: string, feedbackByName?: string): Promise<boolean> {
  const result = await learningApi<{ homework: { id: string; userName: string }[] }>(`homework?date=${encodeURIComponent(date)}`);
  const matches = result.homework.filter(item => item.userName === studentName);
  if (matches.length !== 1) throw new Error('Vui lòng mở bài từ danh sách học viên để xác định đúng tài khoản.');
  return updateHomeworkFeedback(matches[0].id, submissionType, questionNumber, feedback);
}

export async function getStudentWeeklyStatus(_classId: string, weekStart = new Date()): Promise<Record<string, Record<string, boolean>>> {
  const monday = new Date(weekStart);
  monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1);
  monday.setHours(0, 0, 0, 0);
  const result = await learningApi<{ homework: { userId: string; date: string }[] }>('homework');
  const status: Record<string, Record<string, boolean>> = {};
  result.homework.forEach(item => {
    const day = Math.floor((new Date(`${item.date}T00:00:00`).getTime() - monday.getTime()) / 86400000);
    if (day >= 0 && day < 7) { status[item.userId] ||= {}; status[item.userId][day] = true; }
  });
  return status;
}
