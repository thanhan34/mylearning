export interface Student {
  id: string;
  name: string;
  learningGoals: string;
  type: 'one-on-one';
  assignmentStatus: {
    completed: number;
    total: number;
  };
  averageScore: number;
}

export interface Assignment {
  id: string;
  studentId: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed';
  score?: number;
  feedback?: string;
  createdAt: string;
}

export interface SessionNote {
  id: string;
  studentId: string;
  content: string;
  date: string;
  teacherId: string;
}

export interface Progress {
  studentId: string;
  completedAssignments: number;
  totalAssignments: number;
  averageScore: number;
  lastSessionDate: string;
  nextSessionDate?: string;
}
