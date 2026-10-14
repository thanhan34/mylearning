'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import WelcomeHeader from './components/WelcomeHeader';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboardClient from './admin/components/AdminDashboardClient';
import TeacherStats from '@/components/FeedbackWorkspace';
import { useLearningAccount } from '@/components/LearningGate';
import AdminSupportPreview from '@/components/AdminSupportPreview';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status } = useSession();
  const account = useLearningAccount();
  const router = useRouter();
  const [userRole, setUserRole] = useState('student');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    
    if (account) {
      const role = account.role;
      setUserRole(role || 'student');
      setIsLoading(false);
    }
  }, [status, router, account]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-white to-[#fedac2] rounded-xl p-6 shadow-lg mb-8 animate-pulse">
          <div className="h-8 w-48 bg-[#fedac2] rounded mb-2"></div>
          <div className="h-4 w-32 bg-[#fedac2] rounded opacity-70"></div>
        </div>
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
            <div className="h-6 w-32 bg-[#fedac2] rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-[#fedac2] rounded opacity-50"></div>
              <div className="h-64 bg-[#fedac2] rounded opacity-50"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userRole === 'admin_support') return <AdminSupportPreview />;

  if (userRole === 'admin') {
    return <AdminDashboardClient />;
  }

  if (userRole === 'teacher' || userRole === 'assistant') {
    return <TeacherStats />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <WelcomeHeader 
        name={session?.user?.name || ''} 
        role={userRole}
      />
      
      <StudentDashboard userRole={userRole} />
    </div>
  );
}
