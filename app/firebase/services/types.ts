import { Timestamp } from 'firebase/firestore';

export interface HomeworkSubmission {
  id?: string;
  type: string;
  questionNumber: number;
  link: string;
  date: string;
  feedback?: string;
  feedbackBy?: string; // ID của người cho feedback
  feedbackByName?: string; // Tên của người cho feedback
  feedbackByRole?: string; // Vai trò của người cho feedback (teacher, assistant, admin)
  feedbackAt?: string; // Thời gian cho feedback
}

export interface SubmissionWithId extends HomeworkSubmission {
  uniqueId: string;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  description: string;
  schedule: string;
  studentCount: number;
  students: ClassStudent[];
  createdAt: string;
  announcements: any[];
}

export interface ClassStudent {
  id: string;
  name: string;
  email: string;
}

export interface Notification {
  id: string;
  message: string;
  created_at: Timestamp;
  teacher_id?: string;
  admin_id?: string;
  is_read: boolean;
}

export interface DailyTarget {
  id: string;
  date: string;
  target: number;
  completed: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateClassInput {
  name: string;
  teacherId: string;
  description: string;
  schedule: string;
  studentCount: number;
  students: ClassStudent[];
  createdAt: string;
  announcements: any[];
}
