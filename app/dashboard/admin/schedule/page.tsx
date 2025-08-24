import { Metadata } from 'next';
import ScheduleManagement from '../components/ScheduleManagement';

export const metadata: Metadata = {
  title: 'Quản lý lịch học - Admin Dashboard',
  description: 'Quản lý lịch học và phân quyền tạo lịch cho hệ thống',
};

export default function AdminSchedulePage() {
  return <ScheduleManagement />;
}
