// Base interface for exam tracking data
interface ExamTrackingMetadata {
  _createdBy?: string;
  _updatedBy?: string;
}

export interface ExamTrackingBase extends ExamTrackingMetadata {
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

export interface ExamTrackingInfo extends ExamTrackingBase {
  calendarEventId?: string;
}

export interface ExamTrackingWithCalendar extends ExamTrackingBase {
  calendarEventId?: string;
}

export interface ExamTrackingFormData {
  examLocation: string;
  examDate: string;
}

// Admin-specific interfaces
export interface AdminExamTrackingFormData extends ExamTrackingFormData {
  classId: string;
  studentId: string;
  name: string;
  email: string;
  target: string;
}

export interface ClassOption {
  id: string;
  name: string;
  teacherName: string;
}

export interface StudentOption {
  id: string;
  name: string;
  email: string;
  target?: string;
}

export interface ExamTrackingWithStudentInfo extends ExamTrackingInfo {
  classId?: string;
}
