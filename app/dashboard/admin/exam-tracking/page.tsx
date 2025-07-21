import { Metadata } from 'next';
import ExamTrackingManagement from '../components/ExamTrackingManagement';

export const metadata: Metadata = {
  title: 'Exam Tracking Management | Admin Dashboard',
  description: 'Manage student exam information and track exam schedules',
};

export default function AdminExamTrackingPage() {
  return <ExamTrackingManagement />;
}
