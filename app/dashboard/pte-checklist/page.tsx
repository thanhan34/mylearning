import { Metadata } from 'next';
import ChecklistPTE from '../components/ChecklistPTE';

export const metadata: Metadata = {
  title: 'PTE Checklist - MyLearning',
  description: 'Checklist 22 phần thi PTE cho học viên và giáo viên',
};

export default function PTEChecklistPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ChecklistPTE />
    </div>
  );
}
