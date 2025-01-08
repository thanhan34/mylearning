'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { 
  DailyTarget, 
  HomeworkSubmission,
  saveDailyProgress, 
  saveHomeworkSubmission,
  getDailyProgress, 
  getHomeworkSubmissions,
  getWeeklyProgress 
} from '../firebase/services';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Mock data - In real app, this would come from API
const teacherStats = {
  totalClasses: 5,
  totalStudents: 42,
  pendingAssignments: 15,
};

const classProgressData = {
  labels: ['Class A', 'Class B', 'Class C', 'Class D', 'Class E'],
  datasets: [{
    label: 'Assignment Completion Rate (%)',
    data: [75, 82, 90, 65, 88],
    backgroundColor: '#fc5d01',
  }]
};

// Default daily targets template
const defaultDailyTargets = [
  { id: 1, type: 'Read aloud', target: 20, completed: 15, source: 'Shadowing' },
  { id: 2, type: 'Repeat sentence', target: 20, completed: 18, source: 'PTE Repeat Sentence' },
  { id: 3, type: 'Describe image', target: 5, completed: 3, source: '' },
  { id: 4, type: 'Retell lecture', target: 5, completed: 2, source: '' },
  { id: 5, type: 'R&W: Fill in the blanks', target: 20, completed: 12, source: '' },
  { id: 6, type: 'Reoder paragraphs', target: 20, completed: 15, source: '' },
  { id: 7, type: 'Fill in the blanks', target: 20, completed: 16, source: '' },
  { id: 8, type: 'Highlight incorrect words', target: 5, completed: 3, source: '' },
  { id: 9, type: 'Write from dictation', target: 20, completed: 14, source: 'PTE Write From Dictation' }
];

// Default homework submissions template
const getDefaultHomeworkSubmissions = (date: string) => [
  // Read aloud: 20 questions
  ...Array(20).fill(null).map((_, i) => ({ id: 1, type: 'Read aloud', questionNumber: i + 1, link: '', date })),
  // Repeat sentence: 20 questions
  ...Array(20).fill(null).map((_, i) => ({ id: 2, type: 'Repeat sentence', questionNumber: i + 1, link: '', date })),
  // Describe image: 5 questions
  ...Array(5).fill(null).map((_, i) => ({ id: 3, type: 'Describe image', questionNumber: i + 1, link: '', date })),
  // Retell lecture: 5 questions
  ...Array(5).fill(null).map((_, i) => ({ id: 4, type: 'Retell lecture', questionNumber: i + 1, link: '', date }))
];

export default function DashboardPage() {
  const [dailyTargets, setDailyTargets] = useState<DailyTarget[]>(defaultDailyTargets);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkSubmission[]>([]);
  const [selectedHomeworkType, setSelectedHomeworkType] = useState<string>('Read aloud');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [studentProgressData, setStudentProgressData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
    }[];
  }>({
    labels: [],
    datasets: [{
      label: 'Completed Tasks',
      data: [],
      backgroundColor: '#fc5d01',
    }]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userRole, setUserRole] = useState('student');

  const loadDailyProgress = useCallback(async () => {
    if (session?.user?.email) {
      const userId = session.user.email.replace(/[.#$[\]]/g, '_');
      const progress = await getDailyProgress(userId);
      if (progress) {
        setDailyTargets(progress);
      }
      setIsLoading(false);
    }
  }, [session?.user?.email]);

  const loadWeeklyProgress = useCallback(async () => {
    if (session?.user?.email) {
      const userId = session.user.email.replace(/[.#$[\]]/g, '_');
      const weeklyData = await getWeeklyProgress(userId);
      const labels = weeklyData.map((d: { date: Date }) => d.date.toLocaleDateString());
      const data = weeklyData.map((d: { completed: number }) => d.completed);
      
      setStudentProgressData({
        labels,
        datasets: [{
          label: 'Completed Tasks',
          data,
          backgroundColor: '#fc5d01',
        }]
      });
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
    if (session?.user) {
      setUserRole((session.user as any)?.role || 'student');
      loadDailyProgress();
      loadWeeklyProgress();
    }
  }, [status, router, session, loadDailyProgress, loadWeeklyProgress]);

  const handleSaveProgress = async () => {
    if (!session?.user?.email) {
      console.error('No user email found in session');
      return;
    }
    
    setSaveStatus('saving');
    try {
      console.log('Starting save operation:', {
        email: session.user.email,
        targetsCount: dailyTargets.length,
        submissionsCount: homeworkSubmissions.length,
        selectedDate
      });

      // Filter out submissions with empty links
      const submissionsToSave = homeworkSubmissions.filter(s => s.link.trim() !== '');
      console.log('Filtered submissions to save:', submissionsToSave.length);

      // Ensure all submissions have the correct date
      const updatedSubmissions = submissionsToSave.map(submission => ({
        ...submission,
        date: selectedDate
      }));

      const userId = session.user.email.replace(/[.#$[\]]/g, '_');
      const [progressSuccess, submissionsSuccess] = await Promise.all([
        saveDailyProgress(userId, dailyTargets),
        saveHomeworkSubmission(userId, updatedSubmissions)
      ]);

      console.log('Save operation results:', { progressSuccess, submissionsSuccess });

      if (progressSuccess && submissionsSuccess) {
        setSaveStatus('saved');
        console.log('Save successful, refreshing progress...');
        await loadWeeklyProgress(); // Refresh the progress chart
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        console.error('Save operation failed:', { progressSuccess, submissionsSuccess });
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error in handleSaveProgress:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      setSaveStatus('error');
    }
  };

  const loadHomeworkSubmissions = useCallback(async (date: string) => {
    if (session?.user?.email) {
      try {
      const userId = session.user.email.replace(/[.#$[\]]/g, '_');
      const submissions = await getHomeworkSubmissions(userId, date);
        if (submissions) {
          setHomeworkSubmissions(submissions);
        } else {
          // If no submissions exist for the date, create default submissions
          setHomeworkSubmissions(getDefaultHomeworkSubmissions(date));
        }
      } catch (error) {
        console.error('Error loading homework submissions:', error);
        // Set default submissions on error
        setHomeworkSubmissions(getDefaultHomeworkSubmissions(date));
      }
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      const dateStr = date.toISOString().split('T')[0];
      loadHomeworkSubmissions(dateStr);
    }
  }, [loadHomeworkSubmissions, selectedDate]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-[#fc5d01] text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  const TeacherDashboard = () => (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
          <h3 className="text-[#fd7f33] text-sm font-medium">Total Classes</h3>
          <p className="text-[#fc5d01] text-2xl font-bold">{teacherStats.totalClasses}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
          <h3 className="text-[#fd7f33] text-sm font-medium">Total Students</h3>
          <p className="text-[#fc5d01] text-2xl font-bold">{teacherStats.totalStudents}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
          <h3 className="text-[#fd7f33] text-sm font-medium">Pending Assignments</h3>
          <p className="text-[#fc5d01] text-2xl font-bold">{teacherStats.pendingAssignments}</p>
        </div>
      </div>

      {/* Class Progress Chart */}
      <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
        <h3 className="text-[#fc5d01] text-lg font-medium mb-4">Class Progress</h3>
        <div className="h-64">
          <Bar data={classProgressData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => router.push('/dashboard/class')}
          className="bg-[#fc5d01] text-white p-4 rounded-lg hover:bg-[#fd7f33] transition-colors flex items-center justify-center gap-2"
        >
          <span>Manage Classes</span>
        </button>
        <button 
          className="bg-[#fc5d01] text-white p-4 rounded-lg hover:bg-[#fd7f33] transition-colors flex items-center justify-center gap-2"
        >
          <span>Assign New Task</span>
        </button>
        <button 
          className="bg-[#fc5d01] text-white p-4 rounded-lg hover:bg-[#fd7f33] transition-colors flex items-center justify-center gap-2"
        >
          <span>View Reports</span>
        </button>
      </div>
    </div>
  );

  const StudentDashboard = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => router.push('/dashboard/assignments')}
          className="bg-white p-6 rounded-lg shadow border border-[#fedac2] hover:bg-[#fedac2] transition-colors group"
        >
          <h3 className="text-[#fd7f33] text-sm font-medium group-hover:text-[#fc5d01]">Assignments</h3>
          <p className="text-[#fc5d01] text-2xl font-bold">View All</p>
        </button>
        <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
          <h3 className="text-[#fd7f33] text-sm font-medium">Due Soon</h3>
          <p className="text-[#fc5d01] text-2xl font-bold">2</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
          <h3 className="text-[#fd7f33] text-sm font-medium">Completed</h3>
          <p className="text-[#fc5d01] text-2xl font-bold">16</p>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
        <h3 className="text-[#fc5d01] text-lg font-medium mb-4">Your Progress</h3>
        <div className="h-64">
          <Bar data={studentProgressData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>

      {/* Daily Targets */}
      <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
        <h3 className="text-[#fc5d01] text-lg font-medium mb-4">Daily Targets</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#fedac2]">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-[#fd7f33] font-medium">NO</th>
                  <th className="px-4 py-3 text-left text-[#fd7f33] font-medium">TYPE</th>
                  <th className="px-4 py-3 text-center text-[#fd7f33] font-medium">Target</th>
                  <th className="px-4 py-3 text-center text-[#fd7f33] font-medium">Completed</th>
                  <th className="px-4 py-3 text-left text-[#fd7f33] font-medium">Source</th>
                  <th className="px-4 py-3 text-center text-[#fd7f33] font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#fedac2]">
              {dailyTargets.map((task) => {
                const isCompleted = task.completed >= task.target;
                const progress = (task.completed / task.target) * 100;
                
                return (
                  <tr key={task.id} className={task.id % 2 === 0 ? 'bg-[#fedac2] bg-opacity-10' : ''}>
                    <td className="px-4 py-3 text-black">{task.id}</td>
                    <td className="px-4 py-3 text-black">{task.type}</td>
                    <td className="px-4 py-3 text-center text-black">{task.target}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        value={task.completed}
                        onChange={(e) => {
                          const newValue = Math.max(0, parseInt(e.target.value) || 0);
                          setDailyTargets(dailyTargets.map(t => 
                            t.id === task.id ? { ...t, completed: newValue } : t
                          ));
                        }}
                        className="w-16 text-center border border-[#fedac2] rounded px-2 py-1 text-black"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-[#fc5d01]">
                      {task.source && (
                        <a href="#" className="text-black hover:text-[#fc5d01] underline">
                          {task.source}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-center">
                          <div className="w-full bg-[#fedac2] rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${isCompleted ? 'bg-[#fc5d01]' : 'bg-[#fd7f33]'}`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        {!isCompleted && new Date().getHours() >= 20 && (
                          <span className="text-[#fc5d01] text-xs">
                            ⚠️ Target not met
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
          </table>
        </div>
      </div>

      {/* Homework Submissions */}
      <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
        <h3 className="text-[#fc5d01] text-lg font-medium mb-4">Homework Submissions</h3>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-[#fedac2] rounded px-3 py-2 text-black"
            />
            <select
              value={selectedHomeworkType}
              onChange={(e) => setSelectedHomeworkType(e.target.value)}
              className="border border-[#fedac2] rounded px-3 py-2 text-black"
            >
              <option value="Read aloud">Read aloud</option>
              <option value="Repeat sentence">Repeat sentence</option>
              <option value="Describe image">Describe image</option>
              <option value="Retell lecture">Retell lecture</option>
            </select>
          </div>
          <button
            onClick={() => router.push('/dashboard/submit')}
            className="bg-[#fc5d01] text-white px-4 py-2 rounded hover:bg-[#fd7f33] transition-colors"
          >
            Submit New
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#fedac2]">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-[#fd7f33] font-medium">Question</th>
                <th className="px-4 py-3 text-left text-[#fd7f33] font-medium">Link</th>
                <th className="px-4 py-3 text-left text-[#fd7f33] font-medium">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#fedac2]">
              {homeworkSubmissions
                .filter(submission => submission.type === selectedHomeworkType)
                .sort((a, b) => a.questionNumber - b.questionNumber)
                .slice(0, selectedHomeworkType === 'Read aloud' || selectedHomeworkType === 'Repeat sentence' ? 20 : 5)
                .map((submission) => (
                  <tr key={`${submission.type}_${submission.questionNumber}_${submission.date}`} 
                      className={submission.questionNumber % 2 === 0 ? 'bg-[#fedac2] bg-opacity-10' : ''}>
                    <td className="px-4 py-3 text-black">
                      Question {submission.questionNumber}
                    </td>
                    <td className="px-4 py-3">
                      {submission.link ? (
                        <a 
                          href={submission.link.match(/https:\/\/www\.apeuni\.com\/practice\/answer_item\?[^\s]+/)?.[0] || submission.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-black hover:text-[#fc5d01] underline break-all"
                          title="Click để mở link gốc"
                        >
                          {submission.link.split('https://')[0].trim()}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">No submission yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {submission.feedback ? (
                        <div className="text-black">{submission.feedback}</div>
                      ) : (
                        <span className="text-[#fdbc94] text-sm">No feedback yet</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Notifications */}
      <div className="bg-white p-6 rounded-lg shadow border border-[#fedac2]">
        <h3 className="text-[#fc5d01] text-lg font-medium mb-4">Notifications</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-[#fc5d01] pl-4">
            <p className="text-[#fd7f33] font-medium">Math Assignment Due Tomorrow</p>
            <p className="text-[#fdbc94] text-sm">Complete Chapter 5 Exercises</p>
          </div>
          <div className="border-l-4 border-[#fc5d01] pl-4">
            <p className="text-[#fd7f33] font-medium">New Teacher Feedback</p>
            <p className="text-[#fdbc94] text-sm">On your English Essay</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="min-h-screen bg-[#ffffff]">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#fc5d01]">
                Welcome, {session?.user?.name}
              </h1>
              <p className="text-[#fd7f33]">
                {userRole === 'teacher' ? 'Teacher Dashboard' : 'Student Dashboard'}
              </p>
            </div>
            {userRole === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />}
          </div>
        </div>
      </div>
    </form>
  );
}
