import { Metadata } from 'next';
import TeacherScheduleView from '../../components/TeacherScheduleView';

export const metadata: Metadata = {
  title: 'Lịch học - Assistant Dashboard',
  description: 'Xem và quản lý lịch học cho các lớp được phân công',
};

export default function AssistantSchedulePage() {
  return <TeacherScheduleView />;
}
