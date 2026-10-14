'use client';

import { getUserByEmail, User } from '@/app/firebase/services/user';
import DailyHome from './DailyHome';
import DailyTargetTable from './DailyTargetTable';
import NewStudentGuide from './NewStudentGuide';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { isApproved } from '@/lib/learning-access';

interface StudentDashboardProps {
  userRole?: string;
}

export default function StudentDashboard({
  userRole,
}: StudentDashboardProps) {
  const { data: session } = useSession();
  const [isAssigned, setIsAssigned] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAssignment = async () => {
      if (session?.user?.email) {
        const user = await getUserByEmail(session.user.email) as User | null;
        if (user) {          
          const hasAssignment = isApproved(user);
          setIsAssigned(hasAssignment);
        }
        setIsLoading(false);
      }
    };
    checkAssignment();
  }, [session]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
          <div className="h-64 bg-[#fedac2] rounded opacity-50"></div>
        </div>
      </div>
    );
  }

  if (userRole === 'student' && !isAssigned) {
    return <NewStudentGuide />;
  }

  return (
    <div className="space-y-8">
      {/* Daily Targets */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <h3 className="text-lg sm:text-xl font-semibold text-[#fc5d01] mb-4 sm:mb-6">Mục tiêu hàng ngày</h3>
        <DailyTargetTable />
      </div>

      {/* Daily Home */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <h3 className="text-lg sm:text-xl font-semibold text-[#fc5d01] mb-4 sm:mb-6">Bài tập về nhà</h3>
        <DailyHome />
      </div>

    </div>
  );
}
