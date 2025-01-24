import { Timestamp } from "firebase/firestore";

export interface Mocktest {
  id: string;
  studentId: string;
  classId: string;
  link: string;
  submittedAt: Timestamp;
  feedback?: string;
  teacherId?: string;
}

export interface MocktestFormData {
  link: string;
  submittedAt: Date;
}

export interface FeedbackFormData {
  feedback: string;
}
