'use client';

import { HomeworkSubmission } from '@/app/firebase/services';
import DailyHome from './DailyHome';
import DailyTargetTable from './DailyTargetTable';
import { useRouter } from 'next/navigation';
import NewStudentGuide from './NewStudentGuide';
import ProgressChart from './ProgressChart';
import SubmissionsCalendar from './SubmissionsCalendar';
import SubmissionsList from './SubmissionsList';

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

  // Check if student has any submissions
  const hasSubmissions = homeworkSubmissions.length > 0;

  if (userRole === 'student' && !hasSubmissions) {
    return <NewStudentGuide />;
  }

  // Create a map of dates with submissions
  const submissionDates = homeworkProgressData.labels.reduce((acc: { [key: string]: number }, date, index) => {
    const count = homeworkProgressData.datasets[0].data[index];
    if (count > 0) {
      acc[date] = count;
    }
    return acc;
  }, {});

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
            submissions={homeworkSubmissions}
          />
        </div>
      </div>
    </div>
  );
}
