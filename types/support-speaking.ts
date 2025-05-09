import { Timestamp } from 'firebase/firestore';

export interface SupportClass {
  id: string;
  name: string;
  teacherId: string;
  description: string;
  schedule: string;
  students: SupportClassStudent[];
  createdAt: string;
}

export interface SupportClassStudent {
  id: string;
  name: string;
  email: string;
  regularClassId: string; // Reference to their main class
}

export interface SupportAttendance {
  id: string;
  supportClassId: string;
  date: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  students: SupportAttendanceRecord[];
}

export interface SupportAttendanceRecord {
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface SupportEvaluation {
  id: string;
  studentId: string;
  studentName: string;
  supportClassId: string;
  date: string;
  attendanceRate: number;
  homeworkCompletionRate: number;
  progressImproved: boolean;
  responsibility: 'teacher' | 'student' | 'inconclusive';
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
