'use client';

import HomeworkFeedbackTabs from '@/app/dashboard/admin/components/feedback/HomeworkFeedbackTabs';

/**
 * TeacherFeedbackClient Component
 * 
 * Giáo viên có thể xem và quản lý feedback bài tập của học viên trong các lớp được phân công.
 * Sử dụng cùng component với admin nhưng được filter theo lớp của giáo viên.
 */
export default function TeacherFeedbackClient() {
  return <HomeworkFeedbackTabs userRole="teacher" />;
}
