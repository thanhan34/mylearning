import { Metadata } from 'next';
import PTEChecklistManagement from '../../admin/components/PTEChecklistManagement';

export const metadata: Metadata = {
  title: 'PTE Checklist - Teacher',
  description: 'Quản lý và theo dõi tiến độ PTE Checklist của học viên',
};

export default function TeacherPTEChecklistPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PTEChecklistManagement />
    </div>
  );
}
