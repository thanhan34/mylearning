import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exam Tracking | Admin Dashboard',
  description: 'Admin exam tracking management system',
};

export default function AdminExamTrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
