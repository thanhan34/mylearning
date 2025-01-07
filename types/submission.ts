import { Assignment } from "./assignment";

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  link: string;
  notes?: string;
  status: 'submitted' | 'pending';
}

export interface SubmissionFormData {
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
