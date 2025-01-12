'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { 
  DailyTarget, 
  HomeworkSubmission,
  getDailyProgress, 
  getHomeworkSubmissions,
  getWeeklyProgress,
  getHomeworkProgress
} from '../firebase/services';

import WelcomeHeader from './components/WelcomeHeader';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import TeacherStats from './teacher/components/TeacherStats';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export default function DashboardPage() {
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkSubmission[]>([]);
  const [selectedHomeworkType, setSelectedHomeworkType] = useState<string>('Read aloud');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [homeworkProgressData, setHomeworkProgressData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      tension: number;
    }[];
  }>({
    labels: [],
    datasets: [{
      label: 'Homework Completion',
      data: [],
      borderColor: '#fc5d01',
      tension: 0.4
    }]
  });

  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userRole, setUserRole] = useState('student');

  const loadHomeworkProgress = useCallback(async () => {
    if (session?.user?.email) {
      const userId = session.user.email.replace(/[.#$[\]]/g, '_');
      const progressData = await getHomeworkProgress(userId);
      const labels = progressData.map(d => new Date(d.date).toLocaleDateString('vi-VN'));
      const data = progressData.map(d => d.completed);
      
      setHomeworkProgressData({
        labels,
        datasets: [{
          label: 'Tiến độ bài tập',
          data,
          borderColor: '#fc5d01',
          tension: 0.4
        }]
      });
    }
  }, [session?.user?.email]);

  const loadHomeworkSubmissions = useCallback(async (date: string) => {
    if (session?.user?.email) {
      try {
        const userId = session.user.email.replace(/[.#$[\]]/g, '_');
        const submissions = await getHomeworkSubmissions(userId, date);
        if (submissions) {
          setHomeworkSubmissions(submissions);
        }
      } catch (error) {
        console.error('Error loading homework submissions:', error);
      }
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    
    if (session?.user) {
      console.log('Session user:', session.user);
      const role = (session.user as any)?.role;
      console.log('User role:', role);
      setUserRole(role || 'student');
      setIsLoading(false);
      
      if (role === 'student') {
        loadHomeworkProgress().catch(error => {
          console.error('Error loading homework progress:', error);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    }
  }, [status, router, session, loadHomeworkProgress]);

  useEffect(() => {
    console.log('Current state:', {
      userRole,
      isLoading,
      homeworkSubmissions: homeworkSubmissions.length,
      progressData: homeworkProgressData
    });
  }, [userRole, isLoading, homeworkSubmissions, homeworkProgressData]);

  useEffect(() => {
    if (selectedDate) {
      loadHomeworkSubmissions(selectedDate);
    }
  }, [loadHomeworkSubmissions, selectedDate]);

  if (status === 'loading') {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <WelcomeHeader 
        name={session?.user?.name || ''} 
        role={userRole}
      />
      
      {userRole === 'teacher' ? (
        <TeacherStats />
      ) : userRole === 'admin' ? (
        <AdminDashboard />
      ) : (
        <StudentDashboard 
          homeworkProgressData={homeworkProgressData}
          selectedDate={selectedDate}
          selectedHomeworkType={selectedHomeworkType}
          homeworkSubmissions={homeworkSubmissions}
          onDateChange={setSelectedDate}
          onTypeChange={setSelectedHomeworkType}
        />
      )}
    </div>
  );
}
