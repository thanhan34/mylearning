'use client';

import HomeworkFeedbackTabs from '@/app/dashboard/admin/components/feedback/HomeworkFeedbackTabs';

/**
 * AssistantFeedbackClient Component
 * 
 * Trợ giảng có thể xem và quản lý feedback bài tập của học viên trong các lớp được phân công.
 * Sử dụng cùng component với admin nhưng được filter theo lớp của trợ giảng.
 */
export default function AssistantFeedbackClient() {
  return <HomeworkFeedbackTabs userRole="assistant" />;
}
