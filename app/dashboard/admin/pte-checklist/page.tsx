import { Metadata } from 'next';
import PTEChecklistManagement from '../components/PTEChecklistManagement';

export const metadata: Metadata = {
  title: 'Quản lý PTE Checklist - Admin',
  description: 'Quản lý và theo dõi tiến độ PTE Checklist của tất cả học viên',
};

export default function AdminPTEChecklistPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PTEChecklistManagement />
    </div>
  );
}
