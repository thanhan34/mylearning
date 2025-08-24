import { Metadata } from 'next';
import TeacherScheduleView from '../../components/TeacherScheduleView';

export const metadata: Metadata = {
  title: 'Lịch học - Teacher Dashboard',
  description: 'Xem và quản lý lịch học cho các lớp phụ trách',
};

export default function TeacherSchedulePage() {
  return <TeacherScheduleView />;
}
