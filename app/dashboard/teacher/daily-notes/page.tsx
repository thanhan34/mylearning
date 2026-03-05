import { Metadata } from 'next';
import MultiStudentDailyNotesClient from '@/app/dashboard/components/MultiStudentDailyNotesClient';

export const metadata: Metadata = {
  title: 'Nhật ký học tập - Giáo viên',
  description: 'Theo dõi nhật ký học tập của nhiều học viên cho giáo viên.',
};

export default function TeacherDailyNotesPage() {
  return <MultiStudentDailyNotesClient userRole="teacher" />;
}
