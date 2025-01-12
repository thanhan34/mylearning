export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  role: 'student' | 'teacher' | 'admin';
  classId?: string; // For students
  target?: string; // For students' target
}

export interface ClassInfo {
  id: string;
  name: string;
  teacherName: string;
  schedule: string;
  description?: string;
}

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  avatar?: string;
}
