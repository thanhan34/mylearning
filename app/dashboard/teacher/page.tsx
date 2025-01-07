'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import StudentList from './components/StudentList';

const TeacherDashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not logged in or not a teacher
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#fc5d01]">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <StudentList />
    </div>
  );
};

export default TeacherDashboard;
