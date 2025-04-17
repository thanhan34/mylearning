import { Timestamp } from 'firebase/firestore';

export interface Attendance {
  id: string;
  classId: string;
  date: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  students: AttendanceRecord[];
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface AttendanceStats {
  totalSessions: number;
  totalStudents: number;
  averageAttendance: number;
  byClass: {
    classId: string;
    className: string;
    attendanceRate: number;
  }[];
  byStudent: {
    studentId: string;
    studentName: string;
    attendanceRate: number;
    lateCount: number;
    absentCount: number;
  }[];
}
