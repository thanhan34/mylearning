export interface User {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student' | 'assistant';
  createdAt: string;
  teacherId?: string; // ID of assigned teacher (for students)
  classId?: string; // ID of class the student belongs to (for students)
  assignedStudents?: string[]; // Array of student IDs (for teachers)
  supportingTeacherId?: string; // ID of teacher being supported (for assistants)
  assignedClassIds?: string[]; // Array of class IDs assigned to assistant
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
