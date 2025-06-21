export interface Assignment {
  id: string;
  title: string;
  instructions: string;
  attachments?: string[]; // URLs to attached files
  dueDate: string;
  createdAt: string;
  assignedBy: string; // teacherId or assistantId
  assignedByName: string;
  assignedByRole: 'teacher' | 'assistant';
  targetType: 'class' | 'individual';
  targetId: string; // classId or studentId
  targetStudents: string[]; // Array of student IDs who should complete this assignment
  status: 'active' | 'completed' | 'expired';
  notificationSent: boolean;
  submissions: AssignmentSubmission[];
}

export interface AssignmentSubmission {
  studentId: string;
  studentName: string;
  submittedAt: string;
  content: string;
  attachments?: string[];
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedByName?: string;
  gradedAt?: string;
  status: 'submitted' | 'graded' | 'late';
}

export interface AssignmentFormData {
  title: string;
  instructions: string;
  attachments?: File[];
  dueDate: string;
  targetType: Assignment['targetType'];
  targetId: string;
  targetStudents?: string[]; // For individual assignments
}

export interface CreateAssignmentData {
  title: string;
  instructions: string;
  attachments?: string[];
  dueDate: string;
  assignedBy: string;
  assignedByName: string;
  assignedByRole: 'teacher' | 'assistant';
  targetType: 'class' | 'individual';
  targetId: string;
  targetStudents: string[];
}
