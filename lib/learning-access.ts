export const EXERCISE_TYPES = [
  'Read aloud', 'Repeat sentence', 'Describe image', 'Retell lecture',
  'Summarize Written Text', 'Write Essay', 'Summarize Spoken Text',
  'Summarize Group Discussion', 'Respond to a situation',
] as const;

export interface LearningAccount {
  id: string;
  email: string;
  name?: string;
  role: string;
  approvalStatus?: 'pending' | 'approved';
  assignedFeedbackTypes?: string[];
  classId?: string;
  teacherId?: string;
}

// Explicit status always wins; preserve access for existing enrolled students.
export function isApproved(account: LearningAccount): boolean {
  if (account.role !== 'student') return ['admin', 'admin_support', 'teacher', 'assistant'].includes(account.role);
  if (account.approvalStatus !== undefined) return account.approvalStatus === 'approved';
  return !!(account.classId || account.teacherId);
}

export function canFeedback(account: LearningAccount, type: string): boolean {
  return account.role === 'admin' || (
    ['teacher', 'assistant'].includes(account.role) &&
    EXERCISE_TYPES.includes(type as typeof EXERCISE_TYPES[number]) &&
    (account.assignedFeedbackTypes || []).includes(type)
  );
}

export function canEditFeedback(account: LearningAccount, submission: { type: string; feedback?: string; feedbackBy?: string }): boolean {
  return canFeedback(account, submission.type) && (
    account.role === 'admin' || !submission.feedback || submission.feedbackBy === account.id
  );
}