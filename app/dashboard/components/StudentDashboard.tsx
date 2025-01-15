'use client';

import { HomeworkSubmission, getUserByEmail, getDefaultHomeworkSubmissions } from '@/app/firebase/services';
import DailyHome from './DailyHome';
import DailyTargetTable from './DailyTargetTable';
import { useRouter } from 'next/navigation';
import NewStudentGuide from './NewStudentGuide';
import ProgressChart from './ProgressChart';
import SubmissionsCalendar from './SubmissionsCalendar';
import SubmissionsList from './SubmissionsList';
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

  useEffect(() => {
    const checkAssignment = async () => {
      if (session?.user?.email) {
        const user = await getUserByEmail(session.user.email);
        if (user) {
          console.log('User assignment status:', { 
            email: user.email,
            classId: user.classId, 
            teacherId: user.teacherId,
            role: user.role 
          });
          const hasAssignment = !!user.classId || !!user.teacherId;
          console.log('Is assigned:', hasAssignment);
          setIsAssigned(hasAssignment);
        }
      }
    };
    checkAssignment();
  }, [session]);

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

      {/* Daily Targets */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-[#fc5d01] mb-6">Mục tiêu hàng ngày</h3>
        <DailyTargetTable />
      </div>

      {/* Daily Home */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-[#fc5d01] mb-6">Bài tập về nhà</h3>
        <DailyHome />
      </div>

      {/* Homework Submissions */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-[#fc5d01]">Nộp bài tập</h3>
          <button
            onClick={() => router.push('/dashboard/submit')}
            className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33] transition-colors"
          >
            Nộp bài mới
          </button>
        </div>
        <div className="flex gap-8">
          <SubmissionsCalendar 
            selectedDate={selectedDate}
            submissionDates={submissionDates}
            onDateChange={onDateChange}
          />
          <SubmissionsList 
            selectedDate={selectedDate}
            submissionDates={submissionDates}
            submissions={homeworkSubmissions || getDefaultHomeworkSubmissions(selectedDate)}
          />
        </div>
      </div>
    </div>
  );
}
