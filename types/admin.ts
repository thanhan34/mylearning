export interface User {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  createdAt: string;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  description: string;
  schedule: string;
  studentCount: number;
  createdAt: string;
}

export interface SystemStats {
  totalClasses: number;
  totalAssignments: number;
  totalUsers: number;
  completionRate: number;
}
