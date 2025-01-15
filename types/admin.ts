export interface User {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  createdAt: string;
  teacherId?: string; // ID of assigned teacher (for students)
  assignedStudents?: string[]; // Array of student IDs (for teachers)
}

export interface ClassStudent {
  id: string;
  name: string;
  email: string;
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
}

export interface SystemStats {
  totalClasses: number;
  totalAssignments: number;
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  completionRate: number;
}
