ưưimport { Assignment } from "./assignment";

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  type: string;
  date: string;
  link: string;
  notes?: string;
  status: 'submitted' | 'pending';
  feedback?: string;ưư
  questionNumber?: number;
}

export interface SubmissionFormData {
  type: string;
  date: string;
  link: string;
  notes?: string;
}

export interface AssignmentWithSubmission extends Assignment {
  submission?: AssignmentSubmission;
}

export interface DailySubmissionCount {
  date: string;
  count: number;
}
