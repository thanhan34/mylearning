'use client';

import type { HomeworkSubmission } from '@/app/firebase/services/types';
import { getUserByEmail, User } from '@/app/firebase/services/user';
import DailyHome from './DailyHome';
import DailyTargetTable from './DailyTargetTable';
import { useRouter } from 'next/navigation';
import NewStudentGuide from './NewStudentGuide';
import ProgressChart from './ProgressChart';
import SubmissionsCalendar from './SubmissionsCalendar';
import SubmissionsList from './SubmissionsList';
import MispronouncedWordsTracker from './MispronouncedWordsTracker';
import StudentDailyNotesHistory from './StudentDailyNotesHistory';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface StudentDashboardProps {
  homeworkProgressData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      tension: number;
    }[];
  };
  selectedDate: string;
  homeworkSubmissions: HomeworkSubmission[];
  onDateChange: (date: string) => void;
  userRole?: string;
}

export default function StudentDashboard({
  homeworkProgressData,
  selectedDate,
  homeworkSubmissions,
  onDateChange,
  userRole,
}: StudentDashboardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isAssigned, setIsAssigned] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAssignment = async () => {
      if (session?.user?.email) {
        const user = await getUserByEmail(session.user.email) as User | null;
        if (user) {          
          const hasAssignment = !!user.classId || !!user.teacherId;          
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

  // Create a map of dates with submissions and include today's date
  const submissionDates = homeworkProgressData.labels.reduce((acc: { [key: string]: number }, date, index) => {
    const count = homeworkProgressData.datasets[0].data[index];
    acc[date] = count || 0; // Include all dates, even with 0 submissions
    return acc;
  }, {
    // Always include today's date
    [new Date().toISOString().split('T')[0]]: 0
  });

  return (
    <div className="space-y-8">
      {/* Progress Charts */}
      <ProgressChart data={homeworkProgressData} />

      {/* Mispronounced Words Tracker */}
      <MispronouncedWordsTracker userRole={userRole} />

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

      {/* Teacher's Daily Notes */}
      {session?.user?.id && (
        <StudentDailyNotesHistory 
          studentId={session.user.id}
        />
      )}

      {/* Homework Submissions */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-[#fc5d01]">Nộp bài tập</h3>
          <button
            onClick={() => router.push('/dashboard/submit')}
            className="bg-[#fc5d01] text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-[#fd7f33] transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            Nộp bài mới
          </button>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          <div className="w-full lg:w-auto">
            <SubmissionsCalendar 
              selectedDate={selectedDate}
              submissionDates={submissionDates}
              onDateChange={onDateChange}
            />
          </div>
          <div className="w-full">
            <SubmissionsList 
              selectedDate={selectedDate}
              submissionDates={submissionDates}
              submissions={homeworkSubmissions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
