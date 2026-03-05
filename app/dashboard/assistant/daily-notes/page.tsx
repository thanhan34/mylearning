import { Metadata } from 'next';
import MultiStudentDailyNotesClient from '@/app/dashboard/components/MultiStudentDailyNotesClient';

export const metadata: Metadata = {
  title: 'Nhật ký học tập - Trợ giảng',
  description: 'Theo dõi nhật ký học tập của nhiều học viên cho trợ giảng.',
};

export default function AssistantDailyNotesPage() {
  return <MultiStudentDailyNotesClient userRole="assistant" />;
}
