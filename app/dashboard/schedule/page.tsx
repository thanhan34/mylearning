import { Metadata } from 'next';
import StudentScheduleView from '../components/StudentScheduleView';

export const metadata: Metadata = {
  title: 'Lịch học của tôi - Student Dashboard',
  description: 'Xem lịch học cá nhân và các hoạt động sắp tới',
};

export default function StudentSchedulePage() {
  return <StudentScheduleView />;
}
