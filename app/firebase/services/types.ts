import { Timestamp } from 'firebase/firestore';

export interface HomeworkSubmission {
  id?: string;
  date: string;
  email: string;
  links: string[];
  exists: boolean;
  timestamp?: Timestamp;
  type: string;
  questionNumber: number;
  link: string;
  feedback?: string;
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
  title: string;
  message: string;
  timestamp: Timestamp;
  teacher_id: string;
  read: boolean;
}

export interface DailyTarget {
  id: string;
  date: string;
  target: number;
  completed: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SubmissionWithId extends Omit<HomeworkSubmission, 'id'> {
  id: string;
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
