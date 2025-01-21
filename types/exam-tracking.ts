export interface ExamTrackingInfo {
  id?: string;
  studentId: string;
  examLocation: string;
  examDate: string;
  createdAt: string;
  updatedAt: string;
  // User data
  name: string;
  email: string;
  target?: string;
  // Class data
  className?: string;
  teacherName?: string;
}

export interface ExamTrackingFormData {
  examLocation: string;
  examDate: string;
}
