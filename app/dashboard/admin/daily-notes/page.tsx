import { Metadata } from 'next';
import MultiStudentDailyNotesClient from '@/app/dashboard/components/MultiStudentDailyNotesClient';

export const metadata: Metadata = {
  title: 'Nhật ký học tập - Admin',
  description: 'Theo dõi nhật ký học tập của nhiều học viên cho quản trị viên.',
};

export default function AdminDailyNotesPage() {
  return <MultiStudentDailyNotesClient userRole="admin" />;
}
