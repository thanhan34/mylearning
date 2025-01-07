export interface Assignment {
  id: string;
  title: string;
  instructions: string;
  attachments?: string[]; // URLs to attached files
  dueDate: string;
  createdAt: string;
  teacherId: string;
  targetType: 'class' | 'group' | 'individual';
  targetId: string; // classId, groupId, or studentId
  status: 'active' | 'completed' | 'expired';
  notificationSent: boolean;
}

export interface AssignmentFormData {
  title: string;
  instructions: string;
  attachments?: File[];
  dueDate: string;
  targetType: Assignment['targetType'];
  targetId: string;
}
